import Link from "next/link";
import { Search, Link2, TrendingUp, BarChart3, Lock, Crown, Clock } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Card } from "@/components/audit/ui";
import { requireUser } from "@/lib/server/dal";
import { PRO_TOOLS } from "@/lib/plans";

export const metadata = { title: "Pro tools — Sire Crawler" };

const ICONS = { keywords: Search, backlinks: Link2, "rank-tracking": TrendingUp, traffic: BarChart3 };

export default async function ToolsPage() {
  const user = await requireUser();
  const pro = user.plan === "pro";
  return (
    <>
      <PageHeader eyebrow="Pro" title="Pro tools" accent="powered by live data" subtitle="Keyword, backlink, ranking and traffic data from search data providers." />

      {!pro && (
        <div className="sheen relative mb-6 overflow-hidden rounded-2xl bg-navy p-6 text-white shadow-lift sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand/60 blur-[90px]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold"><Crown size={17} className="text-[#f6d27a]" /> Unlock with Pro</div>
              <p className="mt-1 max-w-xl text-sm text-[#b7c6e6]">These tools use paid search data. Upgrade to Pro to get access as soon as each one goes live, plus 1,000-page audits today.</p>
            </div>
            <Link href="/dashboard/billing" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-navy hover:bg-brand-50">
              <Crown size={16} /> Upgrade to Pro
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {PRO_TOOLS.map((t) => {
          const Icon = ICONS[t.id] || Search;
          return (
            <Card key={t.id} className="relative overflow-hidden p-7">
              <div className="flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand ring-1 ring-inset ring-brand/10"><Icon size={22} /></span>
                {pro ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand"><Clock size={11} /> Coming soon</span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-line-2 px-2.5 py-1 text-[11px] font-bold text-mute"><Lock size={11} /> Pro</span>
                )}
              </div>
              <h2 className="mt-5 text-lg font-bold text-ink">{t.name}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-mute">{t.description}</p>
              {/* Decorative preview bars */}
              <div className="mt-6 space-y-2 opacity-60" aria-hidden="true">
                {[78, 54, 36].map((w) => (
                  <div key={w} className="flex items-center gap-3">
                    <span className="h-2 w-20 rounded-full bg-line-2" />
                    <span className="h-2 rounded-full bg-gradient-to-r from-brand-100 to-brand-400/50" style={{ width: `${w}%` }} />
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
      <p className="mt-6 text-center text-xs text-mute">Need this data now? <Link href="/dashboard/services" className="font-semibold text-brand hover:underline">Ask our team</Link> for a custom keyword or backlink report.</p>
    </>
  );
}
