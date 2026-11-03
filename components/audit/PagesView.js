"use client";

import { useMemo, useState } from "react";
import { Search, ChevronUp, ChevronDown, Files } from "lucide-react";
import { displayUrl } from "@/lib/audit/url";
import { Card, Segmented, StatusPill, Pagination, EmptyState, SeverityIcon, cx, fmt, formatMs, formatBytes } from "./ui";
import { GROUPS } from "./Overview";

const PAGE_SIZE = 50;

const COLUMNS = [
  { key: "url", label: "Page", get: (p) => p.url, align: "left" },
  { key: "status", label: "Status", get: (p) => (p.fetched ? p.status || 0 : -1) },
  { key: "issues", label: "Issues", get: (p) => p.counts.error * 1e6 + p.counts.warning * 1e3 + p.counts.notice },
  { key: "depth", label: "Depth", get: (p) => (p.depth === null ? 999 : p.depth) },
  { key: "inlinks", label: "Inlinks", get: (p) => p.inlinks },
  { key: "words", label: "Words", get: (p) => p.wordCount ?? -1 },
  { key: "load", label: "Load", get: (p) => p.loadTime ?? -1 },
  { key: "size", label: "Size", get: (p) => p.size ?? -1 },
];

export default function PagesView({ report, filters, setFilters, onOpenPage }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "issues", asc: false });
  const [page, setPage] = useState(0);
  const group = filters.group || "all";

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const col = COLUMNS.find((c) => c.key === sort.key);
    return report.pages
      .filter((p) => group === "all" || p.group === group)
      .filter((p) => !q || p.url.toLowerCase().includes(q) || (p.title || "").toLowerCase().includes(q))
      .sort((a, b) => {
        const av = col.get(a);
        const bv = col.get(b);
        const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
        return sort.asc ? cmp : -cmp;
      });
  }, [report, group, query, sort]);

  const pageCount = Math.ceil(rows.length / PAGE_SIZE);
  const current = Math.min(page, Math.max(0, pageCount - 1));
  const visible = rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  const toggleSort = (key) => {
    setSort((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: key === "url" || key === "depth" }));
    setPage(0);
  };

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-line px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          value={group}
          onChange={(v) => {
            setFilters({ ...filters, group: v });
            setPage(0);
          }}
          options={[{ id: "all", label: "All pages" }, ...GROUPS].map((g) => ({
            value: g.id,
            label: g.label,
            count: g.id === "all" ? report.pages.length : report.pageGroups[g.id],
          }))}
          className="overflow-x-auto"
        />
        <label className="relative">
          <span className="sr-only">Search pages</span>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Filter by URL or title"
            className="h-9 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink placeholder:text-faint focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15 lg:w-72"
          />
        </label>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Files size={22} />} title="No pages match" description="Try another filter or search term." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas/70">
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={sort.key === c.key ? (sort.asc ? "ascending" : "descending") : "none"}
                    className={cx("px-4 py-3 text-xs font-bold uppercase tracking-wider text-mute first:pl-6 last:pr-6", c.align === "left" ? "text-left" : "text-right")}
                  >
                    <button onClick={() => toggleSort(c.key)} className={cx("inline-flex items-center gap-1 hover:text-ink", sort.key === c.key && "text-ink")}>
                      {c.label}
                      {sort.key === c.key ? (sort.asc ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : <ChevronDown size={13} className="opacity-30" />}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line-2">
              {visible.map((p) => (
                <tr key={p.url} onClick={() => onOpenPage(p.url)} className="group cursor-pointer transition-colors hover:bg-brand-50/40">
                  <td className="max-w-[420px] py-3 pl-6 pr-4">
                    <div className="truncate font-mono text-xs font-medium text-ink group-hover:text-brand" title={p.url}>{displayUrl(p.url)}</div>
                    <div className="mt-0.5 truncate text-xs text-mute" title={p.title}>
                      {p.title || (p.fetched && p.isHtml ? <span className="italic text-critical">Missing title</span> : p.indexability)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right"><StatusPill page={p} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2.5 text-xs font-semibold tabular-nums text-ink-2">
                      {p.counts.error > 0 && <span className="flex items-center gap-1"><SeverityIcon severity="error" size={13} />{p.counts.error}</span>}
                      {p.counts.warning > 0 && <span className="flex items-center gap-1"><SeverityIcon severity="warning" size={13} />{p.counts.warning}</span>}
                      {p.counts.notice > 0 && <span className="flex items-center gap-1"><SeverityIcon severity="notice" size={13} />{p.counts.notice}</span>}
                      {!p.issues.length && <span className="text-good-ink">Clean</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums text-ink-2">{p.depth ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums text-ink-2">{fmt(p.inlinks)}</td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums text-ink-2">{p.wordCount !== undefined ? fmt(p.wordCount) : "—"}</td>
                  <td className={cx("px-4 py-3 text-right text-xs font-semibold tabular-nums", p.loadTime > 1500 ? "text-critical" : "text-ink-2")}>{formatMs(p.loadTime)}</td>
                  <td className="py-3 pl-4 pr-6 text-right text-xs tabular-nums text-ink-2">{p.size !== undefined ? formatBytes(p.size) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={current} pageCount={pageCount} onChange={setPage} total={rows.length} pageSize={PAGE_SIZE} />
    </Card>
  );
}
