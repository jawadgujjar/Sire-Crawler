import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Card } from "@/components/audit/ui";
import { getAdminSubscriptions, getAdminPayments } from "@/lib/server/queries";
import { fmtNumber, formatMoney, formatDay, relativeDays, cn } from "@/lib/format";

export const metadata = { title: "Subscriptions — Admin" };

const STATUS_TONE = {
  active: "bg-good-50 text-good-ink",
  trialing: "bg-brand-50 text-brand",
  past_due: "bg-warning-50 text-warning-ink",
  unpaid: "bg-critical-50 text-critical",
  canceled: "bg-line-2 text-mute",
};
const FILTERS = [["", "All"], ["active", "Active"], ["canceled", "Ended"]];

export default async function AdminSubscriptions({ searchParams }) {
  const params = await searchParams;
  const status = FILTERS.some(([id]) => id === params.status) ? params.status : "";
  const [subs, payments] = await Promise.all([getAdminSubscriptions({ status }), getAdminPayments(50)]);
  const active = subs.filter((s) => s.active);
  const currency = subs[0]?.currency || payments[0]?.currency || "usd";
  const collected = subs.reduce((sum, s) => sum + s.totalPaid, 0);
  const dueSoon = active.filter((s) => s.dueSoon).length;

  return (
    <>
      <PageHeader eyebrow="Admin portal" title="Subscriptions" accent="& payments" subtitle="Who is paying, how much, when they last paid and when the next charge is due." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Active subscribers", fmtNumber(active.length)],
          ["Collected from these customers", formatMoney(collected, currency)],
          ["Due in the next 7 days", fmtNumber(dueSoon)],
          ["Cancelling at period end", fmtNumber(active.filter((s) => s.cancelAtPeriodEnd).length)],
        ].map(([label, value]) => (
          <Card key={label} className="p-5">
            <div className="text-sm font-semibold text-ink-2">{label}</div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-ink tabular-nums">{value}</div>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="px-2 text-[15px] font-bold text-ink">Subscribers</h2>
          <div className="inline-flex rounded-xl bg-line-2 p-1">
            {FILTERS.map(([id, label]) => (
              <Link key={id} href={id ? `/admin/subscriptions?status=${id}` : "/admin/subscriptions"} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", status === id ? "bg-white text-ink shadow-sm" : "text-mute hover:text-ink")}>
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas/70 text-left text-[11px] font-bold uppercase tracking-wider text-mute">
                <th className="px-6 py-3">Customer</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Price</th>
                <th className="px-3 py-3">Started</th>
                <th className="px-3 py-3">Last payment</th>
                <th className="px-3 py-3">Next payment</th>
                <th className="px-6 py-3 text-right">Total paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-2">
              {subs.length === 0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-mute">No subscriptions yet.</td></tr>}
              {subs.map((s) => (
                <tr key={s.userId} className="transition-colors hover:bg-canvas/60">
                  <td className="px-6 py-3">
                    <div className="font-semibold text-ink">{s.name}</div>
                    <div className="text-xs text-mute">{s.email}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold capitalize", STATUS_TONE[s.status] || "bg-line-2 text-mute")}>{s.status.replace("_", " ")}</span>
                    {s.cancelAtPeriodEnd && s.active && <div className="mt-1 text-[11px] font-semibold text-warning-ink">Cancels at period end</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-ink">{s.amount != null ? `${formatMoney(s.amount, s.currency)} / ${s.interval}` : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-ink-2">{formatDay(s.startedAt)}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="text-ink-2">{formatDay(s.lastPaymentAt)}</div>
                    {s.lastPaymentAmount != null && <div className="text-xs text-mute">{formatMoney(s.lastPaymentAmount, s.currency)}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {s.active && !s.cancelAtPeriodEnd ? (
                      <>
                        <div className="font-semibold text-ink">{formatDay(s.currentPeriodEnd)}</div>
                        <div className="text-xs text-mute">{relativeDays(s.currentPeriodEnd)}</div>
                      </>
                    ) : (
                      <span className="text-xs text-faint">{s.active ? `Ends ${formatDay(s.currentPeriodEnd)}` : "No renewal"}</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="font-bold tabular-nums text-ink">{formatMoney(s.totalPaid, s.currency)}</div>
                    <div className="text-xs text-mute">{fmtNumber(s.paymentsCount)} payment{s.paymentsCount === 1 ? "" : "s"}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6">
        <div className="px-6 pt-5">
          <h2 className="text-[15px] font-bold text-ink">Recent payments</h2>
          <p className="mt-0.5 text-xs text-mute">Latest 50 invoices from Stripe</p>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-y border-line bg-canvas/70 text-left text-[11px] font-bold uppercase tracking-wider text-mute">
                <th className="px-6 py-3">Date</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Period</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-6 py-3 text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-2">
              {payments.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-mute">No payments recorded yet.</td></tr>}
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap px-6 py-3 text-ink">{formatDay(p.paidAt || p.createdAt)}</td>
                  <td className="px-3 py-3"><div className="font-semibold text-ink">{p.name || "—"}</div><div className="text-xs text-mute">{p.email}</div></td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-mute">{p.periodStart ? `${formatDay(p.periodStart)} – ${formatDay(p.periodEnd)}` : "—"}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-ink">{formatMoney(p.amount, p.currency)}</td>
                  <td className="px-3 py-3"><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", p.status === "paid" ? "bg-good-50 text-good-ink" : "bg-critical-50 text-critical")}>{p.status === "paid" ? "Paid" : "Failed"}</span></td>
                  <td className="px-6 py-3 text-right">
                    {p.hostedInvoiceUrl ? <a href={p.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">View <ExternalLink size={12} /></a> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
