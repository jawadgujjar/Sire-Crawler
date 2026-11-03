// Turns raw crawl data into an audit report: issues, health score, thematic
// scores and statistics. Pure and environment-agnostic (runs in the browser).

import { CHECKS, CHECK_BY_ID, CATEGORIES, SEVERITIES, THRESHOLDS as T } from "./checks";

const HREFLANG_RE = /^(x-default|[a-z]{2,3}(-[a-z]{4})?(-([a-z]{2}|\d{3}))?)$/i;
const DEAD_LINK_CODES = new Set(["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "EBLOCKED"]);
const PAGE_PENALTY = { error: 15, warning: 5, notice: 0 };
const SITE_PENALTY = { error: 8, warning: 3, notice: 0 };

export function scoreLabel(score) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 60) return "Needs work";
  return "Poor";
}

function isDeadResource(r) {
  if (!r) return false;
  if (r.status === 404 || r.status === 410 || r.status >= 500) return true;
  return r.status === 0 && DEAD_LINK_CODES.has(r.errorCode);
}

function pageGroup(p) {
  if (!p.fetched) return "blocked";
  if (!p.status) return "broken";
  if (p.status >= 400) return "broken";
  if (p.status >= 300) return "redirect";
  return p.counts.error || p.counts.warning ? "issues" : "healthy";
}

/**
 * @param {object} input
 * @param {object} input.site     site-level data from the "site" stream event
 * @param {object[]} input.pages  raw page records
 * @param {object} input.resources { external: [], image: [] } liveness results
 * @param {object} input.meta     { startUrl, startedAt, finishedAt, reason, options, ... }
 */
export function buildReport({ site, pages: rawPages, resources = {}, meta }) {
  const site_ = site || {};
  const pages = rawPages.map((p) => ({
    ...p,
    issues: [],
    counts: { error: 0, warning: 0, notice: 0 },
    inlinks: 0,
    inlinkSources: [],
    depth: null,
  }));
  const byUrl = new Map(pages.map((p) => [p.url, p]));
  const startUrl = meta.startUrl;

  const addIssue = (page, id, detail = "", extra) => {
    const check = CHECK_BY_ID[id];
    page.issues.push({ id, severity: check.severity, detail, ...(extra || {}) });
    page.counts[check.severity]++;
  };

  const isHtmlOk = (p) => p.fetched && p.status >= 200 && p.status < 300 && p.isHtml;

  // ── Redirect resolution ─────────────────────────────────────────────────────
  const resolveRedirect = (url) => {
    const chain = [url];
    let current = byUrl.get(url);
    while (current && current.status >= 300 && current.status < 400 && current.redirectTo) {
      if (chain.includes(current.redirectTo)) return { final: current.redirectTo, chain: [...chain, current.redirectTo], loop: true };
      chain.push(current.redirectTo);
      if (chain.length > 12) return { final: current.redirectTo, chain, loop: true };
      current = byUrl.get(current.redirectTo);
    }
    return { final: chain[chain.length - 1], chain, loop: false };
  };

  /** Status of a link target: number, 0 for unreachable, null if not crawled. */
  const linkTargetState = (url) => {
    const p = byUrl.get(url);
    if (!p || !p.fetched) return { status: null };
    if (p.status >= 300 && p.status < 400) {
      const r = resolveRedirect(url);
      if (r.loop) return { status: p.status, broken: true, reason: "Redirect loop" };
      const final = byUrl.get(r.final);
      if (final && final.fetched && (final.status === 0 || final.status >= 400)) {
        return { status: final.status, broken: true, reason: `Redirects to a ${final.status || "failed"} page` };
      }
      return { status: p.status };
    }
    return { status: p.status, broken: p.status === 0 || p.status >= 400 };
  };

  // ── Link graph: incoming links and click depth ──────────────────────────────
  const adjacency = new Map();
  for (const p of pages) {
    if (isHtmlOk(p) && p.links) {
      const targets = [];
      for (const link of p.links) {
        if (!link.internal) continue;
        targets.push(link.url);
        const target = byUrl.get(link.url);
        if (target && target.url !== p.url) {
          target.inlinks++;
          if (target.inlinkSources.length < 100) target.inlinkSources.push({ url: p.url, anchor: link.anchor, nofollow: link.nofollow });
        }
      }
      adjacency.set(p.url, targets);
    } else if (p.redirectTo) {
      adjacency.set(p.url, [p.redirectTo]);
    }
  }
  if (byUrl.has(startUrl)) {
    byUrl.get(startUrl).depth = 0;
    const queue = [startUrl];
    while (queue.length) {
      const url = queue.shift();
      const d = byUrl.get(url).depth;
      for (const next of adjacency.get(url) || []) {
        const np = byUrl.get(next);
        if (np && np.depth === null) {
          np.depth = d + 1;
          queue.push(next);
        }
      }
    }
  }

  // ── Indexability ────────────────────────────────────────────────────────────
  for (const p of pages) {
    const directives = `${p.robotsMeta || ""} ${p.xRobotsTag || ""}`.toLowerCase();
    p.noindex = /\bnoindex\b|\bnone\b/.test(directives);
    p.canonical = p.canonicals?.[0] || "";
    p.canonicalized = Boolean(p.canonical && p.canonical !== p.url);
    if (!p.fetched) p.indexability = "Blocked by robots.txt";
    else if (!p.status) p.indexability = "Unreachable";
    else if (p.status >= 300 && p.status < 400) p.indexability = "Redirect";
    else if (p.status >= 400) p.indexability = `HTTP ${p.status}`;
    else if (!p.isHtml) p.indexability = "Non-HTML";
    else if (p.noindex) p.indexability = "Noindex";
    else if (p.canonicalized) p.indexability = "Canonicalized";
    else if (p.blockedByRobots) p.indexability = "Blocked by robots.txt";
    else p.indexability = "Indexable";
    p.indexable = p.indexability === "Indexable";
  }

  const externalResults = new Map((resources.external || []).map((r) => [r.url, r]));
  const imageResults = new Map((resources.image || []).map((r) => [r.url, r]));
  const sitemapSet = new Set(site_.sitemapUrls || []);

  // ── Per-page checks ─────────────────────────────────────────────────────────
  for (const p of pages) {
    if (!p.fetched) {
      addIssue(p, "blocked_by_robots", p.robotsRule ? `Disallow: ${p.robotsRule}` : "");
      continue;
    }
    if (p.blockedByRobots) addIssue(p, "blocked_by_robots", p.robotsRule ? `Disallow: ${p.robotsRule} (crawled because robots.txt was ignored)` : "");

    if (!p.status) addIssue(p, "unreachable", p.error || "No response");
    else if (p.status >= 500) addIssue(p, "http_5xx", `HTTP ${p.status}`);
    else if (p.status >= 400) addIssue(p, "http_4xx", `HTTP ${p.status}`);

    if (p.status >= 300 && p.status < 400) {
      if ([302, 303, 307].includes(p.status)) addIssue(p, "temporary_redirect", `${p.status} → ${p.redirectTo || "(no Location header)"}`);
      const r = resolveRedirect(p.url);
      p.redirectChain = r.chain;
      if (r.loop) addIssue(p, "redirect_loop", `Loop: ${r.chain.join(" → ")}`);
      else if (r.chain.length > 2) addIssue(p, "redirect_loop", `${r.chain.length - 1} hops: ${r.chain.join(" → ")}`);
    }

    // URL-shape checks apply to every fetched internal URL
    try {
      const u = new URL(p.url);
      if (p.url.length > T.urlMaxLength) addIssue(p, "long_url", `${p.url.length} characters`);
      if (u.pathname.includes("_")) addIssue(p, "url_underscores");
      const paramCount = [...u.searchParams.keys()].length;
      if (paramCount > T.manyParams) addIssue(p, "many_params", `${paramCount} parameters`);
    } catch {}

    if (!isHtmlOk(p)) continue;

    // On-page content
    if (!p.title) addIssue(p, "missing_title");
    else if (p.title.length > T.titleMax) addIssue(p, "title_too_long", `${p.title.length} characters`);
    else if (p.title.length < T.titleMin) addIssue(p, "title_too_short", `${p.title.length} characters`);

    if (!p.hasMetaDescription) addIssue(p, "missing_description");
    else if (p.metaDescription.length > T.descriptionMax || p.metaDescription.length < T.descriptionMin) {
      addIssue(p, "description_length", `${p.metaDescription.length} characters`);
    }

    if (!p.h1?.length) addIssue(p, "missing_h1");
    else if (p.h1.length > 1) addIssue(p, "multiple_h1", `${p.h1.length} H1 tags`);

    if (!p.noindex && p.wordCount < T.lowWordCount) addIssue(p, "low_word_count", `${p.wordCount} words`);
    if (p.textRatio < T.lowTextRatio) addIssue(p, "low_text_ratio", `${p.textRatio}% text`);

    const missingAlt = (p.images || []).filter((i) => i.alt === null);
    if (missingAlt.length) addIssue(p, "missing_alt", `${missingAlt.length} image${missingAlt.length === 1 ? "" : "s"}`, { list: missingAlt.slice(0, 20).map((i) => i.src) });
    if (!p.hasDoctype) addIssue(p, "missing_doctype");
    if (!p.viewport) addIssue(p, "missing_viewport");
    if (!p.lang) addIssue(p, "missing_lang");

    // Crawlability
    if (p.noindex) addIssue(p, "noindex", p.robotsMeta || p.xRobotsTag);
    if (p.canonicalTagCount > 1) addIssue(p, "multiple_canonical", `${p.canonicalTagCount} canonical tags`);
    if (!p.canonicalTagCount) addIssue(p, "missing_canonical");
    else if (p.canonicalized) {
      addIssue(p, "canonicalized", `→ ${p.canonical}`);
      const state = linkTargetState(p.canonical);
      if (state.broken) addIssue(p, "broken_canonical", `${p.canonical} returns ${state.status || "an error"}`);
    }

    // HTTPS
    if (p.url.startsWith("http:")) {
      addIssue(p, "http_pages");
      if (p.hasPasswordField) addIssue(p, "insecure_password");
    }
    if (p.mixedContent?.length) addIssue(p, "mixed_content", `${p.mixedContent.length} insecure resource${p.mixedContent.length === 1 ? "" : "s"}`, { list: p.mixedContent.slice(0, 20) });

    // Performance
    if (p.size > T.largeHtmlBytes) addIssue(p, "large_html", p.truncated ? "Over 5 MB — download stopped at the limit" : `${(p.size / 1024 / 1024).toFixed(2)} MB`);
    if (p.loadTime > T.slowLoadMs) addIssue(p, "slow_page", `${(p.loadTime / 1000).toFixed(2)}s`);
    if (!p.encoding && p.size > 1024) addIssue(p, "uncompressed", `${Math.round(p.size / 1024)} KB uncompressed`);
    if (p.scriptCount + p.stylesheetCount > T.manyResources) addIssue(p, "many_resources", `${p.scriptCount} JS + ${p.stylesheetCount} CSS files`);
    if (p.renderBlocking > 0) addIssue(p, "render_blocking", `${p.renderBlocking} blocking resource${p.renderBlocking === 1 ? "" : "s"}`);

    // Links
    const brokenLinks = [];
    const nofollowInternal = [];
    const brokenExternal = [];
    for (const link of p.links || []) {
      if (link.internal) {
        const state = linkTargetState(link.url);
        if (state.broken) brokenLinks.push(`${link.url} (${state.reason || state.status || "unreachable"})`);
        if (link.nofollow) nofollowInternal.push(link.url);
      } else if (isDeadResource(externalResults.get(link.url))) {
        const r = externalResults.get(link.url);
        brokenExternal.push(`${link.url} (${r.status || r.error})`);
      }
    }
    if (brokenLinks.length) addIssue(p, "broken_internal_links", `${brokenLinks.length} broken link${brokenLinks.length === 1 ? "" : "s"}`, { list: brokenLinks.slice(0, 25) });
    if (brokenExternal.length) addIssue(p, "broken_external_links", `${brokenExternal.length} broken link${brokenExternal.length === 1 ? "" : "s"}`, { list: brokenExternal.slice(0, 25) });
    if (nofollowInternal.length) addIssue(p, "nofollow_internal", `${nofollowInternal.length} link${nofollowInternal.length === 1 ? "" : "s"}`, { list: nofollowInternal.slice(0, 25) });
    if (p.totalLinks > T.tooManyLinks) addIssue(p, "too_many_links", `${p.totalLinks} links`);

    const brokenImages = (p.images || []).filter((i) => i.internal && isDeadResource(imageResults.get(i.src))).map((i) => `${i.src} (${imageResults.get(i.src).status || imageResults.get(i.src).error})`);
    if (brokenImages.length) addIssue(p, "broken_internal_images", `${brokenImages.length} image${brokenImages.length === 1 ? "" : "s"}`, { list: brokenImages.slice(0, 25) });

    // Markup
    if (p.invalidJsonLd) addIssue(p, "invalid_structured_data", `${p.invalidJsonLd} invalid block${p.invalidJsonLd === 1 ? "" : "s"}`);
    if (!p.schemaTypes?.length) addIssue(p, "no_structured_data");
    if (!p.ogTitle || !p.ogDescription || !p.ogImage) {
      const missing = [!p.ogTitle && "og:title", !p.ogDescription && "og:description", !p.ogImage && "og:image"].filter(Boolean);
      addIssue(p, "missing_og", `Missing ${missing.join(", ")}`);
    }

    // International
    if (p.hreflang?.length) {
      const problems = [];
      const invalid = p.hreflang.filter((h) => !HREFLANG_RE.test(h.lang));
      if (invalid.length) problems.push(`Invalid codes: ${invalid.map((h) => h.lang || "(empty)").join(", ")}`);
      if (!p.hreflang.some((h) => h.href === p.url)) problems.push("No self-referencing hreflang");
      const broken = p.hreflang.filter((h) => linkTargetState(h.href).broken);
      if (broken.length) problems.push(`${broken.length} alternate${broken.length === 1 ? "" : "s"} return errors`);
      if (problems.length) addIssue(p, "hreflang_issues", problems.join(" · "));
    }

    // Linking structure
    if (p.depth !== null && p.depth > T.maxDepth) addIssue(p, "deep_pages", `${p.depth} clicks from the homepage`);
    if (p.url !== startUrl && p.indexable && p.inlinks === 1) addIssue(p, "single_inlink");
    if (p.url !== startUrl && sitemapSet.has(p.url) && p.inlinks === 0) addIssue(p, "orphan_pages", "Listed in sitemap, no internal links");
  }

  // ── Duplicate detection (indexable pages only) ──────────────────────────────
  const duplicateCheck = (id, keyOf, label) => {
    const groups = new Map();
    for (const p of pages) {
      if (!p.indexable) continue;
      const key = keyOf(p);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      for (const p of group) {
        const others = group.filter((o) => o !== p).map((o) => o.url);
        addIssue(p, id, `${label} as ${others.length} other page${others.length === 1 ? "" : "s"}`, { list: others.slice(0, 20) });
      }
    }
  };
  duplicateCheck("duplicate_title", (p) => p.title?.toLowerCase(), "Same title");
  duplicateCheck("duplicate_description", (p) => (p.hasMetaDescription ? p.metaDescription.toLowerCase() : ""), "Same description");
  duplicateCheck("duplicate_content", (p) => p.contentHash, "Same content");

  // ── Sitemap correctness ─────────────────────────────────────────────────────
  for (const p of pages) {
    if (!sitemapSet.has(p.url) || !p.fetched) continue;
    let reason = "";
    if (!p.status) reason = "Unreachable";
    else if (p.status >= 400) reason = `HTTP ${p.status}`;
    else if (p.status >= 300) reason = `Redirects (${p.status})`;
    else if (p.noindex) reason = "Noindex page";
    else if (p.canonicalized) reason = "Canonicalized to another URL";
    if (reason) addIssue(p, "sitemap_bad_urls", reason);
  }

  // ── Site-level checks ───────────────────────────────────────────────────────
  const siteIssues = [];
  const addSiteIssue = (id, detail) => siteIssues.push({ id, severity: CHECK_BY_ID[id].severity, detail });
  const isHttpsSite = startUrl.startsWith("https:");
  const cert = site_.certificate;
  if (isHttpsSite && cert) {
    if (cert.error) addSiteIssue("ssl_invalid", cert.error);
    else if (!cert.authorized) addSiteIssue("ssl_invalid", `Certificate not trusted: ${cert.authError || "unknown reason"}`);
    else if (cert.daysLeft < T.sslWarnDays) addSiteIssue("ssl_invalid", cert.daysLeft < 0 ? "Certificate has expired" : `Certificate expires in ${cert.daysLeft} days`);
  }
  if (isHttpsSite && site_.httpRedirect && site_.httpRedirect.status >= 200 && site_.httpRedirect.status < 300) {
    addSiteIssue("no_http_redirect", `http://${new URL(startUrl).host}/ returns ${site_.httpRedirect.status}`);
  }
  if (site_.hostVariant && !site_.hostVariant.consolidated) {
    addSiteIssue("host_not_consolidated", `${site_.hostVariant.host} returns ${site_.hostVariant.status}${site_.hostVariant.redirectsTo ? ` → ${site_.hostVariant.redirectsTo}` : " without redirecting"}`);
  }
  if (site_.robots && !site_.robots.found) addSiteIssue("no_robots_txt", site_.robots.status ? `/robots.txt returns ${site_.robots.status}` : site_.robots.error);
  if (site_.sitemap && !site_.sitemap.found) addSiteIssue("no_sitemap", site_.sitemap.files?.find((f) => f.error)?.error || "No sitemap at /sitemap.xml or in robots.txt");
  if (site_.sitemap?.found && site_.robots?.found && !site_.sitemap.declaredInRobots) addSiteIssue("sitemap_not_in_robots");
  if (isHttpsSite) {
    const home = byUrl.get(resolveRedirect(startUrl).final) || byUrl.get(startUrl);
    if (home && home.fetched && home.status && home.status < 400 && home.url.startsWith("https:") && !home.hsts) addSiteIssue("no_hsts");
  }

  // ── Aggregation ─────────────────────────────────────────────────────────────
  const issueMap = new Map();
  for (const p of pages) {
    for (const issue of p.issues) {
      if (!issueMap.has(issue.id)) issueMap.set(issue.id, []);
      issueMap.get(issue.id).push({ url: p.url, detail: issue.detail, list: issue.list });
    }
  }
  for (const s of siteIssues) issueMap.set(s.id, [{ url: startUrl, detail: s.detail || "", site: true }]);

  const issues = CHECKS.filter((c) => issueMap.has(c.id))
    .map((c) => ({ id: c.id, severity: c.severity, category: c.category, count: issueMap.get(c.id).length, items: issueMap.get(c.id), site: Boolean(c.site) }))
    .sort((a, b) => SEVERITIES[a.severity].order - SEVERITIES[b.severity].order || b.count - a.count);
  const passed = CHECKS.filter((c) => !issueMap.has(c.id)).map((c) => c.id);

  const counts = { error: 0, warning: 0, notice: 0 };
  for (const i of issues) counts[i.severity] += i.count;

  for (const p of pages) p.group = pageGroup(p);
  const fetchedPages = pages.filter((p) => p.fetched);

  // Health score: average page score minus site-wide penalties
  const pageScore = (p, filter) => {
    let s = 100;
    for (const i of p.issues) if (!filter || filter(i)) s -= PAGE_PENALTY[i.severity];
    return Math.max(0, s);
  };
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 100);
  const sitePenalty = (filter) => siteIssues.filter((i) => !filter || filter(i)).reduce((s, i) => s + SITE_PENALTY[i.severity], 0);
  const score = fetchedPages.length
    ? Math.max(0, Math.min(100, Math.round(avg(fetchedPages.map((p) => pageScore(p))) - sitePenalty())))
    : 0;

  const categories = Object.entries(CATEGORIES).map(([id, cat]) => {
    const inCat = (i) => CHECK_BY_ID[i.id].category === id;
    const catIssues = issues.filter((i) => i.category === id);
    const catScore = fetchedPages.length
      ? Math.max(0, Math.min(100, Math.round(avg(fetchedPages.map((p) => pageScore(p, inCat))) - sitePenalty(inCat) * 2)))
      : 0;
    return {
      id,
      ...cat,
      score: catScore,
      error: catIssues.filter((i) => i.severity === "error").reduce((s, i) => s + i.count, 0),
      warning: catIssues.filter((i) => i.severity === "warning").reduce((s, i) => s + i.count, 0),
      notice: catIssues.filter((i) => i.severity === "notice").reduce((s, i) => s + i.count, 0),
      checks: CHECKS.filter((c) => c.category === id).length,
    };
  });

  const pageGroups = { healthy: 0, issues: 0, broken: 0, redirect: 0, blocked: 0 };
  for (const p of pages) pageGroups[p.group]++;

  return {
    version: 2,
    startUrl,
    rootHost: site_.rootHost || new URL(startUrl).hostname,
    startedAt: meta.startedAt,
    finishedAt: meta.finishedAt,
    durationMs: meta.durationMs,
    reason: meta.reason,
    options: meta.options,
    discovered: meta.discovered || 0,
    site: { ...site_, sitemapUrls: undefined },
    sitemapUrlCount: sitemapSet.size,
    score,
    scoreLabel: scoreLabel(score),
    counts,
    issues,
    passed,
    siteIssues,
    categories,
    pageGroups,
    pages,
    resources: {
      externalChecked: (resources.external || []).length,
      externalTotal: resources.externalTotal || 0,
      imageChecked: (resources.image || []).length,
      imageTotal: resources.imageTotal || 0,
    },
    stats: buildStats(pages),
  };
}

function bucket(values, edges, labels) {
  const out = labels.map((label) => ({ label, value: 0 }));
  for (const v of values) {
    let idx = edges.findIndex((e) => v < e);
    if (idx === -1) idx = labels.length - 1;
    out[idx].value++;
  }
  return out;
}

function buildStats(pages) {
  const fetched = pages.filter((p) => p.fetched);
  const html = fetched.filter((p) => p.isHtml && p.status >= 200 && p.status < 300);

  const status = [
    { label: "2XX", value: fetched.filter((p) => p.status >= 200 && p.status < 300).length },
    { label: "3XX", value: fetched.filter((p) => p.status >= 300 && p.status < 400).length },
    { label: "4XX", value: fetched.filter((p) => p.status >= 400 && p.status < 500).length },
    { label: "5XX", value: fetched.filter((p) => p.status >= 500).length },
    { label: "Failed", value: fetched.filter((p) => !p.status).length },
  ];

  const depthCounts = new Map();
  for (const p of fetched) {
    const key = p.depth === null ? "Not linked" : p.depth >= 5 ? "5+" : String(p.depth);
    depthCounts.set(key, (depthCounts.get(key) || 0) + 1);
  }
  const depth = ["0", "1", "2", "3", "4", "5+", "Not linked"].map((label) => ({ label: label === "0" ? "Home" : label, value: depthCounts.get(label) || 0 }));

  const load = bucket(fetched.filter((p) => p.status).map((p) => p.loadTime), [500, 1000, 1500, 3000, Infinity], ["< 0.5s", "0.5–1s", "1–1.5s", "1.5–3s", "> 3s"]);
  const words = bucket(html.map((p) => p.wordCount), [200, 500, 1000, 2000, Infinity], ["< 200", "200–500", "500–1K", "1K–2K", "2K+"]);
  const inlinks = bucket(html.map((p) => p.inlinks), [1, 2, 6, 16, 51, Infinity], ["0", "1", "2–5", "6–15", "16–50", "51+"]);
  const sizes = bucket(html.map((p) => p.size / 1024), [50, 100, 250, 500, Infinity], ["< 50 KB", "50–100 KB", "100–250 KB", "250–500 KB", "> 500 KB"]);

  const indexabilityCounts = new Map();
  for (const p of pages) indexabilityCounts.set(p.indexability, (indexabilityCounts.get(p.indexability) || 0) + 1);
  const indexability = [...indexabilityCounts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  const schemaCounts = new Map();
  for (const p of html) for (const t of p.schemaTypes || []) schemaCounts.set(t, (schemaCounts.get(t) || 0) + 1);
  const schemaTypes = [...schemaCounts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 10);

  const markup = [
    { label: "Structured data", value: html.filter((p) => p.schemaTypes?.length).length },
    { label: "Open Graph", value: html.filter((p) => p.ogTitle && p.ogDescription).length },
    { label: "Twitter card", value: html.filter((p) => p.twitterCard).length },
    { label: "Hreflang", value: html.filter((p) => p.hreflang?.length).length },
  ];

  const totals = {
    htmlPages: html.length,
    avgLoad: html.length ? Math.round(html.reduce((s, p) => s + p.loadTime, 0) / html.length) : 0,
    avgSize: html.length ? Math.round(html.reduce((s, p) => s + p.size, 0) / html.length) : 0,
    avgWords: html.length ? Math.round(html.reduce((s, p) => s + p.wordCount, 0) / html.length) : 0,
    internalLinks: html.reduce((s, p) => s + (p.links || []).filter((l) => l.internal).length, 0),
    externalLinks: html.reduce((s, p) => s + (p.links || []).filter((l) => !l.internal).length, 0),
    images: html.reduce((s, p) => s + (p.images?.length || 0), 0),
    https: fetched.filter((p) => p.url.startsWith("https:")).length,
    compressed: html.filter((p) => p.encoding).length,
  };

  return { status, depth, load, words, inlinks, sizes, indexability, schemaTypes, markup, totals };
}

export { CHECKS, CHECK_BY_ID, CATEGORIES, SEVERITIES };
