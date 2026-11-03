import * as cheerio from "cheerio";
import { normalizeUrl, isInternalUrl } from "../audit/url";

const MAX_LINKS_PER_PAGE = 1500;
const MAX_IMAGES_PER_PAGE = 300;

function clean(text, max = 300) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

/** 32-bit FNV-1a, enough to group pages whose visible text is identical. */
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36) + ":" + text.length;
}

function collectSchemaTypes(node, out) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach((n) => collectSchemaTypes(n, out));
  const type = node["@type"];
  if (typeof type === "string") out.add(type);
  else if (Array.isArray(type)) type.forEach((t) => typeof t === "string" && out.add(t));
  if (node["@graph"]) collectSchemaTypes(node["@graph"], out);
}

/**
 * Extracts everything the audit needs from one HTML document. `html` is the
 * decoded body; `url` the final URL it was served from.
 */
export function parseHtml(html, url, { rootHost, includeSubdomains, stripTracking }) {
  const $ = cheerio.load(html);
  const isHttps = url.startsWith("https:");
  const baseHref = $("base[href]").attr("href");
  const base = (baseHref && normalizeUrl(baseHref, url, { stripTracking: false })) || url;
  const resolve = (href) => normalizeUrl(href, base, { stripTracking });
  const meta = (name) => {
    const el = $("meta").filter((_, m) => String($(m).attr("name") || "").toLowerCase() === name).first();
    return el.length ? String(el.attr("content") ?? "") : null;
  };
  const prop = (name) => {
    const el = $("meta").filter((_, m) => String($(m).attr("property") || "").toLowerCase() === name).first();
    return el.length ? String(el.attr("content") ?? "") : "";
  };

  const head = html.slice(0, 2000).replace(/^﻿/, "");
  const hasDoctype = /^\s*(<!--[\s\S]*?-->\s*)*<!doctype\s+html/i.test(head);

  const titles = $("title").filter((_, el) => $(el).parents("svg").length === 0);
  const title = clean(titles.first().text(), 500);
  const metaDescription = meta("description");
  const robotsMeta = [meta("robots"), meta("googlebot")].filter(Boolean).join(", ");

  const relHas = (el, token) => String($(el).attr("rel") || "").toLowerCase().split(/\s+/).includes(token);
  const canonicals = $("link[rel]").filter((_, el) => relHas(el, "canonical")).map((_, el) => resolve($(el).attr("href") || "")).get();

  const hreflang = $("link[rel][hreflang]")
    .filter((_, el) => relHas(el, "alternate"))
    .map((_, el) => ({ lang: String($(el).attr("hreflang") || "").trim(), href: resolve($(el).attr("href") || "") }))
    .get()
    .slice(0, 100);

  // Structured data
  const schemaTypes = new Set();
  let invalidJsonLd = 0;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      collectSchemaTypes(JSON.parse($(el).contents().text()), schemaTypes);
    } catch {
      invalidJsonLd++;
    }
  });
  $("[itemtype]").each((_, el) => {
    const t = String($(el).attr("itemtype") || "").split(/[/#]/).filter(Boolean).pop();
    if (t) schemaTypes.add(t);
  });

  // Resources
  const headScripts = $("head script[src]");
  const renderBlocking =
    headScripts.filter((_, el) => $(el).attr("async") === undefined && $(el).attr("defer") === undefined && $(el).attr("type") !== "module").length +
    $('head link[rel="stylesheet"]').filter((_, el) => !$(el).attr("media") || /^(all|screen)$/i.test($(el).attr("media"))).length;
  const scriptCount = $("script[src]").length;
  const stylesheetCount = $('link[rel="stylesheet"]').length;

  const mixedContent = [];
  if (isHttps) {
    $("img[src], script[src], iframe[src], video[src], audio[src], source[src], embed[src], link[rel=stylesheet][href]").each((_, el) => {
      const ref = $(el).attr("src") || $(el).attr("href") || "";
      if (/^http:\/\//i.test(ref.trim()) && mixedContent.length < 50) mixedContent.push(ref.trim());
    });
  }

  // Images
  const images = [];
  const seenImages = new Set();
  $("img").each((_, el) => {
    if (images.length >= MAX_IMAGES_PER_PAGE) return false;
    const $el = $(el);
    const src = $el.attr("src") || $el.attr("data-src") || $el.attr("data-lazy-src") || "";
    const abs = resolve(src);
    if (!abs || seenImages.has(abs)) return;
    seenImages.add(abs);
    const alt = $el.attr("alt");
    images.push({
      src: abs,
      alt: alt === undefined ? null : clean(alt, 200),
      internal: isInternalUrl(abs, rootHost, includeSubdomains),
    });
  });

  // Links
  const links = [];
  const linkIndex = new Map();
  let totalLinks = 0;
  $("a[href]").each((_, el) => {
    totalLinks++;
    if (links.length >= MAX_LINKS_PER_PAGE) return;
    const $el = $(el);
    const abs = resolve($el.attr("href") || "");
    if (!abs || abs === url) return;
    const nofollow = String($el.attr("rel") || "").toLowerCase().split(/\s+/).some((r) => r === "nofollow" || r === "ugc" || r === "sponsored");
    const anchor = clean($el.text(), 120) || clean($el.find("img").attr("alt"), 120) || clean($el.attr("aria-label") || $el.attr("title"), 120);
    const existing = linkIndex.get(abs);
    if (existing) {
      // A followed copy of the same link makes it followed
      if (!nofollow) existing.nofollow = false;
      if (!existing.anchor && anchor) existing.anchor = anchor;
      return;
    }
    const link = { url: abs, anchor, nofollow, internal: isInternalUrl(abs, rootHost, includeSubdomains) };
    linkIndex.set(abs, link);
    links.push(link);
  });

  const h1 = $("h1").map((_, el) => clean($(el).text(), 200)).get().filter(Boolean);
  const h2 = $("h2").map((_, el) => clean($(el).text(), 200)).get().filter(Boolean);
  const h3Count = $("h3").length;
  const hasPasswordField = $('input[type="password"]').length > 0;
  const viewport = meta("viewport") !== null;
  const ogTitle = clean(prop("og:title"), 300);
  const ogDescription = clean(prop("og:description"), 300);
  const ogImage = prop("og:image") ? resolve(prop("og:image")) : "";
  const twitterCard = clean(meta("twitter:card") || "", 40);
  const imageCount = $("img").length;
  const metaDescriptionCount = $("meta").filter((_, m) => String($(m).attr("name") || "").toLowerCase() === "description").length;
  const iframeCount = $("iframe").length;

  // Visible text (after everything that needs scripts/templates has been read)
  $("script, style, noscript, template, svg, head").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = text ? text.split(" ").filter((w) => /[\p{L}\p{N}]/u.test(w)).length : 0;
  const textRatio = html.length ? Math.round((text.length / html.length) * 1000) / 10 : 0;

  return {
    hasDoctype,
    lang: clean($("html").attr("lang") || "", 20),
    title,
    titleCount: titles.length,
    metaDescription: metaDescription === null ? "" : clean(metaDescription, 500),
    hasMetaDescription: metaDescription !== null && metaDescription.trim() !== "",
    metaDescriptionCount,
    robotsMeta: clean(robotsMeta, 200),
    viewport,
    canonicals: canonicals.filter(Boolean),
    canonicalTagCount: canonicals.length,
    hreflang,
    ogTitle,
    ogDescription,
    ogImage,
    twitterCard,
    schemaTypes: [...schemaTypes].slice(0, 30),
    invalidJsonLd,
    h1,
    h2: h2.slice(0, 50),
    h2Count: h2.length,
    h3Count,
    wordCount,
    textRatio,
    contentHash: wordCount >= 50 ? hash(text.toLowerCase()) : "",
    links,
    totalLinks,
    images,
    imageCount,
    scriptCount,
    stylesheetCount,
    renderBlocking,
    mixedContent,
    hasPasswordField,
    iframeCount,
  };
}
