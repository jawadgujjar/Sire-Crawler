"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Lightbulb, Wrench, Copy, Check, CircleCheck, ExternalLink, ListChecks } from "lucide-react";
import { CHECKS, CHECK_BY_ID, CATEGORIES } from "@/lib/audit/checks";
import { displayUrl } from "@/lib/audit/url";
import { Card, Segmented, SeverityIcon, SeverityBadge, EmptyState, Button, cx, fmt } from "./ui";

const PAGE_SIZE = 25;

function AffectedList({ issue, onOpenPage }) {
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const [copied, setCopied] = useState(false);
  const items = issue.items;
  const visible = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageCount = Math.ceil(items.length / PAGE_SIZE);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(items.map((i) => i.url).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-canvas px-4 py-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-mute">
          {issue.site ? "Affected site" : `Affected URLs · ${fmt(items.length)}`}
        </span>
        {!issue.site && (
          <Button variant="ghost" size="sm" onClick={copy}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy URLs"}
          </Button>
        )}
      </div>
      <ul className="divide-y divide-line-2">
        {visible.map((item, idx) => {
          const key = item.url + idx;
          const open = expanded === key;
          return (
            <li key={key} className="px-4 py-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  {issue.site ? (
                    <span className="text-sm font-semibold text-ink">{displayUrl(item.url)}</span>
                  ) : (
                    <button onClick={() => onOpenPage(item.url)} className="max-w-full truncate text-left font-mono text-xs font-medium text-brand hover:underline" title={item.url}>
                      {displayUrl(item.url)}
                    </button>
                  )}
                  {item.detail && <div className="mt-0.5 break-words text-xs text-mute">{item.detail}</div>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.list?.length > 0 && (
                    <button onClick={() => setExpanded(open ? null : key)} className="text-xs font-semibold text-brand hover:underline">
                      {open ? "Hide" : `Show ${item.list.length}`}
                    </button>
                  )}
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-faint hover:text-brand" aria-label="Open URL in new tab">
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
              {open && (
                <ul className="animate-fade-up mt-2 space-y-1 rounded-lg bg-canvas p-3">
                  {item.list.map((l) => (
                    <li key={l} className="break-all font-mono text-[11px] text-ink-2">{l}</li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-mute">
          <span className="tabular-nums">Page {page + 1} of {pageCount}</span>
          <div className="flex gap-1.5">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function IssueRow({ issue, open, onToggle, onOpenPage, previousCount }) {
  const check = CHECK_BY_ID[issue.id];
  const ref = useRef(null);
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [open]);
  const delta = previousCount === null ? null : issue.count - previousCount;
  return (
    <li ref={ref} className={cx("transition-colors", open && "bg-canvas/60")}>
      <button onClick={onToggle} className="group flex w-full items-center gap-4 px-6 py-4 text-left" aria-expanded={open}>
        <SeverityIcon severity={issue.severity} size={18} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink group-hover:text-brand">{check.title(issue.count)}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-mute">
            <span>{CATEGORIES[check.category].label}</span>
            {delta !== null && previousCount > 0 && delta !== 0 && (
              <span className={cx("font-semibold", delta > 0 ? "text-critical" : "text-good-ink")}>
                · {delta > 0 ? `${delta} new` : `${-delta} fixed`} since last audit
              </span>
            )}
            {previousCount === 0 && <span className="font-semibold text-critical">· New since last audit</span>}
          </span>
        </span>
        <span className="hidden text-lg font-bold tabular-nums text-ink sm:block">{fmt(issue.count)}</span>
        <ChevronDown size={18} className={cx("shrink-0 text-faint transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="animate-fade-up space-y-4 px-6 pb-6">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-line bg-white p-4">
              <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-2"><Lightbulb size={14} className="text-warning" /> Why it matters</div>
              <p className="text-sm leading-relaxed text-ink-2">{check.why}</p>
            </div>
            <div className="rounded-xl border border-line bg-white p-4">
              <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-2"><Wrench size={14} className="text-brand" /> How to fix it</div>
              <p className="text-sm leading-relaxed text-ink-2">{check.fix}</p>
            </div>
          </div>
          <AffectedList issue={issue} onOpenPage={onOpenPage} />
        </div>
      )}
    </li>
  );
}

export default function IssuesView({ report, filters, setFilters, onOpenPage, previous }) {
  const [query, setQuery] = useState("");
  const severity = filters.severity || "all";
  const category = filters.category || "all";
  const openId = filters.open || null;

  const counts = useMemo(() => {
    const c = { all: report.issues.length, error: 0, warning: 0, notice: 0, passed: report.passed.length };
    for (const i of report.issues) if (category === "all" || i.category === category) c[i.severity]++;
    if (category !== "all") {
      c.all = c.error + c.warning + c.notice;
      c.passed = report.passed.filter((id) => CHECK_BY_ID[id].category === category).length;
    }
    return c;
  }, [report, category]);

  const q = query.trim().toLowerCase();
  const list = report.issues.filter((i) => {
    if (severity !== "all" && severity !== "passed" && i.severity !== severity) return false;
    if (category !== "all" && i.category !== category) return false;
    if (q) {
      const check = CHECK_BY_ID[i.id];
      return check.name.toLowerCase().includes(q) || check.title(i.count).toLowerCase().includes(q) || i.items.some((it) => it.url.toLowerCase().includes(q));
    }
    return true;
  });
  const passed = CHECKS.filter((c) => report.passed.includes(c.id) && (category === "all" || c.category === category) && (!q || c.name.toLowerCase().includes(q)));

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-line px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          value={severity}
          onChange={(v) => setFilters({ ...filters, severity: v, open: null })}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "error", label: "Errors", count: counts.error, icon: <SeverityIcon severity="error" size={12} /> },
            { value: "warning", label: "Warnings", count: counts.warning, icon: <SeverityIcon severity="warning" size={12} /> },
            { value: "notice", label: "Notices", count: counts.notice, icon: <SeverityIcon severity="notice" size={12} /> },
            { value: "passed", label: "Passed", count: counts.passed, icon: <CircleCheck size={12} className="text-good" /> },
          ]}
          className="overflow-x-auto"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value, open: null })}
            className="h-9 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15"
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {Object.entries(CATEGORIES).map(([id, c]) => (
              <option key={id} value={id}>{c.label}</option>
            ))}
          </select>
          <label className="relative">
            <span className="sr-only">Search issues</span>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search issues or URLs"
              className="h-9 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink placeholder:text-faint focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15 sm:w-60"
            />
          </label>
        </div>
      </div>

      {severity === "passed" ? (
        passed.length === 0 ? (
          <EmptyState icon={<ListChecks size={22} />} title="No passed checks here" description="Try a different category or search." />
        ) : (
          <ul className="grid gap-x-8 px-6 py-4 md:grid-cols-2">
            {passed.map((c) => (
              <li key={c.id} className="flex items-start gap-3 border-b border-line-2 py-3">
                <CircleCheck size={17} className="mt-0.5 shrink-0 text-good" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{c.name}</span>
                  <span className="flex items-center gap-2 text-xs text-mute">{CATEGORIES[c.category].label} · <SeverityBadge severity={c.severity} /></span>
                </span>
              </li>
            ))}
          </ul>
        )
      ) : list.length === 0 ? (
        <EmptyState icon={<CircleCheck size={22} />} title="Nothing to fix here" description={q ? "No issues match your search." : "No issues of this type were found on the crawled pages."} />
      ) : (
        <ul className="divide-y divide-line">
          {list.map((issue) => (
            <IssueRow
              key={issue.id}
              issue={issue}
              open={openId === issue.id}
              onToggle={() => setFilters({ ...filters, open: openId === issue.id ? null : issue.id })}
              onOpenPage={onOpenPage}
              previousCount={previous ? previous.issues?.[issue.id] ?? 0 : null}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
