import * as cheerio from "cheerio";
import { fetchRaw, maybeGunzip, decodeText } from "./net";
import { normalizeUrl } from "../audit/url";

const MAX_SITEMAP_FILES = 25;
const MAX_SITEMAP_URLS = 10000;

/**
 * Downloads sitemap files (following sitemap indexes) and returns every page
 * URL they list, along with per-file status so broken sitemaps can be reported.
 */
export async function loadSitemaps(candidates, { userAgent, signal, explicit }) {
  const queue = [...new Set(candidates)];
  const seen = new Set();
  const files = [];
  const urls = new Set();

  while (queue.length && files.length < MAX_SITEMAP_FILES && urls.size < MAX_SITEMAP_URLS) {
    if (signal?.aborted) break;
    const sitemapUrl = queue.shift();
    if (seen.has(sitemapUrl)) continue;
    seen.add(sitemapUrl);

    const res = await fetchRaw(sitemapUrl, {
      userAgent,
      signal,
      timeout: 15000,
      maxBytes: 50 * 1024 * 1024,
      accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
    });
    const file = { url: sitemapUrl, status: res.status, urlCount: 0, type: "", error: "" };
    files.push(file);

    if (!res.ok) {
      file.error = res.error;
      continue;
    }
    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      const target = normalizeUrl(res.headers.location, sitemapUrl, { stripTracking: false });
      file.error = `Redirects to ${target}`;
      if (target) queue.unshift(target);
      continue;
    }
    if (res.status !== 200) {
      file.error = `HTTP ${res.status}`;
      continue;
    }

    let xml;
    try {
      xml = decodeText(maybeGunzip(res.body), res.headers["content-type"]);
    } catch {
      file.error = "Could not decompress the sitemap file";
      continue;
    }
    if (!/<(urlset|sitemapindex)[\s>]/i.test(xml)) {
      // Plain-text sitemaps: one URL per line
      const lines = xml.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l));
      if (lines.length && !/<html/i.test(xml)) {
        file.type = "text";
        for (const line of lines) {
          const n = normalizeUrl(line);
          if (n) urls.add(n);
        }
        file.urlCount = lines.length;
      } else {
        file.error = "Not a valid XML sitemap";
      }
      continue;
    }

    const $ = cheerio.load(xml, { xml: true });
    if ($("sitemapindex").length) {
      file.type = "index";
      $("sitemap > loc").each((_, el) => {
        const loc = normalizeUrl($(el).text(), undefined, { stripTracking: false });
        if (loc && !seen.has(loc)) queue.push(loc);
        file.urlCount++;
      });
    } else {
      file.type = "urlset";
      $("url > loc").each((_, el) => {
        if (urls.size >= MAX_SITEMAP_URLS) return false;
        const loc = normalizeUrl($(el).text());
        if (loc) urls.add(loc);
        file.urlCount++;
      });
      if (!file.urlCount) file.error = "Sitemap contains no URLs";
    }
  }

  const found = files.some((f) => f.status === 200 && !f.error);
  return {
    found,
    // Report missing defaults quietly: a 404 on a guessed /sitemap.xml is only an error if robots.txt pointed there
    files: explicit ? files : files.filter((f) => f.status === 200 || f.type),
    urls: [...urls],
    truncated: urls.size >= MAX_SITEMAP_URLS,
  };
}
