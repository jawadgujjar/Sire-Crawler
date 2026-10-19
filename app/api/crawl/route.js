import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

export const maxDuration = 60;

function normalizeUrl(url, base) {
  try {
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("/")) return new URL(url, base).href;
    if (url.startsWith("http")) return url;
    return new URL(url, base).href;
  } catch {
    return "";
  }
}

function auditPage(page) {
  const issues = [];

  // Title checks
  if (!page.title) {
    issues.push({ type: "error", field: "Title", message: "Missing title tag — required for search indexing" });
  } else if (page.title.length > 60) {
    issues.push({ type: "warning", field: "Title", message: `Title is ${page.title.length} characters — Google truncates above 60` });
  } else if (page.title.length < 10) {
    issues.push({ type: "warning", field: "Title", message: `Title is too short (${page.title.length} chars) — aim for 30–60 characters` });
  }

  // Meta description checks
  if (!page.metaDescription) {
    issues.push({ type: "error", field: "Meta Description", message: "Missing meta description — impacts CTR in search results" });
  } else if (page.metaDescription.length > 160) {
    issues.push({ type: "warning", field: "Meta Description", message: `Meta description is ${page.metaDescription.length} chars — Google truncates above 160` });
  } else if (page.metaDescription.length < 50) {
    issues.push({ type: "warning", field: "Meta Description", message: `Meta description is too short (${page.metaDescription.length} chars) — aim for 120–160 characters` });
  }

  // H1 checks
  if (!page.h1 || page.h1.length === 0) {
    issues.push({ type: "error", field: "H1", message: "Missing H1 heading — every page should have exactly one H1" });
  } else if (page.h1.length > 1) {
    issues.push({ type: "warning", field: "H1", message: `${page.h1.length} H1 tags detected — use only one H1 per page` });
  }

  // Image alt text
  if (page.images) {
    const missing = page.images.filter((img) => !img.alt).length;
    if (missing > 0) {
      issues.push({ type: "warning", field: "Images", message: `${missing} image${missing > 1 ? "s" : ""} missing alt text — required for accessibility and image SEO` });
    }
  }

  // Canonical
  if (!page.canonicalUrl) {
    issues.push({ type: "warning", field: "Canonical", message: "No canonical URL defined — may cause duplicate content issues" });
  }

  // Word count
  if (page.wordCount && page.wordCount < 300) {
    issues.push({ type: "info", field: "Content", message: `Low word count (${page.wordCount} words) — thin content may rank poorly` });
  }

  // Slow response
  if (page.responseTime && page.responseTime > 2000) {
    issues.push({ type: "warning", field: "Performance", message: `Slow response time (${page.responseTime}ms) — Google recommends under 200ms TTFB` });
  }

  return issues;
}

export async function POST(req) {
  const { url, maxPages = 20 } = await req.json();

  if (!url) return NextResponse.json({ error: "A valid URL is required to begin crawling." }, { status: 400 });

  let baseUrl;
  try {
    const parsed = new URL(url);
    baseUrl = `${parsed.protocol}//${parsed.host}`;
  } catch {
    return NextResponse.json({ error: "The URL you entered is not valid. Please include https:// and try again." }, { status: 400 });
  }

  const visited = new Set();
  const queue = [url];
  const results = [];
  const limit = Math.min(maxPages, 50);

  while (queue.length > 0 && results.length < limit) {
    const currentUrl = queue.shift();
    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    const start = Date.now();
    try {
      const response = await axios.get(currentUrl, {
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: {
          "User-Agent": "SireCrawler/1.0 (+https://sirecrawler.com/bot)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      const responseTime = Date.now() - start;
      const contentType = String(response.headers["content-type"] || "");
      const html = response.data;
      const size = Buffer.byteLength(typeof html === "string" ? html : JSON.stringify(html), "utf8");

      if (!contentType.includes("text/html")) {
        results.push({
          url: currentUrl, statusCode: response.status,
          title: "", metaDescription: "", h1: [], h2: [],
          wordCount: 0, internalLinks: [], externalLinks: [],
          images: [], canonicalUrl: "", robotsMeta: "",
          responseTime, contentType, size, indexable: false,
          issues: [{ type: "info", field: "Content-Type", message: "Non-HTML resource — skipped SEO analysis" }],
        });
        continue;
      }

      const $ = cheerio.load(html);
      const robotsMeta = $('meta[name="robots"]').attr("content") || "";
      const indexable = !robotsMeta.includes("noindex") && response.status === 200;

      const title = $("title").first().text().trim();
      const metaDescription = $('meta[name="description"]').attr("content")?.trim() || "";
      const h1 = $("h1").map((_, el) => $(el).text().trim()).get();
      const h2 = $("h2").map((_, el) => $(el).text().trim()).get();
      const canonicalUrl = $('link[rel="canonical"]').attr("href") || "";
      const bodyText = $("body").text().replace(/\s+/g, " ").trim();
      const wordCount = bodyText.split(" ").filter(Boolean).length;
      const ogTitle = $('meta[property="og:title"]').attr("content") || "";
      const ogDescription = $('meta[property="og:description"]').attr("content") || "";

      const images = [];
      $("img").each((_, el) => {
        const src = $(el).attr("src") || "";
        const alt = $(el).attr("alt") || "";
        if (src) images.push({ src: normalizeUrl(src, currentUrl), alt });
      });

      const internalLinks = [];
      const externalLinks = [];
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
        const normalized = normalizeUrl(href, currentUrl);
        if (!normalized) return;
        if (normalized.startsWith(baseUrl)) {
          if (!visited.has(normalized) && !queue.includes(normalized)) queue.push(normalized);
          if (!internalLinks.includes(normalized)) internalLinks.push(normalized);
        } else {
          if (!externalLinks.includes(normalized)) externalLinks.push(normalized);
        }
      });

      const pageData = { title, metaDescription, h1, h2, images, canonicalUrl, wordCount, responseTime };

      results.push({
        url: currentUrl, statusCode: response.status,
        title, metaDescription, h1, h2, wordCount,
        internalLinks, externalLinks, images,
        canonicalUrl, robotsMeta, ogTitle, ogDescription,
        responseTime, contentType, size, indexable,
        issues: auditPage(pageData),
      });
    } catch (err) {
      const responseTime = Date.now() - start;
      results.push({
        url: currentUrl, statusCode: 0,
        title: "", metaDescription: "", h1: [], h2: [],
        wordCount: 0, internalLinks: [], externalLinks: [],
        images: [], canonicalUrl: "", robotsMeta: "",
        responseTime, contentType: "", size: 0, indexable: false,
        issues: [{ type: "error", field: "Connection", message: `Failed to fetch page: ${err.message}` }],
      });
    }
  }

  const allIssues = results.flatMap((r) => r.issues);
  const summary = {
    totalPages: results.length,
    indexablePages: results.filter((r) => r.indexable).length,
    brokenPages: results.filter((r) => r.statusCode >= 400 || r.statusCode === 0).length,
    pagesWithIssues: results.filter((r) => r.issues.length > 0).length,
    criticalIssues: allIssues.filter((i) => i.type === "error").length,
    warnings: allIssues.filter((i) => i.type === "warning").length,
    avgResponseTime: results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.responseTime, 0) / results.length)
      : 0,
    totalImages: results.reduce((s, r) => s + r.images.length, 0),
    totalInternalLinks: results.reduce((s, r) => s + r.internalLinks.length, 0),
    totalExternalLinks: results.reduce((s, r) => s + r.externalLinks.length, 0),
    missingTitles: results.filter((r) => !r.title).length,
    missingDescriptions: results.filter((r) => !r.metaDescription).length,
    slowPages: results.filter((r) => r.responseTime > 2000).length,
  };

  return NextResponse.json({ results, summary });
}
