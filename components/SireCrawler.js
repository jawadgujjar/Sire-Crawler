"use client";

import { useState, useRef, useCallback } from "react";

// ─── Icons (inline SVG — no extra deps) ──────────────────────────────────────

const Icon = {
  Spider: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/><path d="M12 8V4"/><path d="M12 16v4"/><path d="M8 12H4"/><path d="M16 12h4"/>
      <path d="M6.34 6.34 3.51 3.51"/><path d="M17.66 17.66l2.83 2.83"/><path d="M17.66 6.34l2.83-2.83"/><path d="M6.34 17.66l-2.83 2.83"/>
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  Download: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  ChevronUp: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18,15 12,9 6,15"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6,9 12,15 18,9"/>
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Check: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  ),
  AlertCircle: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Info: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  ExternalLink: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
  Globe: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  Zap: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/>
    </svg>
  ),
  Image: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/>
    </svg>
  ),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusConfig(code) {
  if (code === 0)   return { dot: "bg-slate-500", badge: "text-slate-400 bg-slate-500/10 border-slate-500/20", label: "Error" };
  if (code < 300)   return { dot: "bg-emerald-400", badge: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", label: String(code) };
  if (code < 400)   return { dot: "bg-amber-400", badge: "text-amber-400 bg-amber-400/10 border-amber-400/20", label: String(code) };
  return { dot: "bg-red-400", badge: "text-red-400 bg-red-400/10 border-red-400/20", label: String(code) };
}

function issueConfig(type) {
  if (type === "error")   return { color: "text-red-400", bg: "bg-red-400/8 border-red-400/15", Icon: Icon.AlertCircle };
  if (type === "warning") return { color: "text-amber-400", bg: "bg-amber-400/8 border-amber-400/15", Icon: Icon.AlertTriangle };
  return { color: "text-blue-400", bg: "bg-blue-400/8 border-blue-400/15", Icon: Icon.Info };
}

function speedConfig(ms) {
  if (ms > 2000) return "text-red-400";
  if (ms > 800)  return "text-amber-400";
  return "text-emerald-400";
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, color, sub }) {
  return (
    <div className="bg-[#0F1623] border border-[#1E2D45] rounded-xl p-4">
      <div className={`text-2xl font-bold tracking-tight ${color}`}>{value}</div>
      <div className="text-[#4A6080] text-xs mt-1 font-medium uppercase tracking-wider">{label}</div>
      {sub && <div className="text-[#4A6080] text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

function SortBtn({ label, sortKey, current, asc, onClick }) {
  const active = current === sortKey;
  return (
    <th
      className="text-left px-4 py-3 text-xs font-semibold text-[#4A6080] uppercase tracking-wider cursor-pointer select-none hover:text-[#7A9CC0] whitespace-nowrap transition-colors"
      onClick={() => onClick(sortKey)}
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        <span className={`transition-opacity ${active ? "opacity-100" : "opacity-30"}`}>
          {active && asc ? <Icon.ChevronUp /> : <Icon.ChevronDown />}
        </span>
      </span>
    </th>
  );
}

function DetailRow({ label, value, warn, mono }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[#4A6080] text-xs font-medium uppercase tracking-wider">{label}</span>
      <span className={`text-sm break-all ${warn ? "text-red-400" : "text-[#C8DCF0]"} ${mono ? "font-mono text-xs" : ""}`}>
        {value || <span className="text-red-400 italic">Not set</span>}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SireCrawler() {
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(20);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("all");
  const [sortKey, setSortKey] = useState("url");
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch] = useState("");
  const [detailTab, setDetailTab] = useState("overview");
  const inputRef = useRef(null);

  // ── Crawl ────────────────────────────────────────────────────────────────────

  const handleCrawl = useCallback(async () => {
    if (!url.trim()) { setError("Please enter a website URL to begin your audit."); return; }
    let crawlUrl = url.trim();
    if (!crawlUrl.startsWith("http")) crawlUrl = "https://" + crawlUrl;

    setLoading(true);
    setError("");
    setResults([]);
    setSummary(null);
    setSelected(null);
    setTab("all");

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: crawlUrl, maxPages }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "The crawl could not be completed. Please try again."); return; }
      setResults(data.results);
      setSummary(data.summary);
    } catch {
      setError("Unable to reach the server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [url, maxPages]);

  // ── Sort ─────────────────────────────────────────────────────────────────────

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  // ── Filter + Sort ─────────────────────────────────────────────────────────────

  const filtered = results
    .filter((r) => {
      if (tab === "issues")   return r.issues.some(i => i.type === "error" || i.type === "warning");
      if (tab === "errors")   return r.issues.some(i => i.type === "error");
      if (tab === "broken")   return r.statusCode >= 400 || r.statusCode === 0;
      if (tab === "images")   return r.images.length > 0;
      return true;
    })
    .filter((r) =>
      !search ||
      r.url.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let av, bv;
      if (sortKey === "url")          { av = a.url;            bv = b.url; }
      else if (sortKey === "status")  { av = a.statusCode;     bv = b.statusCode; }
      else if (sortKey === "speed")   { av = a.responseTime;   bv = b.responseTime; }
      else if (sortKey === "words")   { av = a.wordCount;      bv = b.wordCount; }
      else if (sortKey === "issues")  { av = a.issues.length;  bv = b.issues.length; }
      else if (sortKey === "size")    { av = a.size;           bv = b.size; }
      else { av = a.url; bv = b.url; }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

  // ── Export ───────────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const headers = ["URL","HTTP Status","Page Title","Meta Description","H1 Tags","Word Count","Response Time (ms)","Page Size (bytes)","Indexable","Canonical URL","Internal Links","External Links","Images","Issue Count","Issues"];
    const rows = results.map((r) => [
      r.url, r.statusCode,
      `"${(r.title || "").replace(/"/g, '""')}"`,
      `"${(r.metaDescription || "").replace(/"/g, '""')}"`,
      `"${r.h1.join(" | ").replace(/"/g, '""')}"`,
      r.wordCount, r.responseTime, r.size, r.indexable,
      r.canonicalUrl,
      r.internalLinks.length, r.externalLinks.length, r.images.length,
      r.issues.length,
      `"${r.issues.map(i => `[${i.type.toUpperCase()}] ${i.field}: ${i.message}`).join(" | ").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sire-crawler-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // ── Tabs config ───────────────────────────────────────────────────────────────

  const tabs = [
    { key: "all",    label: "All Pages",   count: results.length },
    { key: "errors", label: "Errors",      count: results.filter(r => r.issues.some(i => i.type === "error")).length },
    { key: "issues", label: "Warnings",    count: results.filter(r => r.issues.some(i => i.type === "warning")).length },
    { key: "broken", label: "Broken",      count: results.filter(r => r.statusCode >= 400 || r.statusCode === 0).length },
    { key: "images", label: "Images",      count: results.filter(r => r.images.length > 0).length },
  ];

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#060A12] text-[#C8DCF0]" style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,sans-serif" }}>

      {/* ── Top Nav ── */}
      <nav className="border-b border-[#1E2D45] bg-[#080C14]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-white">
              <Icon.Spider />
            </div>
            <span className="font-bold text-white text-[15px] tracking-tight">
              Sire<span className="text-blue-400">Crawler</span>
            </span>
            <span className="hidden sm:inline text-[10px] font-semibold text-blue-400/70 border border-blue-400/25 rounded-full px-2 py-0.5 uppercase tracking-widest">Beta</span>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-[#4A6080]">
            <span className="text-[#7A9CC0] font-medium">Crawler</span>
            <span className="cursor-not-allowed opacity-50">Reports</span>
            <span className="cursor-not-allowed opacity-50">Sitemap</span>
            <span className="cursor-not-allowed opacity-50">API</span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 shrink-0">
            {results.length > 0 && (
              <button
                onClick={exportCSV}
                className="hidden sm:flex items-center gap-2 text-sm text-[#7A9CC0] hover:text-white border border-[#1E2D45] hover:border-[#2E4D75] px-3 py-1.5 rounded-lg transition-all"
              >
                <Icon.Download />
                Export CSV
              </button>
            )}
            <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400">
              S
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero / Crawl Bar ── */}
      <div className={`border-b border-[#1E2D45] bg-[#080C14] transition-all ${results.length === 0 && !loading ? "py-16" : "py-5"}`}>
        <div className="max-w-screen-xl mx-auto px-6">
          {results.length === 0 && !loading && (
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-full px-3 py-1 mb-5 uppercase tracking-widest">
                <Icon.Spider />
                Professional SEO Crawler
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-3">
                Audit any website in seconds
              </h1>
              <p className="text-[#4A6080] text-lg max-w-xl mx-auto">
                Sire Crawler scans every page for SEO issues, broken links, missing tags, and performance problems — just like Screaming Frog, built for the web.
              </p>
            </div>
          )}

          {/* Input Row */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto">
            <div className="relative flex-1">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4A6080]">
                <Icon.Globe />
              </div>
              <input
                ref={inputRef}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCrawl()}
                placeholder="https://yourwebsite.com"
                className="w-full bg-[#0F1623] border border-[#1E2D45] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#2E4D75] focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <select
                value={maxPages}
                onChange={(e) => setMaxPages(Number(e.target.value))}
                className="bg-[#0F1623] border border-[#1E2D45] rounded-xl px-3 py-3 text-sm text-[#7A9CC0] focus:outline-none focus:border-blue-500/60 transition-colors cursor-pointer"
              >
                <option value={10}>10 pages</option>
                <option value={20}>20 pages</option>
                <option value={30}>30 pages</option>
                <option value={50}>50 pages</option>
              </select>
              <button
                onClick={handleCrawl}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 whitespace-nowrap"
              >
                {loading ? "Crawling…" : "Start Audit"}
              </button>
            </div>
          </div>

          {error && (
            <div className="max-w-3xl mx-auto mt-3 flex items-start gap-2 text-sm text-red-400 bg-red-400/8 border border-red-400/15 rounded-lg px-4 py-2.5">
              <Icon.AlertCircle />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="max-w-screen-xl mx-auto px-6 py-20 text-center">
          <div className="w-12 h-12 border-2 border-[#1E2D45] border-t-blue-500 rounded-full animate-spin mx-auto mb-5" />
          <h2 className="text-white font-semibold text-lg mb-2">Crawling your site…</h2>
          <p className="text-[#4A6080] text-sm">Sire Crawler is scanning pages, analyzing SEO, and checking for issues. This typically takes 15–60 seconds.</p>
        </div>
      )}

      {/* ── Results ── */}
      {summary && !loading && (
        <div className="max-w-screen-xl mx-auto px-6 py-6">

          {/* Site Health Score */}
          <div className="mb-6 p-5 bg-[#0F1623] border border-[#1E2D45] rounded-2xl flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="24" fill="none" stroke="#1E2D45" strokeWidth="6"/>
                  <circle
                    cx="30" cy="30" r="24" fill="none"
                    stroke={summary.criticalIssues === 0 ? "#10B981" : summary.criticalIssues < 5 ? "#F59E0B" : "#EF4444"}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${Math.round(((summary.indexablePages / Math.max(summary.totalPages, 1)) * 100) * 1.508)} 150.8`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                  {Math.round((summary.indexablePages / Math.max(summary.totalPages, 1)) * 100)}%
                </div>
              </div>
              <div>
                <div className="font-bold text-white text-base">Site Health Score</div>
                <div className="text-[#4A6080] text-xs mt-0.5">
                  {summary.criticalIssues === 0
                    ? "No critical issues detected — looking good!"
                    : `${summary.criticalIssues} critical issue${summary.criticalIssues > 1 ? "s" : ""} require your attention`}
                </div>
              </div>
            </div>
            <div className="sm:ml-auto flex flex-wrap gap-3">
              {[
                { label: "Critical Errors", value: summary.criticalIssues, color: summary.criticalIssues > 0 ? "text-red-400" : "text-emerald-400" },
                { label: "Warnings", value: summary.warnings, color: summary.warnings > 0 ? "text-amber-400" : "text-emerald-400" },
                { label: "Missing Titles", value: summary.missingTitles, color: summary.missingTitles > 0 ? "text-red-400" : "text-emerald-400" },
                { label: "Slow Pages", value: summary.slowPages, color: summary.slowPages > 0 ? "text-amber-400" : "text-emerald-400" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[#4A6080] text-xs">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <StatCard label="Pages Crawled"   value={summary.totalPages}            color="text-white" />
            <StatCard label="Indexable"       value={summary.indexablePages}        color="text-emerald-400" />
            <StatCard label="Broken Pages"    value={summary.brokenPages}           color={summary.brokenPages > 0 ? "text-red-400" : "text-emerald-400"} />
            <StatCard label="Avg. Response"   value={`${summary.avgResponseTime}ms`} color={summary.avgResponseTime > 1000 ? "text-amber-400" : "text-blue-400"} />
            <StatCard label="Total Images"    value={summary.totalImages}           color="text-[#7A9CC0]" />
            <StatCard label="Internal Links"  value={summary.totalInternalLinks}    color="text-[#7A9CC0]" />
          </div>

          {/* Tabs + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${
                    tab === t.key
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                      : "text-[#4A6080] hover:text-[#7A9CC0] hover:bg-[#0F1623]"
                  }`}
                >
                  {t.label}
                  <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold ${tab === t.key ? "bg-white/20" : "bg-[#1E2D45] text-[#4A6080]"}`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="sm:ml-auto relative w-full sm:w-64">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A6080]">
                <Icon.Search />
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by URL or title…"
                className="w-full bg-[#0F1623] border border-[#1E2D45] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#2E4D75] focus:outline-none focus:border-blue-500/60 transition-colors"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#0F1623] border border-[#1E2D45] rounded-2xl overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1E2D45] bg-[#080C14]/60">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#4A6080] uppercase tracking-wider w-8">#</th>
                    <SortBtn label="URL"          sortKey="url"     current={sortKey} asc={sortAsc} onClick={handleSort} />
                    <SortBtn label="Status"       sortKey="status"  current={sortKey} asc={sortAsc} onClick={handleSort} />
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#4A6080] uppercase tracking-wider">Page Title</th>
                    <SortBtn label="Words"        sortKey="words"   current={sortKey} asc={sortAsc} onClick={handleSort} />
                    <SortBtn label="Speed"        sortKey="speed"   current={sortKey} asc={sortAsc} onClick={handleSort} />
                    <SortBtn label="Size"         sortKey="size"    current={sortKey} asc={sortAsc} onClick={handleSort} />
                    <SortBtn label="Issues"       sortKey="issues"  current={sortKey} asc={sortAsc} onClick={handleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2D45]/60">
                  {filtered.map((page, i) => {
                    const sc = statusConfig(page.statusCode);
                    const errorCount = page.issues.filter(x => x.type === "error").length;
                    const warnCount  = page.issues.filter(x => x.type === "warning").length;
                    const isSelected = selected?.url === page.url;
                    return (
                      <tr
                        key={page.url}
                        onClick={() => { setSelected(isSelected ? null : page); setDetailTab("overview"); }}
                        className={`cursor-pointer transition-colors ${isSelected ? "bg-blue-600/8 border-l-2 border-l-blue-500" : "hover:bg-[#0F1A28] border-l-2 border-l-transparent"}`}
                      >
                        <td className="px-4 py-3 text-[#2E4D75] text-xs font-mono">{i + 1}</td>
                        <td className="px-4 py-3 max-w-[240px]">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-[#C8DCF0] text-xs font-mono" title={page.url}>
                              {page.url.replace(/^https?:\/\//, "")}
                            </div>
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0 text-[#2E4D75] hover:text-blue-400 transition-colors"
                            >
                              <Icon.ExternalLink />
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${sc.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <div className="truncate text-[#7A9CC0] text-xs" title={page.title}>
                            {page.title || <span className="text-red-400 italic font-medium">Missing</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#4A6080] text-xs whitespace-nowrap font-mono">
                          {page.wordCount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-mono font-medium ${speedConfig(page.responseTime)}`}>
                            {page.responseTime}ms
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#4A6080] text-xs whitespace-nowrap font-mono">
                          {formatBytes(page.size)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {errorCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full">
                                <Icon.AlertCircle /> {errorCount}
                              </span>
                            )}
                            {warnCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                                <Icon.AlertTriangle /> {warnCount}
                              </span>
                            )}
                            {page.issues.length === 0 && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                                <Icon.Check /> Clean
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center text-[#2E4D75] text-sm">
                        No pages match the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Detail Panel ── */}
          {selected && (
            <div className="bg-[#0F1623] border border-[#1E2D45] rounded-2xl overflow-hidden">
              {/* Panel Header */}
              <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#1E2D45] bg-[#080C14]/40">
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-white truncate">
                    {selected.title || <span className="text-red-400 italic">No title tag</span>}
                  </h2>
                  <a href={selected.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-mono break-all mt-0.5 flex items-center gap-1">
                    {selected.url} <Icon.ExternalLink />
                  </a>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="shrink-0 text-[#4A6080] hover:text-white w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#1E2D45] transition-all"
                >
                  <Icon.X />
                </button>
              </div>

              {/* Panel Tabs */}
              <div className="flex gap-1 px-6 pt-3 border-b border-[#1E2D45]">
                {["overview", "content", "links", "issues"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setDetailTab(t)}
                    className={`text-xs font-medium px-3 py-2 capitalize rounded-t-lg transition-colors border-b-2 -mb-px ${
                      detailTab === t
                        ? "text-blue-400 border-blue-500"
                        : "text-[#4A6080] border-transparent hover:text-[#7A9CC0]"
                    }`}
                  >
                    {t === "issues" ? `Issues (${selected.issues.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {detailTab === "overview" && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    <DetailRow label="HTTP Status"    value={String(selected.statusCode || "Connection Error")} warn={selected.statusCode >= 400 || selected.statusCode === 0} />
                    <DetailRow label="Response Time"  value={`${selected.responseTime}ms`} warn={selected.responseTime > 2000} />
                    <DetailRow label="Page Size"      value={formatBytes(selected.size)} />
                    <DetailRow label="Word Count"     value={`${selected.wordCount.toLocaleString()} words`} warn={selected.wordCount < 300} />
                    <DetailRow label="Indexable"      value={selected.indexable ? "Yes — will appear in search" : "No — blocked from indexing"} warn={!selected.indexable} />
                    <DetailRow label="Robots Meta"    value={selected.robotsMeta || "Not specified"} />
                    <DetailRow label="Content-Type"   value={selected.contentType} mono />
                    <DetailRow label="Internal Links" value={String(selected.internalLinks.length)} />
                    <DetailRow label="External Links" value={String(selected.externalLinks.length)} />
                    <DetailRow label="Images"         value={`${selected.images.length} total, ${selected.images.filter(i => !i.alt).length} missing alt`} warn={selected.images.filter(i => !i.alt).length > 0} />
                  </div>
                )}

                {/* Content Tab */}
                {detailTab === "content" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-semibold text-[#4A6080] uppercase tracking-wider mb-1.5">Page Title</div>
                        <div className={`text-sm ${selected.title ? "text-[#C8DCF0]" : "text-red-400 italic"}`}>
                          {selected.title || "Not set"}
                        </div>
                        <div className="mt-1.5 h-1.5 bg-[#1E2D45] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${selected.title.length > 60 ? "bg-red-500" : selected.title.length > 30 ? "bg-emerald-500" : "bg-amber-500"}`}
                            style={{ width: `${Math.min((selected.title.length / 60) * 100, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-[#4A6080] mt-1">{selected.title.length}/60 characters recommended</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#4A6080] uppercase tracking-wider mb-1.5">Canonical URL</div>
                        <div className={`text-xs font-mono break-all ${selected.canonicalUrl ? "text-[#C8DCF0]" : "text-red-400 italic"}`}>
                          {selected.canonicalUrl || "Not set — recommended for all pages"}
                        </div>
                      </div>
                      {selected.ogTitle && (
                        <div>
                          <div className="text-xs font-semibold text-[#4A6080] uppercase tracking-wider mb-1.5">OG Title</div>
                          <div className="text-sm text-[#C8DCF0]">{selected.ogTitle}</div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-semibold text-[#4A6080] uppercase tracking-wider mb-1.5">Meta Description</div>
                        <div className={`text-sm leading-relaxed ${selected.metaDescription ? "text-[#C8DCF0]" : "text-red-400 italic"}`}>
                          {selected.metaDescription || "Not set"}
                        </div>
                        <div className="mt-1.5 h-1.5 bg-[#1E2D45] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${selected.metaDescription.length > 160 ? "bg-red-500" : selected.metaDescription.length > 80 ? "bg-emerald-500" : "bg-amber-500"}`}
                            style={{ width: `${Math.min((selected.metaDescription.length / 160) * 100, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-[#4A6080] mt-1">{selected.metaDescription.length}/160 characters recommended</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#4A6080] uppercase tracking-wider mb-1.5">
                          H1 Tags <span className="text-[#2E4D75] normal-case font-normal">({selected.h1.length})</span>
                        </div>
                        {selected.h1.length > 0
                          ? selected.h1.map((h, i) => <div key={i} className="text-sm text-[#C8DCF0] mb-1">→ {h}</div>)
                          : <div className="text-red-400 italic text-sm">No H1 tag found</div>}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#4A6080] uppercase tracking-wider mb-1.5">
                          H2 Tags <span className="text-[#2E4D75] normal-case font-normal">({selected.h2.length})</span>
                        </div>
                        {selected.h2.slice(0, 4).map((h, i) => <div key={i} className="text-xs text-[#7A9CC0] mb-1">→ {h}</div>)}
                        {selected.h2.length > 4 && <div className="text-xs text-[#2E4D75]">+{selected.h2.length - 4} more headings</div>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Links Tab */}
                {detailTab === "links" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs font-semibold text-[#4A6080] uppercase tracking-wider mb-3">
                        Internal Links <span className="text-[#2E4D75] normal-case font-normal">({selected.internalLinks.length})</span>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {selected.internalLinks.slice(0, 15).map((link, i) => (
                          <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-mono truncate hover:underline">
                            <Icon.ExternalLink />
                            {link.replace(/^https?:\/\/[^/]+/, "") || "/"}
                          </a>
                        ))}
                        {selected.internalLinks.length > 15 && (
                          <div className="text-xs text-[#2E4D75]">+{selected.internalLinks.length - 15} more links</div>
                        )}
                        {selected.internalLinks.length === 0 && (
                          <div className="text-xs text-[#2E4D75]">No internal links found on this page.</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#4A6080] uppercase tracking-wider mb-3">
                        External Links <span className="text-[#2E4D75] normal-case font-normal">({selected.externalLinks.length})</span>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {selected.externalLinks.slice(0, 15).map((link, i) => (
                          <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-[#4A6080] hover:text-[#7A9CC0] font-mono truncate hover:underline">
                            <Icon.Globe />
                            {link.replace(/^https?:\/\//, "").split("/")[0]}
                          </a>
                        ))}
                        {selected.externalLinks.length > 15 && (
                          <div className="text-xs text-[#2E4D75]">+{selected.externalLinks.length - 15} more links</div>
                        )}
                        {selected.externalLinks.length === 0 && (
                          <div className="text-xs text-[#2E4D75]">No external links found on this page.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Issues Tab */}
                {detailTab === "issues" && (
                  <div className="space-y-2.5">
                    {selected.issues.length === 0 ? (
                      <div className="flex items-center gap-3 p-4 bg-emerald-400/8 border border-emerald-400/20 rounded-xl">
                        <div className="text-emerald-400"><Icon.Check /></div>
                        <div>
                          <div className="text-sm font-semibold text-emerald-400">No issues detected</div>
                          <div className="text-xs text-[#4A6080] mt-0.5">This page passed all SEO checks.</div>
                        </div>
                      </div>
                    ) : (
                      selected.issues.map((issue, i) => {
                        const cfg = issueConfig(issue.type);
                        return (
                          <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${cfg.bg}`}>
                            <div className={`shrink-0 mt-0.5 ${cfg.color}`}><cfg.Icon /></div>
                            <div>
                              <div className={`text-xs font-semibold ${cfg.color}`}>{issue.field}</div>
                              <div className="text-xs text-[#7A9CC0] mt-0.5 leading-relaxed">{issue.message}</div>
                            </div>
                            <div className={`ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                              {issue.type}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && results.length === 0 && !error && (
        <div className="max-w-screen-xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              {
                Icon: Icon.Search,
                title: "Deep SEO Analysis",
                desc: "Audits every page for titles, meta descriptions, H1/H2 structure, canonical URLs, and indexability.",
                color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20",
              },
              {
                Icon: Icon.Zap,
                title: "Performance Insights",
                desc: "Measures response time and page size across your entire site to surface slow or bloated pages.",
                color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20",
              },
              {
                Icon: Icon.Globe,
                title: "Complete Link Audit",
                desc: "Maps every internal and external link, flags broken URLs, and tracks redirect chains.",
                color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20",
              },
            ].map((f) => (
              <div key={f.title} className="bg-[#0F1623] border border-[#1E2D45] rounded-2xl p-5">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-4 ${f.bg} ${f.color}`}>
                  <f.Icon />
                </div>
                <div className="font-semibold text-white text-sm mb-2">{f.title}</div>
                <div className="text-xs text-[#4A6080] leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Trust line */}
          <p className="text-center text-[#2E4D75] text-xs mt-10">
            Sire Crawler respects robots.txt and crawl delays. Built for SEO professionals and web developers.
          </p>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-[#1E2D45] mt-16">
        <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#2E4D75]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Icon.Spider />
            </div>
            <span className="font-semibold text-[#4A6080]">SireCrawler</span>
            <span>— Professional SEO Auditing Tool</span>
          </div>
          <span>© {new Date().getFullYear()} SireCrawler. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
