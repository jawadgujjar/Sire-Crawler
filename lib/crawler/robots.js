// robots.txt parsing per RFC 9309: user-agent groups, Allow/Disallow with
// "*" and "$" wildcards, longest match wins and Allow wins ties.

export function parseRobots(text) {
  const groups = [];
  const sitemaps = [];
  let current = null;
  let lastWasAgent = false;

  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (key === "user-agent") {
      if (!lastWasAgent || !current) {
        current = { agents: [], rules: [], crawlDelay: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;

    if (key === "sitemap") {
      if (value) sitemaps.push(value);
    } else if (!current) {
      continue;
    } else if (key === "allow" || key === "disallow") {
      if (value) current.rules.push({ allow: key === "allow", pattern: value });
    } else if (key === "crawl-delay") {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) current.crawlDelay = n;
    }
  }
  return { groups, sitemaps };
}

/** Picks the most specific group for our crawler, falling back to "*". */
export function rulesFor(parsed, token = "sirecrawler") {
  const tok = token.toLowerCase();
  const specific = parsed.groups.filter((g) => g.agents.some((a) => a !== "*" && tok.includes(a)));
  const chosen = specific.length ? specific : parsed.groups.filter((g) => g.agents.includes("*"));
  return {
    rules: chosen.flatMap((g) => g.rules),
    crawlDelay: chosen.reduce((max, g) => (g.crawlDelay != null && g.crawlDelay > (max ?? -1) ? g.crawlDelay : max), null),
  };
}

const patternCache = new Map();
function toRegex(pattern) {
  let re = patternCache.get(pattern);
  if (!re) {
    const anchored = pattern.endsWith("$");
    const body = (anchored ? pattern.slice(0, -1) : pattern)
      .split("*")
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    re = new RegExp("^" + body + (anchored ? "$" : ""));
    patternCache.set(pattern, re);
  }
  return re;
}

/** `path` is pathname + search, e.g. "/shop?page=2". */
export function isAllowed(rules, path) {
  let best = null;
  for (const rule of rules) {
    let decoded = path;
    try {
      decoded = decodeURI(path);
    } catch {}
    if (!toRegex(rule.pattern).test(path) && !toRegex(rule.pattern).test(decoded)) continue;
    const len = rule.pattern.length;
    if (!best || len > best.len || (len === best.len && rule.allow && !best.allow)) {
      best = { len, allow: rule.allow, pattern: rule.pattern };
    }
  }
  return best ? { allowed: best.allow, rule: best.pattern } : { allowed: true, rule: "" };
}
