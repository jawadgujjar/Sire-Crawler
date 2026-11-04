// Audit history lives in localStorage (per browser). Only compact summaries are
// stored — full reports can be several MB — so the Progress tab can compare
// audits of the same site over time.

const KEY = "sire-crawler:history:v2";
const MAX_ENTRIES = 60;
const MAX_PER_SITE = 12;

// Tiny external store so components read history with useSyncExternalStore
// (no hydration mismatch: the server snapshot is always empty).
const EMPTY = [];
let cache = null;
const listeners = new Set();

function publish(next) {
  cache = next;
  listeners.forEach((l) => l());
}

export function subscribeHistory(listener) {
  listeners.add(listener);
  const onStorage = (e) => {
    if (e.key === KEY) publish(loadHistory());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getHistorySnapshot() {
  if (cache === null) cache = loadHistory();
  return cache;
}

export function getServerHistorySnapshot() {
  return EMPTY;
}

export function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function summarize(report) {
  return {
    id: `${report.rootHost}-${report.finishedAt}`,
    host: report.rootHost,
    startUrl: report.startUrl,
    finishedAt: report.finishedAt,
    durationMs: report.durationMs,
    score: report.score,
    counts: report.counts,
    pages: report.pages.filter((p) => p.fetched).length,
    pageGroups: report.pageGroups,
    categories: Object.fromEntries(report.categories.map((c) => [c.id, c.score])),
    issues: Object.fromEntries(report.issues.map((i) => [i.id, i.count])),
    options: { maxPages: report.options?.maxPages },
  };
}

export function saveToHistory(report) {
  const entry = summarize(report);
  try {
    const all = loadHistory().filter((h) => h.id !== entry.id);
    all.unshift(entry);
    const perSite = new Map();
    const trimmed = all.filter((h) => {
      const n = (perSite.get(h.host) || 0) + 1;
      perSite.set(h.host, n);
      return n <= MAX_PER_SITE;
    }).slice(0, MAX_ENTRIES);
    localStorage.setItem(KEY, JSON.stringify(trimmed));
    publish(trimmed);
    return trimmed;
  } catch {
    return loadHistory();
  }
}

export function removeFromHistory(id) {
  try {
    const all = loadHistory().filter((h) => h.id !== id);
    localStorage.setItem(KEY, JSON.stringify(all));
    publish(all);
    return all;
  } catch {
    return loadHistory();
  }
}

/** Previous audit of the same host, older than `report`. */
export function previousFor(history, report) {
  return history
    .filter((h) => h.host === report.rootHost && h.finishedAt < report.finishedAt)
    .sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1))[0] || null;
}
