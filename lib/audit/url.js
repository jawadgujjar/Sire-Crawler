// URL helpers shared by the crawler (server) and the report builder (browser).
// Only uses the WHATWG URL API so it runs in both environments.

const TRACKING_PARAMS = /^(utm_[a-z]+|gclid|gbraid|wbraid|fbclid|msclkid|dclid|yclid|mc_cid|mc_eid|_ga|_gl|_hsenc|_hsmi|igshid|ref_src)$/i;

export const BINARY_EXT = /\.(zip|rar|7z|tar|gz|tgz|bz2|exe|msi|dmg|pkg|deb|rpm|apk|iso|bin|mp4|m4v|mov|avi|mkv|webm|wmv|flv|mp3|m4a|wav|ogg|flac|aac|pdf|docx?|xlsx?|pptx?|odt|ods|csv|jpe?g|png|gif|webp|avif|bmp|tiff?|svg|ico|heic|woff2?|ttf|otf|eot|css|js|mjs|json|xml|rss|atom|txt|map)$/i;

const SKIP_SCHEMES = /^(javascript|mailto|tel|sms|data|blob|ftp|file|about|chrome|whatsapp|skype|viber|intent|market):/i;

/**
 * Resolve `href` against `base` and canonicalise it so the same page is never
 * queued twice: fragment removed, host lower-cased, default port dropped and
 * (optionally) tracking parameters stripped. Returns "" for anything that is
 * not an http(s) URL.
 */
export function normalizeUrl(href, base, { stripTracking = true } = {}) {
  if (typeof href !== "string") return "";
  const raw = href.trim();
  if (!raw || raw.startsWith("#") || SKIP_SCHEMES.test(raw)) return "";
  let u;
  try {
    u = base ? new URL(raw, base) : new URL(raw);
  } catch {
    return "";
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return "";
  u.hash = "";
  u.username = "";
  u.password = "";
  if (stripTracking && u.search) {
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.test(key)) u.searchParams.delete(key);
    }
    if (![...u.searchParams.keys()].length) u.search = "";
  }
  return u.href;
}

/** Host without a leading "www." — used to treat www and the bare domain as one site. */
export function siteHost(hostname) {
  return String(hostname || "").toLowerCase().replace(/^www\./, "");
}

export function isInternalUrl(url, rootHost, includeSubdomains = false) {
  let host;
  try {
    host = siteHost(new URL(url).hostname);
  } catch {
    return false;
  }
  if (host === rootHost) return true;
  return includeSubdomains && host.endsWith("." + rootHost);
}

export function isBinaryUrl(url) {
  try {
    return BINARY_EXT.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

/** "https://example.com/a/b?x=1" → "/a/b?x=1" (or the full URL when parsing fails). */
export function pathOf(url) {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

export function displayUrl(url) {
  return String(url || "").replace(/^https?:\/\//, "");
}

/** Accepts "example.com", "www.example.com/path", "https://example.com" and returns a full URL, or "". */
export function coerceStartUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
  const normalized = normalizeUrl(withScheme, undefined, { stripTracking: false });
  if (!normalized) return "";
  try {
    const { hostname } = new URL(normalized);
    // Require something that looks like a real host (a dot, or an IPv6 literal)
    if (!hostname.includes(".") && !hostname.startsWith("[")) return "";
  } catch {
    return "";
  }
  return normalized;
}
