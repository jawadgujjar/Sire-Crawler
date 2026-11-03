"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle, Square, Globe } from "lucide-react";
import { Button, Card, StatusPill, cx, fmt, formatDuration } from "./ui";
import { displayUrl } from "@/lib/audit/url";

const PHASES = [
  { id: "setup", label: "Robots.txt, sitemap & SSL", hint: "Reading site configuration" },
  { id: "crawl", label: "Crawling pages", hint: "Fetching and analysing every page" },
  { id: "resources", label: "Checking links & images", hint: "Verifying external links and images" },
  { id: "report", label: "Building report", hint: "Scoring and prioritising issues" },
];

export default function CrawlProgress({ url, progress, onStop }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const phaseIdx = Math.max(0, PHASES.findIndex((p) => p.id === progress.phase));
  const max = progress.maxPages || 100;
  const pct = Math.min(100, Math.round((progress.crawled / max) * 100));
  const elapsed = progress.startedAt ? now - progress.startedAt : 0;
  const site = progress.site;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <Card className="overflow-hidden shadow-lift">
        <div className="sheen relative overflow-hidden bg-navy px-6 py-8 sm:px-10 sm:py-10">
          <div className="hero-grid absolute inset-0 opacity-60" />
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand/50 blur-[90px]" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-100">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5ce65c] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#5ce65c]" />
                </span>
                Audit in progress
              </div>
              <h1 className="mt-2 truncate text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{displayUrl(url).replace(/\/$/, "")}</h1>
              <p className="mt-1 text-sm text-[#b7c6e6]">{progress.message || "Starting"}…</p>
            </div>
            <Button variant="light" onClick={onStop} className="shrink-0">
              <Square size={14} fill="currentColor" />
              Stop & view results
            </Button>
          </div>

          <div className="relative mt-8">
            <div className="flex items-end justify-between text-white">
              <div>
                <span className="text-6xl font-extrabold tabular-nums tracking-tight">{fmt(progress.crawled)}</span>
                <span className="ml-2 font-display text-2xl italic text-[#8fa3cf]">of {fmt(max)} pages</span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-[#b7c6e6]">{formatDuration(elapsed)}</span>
            </div>
            <div className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-[#9ec5f4] transition-all duration-500" style={{ width: `${Math.max(2, pct)}%` }} />
              <div className="animate-shimmer absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#b7c6e6]">
              <span><b className="text-white tabular-nums">{fmt(progress.discovered)}</b> URLs discovered</span>
              <span><b className="text-white tabular-nums">{fmt(progress.queued)}</b> in queue</span>
              {site?.sitemap?.found && <span><b className="text-white tabular-nums">{fmt(site.sitemap.urlCount)}</b> URLs in sitemap</span>}
              {site?.crawlDelayMs > 0 && <span>Crawl-delay {site.crawlDelayMs / 1000}s from robots.txt</span>}
            </div>
          </div>
        </div>

        <div className="grid gap-0 md:grid-cols-[280px_1fr]">
          <ol className="space-y-1 border-b border-line p-6 md:border-b-0 md:border-r">
            {PHASES.map((p, i) => {
              const state = i < phaseIdx ? "done" : i === phaseIdx ? "active" : "todo";
              return (
                <li key={p.id} className="flex items-start gap-3 py-2">
                  <span
                    className={cx(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      state === "done" && "bg-good-50 text-good-ink",
                      state === "active" && "bg-brand-50 text-brand",
                      state === "todo" && "bg-line-2 text-faint"
                    )}
                  >
                    {state === "done" ? <Check size={13} strokeWidth={3} /> : state === "active" ? <LoaderCircle size={14} className="animate-spin" /> : i + 1}
                  </span>
                  <span>
                    <span className={cx("block text-sm font-semibold", state === "todo" ? "text-faint" : "text-ink")}>{p.label}</span>
                    <span className="block text-xs text-mute">{p.hint}</span>
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="min-w-0 p-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-mute">Live crawl feed</span>
              <span className="text-[11px] font-medium text-faint">Latest 8 pages</span>
            </div>
            {progress.recent.length === 0 ? (
              <div className="flex h-40 items-center justify-center gap-2 text-sm text-mute">
                <LoaderCircle size={16} className="animate-spin text-brand" /> Waiting for the first page…
              </div>
            ) : (
              <ul className="divide-y divide-line-2">
                {progress.recent.map((p, i) => (
                  <li key={p.url + i} className={cx("flex items-center gap-3 py-2.5", i === 0 && "animate-fade-up")}>
                    <StatusPill page={p} />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-2" title={p.url}>{displayUrl(p.url)}</span>
                    {p.loadTime !== undefined && <span className="shrink-0 text-xs tabular-nums text-mute">{p.loadTime}ms</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>
      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-mute">
        <Globe size={13} /> You can stop at any time — the report is built from every page crawled so far.
      </p>
    </div>
  );
}
