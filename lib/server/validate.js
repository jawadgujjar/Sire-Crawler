import "server-only";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function str(value, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

export function normalizeEmail(value) {
  return str(value, 254).toLowerCase();
}

export function isEmail(value) {
  return EMAIL_RE.test(value);
}

export function passwordProblem(password) {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 128) return "Use 128 characters or fewer.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return "Include at least one letter and one number.";
  return null;
}

/** Accepts example.com or a full URL; returns a normalised https URL or "". */
export function normalizeWebsite(value) {
  const raw = str(value, 300);
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
}

// In-memory fixed-window limiter. Per server instance only; good enough to
// slow down brute force and spam on a single host.
const buckets = new Map();
export function rateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return { ok: true };
  }
  bucket.count += 1;
  return bucket.count > limit ? { ok: false, retryAfterMs: bucket.resetAt - now } : { ok: true };
}

export function clientIp(headers) {
  const fwd = headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : "") || headers.get("x-real-ip") || "local";
}

/** Rejects cross-site POSTs to route handlers (cookies are SameSite=Lax, this is a second layer). */
export function isSameOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
