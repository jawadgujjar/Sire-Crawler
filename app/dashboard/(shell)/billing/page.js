import Link from "next/link";
import { Check, Crown, CircleCheck, Info, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import BillingButton from "@/components/app/BillingButton";
import { Card } from "@/components/audit/ui";
import { requireUser, toPublicUser } from "@/lib/server/dal";
import { getUserPayments } from "@/lib/server/queries";
import { getProPrice, getStripe, isStripeConfigured, syncSubscription } from "@/lib/server/billing";
import { getDb, toObjectId } from "@/lib/server/db";
import { PLANS } from "@/lib/plans";
import { formatMoney, formatDay, relativeDays, cn } from "@/lib/format";

export const metadata = { title: "Billing — Sire Crawler" };

const STATUS = {
  active: ["Active", "bg-good-50 text-good-ink"],
  trialing: ["Trial", "bg-brand-50 text-brand"],
  past_due: ["Payment due", "bg-warning-50 text-warning-ink"],
  canceled: ["Cancelled", "bg-line-2 text-mute"],
  unpaid: ["Unpaid", "bg-critical-50 text-critical"],
  incomplete: ["Incomplete", "bg-warning-50 text-warning-ink"],
  incomplete_expired: ["Expired", "bg-line-2 text-mute"],
  paused: ["Paused", "bg-line-2 text-mute"],
};

/** After Checkout, sync right away so the page is correct even before the webhook lands. */
async function syncFromCheckout(sessionId, userId) {
  const stripe = getStripe();
  if (!stripe || typeof sessionId !== "string" || !sessionId.startsWith("cs_")) return;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.client_reference_id !== userId || !session.subscription) return;
    const sub = await stripe.subscriptions.retrieve(typeof session.subscription === "string" ? session.subscription : session.subscription.id);
    await syncSubscription(sub, toObjectId(userId));
  } catch (err) {
    console.error("Checkout sync failed", err?.message);
  }
}

export default async function BillingPage({ searchParams }) {
  const params = await searchParams;
  let user = await requireUser();
  if (params.checkout === "success" && user.plan !== "pro") {
    await syncFromCheckout(params.session_id, user.id);
  }
  const [payments, price] = await Promise.all([getUserPayments(user.id), getProPrice()]);
  // requireUser() is cached per request, so re-read after a sync
  if (params.checkout === "success") {
    const fresh = await (await getDb()).collection("users").findOne({ _id: toObjectId(user.id) }, { projection: { passwordHash: 0 } });
    if (fresh) user = toPublicUser(fresh);
  }

  const pro = user.plan === "pro";
  const sub = user.subscription;
  const [statusLabel, statusTone] = STATUS[sub?.status] || ["—", "bg-line-2 text-mute"];
  const stripeReady = isStripeConfigured();

  return (
    <>
      <PageHeader eyebrow="Account" title="Billing" accent="& plan" subtitle="Manage your subscription, payment method and invoices." />

      {params.checkout === "success" && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-good-50 px-5 py-4 text-sm text-good-ink ring-1 ring-inset ring-good/20">
          <CircleCheck size={18} className="mt-0.5 shrink-0" />
          <span>{pro ? "Welcome to Pro! Your new limits are active now." : "Thanks! Your payment is being confirmed — this page will update within a minute."}</span>
        </div>
      )}
      {params.checkout === "cancelled" && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-notice-50 px-5 py-4 text-sm text-ink-2 ring-1 ring-inset ring-notice/15">
          <Info size={18} className="mt-0.5 shrink-0 text-notice" /> Checkout was cancelled. You have not been charged.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current plan */}
        <div className="sheen relative overflow-hidden rounded-2xl bg-navy p-7 text-white shadow-lift">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand/60 blur-[90px]" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#9ec5f4]">Current plan</span>
              {sub && <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", statusTone)}>{statusLabel}</span>}
            </div>
            <div className="mt-3 flex items-center gap-2 text-4xl font-extrabold tracking-tight">
              {pro && <Crown size={28} className="text-[#f6d27a]" />} {pro ? "Pro" : "Free"}
            </div>
            {pro && sub?.amount != null && (
              <p className="mt-1 text-[#b7c6e6]">{formatMoney(sub.amount, sub.currency)} / {sub.interval}</p>
            )}
            {pro && sub?.currentPeriodEnd && (
              <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/10">
                <div className="bg-navy/70 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8fa3cf]">{sub.cancelAtPeriodEnd ? "Access until" : "Next payment"}</div>
                  <div className="mt-1 font-bold">{formatDay(sub.currentPeriodEnd)}</div>
                  <div className="text-xs text-[#9fb2d8]">{relativeDays(sub.currentPeriodEnd)}</div>
                </div>
                <div className="bg-navy/70 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8fa3cf]">Page limit</div>
                  <div className="mt-1 font-bold">{PLANS.pro.maxPages.toLocaleString("en-US")} pages</div>
                  <div className="text-xs text-[#9fb2d8]">per audit</div>
                </div>
              </div>
            )}
            {sub?.cancelAtPeriodEnd && <p className="mt-4 text-sm text-[#f6d27a]">Your subscription is set to cancel. You keep Pro until the date above.</p>}
            {sub?.status === "past_due" && <p className="mt-4 text-sm text-[#f6d27a]">Your last payment failed. Please update your card to keep Pro.</p>}
            {!pro && <p className="mt-2 text-[#b7c6e6]">Audits up to {PLANS.free.maxPages} pages. Upgrade for deeper crawls and Pro tools.</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              {pro || user.subscription ? (
                <BillingButton action="portal" variant="secondary" className="w-full sm:w-auto" />
              ) : null}
            </div>
          </div>
        </div>

        {/* Upgrade / Pro features */}
        <Card className="edge-gradient flex flex-col p-7">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-ink">Pro</span>
            {price && <span className="text-sm text-mute"><b className="text-2xl font-extrabold text-ink">{formatMoney(price.amount, price.currency)}</b> / {price.interval}</span>}
          </div>
          <ul className="mt-5 flex-1 space-y-3">
            {PLANS.pro.features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-ink-2"><Check size={16} className="mt-0.5 shrink-0 text-good" />{f}</li>
            ))}
          </ul>
          <div className="mt-7">
            {pro ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-good-ink"><CircleCheck size={17} /> You have every Pro feature.</p>
            ) : stripeReady ? (
              <>
                <BillingButton action="checkout" />
                <p className="mt-2 text-center text-xs text-mute">Secure payment by Stripe. Cancel anytime.</p>
              </>
            ) : (
              <div className="rounded-xl bg-canvas p-4 text-sm text-ink-2">
                Online upgrades are coming soon. <Link href="/dashboard/services" className="font-semibold text-brand hover:underline">Contact us</Link> to activate Pro today.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Payment history */}
      <Card className="mt-6">
        <div className="px-6 pt-5">
          <h2 className="text-[15px] font-bold text-ink">Payment history</h2>
          <p className="mt-0.5 text-xs text-mute">Invoices are issued by Stripe and emailed to {user.email}</p>
        </div>
        {payments.length === 0 ? (
          <p className="px-6 py-10 text-sm text-mute">No payments yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-y border-line bg-canvas/70 text-left text-[11px] font-bold uppercase tracking-wider text-mute">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-3 py-3">Period</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-2">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap px-6 py-3 text-ink">{formatDay(p.paidAt || p.createdAt)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-mute">{p.periodStart ? `${formatDay(p.periodStart)} – ${formatDay(p.periodEnd)}` : "—"}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-ink">{formatMoney(p.amount, p.currency)}</td>
                    <td className="px-3 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", p.status === "paid" ? "bg-good-50 text-good-ink" : "bg-critical-50 text-critical")}>{p.status === "paid" ? "Paid" : "Failed"}</span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {p.hostedInvoiceUrl ? (
                        <a href={p.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">View <ExternalLink size={12} /></a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
