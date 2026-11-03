"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, ExternalLink, CircleCheck, CornerDownRight, ArrowRight } from "lucide-react";
import { CHECK_BY_ID, CATEGORIES, THRESHOLDS } from "@/lib/audit/checks";
import { displayUrl } from "@/lib/audit/url";
import { StatusPill, SeverityIcon, Tabs, cx, fmt, formatMs, formatBytes } from "./ui";

function Field({ label, children, mono }) {
  return (
    <div className="border-b border-line-2 py-3 last:border-0">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-mute">{label}</div>
      <div className={cx("break-words text-sm text-ink", mono && "font-mono text-xs")}>{children}</div>
    </div>
  );
}

function Missing({ children = "Not set" }) {
  return <span className="italic text-critical">{children}</span>;
}

function LengthMeter({ length, min, max }) {
  const pct = Math.min(100, (length / max) * 100);
  const color = length > max ? "#d03b3b" : length < min ? "#fab219" : "#0ca30c";
  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-2">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums text-mute">{length} / {min}–{max} chars</span>
    </div>
  );
}

function LinkList({ links, byUrl, onOpenPage, empty }) {
  const [limit, setLimit] = useState(50);
  if (!links.length) return <p className="py-6 text-center text-sm text-mute">{empty}</p>;
  return (
    <div>
      <ul className="divide-y divide-line-2">
        {links.slice(0, limit).map((l) => {
          const target = l.internal ? byUrl.get(l.url) : null;
          return (
            <li key={l.url} className="flex items-center gap-3 py-2.5">
              {target ? <StatusPill page={target} /> : <span className="w-12 text-xs text-faint">{l.internal ? "—" : "Ext"}</span>}
              <div className="min-w-0 flex-1">
                {l.internal && target ? (
                  <button onClick={() => onOpenPage(l.url)} className="block max-w-full truncate text-left font-mono text-xs text-brand hover:underline" title={l.url}>{displayUrl(l.url)}</button>
                ) : (
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="block truncate font-mono text-xs text-ink-2 hover:text-brand" title={l.url}>{displayUrl(l.url)}</a>
                )}
                <div className="truncate text-xs text-mute">
                  {l.anchor ? `“${l.anchor}”` : <span className="italic">No anchor text</span>}
                  {l.nofollow && <span className="ml-2 rounded bg-warning-50 px-1.5 py-0.5 text-[10px] font-bold text-warning-ink">NOFOLLOW</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {links.length > limit && (
        <button onClick={() => setLimit((n) => n + 100)} className="mt-2 w-full rounded-lg py-2 text-xs font-semibold text-brand hover:bg-brand-50">
          Show more ({fmt(links.length - limit)} remaining)
        </button>
      )}
    </div>
  );
}

export default function PageDrawer({ report, url, onClose, onOpenPage }) {
  const byUrl = useMemo(() => new Map(report.pages.map((p) => [p.url, p])), [report]);
  const page = byUrl.get(url);
  const [tab, setTab] = useState("issues");
  const closeRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!page) return null;
  const internal = (page.links || []).filter((l) => l.internal);
  const external = (page.links || []).filter((l) => !l.internal);
  const sortedIssues = [...page.issues].sort((a, b) => ["error", "warning", "notice"].indexOf(a.severity) - ["error", "warning", "notice"].indexOf(b.severity));
  const isHtml = page.fetched && page.isHtml && page.status < 300;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Page details for ${page.url}`}>
      <div className="absolute inset-0 bg-navy/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="animate-slide-in relative flex h-full w-full max-w-3xl flex-col bg-white shadow-lift">
        <header className="border-b border-line px-6 pb-0 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill page={page} />
                <span className={cx("rounded-md px-2 py-0.5 text-xs font-semibold", page.indexable ? "bg-good-50 text-good-ink" : "bg-line-2 text-ink-2")}>{page.indexability}</span>
              </div>
              <h2 className="mt-2 line-clamp-2 text-lg font-bold leading-snug tracking-tight text-ink">{page.title || displayUrl(page.url)}</h2>
              <a href={page.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1.5 break-all font-mono text-xs text-brand hover:underline">
                {page.url} <ExternalLink size={12} className="shrink-0" />
              </a>
            </div>
            <button ref={closeRef} onClick={onClose} className="rounded-lg p-2 text-mute transition-colors hover:bg-line-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-6">
            {[
              ["Load time", formatMs(page.loadTime)],
              ["HTML size", page.size !== undefined ? formatBytes(page.size) : "—"],
              ["Words", page.wordCount !== undefined ? fmt(page.wordCount) : "—"],
              ["Depth", page.depth ?? "—"],
              ["Inlinks", fmt(page.inlinks)],
              ["Outlinks", fmt(page.links?.length || 0)],
            ].map(([k, v]) => (
              <div key={k} className="bg-white px-3 py-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-mute">{k}</div>
                <div className="text-sm font-bold tabular-nums text-ink">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-2">
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "issues", label: "Issues", badge: page.issues.length },
                { value: "seo", label: "On-page SEO" },
                { value: "links", label: "Links", badge: fmt(page.inlinks + (page.links?.length || 0)) },
                { value: "tech", label: "Technical" },
              ]}
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === "issues" && (
            sortedIssues.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <CircleCheck size={36} className="text-good" />
                <h3 className="mt-3 text-base font-bold text-ink">This page passed every check</h3>
                <p className="mt-1 text-sm text-mute">No errors, warnings or notices were found.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {sortedIssues.map((issue, i) => {
                  const check = CHECK_BY_ID[issue.id];
                  return (
                    <li key={issue.id + i} className="rounded-xl border border-line p-4">
                      <div className="flex items-start gap-3">
                        <SeverityIcon severity={issue.severity} size={17} className="mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h4 className="text-sm font-bold text-ink">{check.name}</h4>
                            <span className="text-xs text-mute">{CATEGORIES[check.category].label}</span>
                          </div>
                          {issue.detail && <p className="mt-0.5 break-words text-xs font-medium text-ink-2">{issue.detail}</p>}
                          <p className="mt-2 text-xs leading-relaxed text-mute"><b className="text-ink-2">Fix:</b> {check.fix}</p>
                          {issue.list?.length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs font-semibold text-brand">Show {issue.list.length} affected item{issue.list.length === 1 ? "" : "s"}</summary>
                              <ul className="mt-2 space-y-1 rounded-lg bg-canvas p-3">
                                {issue.list.map((l) => <li key={l} className="break-all font-mono text-[11px] text-ink-2">{l}</li>)}
                              </ul>
                            </details>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          )}

          {tab === "seo" && (
            isHtml ? (
              <div>
                <Field label="Title tag">
                  {page.title || <Missing />}
                  {page.title && <LengthMeter length={page.title.length} min={THRESHOLDS.titleMin} max={THRESHOLDS.titleMax} />}
                </Field>
                <Field label="Meta description">
                  {page.hasMetaDescription ? page.metaDescription : <Missing />}
                  {page.hasMetaDescription && <LengthMeter length={page.metaDescription.length} min={THRESHOLDS.descriptionMin} max={THRESHOLDS.descriptionMax} />}
                </Field>
                <Field label={`H1 (${page.h1?.length || 0})`}>
                  {page.h1?.length ? <ul className="space-y-1">{page.h1.map((h, i) => <li key={i}>{h}</li>)}</ul> : <Missing>No H1 heading</Missing>}
                </Field>
                <Field label={`H2 (${page.h2Count || 0})`}>
                  {page.h2?.length ? (
                    <ul className="space-y-1 text-ink-2">{page.h2.slice(0, 12).map((h, i) => <li key={i} className="flex gap-2"><CornerDownRight size={13} className="mt-1 shrink-0 text-faint" />{h}</li>)}</ul>
                  ) : <span className="text-mute">None</span>}
                  {page.h2Count > 12 && <div className="mt-1 text-xs text-mute">+{page.h2Count - 12} more</div>}
                </Field>
                <Field label="Canonical URL" mono>{page.canonical || <Missing />}{page.canonicalized && <div className="mt-1 font-sans text-xs text-warning-ink">Points to a different URL</div>}</Field>
                <Field label="Robots directives" mono>{[page.robotsMeta, page.xRobotsTag && `X-Robots-Tag: ${page.xRobotsTag}`].filter(Boolean).join(" · ") || <span className="font-sans text-mute">None (index, follow)</span>}</Field>
                <Field label="Language">{page.lang || <Missing />}</Field>
                {page.hreflang?.length > 0 && (
                  <Field label={`Hreflang (${page.hreflang.length})`}>
                    <ul className="space-y-1">{page.hreflang.map((h) => <li key={h.lang + h.href} className="font-mono text-xs"><b>{h.lang}</b> → {displayUrl(h.href)}</li>)}</ul>
                  </Field>
                )}
                <Field label="Open Graph">
                  <div className="space-y-1 text-sm">
                    <div><span className="text-mute">og:title</span> {page.ogTitle || <Missing />}</div>
                    <div><span className="text-mute">og:description</span> {page.ogDescription || <Missing />}</div>
                    <div className="break-all"><span className="text-mute">og:image</span> {page.ogImage ? <span className="font-mono text-xs">{page.ogImage}</span> : <Missing />}</div>
                    <div><span className="text-mute">twitter:card</span> {page.twitterCard || <span className="text-mute">—</span>}</div>
                  </div>
                </Field>
                <Field label="Structured data">
                  {page.schemaTypes?.length ? (
                    <div className="flex flex-wrap gap-1.5">{page.schemaTypes.map((t) => <span key={t} className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand">{t}</span>)}</div>
                  ) : <span className="text-mute">None found</span>}
                </Field>
                <Field label={`Images (${page.imageCount || 0})`}>
                  {(page.images || []).length ? (
                    <span>{(page.images || []).filter((i) => i.alt === null).length} missing alt attribute · {(page.images || []).filter((i) => i.alt === "").length} decorative (empty alt)</span>
                  ) : <span className="text-mute">No images</span>}
                </Field>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-mute">On-page data is only available for HTML pages that returned 200.</p>
            )
          )}

          {tab === "links" && (
            <div className="space-y-8">
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">Incoming internal links ({fmt(page.inlinks)})</h3>
                <LinkList links={page.inlinkSources.map((s) => ({ url: s.url, anchor: s.anchor, nofollow: s.nofollow, internal: true }))} byUrl={byUrl} onOpenPage={onOpenPage} empty="No crawled page links here." />
                {page.inlinks > page.inlinkSources.length && <p className="mt-1 text-xs text-mute">Showing the first {page.inlinkSources.length}.</p>}
              </section>
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">Outgoing internal links ({fmt(internal.length)})</h3>
                <LinkList links={internal} byUrl={byUrl} onOpenPage={onOpenPage} empty="No internal links on this page." />
              </section>
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">External links ({fmt(external.length)})</h3>
                <LinkList links={external} byUrl={byUrl} onOpenPage={onOpenPage} empty="No external links on this page." />
              </section>
            </div>
          )}

          {tab === "tech" && (
            <div>
              {page.redirectChain?.length > 1 && (
                <Field label="Redirect chain">
                  <ol className="space-y-1.5">
                    {page.redirectChain.map((u, i) => {
                      const hop = byUrl.get(u);
                      return (
                        <li key={u + i} className="flex items-center gap-2">
                          {i > 0 && <ArrowRight size={13} className="shrink-0 text-faint" />}
                          {hop ? <StatusPill page={hop} /> : <span className="text-xs text-faint">not crawled</span>}
                          <span className="truncate font-mono text-xs">{displayUrl(u)}</span>
                        </li>
                      );
                    })}
                  </ol>
                </Field>
              )}
              {page.error && <Field label="Error"><span className="text-critical">{page.error}</span></Field>}
              <Field label="HTTP status">{page.fetched ? page.status || "No response" : `Not crawled — blocked by robots.txt (${page.robotsRule})`}</Field>
              <Field label="Content type" mono>{page.contentType || "—"}</Field>
              <Field label="Response timing">
                Time to first byte <b className="tabular-nums">{formatMs(page.ttfb)}</b> · full download <b className="tabular-nums">{formatMs(page.loadTime)}</b>
              </Field>
              <Field label="Transfer">
                {page.size !== undefined ? (
                  <>
                    {formatBytes(page.transferSize)} transferred · {formatBytes(page.size)} HTML ·{" "}
                    {page.encoding ? <span className="font-semibold text-good-ink">{page.encoding} compression</span> : <span className="font-semibold text-critical">no compression</span>}
                  </>
                ) : "—"}
              </Field>
              {isHtml && (
                <>
                  <Field label="Resources">{page.scriptCount} scripts · {page.stylesheetCount} stylesheets · {page.renderBlocking} render-blocking in &lt;head&gt; · {page.iframeCount} iframes</Field>
                  <Field label="Text-to-HTML ratio">{page.textRatio}%</Field>
                  <Field label="Doctype · Viewport">{page.hasDoctype ? "HTML5 doctype" : <Missing>No doctype</Missing>} · {page.viewport ? "Viewport set" : <Missing>No viewport</Missing>}</Field>
                  {page.mixedContent?.length > 0 && (
                    <Field label="Mixed content">
                      <ul className="space-y-1">{page.mixedContent.map((m) => <li key={m} className="break-all font-mono text-xs text-critical">{m}</li>)}</ul>
                    </Field>
                  )}
                </>
              )}
              <Field label="Cache-Control" mono>{page.cacheControl || "—"}</Field>
              <Field label="Server" mono>{page.server || "—"}</Field>
              <Field label="HSTS">{page.hsts ? "Enabled" : "Not sent"}</Field>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
