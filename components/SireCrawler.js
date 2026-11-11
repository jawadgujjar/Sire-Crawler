"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Download, RotateCw, Plus, LayoutDashboard, ListChecks, Files, ChartColumn, TrendingUp,
  FileSpreadsheet, FileJson, Printer, Globe, Clock, Info, ChevronRight, ExternalLink, Headset, ArrowRight, ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteNav from "./site/SiteNav";
import SiteFooter from "./site/SiteFooter";
import { coerceStartUrl, displayUrl } from "@/lib/audit/url";
import { CHECK_BY_ID, CATEGORIES } from "@/lib/audit/checks";
import { useCrawl } from "./audit/useCrawl";
import { subscribeHistory, getHistorySnapshot, getServerHistorySnapshot, saveToHistory, removeFromHistory, previousFor, summarize } from "./audit/history";
import { exportPagesCsv, exportIssuesCsv, exportJson } from "./audit/exporters";
import Landing, { DEFAULT_OPTIONS } from "./audit/Landing";
import CrawlProgress from "./audit/CrawlProgress";
import Overview from "./audit/Overview";
import IssuesView from "./audit/IssuesView";
import PagesView from "./audit/PagesView";
import PageDrawer from "./audit/PageDrawer";
import StatsView from "./audit/StatsView";
import HistoryView from "./audit/HistoryView";
import { Button, Tabs, Dropdown, DropdownItem, Logo, ScoreRing, SeverityIcon, scoreTone, cx, fmt, formatDate, formatDuration } from "./audit/ui";

const REASON_NOTES = {
  limit: (r) => `Page limit reached: ${fmt(r.options?.maxPages)} pages crawled out of ${fmt(r.discovered)} URLs discovered. Raise the limit in Audit settings to crawl more.`,
  time: () => "Time limit reached. The crawl stopped early to stay within the server's time limit, so results cover the pages crawled so far.",
  stopped: () => "You stopped the audit. Results cover the pages crawled before it was stopped.",
  interrupted: () => "The connection was interrupted. Results cover the pages crawled before the connection dropped.",
};

function PrintReport({ report }) {
  return (
    <div className="hidden bg-white p-8 text-ink print:block">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <Logo />
        <div className="text-right text-xs text-mute">Site Audit · {formatDate(report.finishedAt)}</div>
      </div>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">{report.rootHost}</h1>
      <p className="text-sm text-mute">{report.startUrl} · {fmt(report.pages.filter((p) => p.fetched).length)} pages crawled</p>
      <div className="mt-6 grid grid-cols-4 gap-4">
        {[
          ["Site health", `${report.score}%`],
          ["Errors", fmt(report.counts.error)],
          ["Warnings", fmt(report.counts.warning)],
          ["Notices", fmt(report.counts.notice)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line p-4">
            <div className="text-xs text-mute">{k}</div>
            <div className="text-2xl font-extrabold">{v}</div>
          </div>
        ))}
      </div>
      <h2 className="mt-8 text-lg font-bold">Thematic reports</h2>
      <table className="mt-2 w-full text-sm">
        <tbody>
          {report.categories.map((c) => (
            <tr key={c.id} className="border-b border-line-2">
              <td className="py-2 font-semibold">{c.label}</td>
              <td className="py-2 text-right">{c.score}%</td>
              <td className="py-2 text-right text-mute">{c.error} errors · {c.warning} warnings · {c.notice} notices</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="print-break mt-8 text-lg font-bold">Issues</h2>
      {report.issues.map((issue) => {
        const check = CHECK_BY_ID[issue.id];
        return (
          <div key={issue.id} className="mt-4 break-inside-avoid rounded-xl border border-line p-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <SeverityIcon severity={issue.severity} size={14} /> {check.title(issue.count)}
              <span className="ml-auto text-xs font-normal text-mute">{CATEGORIES[check.category].label}</span>
            </div>
            <p className="mt-1 text-xs text-ink-2"><b>Why:</b> {check.why}</p>
            <p className="mt-1 text-xs text-ink-2"><b>Fix:</b> {check.fix}</p>
            <ul className="mt-2 space-y-0.5">
              {issue.items.slice(0, 10).map((it, i) => (
                <li key={it.url + i} className="break-all font-mono text-[10px] text-mute">{it.url}{it.detail ? ` — ${it.detail}` : ""}</li>
              ))}
              {issue.items.length > 10 && <li className="text-[10px] text-mute">+ {issue.items.length - 10} more (see CSV export)</li>}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

const REPORT_TABS = [
  { value: "overview", label: "Overview", Icon: LayoutDashboard, title: "Overview", subtitle: "Site health, thematic scores and the issues that matter most" },
  { value: "issues", label: "Issues", Icon: ListChecks, title: "Issues", subtitle: "Every problem found, with why it matters and how to fix it" },
  { value: "pages", label: "Crawled Pages", Icon: Files, title: "Crawled pages", subtitle: "Every URL found during the audit, with its SEO data" },
  { value: "stats", label: "Statistics", Icon: ChartColumn, title: "Statistics", subtitle: "How your pages are distributed by status, depth, speed and size" },
  { value: "progress", label: "Progress", Icon: TrendingUp, title: "Progress", subtitle: "How this site has changed between audits" },
];

function ReportFooter({ className = "" }) {
  return (
    <footer className={cx("border-t border-line bg-white print:hidden", className)}>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-7 text-xs text-mute sm:flex-row sm:px-6">
        <Logo />
        <span>Professional technical SEO auditing · © {new Date().getFullYear()} Sire Crawler</span>
      </div>
    </footer>
  );
}

function ReportView({ report, history, onRerun, onNew, onHome }) {
  const [tab, setTab] = useState("overview");
  const [filters, setFilters] = useState({ issues: {}, pages: {} });
  const [drawerUrl, setDrawerUrl] = useState(null);
  const previous = useMemo(() => previousFor(history, report), [history, report]);

  const navigate = useCallback((nextTab, f) => {
    setTab(nextTab);
    if (nextTab === "issues" || nextTab === "pages") setFilters((prev) => ({ ...prev, [nextTab]: f }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const selectTab = useCallback((value) => {
    setTab(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const closeDrawer = useCallback(() => setDrawerUrl(null), []);

  const fetched = report.pages.filter((p) => p.fetched).length;
  const note = REASON_NOTES[report.reason]?.(report);
  const current = REPORT_TABS.find((t) => t.value === tab);
  const badges = {
    issues: report.counts.error ? `${fmt(report.counts.error)} errors` : fmt(report.issues.length),
    pages: fmt(report.pages.length),
  };
  const tone = scoreTone(report.score);

  const exportMenu = (
    <Dropdown label="Export" icon={<Download size={16} />}>
      <DropdownItem icon={<FileSpreadsheet size={16} />} title="Issues report (CSV)" description="Every issue with URL, details and fix" onClick={() => exportIssuesCsv(report)} />
      <DropdownItem icon={<FileSpreadsheet size={16} />} title="Crawled pages (CSV)" description="All pages with SEO data and metrics" onClick={() => exportPagesCsv(report)} />
      <DropdownItem icon={<FileJson size={16} />} title="Full report (JSON)" description="Raw data for developers" onClick={() => exportJson(report)} />
      <DropdownItem icon={<Printer size={16} />} title="Print / Save as PDF" description="Client-ready summary report" onClick={() => setTimeout(() => window.print(), 50)} />
    </Dropdown>
  );

  return (
    <>
      <div className="flex min-h-screen print:hidden">
        {/* ── Sidebar (desktop) ── */}
        <aside className="sticky top-0 hidden h-screen w-[268px] shrink-0 flex-col overflow-y-auto bg-navy text-white lg:flex">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top_left,rgb(59_111_240/0.35),transparent_70%)]" />
          <div className="relative flex h-16 shrink-0 items-center px-5">
            <button onClick={onHome} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" aria-label="Sire Crawler home">
              <Logo light />
            </button>
          </div>

          <div className="sheen relative mx-4 mt-2 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-inset ring-white/10">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8fa3cf]">Project</div>
            <div className="mt-1.5 flex items-center gap-2">
              <Globe size={14} className="shrink-0 text-[#9ec5f4]" />
              <span className="truncate text-sm font-bold" title={report.rootHost}>{report.rootHost}</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <ScoreRing score={report.score} size={48} stroke={5} light />
              <div className="min-w-0">
                <div className="text-xs text-[#b7c6e6]">Site health</div>
                <div className="text-sm font-bold">{tone.label}</div>
              </div>
            </div>
          </div>

          <nav className="relative mt-6 px-3" aria-label="Report sections">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8fa3cf]">Site Audit</div>
            <ul className="space-y-0.5">
              {REPORT_TABS.map(({ value, label, Icon }) => {
                const active = tab === value;
                return (
                  <li key={value}>
                    <button
                      onClick={() => selectTab(value)}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                        active ? "bg-white text-navy shadow-[0_8px_24px_-12px_rgb(0_0_0/0.5)]" : "text-[#c5d2ec] hover:bg-white/[0.07] hover:text-white"
                      )}
                    >
                      <Icon size={17} className={active ? "text-brand" : "text-[#8fa3cf] group-hover:text-white"} />
                      <span className="flex-1 text-left">{label}</span>
                      {badges[value] && (
                        <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums", active ? "bg-brand-50 text-brand" : "bg-white/10 text-[#c5d2ec]")}>{badges[value]}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="relative mt-auto space-y-2 p-4">
            <Link href={`/contact?service=Technical%20SEO&website=${encodeURIComponent(report.rootHost)}`} className="sheen relative mb-3 block overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-navy-2 p-4 ring-1 ring-inset ring-white/15 transition-transform hover:-translate-y-0.5">
              <Headset size={18} className="text-[#b9d3fb]" />
              <div className="mt-2 text-sm font-bold">Need help fixing these?</div>
              <p className="mt-0.5 text-xs leading-relaxed text-[#c5d2ec]">Our SEO team can fix every issue for you.</p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-white">Get a free quote <ArrowRight size={12} /></span>
            </Link>
            <Button variant="light" className="w-full" onClick={onRerun}><RotateCw size={15} /> Re-run audit</Button>
            <Button className="w-full" onClick={onNew}><Plus size={16} /> New audit</Button>
            <p className="pt-2 text-center text-[11px] text-[#8fa3cf]">{fmt(fetched)} pages · {formatDuration(report.durationMs)}</p>
          </div>
        </aside>

        {/* ── Main column ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button onClick={onHome} className="lg:hidden" aria-label="Sire Crawler home"><Logo compact /></button>
                <nav className="hidden min-w-0 items-center gap-1.5 text-sm text-mute sm:flex" aria-label="Breadcrumb">
                  <span>Site Audit</span>
                  <ChevronRight size={14} className="shrink-0 text-faint" />
                  <span className="truncate font-semibold text-ink">{report.rootHost}</span>
                  <ChevronRight size={14} className="hidden shrink-0 text-faint md:block" />
                  <span className="hidden text-ink-2 md:inline">{current.label}</span>
                </nav>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {exportMenu}
                <Button variant="secondary" className="lg:hidden" onClick={onRerun} aria-label="Re-run audit"><RotateCw size={16} /></Button>
                <Button className="lg:hidden" onClick={onNew} aria-label="New audit"><Plus size={16} /></Button>
              </div>
            </div>
            <div className="border-t border-line-2 px-2 sm:px-6 lg:hidden">
              <Tabs value={tab} onChange={selectTab} tabs={REPORT_TABS.map(({ value, label, Icon }) => ({ value, label, icon: <Icon size={16} />, badge: badges[value] }))} />
            </div>
          </header>

          <main className="w-full max-w-[1320px] flex-1 px-4 pb-16 pt-8 sm:px-8">
            <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-ink">
                  {current.title}
                  {tab === "overview" && <span className="font-display text-[32px] font-normal italic text-brand"> · {report.rootHost}</span>}
                </h1>
                <p className="mt-1 text-sm text-mute">{current.subtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mute">
                <a href={report.startUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-mono hover:text-brand">
                  <ExternalLink size={12} />{displayUrl(report.startUrl)}
                </a>
                <span className="flex items-center gap-1.5"><Clock size={12} />{formatDate(report.finishedAt)}</span>
                <span className="lg:hidden">{fmt(fetched)} pages · {formatDuration(report.durationMs)}</span>
              </div>
            </div>

            {note && (
              <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-notice-50 px-4 py-3 text-sm text-ink-2 ring-1 ring-inset ring-notice/15">
                <Info size={16} className="mt-0.5 shrink-0 text-notice" />
                {note}
              </div>
            )}

            <div key={tab} className="animate-fade-up">
              {tab === "overview" && <Overview report={report} previous={previous} onNavigate={navigate} />}
              {tab === "issues" && (
                <IssuesView report={report} previous={previous} filters={filters.issues} setFilters={(f) => setFilters((p) => ({ ...p, issues: f }))} onOpenPage={setDrawerUrl} />
              )}
              {tab === "pages" && (
                <PagesView report={report} filters={filters.pages} setFilters={(f) => setFilters((p) => ({ ...p, pages: f }))} onOpenPage={setDrawerUrl} />
              )}
              {tab === "stats" && <StatsView report={report} />}
              {tab === "progress" && <HistoryView report={report} history={history} />}
            </div>

            {(tab === "overview" || tab === "issues") && (
              <div className="sheen relative mt-8 overflow-hidden rounded-3xl bg-navy px-6 py-8 text-white shadow-lift sm:px-10">
                <div className="hero-grid absolute inset-0 opacity-60" />
                <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand/60 blur-[90px]" />
                <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#9ec5f4]">Done-for-you SEO</div>
                    <h3 className="mt-1.5 text-2xl font-extrabold tracking-tight">
                      {report.counts.error + report.counts.warning > 0 ? `${fmt(report.counts.error + report.counts.warning)} issues to fix — ` : ""}
                      <span className="font-display font-normal italic text-[#b9d3fb]">let our experts handle it</span>
                    </h3>
                    <p className="mt-1 text-sm text-[#b7c6e6]">Technical SEO, website audits, Google Ads, social media and web design.</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <Link href={`/contact?service=Technical%20SEO&website=${encodeURIComponent(report.rootHost)}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-navy transition-colors hover:bg-brand-50">
                      Get a free quote <ArrowRight size={16} />
                    </Link>
                    <Link href="/contact" className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition-colors hover:bg-white/10">
                      Contact us
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </main>

          <ReportFooter />
        </div>

        {drawerUrl && <PageDrawer key={drawerUrl} report={report} url={drawerUrl} onClose={closeDrawer} onOpenPage={setDrawerUrl} />}
      </div>
      <PrintReport report={report} />
    </>
  );
}

/**
 * The audit app. On the marketing home page it shows the full landing; inside
 * the dashboard (`embedded`) it shows a compact start screen.
 */
export default function SireCrawler({ user = null, proPrice = null, embedded = false }) {
  const router = useRouter();
  const crawl = useCrawl();
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [lastUrl, setLastUrl] = useState("");
  const history = useSyncExternalStore(subscribeHistory, getHistorySnapshot, getServerHistorySnapshot);
  const savedRef = useRef(null);

  useEffect(() => {
    if (crawl.report && savedRef.current !== crawl.report) {
      savedRef.current = crawl.report;
      saveToHistory(crawl.report);
      // Signed-in users also keep the summary in their dashboard
      if (user) {
        fetch("/api/audits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(summarize(crawl.report)) })
          .then(() => router.refresh())
          .catch(() => {});
      }
    }
  }, [crawl.report, user, router]);

  useEffect(() => {
    if (crawl.status !== "idle") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [crawl.status]);

  const start = useCallback(
    (input, overrides) => {
      const url = coerceStartUrl(input);
      if (!url) {
        crawl.setError(input?.trim() ? "That doesn't look like a valid website address. Try something like example.com or https://www.example.com" : "Please enter a website address to audit.");
        return;
      }
      const next = { ...options, ...overrides };
      const maxPages = user?.maxPages ?? 100;
      if (next.maxPages > maxPages) next.maxPages = maxPages;
      setLastUrl(url);
      crawl.start(url, next);
    },
    [crawl, options, user]
  );

  const goHome = useCallback(() => (embedded ? router.push("/dashboard") : crawl.reset()), [embedded, router, crawl]);
  const showLanding = crawl.status === "idle" || crawl.status === "error";
  const showReport = crawl.status === "done" && crawl.report;

  if (showReport) {
    return (
      <div className="min-h-screen bg-canvas">
        <ReportView report={crawl.report} history={history} onRerun={() => start(crawl.report.startUrl, crawl.report.options)} onNew={crawl.reset} onHome={goHome} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {embedded ? (
        <nav className={cx("sticky top-0 z-40 border-b backdrop-blur-xl", showLanding ? "border-white/10 bg-navy/90" : "border-line bg-white/85")}>
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/dashboard" aria-label="Dashboard"><Logo light={showLanding} /></Link>
            <Link
              href="/dashboard"
              className={cx("inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors", showLanding ? "text-white ring-1 ring-inset ring-white/20 hover:bg-white/10" : "text-ink ring-1 ring-inset ring-line hover:bg-canvas")}
            >
              <ArrowLeft size={15} /> Dashboard
            </Link>
          </div>
        </nav>
      ) : (
        <SiteNav user={user} tone={showLanding ? "dark" : "light"} onHome={crawl.status === "running" ? undefined : crawl.reset} />
      )}

      <div className="flex-1">
        {showLanding && (
          <Landing
            onStart={start}
            error={crawl.error}
            history={history}
            options={options}
            setOptions={setOptions}
            user={user}
            proPrice={proPrice}
            compact={embedded}
            onOpenHistory={(h) => start(h.startUrl, h.options?.maxPages ? { maxPages: h.options.maxPages } : undefined)}
            onRemoveHistory={removeFromHistory}
          />
        )}

        {crawl.status === "running" && <CrawlProgress url={lastUrl} progress={crawl.progress} onStop={crawl.stop} />}
      </div>

      {embedded ? null : showLanding ? <SiteFooter /> : <ReportFooter className="mt-12" />}
    </div>
  );
}
