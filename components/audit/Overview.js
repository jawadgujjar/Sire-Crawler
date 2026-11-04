"use client";

import { ArrowRight, Bot, ShieldCheck, Gauge, Network, FileText, Code2, Languages, CircleCheck, Info } from "lucide-react";
import { CHECK_BY_ID, CATEGORIES } from "@/lib/audit/checks";
import { Card, CardHeader, ScoreGauge, ScoreRing, StackedBar, Delta, SeverityIcon, CheckItem, scoreTone, cx, fmt } from "./ui";

export const CATEGORY_ICONS = {
  crawlability: Bot,
  https: ShieldCheck,
  performance: Gauge,
  linking: Network,
  content: FileText,
  markup: Code2,
  international: Languages,
};

export const GROUPS = [
  { id: "healthy", label: "Healthy", color: "#0ca30c" },
  { id: "issues", label: "Have issues", color: "#fab219" },
  { id: "redirect", label: "Redirects", color: "#ec835a" },
  { id: "broken", label: "Broken", color: "#d03b3b" },
  { id: "blocked", label: "Blocked", color: "#a3adc2" },
];

export default function Overview({ report, previous, onNavigate }) {
  const tone = scoreTone(report.score);
  const fetched = report.pages.filter((p) => p.fetched).length;
  const topIssues = report.issues.filter((i) => i.severity !== "notice").slice(0, 8);
  const site = report.site || {};

  return (
    <div className="space-y-6">
      {/* ── Headline row ── */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
        <Card className="relative flex flex-col items-center overflow-hidden px-6 pb-6 pt-5 text-center">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-50/70 to-transparent" />
          <div className="relative flex w-full items-center justify-between">
            <h3 className="text-[15px] font-bold text-ink">Site Health</h3>
            {previous && <Delta value={report.score - previous.score} goodWhenDown={false} suffix=" pts" />}
          </div>
          <div className="relative mt-4">
            <ScoreGauge score={report.score} size={230} />
          </div>
          <span className={cx("mt-3 rounded-full px-3 py-1 text-xs font-bold", tone.soft, tone.text)}>{tone.label}</span>
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-mute">
            Based on the number and severity of issues found across {fmt(fetched)} crawled page{fetched === 1 ? "" : "s"}. Fix errors first for the biggest gain.
          </p>
        </Card>

        <div className="grid gap-6">
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-ink">Crawled pages</h3>
                <div className="mt-1 text-4xl font-extrabold tracking-tight text-ink">{fmt(report.pages.length)}</div>
              </div>
              <button onClick={() => onNavigate("pages", {})} className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                View all <ArrowRight size={13} />
              </button>
            </div>
            <div className="mt-5">
              <StackedBar segments={GROUPS.map((g) => ({ label: g.label, value: report.pageGroups[g.id], color: g.color }))} height={14} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-5">
              {GROUPS.map((g) => (
                <button key={g.id} onClick={() => onNavigate("pages", { group: g.id })} className="group text-left">
                  <span className="flex items-center gap-2 text-xs text-mute group-hover:text-ink">
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: g.color }} />
                    {g.label}
                  </span>
                  <span className="mt-0.5 block text-lg font-bold tabular-nums text-ink">{fmt(report.pageGroups[g.id])}</span>
                </button>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            {["error", "warning", "notice"].map((sev) => (
              <button key={sev} onClick={() => onNavigate("issues", { severity: sev })} className="text-left">
                <Card className="relative h-full overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
                  <span className={cx("absolute inset-x-0 top-0 h-[3px]", sev === "error" ? "bg-critical" : sev === "warning" ? "bg-warning" : "bg-notice")} />
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold text-ink-2">
                      <SeverityIcon severity={sev} />
                      {sev === "error" ? "Errors" : sev === "warning" ? "Warnings" : "Notices"}
                    </span>
                    {previous && <Delta value={report.counts[sev] - (previous.counts?.[sev] ?? 0)} />}
                  </div>
                  <div className="mt-3 text-3xl font-extrabold tracking-tight text-ink">{fmt(report.counts[sev])}</div>
                  <div className="mt-1 text-xs text-mute">
                    {report.issues.filter((i) => i.severity === sev).length} issue type{report.issues.filter((i) => i.severity === sev).length === 1 ? "" : "s"}
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Thematic reports ── */}
      <div>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">By category</div>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight text-ink">Thematic reports</h2>
            <p className="text-sm text-mute">Each area is scored separately so you can see where to focus.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {report.categories.map((c) => {
            const Icon = CATEGORY_ICONS[c.id];
            return (
              <button key={c.id} onClick={() => onNavigate("issues", { category: c.id })} className="text-left">
                <Card className="group h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand">
                      <Icon size={19} />
                    </span>
                    <ScoreRing score={c.score} size={50} stroke={5} />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-ink">{c.label}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-mute">{c.description}</p>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold tabular-nums">
                    <span className="flex items-center gap-1 text-ink-2"><SeverityIcon severity="error" size={12} />{fmt(c.error)}</span>
                    <span className="flex items-center gap-1 text-ink-2"><SeverityIcon severity="warning" size={12} />{fmt(c.warning)}</span>
                    <span className="flex items-center gap-1 text-ink-2"><SeverityIcon severity="notice" size={12} />{fmt(c.notice)}</span>
                  </div>
                </Card>
              </button>
            );
          })}
          <Card className="sheen relative flex flex-col justify-between overflow-hidden border-0 bg-gradient-to-br from-brand via-navy-2 to-navy p-5 text-white">
            <div>
              <h3 className="text-sm font-bold">Checks passed</h3>
              <div className="mt-2 text-4xl font-extrabold tracking-tight">{report.passed.length}<span className="text-xl text-brand-100">/{report.passed.length + report.issues.length}</span></div>
            </div>
            <button onClick={() => onNavigate("issues", { severity: "passed" })} className="mt-4 flex items-center gap-1 text-xs font-semibold text-brand-100 hover:text-white">
              See passed checks <ArrowRight size={13} />
            </button>
          </Card>
        </div>
      </div>

      {/* ── Top issues + site config ── */}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader
            title="Top issues"
            subtitle="The errors and warnings affecting the most pages"
            action={
              <button onClick={() => onNavigate("issues", {})} className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                All issues <ArrowRight size={13} />
              </button>
            }
          />
          {topIssues.length === 0 ? (
            <div className="flex items-center gap-3 px-6 py-10 text-sm text-ink-2">
              <CircleCheck className="text-good" /> No errors or warnings found. Outstanding work.
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-line-2 pb-2">
              {topIssues.map((issue) => {
                const check = CHECK_BY_ID[issue.id];
                const share = issue.site ? null : Math.min(100, Math.round((issue.count / Math.max(1, fetched)) * 100));
                return (
                  <li key={issue.id}>
                    <button onClick={() => onNavigate("issues", { open: issue.id })} className="group flex w-full items-center gap-4 px-6 py-3 text-left transition-colors hover:bg-canvas">
                      <SeverityIcon severity={issue.severity} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink group-hover:text-brand">{check.title(issue.count)}</span>
                        <span className="text-xs text-mute">{CATEGORIES[check.category].label}</span>
                      </span>
                      {share !== null && (
                        <span className="hidden w-32 shrink-0 items-center gap-2 sm:flex">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-2">
                            <span className={cx("block h-full rounded-full", issue.severity === "error" ? "bg-critical" : "bg-warning")} style={{ width: `${Math.max(share, 2)}%` }} />
                          </span>
                          <span className="w-9 text-right text-xs font-semibold tabular-nums text-ink-2">{share}%</span>
                        </span>
                      )}
                      <ArrowRight size={15} className="shrink-0 text-faint group-hover:text-brand" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Site configuration" subtitle="Domain-level checks" />
          <ul className="divide-y divide-line-2 px-6 pb-3 pt-2">
            <CheckItem
              ok={site.robots?.found}
              warn
              label="robots.txt"
              detail={site.robots?.found ? `Found · ${site.robots.disallowCount} disallow rule${site.robots.disallowCount === 1 ? "" : "s"}${site.robots.crawlDelay ? ` · crawl-delay ${site.robots.crawlDelay}s` : ""}` : "Not found"}
            />
            <CheckItem
              ok={site.sitemap?.found}
              warn
              label="XML sitemap"
              detail={site.sitemap?.found ? `${fmt(report.sitemapUrlCount)} URLs in ${site.sitemap.files.filter((f) => !f.error).length} file${site.sitemap.files.filter((f) => !f.error).length === 1 ? "" : "s"}${site.sitemap.declaredInRobots ? " · declared in robots.txt" : ""}` : "Not found"}
            />
            {report.startUrl.startsWith("https:") ? (
              <CheckItem
                ok={site.certificate && !site.certificate.error && site.certificate.authorized && site.certificate.daysLeft >= 30}
                label="SSL certificate"
                detail={site.certificate?.error || (site.certificate ? `${site.certificate.issuer || "Unknown issuer"} · expires in ${site.certificate.daysLeft} days` : "Not checked")}
              />
            ) : (
              <CheckItem ok={false} label="HTTPS" detail="Site is served over plain HTTP" />
            )}
            {site.httpRedirect && (
              <CheckItem
                ok={site.httpRedirect.toHttps || site.httpRedirect.status === 0 || site.httpRedirect.status >= 400}
                warn
                label="HTTP → HTTPS redirect"
                detail={site.httpRedirect.toHttps ? `${site.httpRedirect.status} redirect` : site.httpRedirect.status ? `HTTP version returns ${site.httpRedirect.status}` : "HTTP version not reachable"}
              />
            )}
            {site.hostVariant && (
              <CheckItem
                ok={site.hostVariant.consolidated}
                warn
                label="www / non-www"
                detail={site.hostVariant.redirectsTo ? `${site.hostVariant.host} → ${site.hostVariant.redirectsTo}` : site.hostVariant.status ? `${site.hostVariant.host} returns ${site.hostVariant.status}` : `${site.hostVariant.host} not reachable`}
              />
            )}
            <CheckItem ok={!report.siteIssues.some((i) => i.id === "no_hsts")} warn label="HSTS" detail={report.siteIssues.some((i) => i.id === "no_hsts") ? "Strict-Transport-Security header missing" : report.startUrl.startsWith("https:") ? "Enabled" : "Requires HTTPS"} />
          </ul>
        </Card>
      </div>

      <p className="flex items-center gap-2 text-xs text-mute">
        <Info size={13} />
        Checked {fmt(report.resources.externalChecked)} of {fmt(report.resources.externalTotal)} external links and {fmt(report.resources.imageChecked)} of {fmt(report.resources.imageTotal)} internal images.
      </p>
    </div>
  );
}
