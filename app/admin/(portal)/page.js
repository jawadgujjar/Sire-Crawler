import Link from "next/link";
import { Users, Crown, DollarSign, MessageSquareQuote, ArrowRight, ScanSearch, CalendarClock, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Card } from "@/components/audit/ui";
import { getAdminOverview, getRecentQuotes, getRecentUsers } from "@/lib/server/queries";
import { fmtNumber, formatMoney, formatDay, cn } from "@/lib/format";
import { QUOTE_STATUSES } from "@/lib/plans";

export const metadata = { title: "Admin overview — Sire Crawler" };

function Stat({ label, value, sub, Icon, href }) {
  const body = (
    <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink-2">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand"><Icon size={17} /></span>
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-tight text-ink tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-mute">{sub}</div>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/** 30-day signups: single series, one bar per day. */
function SignupChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((s, d) => s + d.count, 0);
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-extrabold tracking-tight text-ink">{fmtNumber(total)}</span>
        <span className="text-sm text-mute">signups in the last 30 days</span>
      </div>
      <div className="mt-6 flex h-40 items-end gap-[3px] border-b border-line" role="img" aria-label={`${total} signups in the last 30 days`}>
        {days.map((d) => (
          <div key={d.date} className="group relative flex h-full flex-1 items-end justify-center" title={`${formatDay(d.date)}: ${d.count} signup${d.count === 1 ? "" : "s"}`}>
            <span
              className="w-full max-w-[24px] rounded-t-[4px] bg-[#2a78d6] transition-opacity group-hover:opacity-75"
              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 3 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-medium text-mute">
        <span>{formatDay(days[0]?.date)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

export default async function AdminOverview() {
  const [o, quotes, users] = await Promise.all([getAdminOverview(), getRecentQuotes(5), getRecentUsers(6)]);
  return (
    <>
      <PageHeader eyebrow="Admin portal" title="Business" accent="overview" subtitle="Users, revenue and leads — updated in real time." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total users" value={fmtNumber(o.totalUsers)} sub={`+${fmtNumber(o.newThisWeek)} this week · +${fmtNumber(o.newThisMonth)} this month`} Icon={Users} href="/admin/users" />
        <Stat label="Active subscriptions" value={fmtNumber(o.activeSubscriptions)} sub={`${fmtNumber(o.renewalsSoon)} renewing in the next 7 days`} Icon={Crown} href="/admin/subscriptions" />
        <Stat label="Monthly recurring revenue" value={formatMoney(o.mrr, o.currency)} sub={`${formatMoney(o.revenueMonth, o.currency)} collected this month`} Icon={TrendingUp} href="/admin/subscriptions" />
        <Stat label="Total revenue" value={formatMoney(o.revenueTotal, o.currency)} sub={`${fmtNumber(o.paymentsCount)} successful payments`} Icon={DollarSign} href="/admin/subscriptions" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-6">
          <h2 className="text-[15px] font-bold text-ink">New users</h2>
          <p className="mb-5 mt-0.5 text-xs text-mute">Daily signups</p>
          <SignupChart days={o.signups} />
        </Card>
        <div className="grid gap-4">
          <Stat label="New quote requests" value={fmtNumber(o.openQuotes)} sub={`${fmtNumber(o.totalQuotes)} requests in total`} Icon={MessageSquareQuote} href="/admin/quotes?status=new" />
          <Stat label="Audits saved" value={fmtNumber(o.audits)} sub="By signed-in users" Icon={ScanSearch} />
          <Stat label="Renewals this week" value={fmtNumber(o.renewalsSoon)} sub="Subscriptions due for payment in 7 days" Icon={CalendarClock} href="/admin/subscriptions" />
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between px-6 pt-5">
            <h2 className="text-[15px] font-bold text-ink">Latest quote requests</h2>
            <Link href="/admin/quotes" className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">View all <ArrowRight size={13} /></Link>
          </div>
          {quotes.length === 0 ? (
            <p className="px-6 py-10 text-sm text-mute">No quote requests yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line-2 pb-2">
              {quotes.map((q) => (
                <li key={q.id} className="flex items-start justify-between gap-3 px-6 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{q.name} <span className="font-normal text-mute">· {q.email}</span></div>
                    <div className="truncate text-xs text-mute">{q.services.join(", ")}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", q.status === "new" ? "bg-brand-50 text-brand" : "bg-line-2 text-mute")}>
                      {QUOTE_STATUSES.find((s) => s.id === q.status)?.label}
                    </span>
                    <div className="mt-1 text-[11px] text-faint">{formatDay(q.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <div className="flex items-center justify-between px-6 pt-5">
            <h2 className="text-[15px] font-bold text-ink">Newest users</h2>
            <Link href="/admin/users" className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">View all <ArrowRight size={13} /></Link>
          </div>
          {users.length === 0 ? (
            <p className="px-6 py-10 text-sm text-mute">No users yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line-2 pb-2">
              {users.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{u.name}</div>
                    <div className="truncate text-xs text-mute">{u.email}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", u.role === "admin" ? "bg-navy text-white" : u.pro ? "bg-brand text-white" : "bg-line-2 text-mute")}>
                      {u.role === "admin" ? "Admin" : u.pro ? "Pro" : "Free"}
                    </span>
                    <div className="mt-1 text-[11px] text-faint">{formatDay(u.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
