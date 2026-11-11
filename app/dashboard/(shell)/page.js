import Link from "next/link";
import { ScanSearch, ArrowRight, Globe, Files, Gauge, Crown, Headset, Sparkles, Lock } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Card, ScoreRing } from "@/components/audit/ui";
import { requireUser } from "@/lib/server/dal";
import { getUserAudits, getUserAuditStats } from "@/lib/server/queries";
import { fmtNumber, formatDateTime, formatDay } from "@/lib/format";
import { PRO_TOOLS } from "@/lib/plans";

export default async function DashboardHome() {
  const user = await requireUser();
  const [audits, stats] = await Promise.all([getUserAudits(user.id, 8), getUserAuditStats(user.id)]);
  const first = user.name.split(" ")[0];
  const latest = audits[0];
  const pro = user.plan === "pro";

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${first}`}
        subtitle="Your audits, plan and services at a glance."
        actions={
          <Link href="/dashboard/audit" className="inline-flex h-11 items-center gap-2 rounded-xl bg-navy px-5 text-sm font-semibold text-white shadow-[0_12px_28px_-14px_rgb(7_21_56/0.9)] transition-colors hover:bg-navy-3">
            <ScanSearch size={16} /> Start a new audit
          </Link>
        }
      />

      {/* ── Stat tiles ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="relative overflow-hidden p-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-brand-50/80 to-transparent" />
          <div className="relative flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-2">Latest health score</span>
            <Gauge size={17} className="text-brand" />
          </div>
          <div className="relative mt-3 flex items-center gap-4">
            {latest ? <ScoreRing score={latest.score} size={56} stroke={6} /> : <span className="text-3xl font-extrabold text-faint">—</span>}
            <div className="min-w-0 text-xs text-mute">{latest ? <><b className="block truncate text-sm text-ink">{latest.host}</b>{formatDay(latest.finishedAt)}</> : "Run your first audit"}</div>
          </div>
        </Card>
        {[
          { label: "Audits run", value: fmtNumber(stats.audits), Icon: ScanSearch },
          { label: "Pages crawled", value: fmtNumber(stats.pages), Icon: Files },
          { label: "Websites audited", value: fmtNumber(stats.sites), Icon: Globe },
        ].map(({ label, value, Icon }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink-2">{label}</span>
              <Icon size={17} className="text-brand" />
            </div>
            <div className="mt-3 text-4xl font-extrabold tracking-tight text-ink">{value}</div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* ── Recent audits ── */}
        <Card>
          <div className="flex items-start justify-between gap-4 px-6 pt-5">
            <div>
              <h2 className="text-[15px] font-bold text-ink">Recent audits</h2>
              <p className="mt-0.5 text-xs text-mute">Saved automatically when an audit finishes</p>
            </div>
            <Link href="/dashboard/audit" className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">New audit <ArrowRight size={13} /></Link>
          </div>
          {audits.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand"><ScanSearch size={22} /></span>
              <h3 className="mt-4 font-bold text-ink">No audits yet</h3>
              <p className="mt-1 max-w-xs text-sm text-mute">Audit any website in minutes. Your results will appear here.</p>
              <Link href="/dashboard/audit" className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-glow hover:bg-brand-600">
                Run your first audit <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-y border-line bg-canvas/70 text-left text-[11px] font-bold uppercase tracking-wider text-mute">
                    <th className="px-6 py-3">Website</th>
                    <th className="px-3 py-3 text-right">Health</th>
                    <th className="px-3 py-3 text-right">Pages</th>
                    <th className="px-3 py-3 text-right">Errors</th>
                    <th className="px-6 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-2">
                  {audits.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-canvas/60">
                      <td className="px-6 py-3">
                        <div className="font-semibold text-ink">{a.host}</div>
                        <div className="max-w-[260px] truncate font-mono text-[11px] text-mute">{a.startUrl}</div>
                      </td>
                      <td className="px-3 py-3"><div className="flex justify-end"><ScoreRing score={a.score} size={36} stroke={4} /></div></td>
                      <td className="px-3 py-3 text-right tabular-nums text-ink-2">{fmtNumber(a.pages)}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-critical">{fmtNumber(a.counts?.error)}</td>
                      <td className="whitespace-nowrap px-6 py-3 text-right text-xs text-mute">{formatDateTime(a.finishedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          {/* ── Plan ── */}
          <div className="sheen relative overflow-hidden rounded-2xl bg-navy p-6 text-white shadow-lift">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand/60 blur-[70px]" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#9ec5f4]">Your plan</span>
                {pro && <Crown size={18} className="text-[#f6d27a]" />}
              </div>
              <div className="mt-2 text-3xl font-extrabold tracking-tight">{pro ? "Pro" : "Free"}</div>
              <p className="mt-1 text-sm text-[#b7c6e6]">Audits up to {fmtNumber(user.maxPages)} pages{pro ? ", fast crawling and Pro tools." : "."}</p>
              {pro && user.subscription?.currentPeriodEnd && (
                <p className="mt-3 text-xs text-[#9fb2d8]">{user.subscription.cancelAtPeriodEnd ? "Ends" : "Renews"} on {formatDay(user.subscription.currentPeriodEnd)}</p>
              )}
              <Link href="/dashboard/billing" className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-navy transition-colors hover:bg-brand-50">
                {pro ? "Manage billing" : <><Crown size={15} /> Upgrade to Pro</>}
              </Link>
            </div>
          </div>

          {/* ── Services CTA ── */}
          <Card className="p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand"><Headset size={19} /></span>
            <h3 className="mt-4 text-[15px] font-bold text-ink">Want experts to fix it for you?</h3>
            <p className="mt-1 text-sm leading-relaxed text-mute">Technical SEO, website audits, Google Ads, social media and web design — done for you.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/dashboard/services" className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-3">Request a quote <ArrowRight size={15} /></Link>
              <Link href="/contact" className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-ink ring-1 ring-inset ring-line hover:bg-canvas">Contact us</Link>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Pro tools teaser ── */}
      <div className="mt-6">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">Pro tools</div>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight text-ink">Go beyond the audit</h2>
          </div>
          <Link href="/dashboard/tools" className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">Explore <ArrowRight size={13} /></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PRO_TOOLS.map((t) => (
            <Link key={t.id} href="/dashboard/tools" className="group">
              <Card className="h-full p-5 transition-all group-hover:-translate-y-0.5 group-hover:shadow-lift">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand"><Sparkles size={18} /></span>
                  {!pro && <span className="inline-flex items-center gap-1 rounded-full bg-line-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mute"><Lock size={10} /> Pro</span>}
                </div>
                <h3 className="mt-4 text-sm font-bold text-ink">{t.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-mute">{t.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
