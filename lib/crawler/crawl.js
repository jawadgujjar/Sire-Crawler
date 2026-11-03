import { fetchRaw, checkResource, inspectCertificate, decodeText, USER_AGENTS } from "./net";
import { parseRobots, rulesFor, isAllowed } from "./robots";
import { loadSitemaps } from "./sitemap";
import { parseHtml } from "./parse";
import { normalizeUrl, isInternalUrl, isBinaryUrl, siteHost, pathOf } from "../audit/url";

export const PAGE_LIMITS = [50, 100, 250, 500, 1000];
export const SPEEDS = { gentle: 2, normal: 6, fast: 10 };

const MAX_PAGE_BYTES = 5 * 1024 * 1024;
const MAX_URL_LENGTH = 2048;
const MAX_BLOCKED_RECORDS = 500;
const MAX_EXTERNAL_CHECKS = 200;
const MAX_IMAGE_CHECKS = 300;
const MAX_QUERY_VARIANTS_PER_PATH = 40; // guards against calendar / faceted-search crawler traps
const MAX_CRAWL_DELAY_MS = 5000;
// Sites that block automated requests (login walls, 999/404 for bots): results would be false positives
const UNVERIFIABLE_HOSTS = /(^|\.)(twitter\.com|x\.com|linkedin\.com|instagram\.com|facebook\.com|fb\.com|tiktok\.com|pinterest\.com|reddit\.com|quora\.com)$/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Validates and clamps user-supplied crawl options. */
export function sanitizeOptions(input = {}) {
  const maxPages = PAGE_LIMITS.includes(Number(input.maxPages)) ? Number(input.maxPages) : 100;
  const patterns = (value) =>
    String(value || "")
      .split(/[\n,]/)
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 20)
      .map((p) => p.slice(0, 200));
  return {
    maxPages,
    speed: SPEEDS[input.speed] ? input.speed : "normal",
    userAgent: input.userAgent === "mobile" ? "mobile" : "desktop",
    respectRobots: input.respectRobots !== false,
    useSitemap: input.useSitemap !== false,
    includeSubdomains: input.includeSubdomains === true,
    checkExternal: input.checkExternal !== false,
    checkImages: input.checkImages !== false,
    stripTracking: input.stripTracking !== false,
    include: patterns(input.include),
    exclude: patterns(input.exclude),
  };
}

function wildcardTest(patterns, path) {
  return patterns.some((p) => {
    if (!p.includes("*")) return path.includes(p);
    const re = new RegExp(p.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*"));
    return re.test(path);
  });
}

async function mapLimit(items, limit, fn, shouldStop) {
  const results = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length && !shouldStop()) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results.filter(Boolean);
}

/**
 * Crawls a site breadth-first and streams raw findings through `emit`.
 * All judgement (issues, scores) happens in lib/audit/analyze.js so the
 * browser can build a report even from a partial, stopped crawl.
 */
export async function runCrawl({ startUrl, options, signal, emit, deadline }) {
  const startedAt = Date.now();
  const opts = options;
  const userAgent = USER_AGENTS[opts.userAgent];
  const start = new URL(startUrl);
  const rootHost = siteHost(start.hostname);
  const origin = start.origin;
  const concurrencyBase = SPEEDS[opts.speed];
  const reserveMs = (opts.checkExternal || opts.checkImages) ? 30000 : 5000;
  const outOfTime = () => Date.now() > deadline - reserveMs;
  const stopped = () => signal.aborted;

  emit({ t: "phase", phase: "setup", message: "Reading robots.txt, sitemap and SSL certificate" });

  // ── Site-level checks (run in parallel) ─────────────────────────────────────
  const robotsPromise = fetchRaw(`${origin}/robots.txt`, { userAgent, signal, timeout: 10000, maxBytes: 512 * 1024, accept: "text/plain,*/*" });
  const certPromise = start.protocol === "https:" ? inspectCertificate(start.hostname) : Promise.resolve(null);
  const altHost = start.hostname.startsWith("www.") ? start.hostname.slice(4) : "www." + start.hostname;
  const altHostPromise = fetchRaw(`${start.protocol}//${altHost}/`, { userAgent, signal, timeout: 10000, maxBytes: 256 * 1024 });
  const httpPromise = start.protocol === "https:"
    ? fetchRaw(`http://${start.host}/`, { userAgent, signal, timeout: 10000, maxBytes: 256 * 1024 })
    : Promise.resolve(null);

  const robotsRes = await robotsPromise;
  const robots = { found: false, status: robotsRes.status, error: robotsRes.error || "", sitemaps: [], crawlDelay: null, disallowCount: 0 };
  let robotRules = [];
  if (robotsRes.ok && robotsRes.status === 200 && !/<html/i.test(robotsRes.body.subarray(0, 512).toString())) {
    const parsed = parseRobots(decodeText(robotsRes.body, robotsRes.headers["content-type"]));
    const mine = rulesFor(parsed);
    robotRules = mine.rules;
    robots.found = true;
    robots.sitemaps = parsed.sitemaps.slice(0, 20);
    robots.crawlDelay = mine.crawlDelay;
    robots.disallowCount = mine.rules.filter((r) => !r.allow).length;
    robots.blocksEverything = mine.rules.some((r) => !r.allow && r.pattern === "/") && !mine.rules.some((r) => r.allow);
  }

  const crawlDelayMs = opts.respectRobots && robots.crawlDelay ? Math.min(robots.crawlDelay * 1000, MAX_CRAWL_DELAY_MS) : 0;
  const concurrency = crawlDelayMs ? 1 : concurrencyBase;

  const sitemapCandidates = robots.sitemaps.length
    ? robots.sitemaps.map((s) => normalizeUrl(s, origin, { stripTracking: false })).filter(Boolean)
    : [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
  const sitemapPromise = loadSitemaps(sitemapCandidates, { userAgent, signal, explicit: robots.sitemaps.length > 0 });

  const [cert, altHostRes, httpRes, sitemap] = await Promise.all([certPromise, altHostPromise, httpPromise, sitemapPromise]);

  const redirectTarget = (res, from) => (res && res.ok && res.status >= 300 && res.status < 400 && res.headers.location ? normalizeUrl(res.headers.location, from, { stripTracking: false }) : "");
  const altTarget = redirectTarget(altHostRes, `${start.protocol}//${altHost}/`);
  const httpTarget = redirectTarget(httpRes, `http://${start.host}/`);

  const sitemapUrls = sitemap.urls.filter((u) => isInternalUrl(u, rootHost, opts.includeSubdomains));
  emit({
    t: "site",
    site: {
      startUrl,
      rootHost,
      robots,
      sitemap: { found: sitemap.found, files: sitemap.files, urlCount: sitemapUrls.length, truncated: sitemap.truncated, declaredInRobots: robots.sitemaps.length > 0 },
      sitemapUrls: sitemapUrls.slice(0, 10000),
      certificate: cert,
      hostVariant: {
        host: altHost,
        status: altHostRes.status,
        error: altHostRes.error || "",
        redirectsTo: altTarget,
        consolidated: !altHostRes.ok || altHostRes.status >= 400 || (altTarget && siteHost(new URL(altTarget).hostname) === rootHost && new URL(altTarget).hostname === start.hostname),
      },
      httpRedirect: httpRes ? { status: httpRes.status, error: httpRes.error || "", redirectsTo: httpTarget, toHttps: httpTarget.startsWith("https://") } : null,
      crawlDelayMs,
      concurrency,
    },
  });

  if (stopped()) return emit({ t: "done", reason: "stopped", elapsedMs: Date.now() - startedAt });

  // ── Crawl ───────────────────────────────────────────────────────────────────
  const queued = new Set();
  const linkQueue = [];
  const sitemapQueue = [];
  const queryVariants = new Map();
  let crawled = 0;
  let reserved = 0; // fetch slots taken (queued fetches + finished fetches), capped at maxPages
  let blockedRecords = 0;
  let inFlight = 0;
  let linkInFlight = 0; // fetches of URLs discovered through links (not the sitemap)
  let lastFetchAt = 0;
  const externalLinks = new Map();
  const internalImages = new Set();

  const allowedByFilters = (url) => {
    const path = pathOf(url);
    if (opts.include.length && url !== startUrl && !wildcardTest(opts.include, path)) return false;
    if (opts.exclude.length && wildcardTest(opts.exclude, path)) return false;
    return true;
  };

  const sitemapPending = new Set(); // sitemap URLs not yet promoted or crawled

  const enqueue = (url, depth, target = linkQueue) => {
    if (!url || url.length > MAX_URL_LENGTH) return;
    if (queued.has(url)) {
      // A link to a URL that is only waiting in the sitemap queue: crawl it now, as a linked page
      if (target === linkQueue && sitemapPending.delete(url)) linkQueue.push({ url, depth, source: "link" });
      return;
    }
    if (!isInternalUrl(url, rootHost, opts.includeSubdomains) || isBinaryUrl(url)) return;
    if (!allowedByFilters(url)) return;
    const u = new URL(url);
    if (u.search) {
      const key = u.origin + u.pathname;
      const n = (queryVariants.get(key) || 0) + 1;
      if (n > MAX_QUERY_VARIANTS_PER_PATH) return;
      queryVariants.set(key, n);
    }
    queued.add(url);
    if (target === sitemapQueue) sitemapPending.add(url);
    target.push({ url, depth, source: target === sitemapQueue ? "sitemap" : "link" });
  };

  enqueue(startUrl, 0);
  if (opts.useSitemap) for (const u of sitemapUrls) enqueue(u, null, sitemapQueue);

  const progress = () =>
    emit({ t: "progress", crawled, queued: linkQueue.length + sitemapPending.size, discovered: queued.size, inFlight });

  async function processUrl({ url, depth }) {
    const path = pathOf(url);
    const robotsCheck = robotRules.length ? isAllowed(robotRules, path) : { allowed: true, rule: "" };
    const blocked = !robotsCheck.allowed;
    if (blocked && opts.respectRobots) {
      if (blockedRecords++ < MAX_BLOCKED_RECORDS) {
        emit({ t: "page", page: { url, depth, status: null, blockedByRobots: true, robotsRule: robotsCheck.rule, fetched: false } });
      }
      return false;
    }

    if (crawlDelayMs) {
      const wait = lastFetchAt + crawlDelayMs - Date.now();
      lastFetchAt = Date.now() + Math.max(wait, 0);
      if (wait > 0) await sleep(wait);
    }

    crawled++;
    const res = await fetchRaw(url, { userAgent, signal, timeout: 15000, maxBytes: MAX_PAGE_BYTES });
    const page = {
      url,
      depth,
      fetched: true,
      blockedByRobots: blocked,
      robotsRule: blocked ? robotsCheck.rule : "",
      status: res.status,
      error: res.error || "",
      loadTime: res.timeMs,
    };

    if (!res.ok) {
      emit({ t: "page", page });
      return;
    }

    const headers = res.headers;
    page.contentType = String(headers["content-type"] || "");
    page.size = res.size;
    page.transferSize = res.transferSize;
    page.truncated = Boolean(res.truncated);
    page.ttfb = res.ttfb;
    page.encoding = res.encoding;
    page.xRobotsTag = String(headers["x-robots-tag"] || "");
    page.hsts = Boolean(headers["strict-transport-security"]);
    page.cacheControl = String(headers["cache-control"] || "");
    page.server = String(headers.server || "").slice(0, 60);

    if (res.status >= 300 && res.status < 400) {
      const target = headers.location ? normalizeUrl(String(headers.location), url, { stripTracking: opts.stripTracking }) : "";
      page.redirectTo = target;
      page.redirectInternal = target ? isInternalUrl(target, rootHost, opts.includeSubdomains) : false;
      if (target) enqueue(target, depth);
      emit({ t: "page", page });
      return;
    }

    const isHtml = /text\/html|application\/xhtml\+xml/i.test(page.contentType) || (!page.contentType && /<html/i.test(res.body.subarray(0, 1024).toString()));
    page.isHtml = isHtml;
    if (!isHtml) {
      emit({ t: "page", page });
      return;
    }

    const html = decodeText(res.body, page.contentType);
    let data;
    try {
      data = parseHtml(html, url, { rootHost, includeSubdomains: opts.includeSubdomains, stripTracking: opts.stripTracking });
    } catch (err) {
      page.error = `HTML could not be parsed: ${err.message}`;
      emit({ t: "page", page });
      return;
    }
    Object.assign(page, data);

    const robotsDirectives = `${page.robotsMeta} ${page.xRobotsTag}`.toLowerCase();
    const nofollowPage = /\bnofollow\b|\bnone\b/.test(robotsDirectives);
    if (!nofollowPage && res.status < 400) {
      const nextDepth = depth == null ? null : depth + 1;
      for (const link of data.links) {
        if (link.internal) enqueue(link.url, nextDepth);
        else if (externalLinks.size < 5000 && !UNVERIFIABLE_HOSTS.test(new URL(link.url).hostname)) {
          externalLinks.set(link.url, (externalLinks.get(link.url) || 0) + 1);
        }
      }
    }
    for (const img of data.images) if (img.internal) internalImages.add(img.src);

    emit({ t: "page", page });
  }

  emit({ t: "phase", phase: "crawl", message: "Crawling pages", elapsedMs: Date.now() - startedAt });
  let finishReason = "complete";
  let lastProgressAt = 0;

  await new Promise((resolve) => {
    const pump = () => {
      if (stopped()) finishReason = "stopped";
      else if (outOfTime()) finishReason = "time";
      const canStart = finishReason === "complete";
      // Sitemap URLs only fill in once link discovery is exhausted; otherwise they would
      // use up the page budget while the homepage is still loading.
      const nextItem = () => {
        if (linkQueue.length) return linkQueue.shift();
        while (linkInFlight === 0 && sitemapQueue.length) {
          const item = sitemapQueue.shift();
          if (sitemapPending.delete(item.url)) return item; // skip entries already promoted to the link queue
        }
        return null;
      };
      while (canStart && inFlight < concurrency && reserved < opts.maxPages) {
        const item = nextItem();
        if (!item) break;
        const fromLinks = item.source !== "sitemap";
        inFlight++;
        reserved++;
        if (fromLinks) linkInFlight++;
        processUrl(item)
          .then((fetched) => {
            // Robots-blocked URLs are recorded but don't use up the page budget
            if (fetched === false) reserved--;
          })
          .catch((err) => emit({ t: "page", page: { url: item.url, depth: item.depth, fetched: true, status: 0, error: err.message } }))
          .finally(() => {
            inFlight--;
            if (fromLinks) linkInFlight--;
            if (Date.now() - lastProgressAt > 250) {
              lastProgressAt = Date.now();
              progress();
            }
            pump();
          });
      }
      if (inFlight === 0) {
        if (finishReason === "complete" && reserved >= opts.maxPages && (linkQueue.length || sitemapPending.size)) finishReason = "limit";
        resolve();
      }
    };
    pump();
  });
  progress();

  // ── Link & image checks ─────────────────────────────────────────────────────
  if (!stopped() && Date.now() < deadline - 5000 && (opts.checkExternal || opts.checkImages)) {
    emit({ t: "phase", phase: "resources", message: "Checking external links and images", elapsedMs: Date.now() - startedAt });
    const shouldStop = () => stopped() || Date.now() > deadline - 3000;
    if (opts.checkExternal && externalLinks.size) {
      const targets = [...externalLinks.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_EXTERNAL_CHECKS).map(([u]) => u);
      const results = await mapLimit(targets, 16, (u) => checkResource(u, { userAgent, signal, timeout: 6000 }), shouldStop);
      emit({ t: "resources", kind: "external", results, total: externalLinks.size });
    }
    if (opts.checkImages && internalImages.size && !shouldStop()) {
      const targets = [...internalImages].slice(0, MAX_IMAGE_CHECKS);
      const results = await mapLimit(targets, 12, (u) => checkResource(u, { userAgent, signal, timeout: 6000 }), shouldStop);
      emit({ t: "resources", kind: "image", results, total: internalImages.size });
    }
  }

  emit({ t: "done", reason: stopped() ? "stopped" : finishReason, elapsedMs: Date.now() - startedAt, crawled, discovered: queued.size });
}
