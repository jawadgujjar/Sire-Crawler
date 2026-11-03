import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import net from "node:net";
import tls from "node:tls";
import zlib from "node:zlib";
import axios from "axios";

// Opt-in escape hatch for local development (crawling a site on localhost / LAN).
// Never enable this on a public deployment.
const ALLOW_PRIVATE = process.env.CRAWLER_ALLOW_PRIVATE_NETWORKS === "true";

const MAX_DECOMPRESSED_BYTES = 20 * 1024 * 1024;

export const USER_AGENTS = {
  desktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 SireCrawler/2.0 (+https://sirecrawler.com/bot)",
  mobile: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 SireCrawler/2.0 (+https://sirecrawler.com/bot)",
};

// ─── SSRF protection ──────────────────────────────────────────────────────────

function ipv4ToInt(ip) {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

const PRIVATE_V4 = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
].map(([base, bits]) => [ipv4ToInt(base), bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0]);

/** True for loopback, private, link-local, CGNAT, multicast, reserved and documentation ranges. */
export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const n = ipv4ToInt(ip);
    return PRIVATE_V4.some(([base, mask]) => ((n & mask) >>> 0) === base);
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    const mapped = lower.match(/^(?:0*:)*:?ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    if (lower === "::" || lower === "::1") return true;
    const first = parseInt(lower.split(":")[0] || "0", 16);
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
    if ((first & 0xff00) === 0xff00) return true; // ff00::/8 multicast
    if (lower.startsWith("64:ff9b:") || lower.startsWith("2001:db8:") || lower.startsWith("100::")) return true;
    return false;
  }
  return true;
}

export class BlockedHostError extends Error {
  constructor(host) {
    super(`Blocked: ${host} resolves to a private or reserved network address`);
    this.code = "EBLOCKED";
  }
}

// Every socket goes through this lookup, so redirects and DNS rebinding can't
// reach internal addresses either — the check happens at connect time.
function safeLookup(hostname, options, callback) {
  const opts = typeof options === "number" ? { family: options } : { ...(options || {}) };
  dns.lookup(hostname, { ...opts, all: true }, (err, addresses) => {
    if (err) return callback(err);
    if (!ALLOW_PRIVATE && addresses.some((a) => isPrivateIp(a.address))) {
      return callback(new BlockedHostError(hostname));
    }
    if (opts.all) return callback(null, addresses);
    const first = addresses[0];
    return callback(null, first.address, first.family);
  });
}

const agentOptions = { keepAlive: true, maxSockets: 24, lookup: safeLookup };
const httpAgent = new http.Agent(agentOptions);
const httpsAgent = new https.Agent(agentOptions);

/** Throws for IP-literal hosts in private ranges (those never hit the DNS lookup). */
export function assertPublicUrl(url) {
  const { hostname } = new URL(url);
  const host = hostname.replace(/^\[|\]$/g, "");
  if (ALLOW_PRIVATE) return;
  if (net.isIP(host) && isPrivateIp(host)) throw new BlockedHostError(host);
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new BlockedHostError(host);
  }
}

/** Resolves the host up-front so the API can reject internal targets with a clear message. */
export async function assertResolvablePublicHost(url) {
  assertPublicUrl(url);
  const { hostname } = new URL(url);
  const host = hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) return;
  const addresses = await dns.promises.lookup(host, { all: true });
  if (!ALLOW_PRIVATE && addresses.some((a) => isPrivateIp(a.address))) throw new BlockedHostError(host);
}

// ─── Body decoding ────────────────────────────────────────────────────────────

function decompress(buffer, encoding, partial = false) {
  const enc = String(encoding || "").toLowerCase().trim();
  const opts = { maxOutputLength: MAX_DECOMPRESSED_BYTES };
  // Sync flush lets a truncated stream decode as far as it goes
  const flush = { finishFlush: zlib.constants.Z_SYNC_FLUSH };
  if (!enc || enc === "identity") return buffer;
  if (enc.includes("br")) {
    return zlib.brotliDecompressSync(buffer, partial ? { ...opts, finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH } : opts);
  }
  if (enc.includes("gzip")) return zlib.gunzipSync(buffer, { ...opts, ...flush });
  if (enc.includes("deflate")) {
    try {
      return zlib.inflateSync(buffer, { ...opts, ...flush });
    } catch {
      return zlib.inflateRawSync(buffer, { ...opts, ...flush });
    }
  }
  return buffer;
}

/** Gunzips a buffer that starts with the gzip magic bytes (e.g. sitemap.xml.gz). */
export function maybeGunzip(buffer) {
  if (buffer && buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
    return zlib.gunzipSync(buffer, { maxOutputLength: MAX_DECOMPRESSED_BYTES, finishFlush: zlib.constants.Z_SYNC_FLUSH });
  }
  return buffer;
}

export function decodeText(buffer, contentType = "") {
  let charset = (String(contentType).match(/charset=["']?([\w-]+)/i) || [])[1];
  if (!charset) {
    const head = buffer.subarray(0, 4096).toString("latin1");
    charset = (head.match(/<meta[^>]+charset=["']?([\w-]+)/i) || [])[1];
  }
  try {
    return new TextDecoder(charset || "utf-8").decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

// ─── Requests ─────────────────────────────────────────────────────────────────

function describeError(err) {
  if (err?.code === "EBLOCKED") return err.message;
  if (err?.code === "ECONNABORTED" || err?.code === "ETIMEDOUT" || /timeout/i.test(err?.message || "")) return "Request timed out";
  if (err?.code === "ENOTFOUND" || err?.code === "EAI_AGAIN") return "Domain name could not be resolved (DNS error)";
  if (err?.code === "ECONNREFUSED") return "Connection refused by the server";
  if (err?.code === "ECONNRESET") return "Connection was reset by the server";
  if (/maxContentLength/i.test(err?.message || "")) return "Response is larger than the download limit";
  if (/certificate|SSL|TLS/i.test(err?.code || "") || /certificate/i.test(err?.message || "")) return `SSL/TLS error: ${err.code || err.message}`;
  if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return "Request cancelled";
  return err?.message || "Unknown network error";
}

/**
 * Single HTTP request that never follows redirects (the caller records each hop)
 * and returns the decompressed body plus transfer metadata.
 */
export async function fetchRaw(url, { method = "GET", timeout = 15000, maxBytes = 5 * 1024 * 1024, userAgent = USER_AGENTS.desktop, accept, signal } = {}) {
  assertPublicUrl(url);
  const started = Date.now();
  let stream;
  try {
    const res = await axios.request({
      url,
      method,
      timeout,
      signal,
      maxRedirects: 0,
      decompress: false,
      proxy: false,
      responseType: "stream",
      validateStatus: () => true,
      httpAgent,
      httpsAgent,
      headers: {
        "User-Agent": userAgent,
        Accept: accept || "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const ttfb = Date.now() - started;
    stream = res.data;

    // Read the body ourselves so oversized pages are cut off at `maxBytes`
    // (and still analysed) instead of failing the whole request.
    const chunks = [];
    let received = 0;
    let truncated = false;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        stream.destroy();
        reject(Object.assign(new Error("Request timed out"), { code: "ETIMEDOUT" }));
      }, Math.max(1000, timeout - ttfb));
      stream.on("data", (chunk) => {
        received += chunk.length;
        if (received > maxBytes) {
          truncated = true;
          chunks.push(chunk.subarray(0, chunk.length - (received - maxBytes)));
          clearTimeout(timer);
          stream.destroy();
          resolve();
          return;
        }
        chunks.push(chunk);
      });
      stream.on("end", () => {
        clearTimeout(timer);
        resolve();
      });
      stream.on("error", (err) => {
        clearTimeout(timer);
        if (truncated) resolve();
        else reject(err);
      });
    });

    const raw = Buffer.concat(chunks);
    const encoding = String(res.headers["content-encoding"] || "");
    let body = raw;
    try {
      body = decompress(raw, encoding, truncated);
    } catch {
      body = raw;
    }
    return {
      ok: true,
      status: res.status,
      headers: res.headers,
      body,
      transferSize: received,
      size: truncated ? Math.max(body.length, received) : body.length,
      truncated,
      encoding,
      ttfb,
      timeMs: Date.now() - started,
    };
  } catch (err) {
    stream?.destroy?.();
    return { ok: false, status: 0, error: describeError(err), errorCode: err?.code || "", timeMs: Date.now() - started };
  }
}

/**
 * Lightweight liveness check for links and images: HEAD first, then a GET whose
 * body is discarded as soon as headers arrive (many servers reject HEAD).
 */
export async function checkResource(url, { timeout = 8000, userAgent = USER_AGENTS.desktop, signal } = {}) {
  try {
    assertPublicUrl(url);
  } catch (err) {
    return { url, status: 0, error: describeError(err) };
  }
  const base = {
    url,
    timeout,
    signal,
    maxRedirects: 5,
    proxy: false,
    validateStatus: () => true,
    httpAgent,
    httpsAgent,
    headers: { "User-Agent": userAgent, Accept: "*/*" },
  };
  try {
    let res = await axios.request({ ...base, method: "HEAD" });
    // Many servers answer HEAD with 404/405 while GET works, so confirm every failure with GET
    if (res.status >= 400) {
      res = await axios.request({ ...base, method: "GET", responseType: "stream" });
      res.data?.destroy?.();
    }
    return { url, status: res.status };
  } catch (err) {
    return { url, status: 0, error: describeError(err), errorCode: err?.code || "" };
  }
}

/** Reads the TLS certificate of a host (validity dates and issuer). */
export function inspectCertificate(hostname, { timeout = 8000 } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    try {
      assertPublicUrl(`https://${hostname}/`);
    } catch (err) {
      return done({ error: err.message });
    }
    const socket = tls.connect({
      host: hostname,
      port: 443,
      servername: hostname,
      rejectUnauthorized: false,
      lookup: safeLookup,
      timeout,
    });
    socket.once("secureConnect", () => {
      const cert = socket.getPeerCertificate();
      const authorized = socket.authorized;
      const authError = socket.authorizationError ? String(socket.authorizationError) : "";
      socket.end();
      if (!cert || !cert.valid_to) return done({ error: "No certificate presented" });
      const validTo = new Date(cert.valid_to);
      done({
        validFrom: new Date(cert.valid_from).toISOString(),
        validTo: validTo.toISOString(),
        daysLeft: Math.floor((validTo.getTime() - Date.now()) / 86400000),
        issuer: cert.issuer?.O || cert.issuer?.CN || "",
        subject: cert.subject?.CN || "",
        authorized,
        authError,
      });
    });
    socket.once("timeout", () => {
      socket.destroy();
      done({ error: "TLS handshake timed out" });
    });
    socket.once("error", (err) => done({ error: describeError(err) }));
  });
}
