import "server-only";
import Stripe from "stripe";
import { getDb, toObjectId } from "./db";

let stripeClient;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  stripeClient ||= new Stripe(process.env.STRIPE_SECRET_KEY, { appInfo: { name: "Sire Crawler" } });
  return stripeClient;
}

export function appUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// The Pro price, read from Stripe and cached for 10 minutes
let priceCache = { at: 0, value: null };
export async function getProPrice() {
  if (!isStripeConfigured()) return null;
  if (Date.now() - priceCache.at < 10 * 60 * 1000) return priceCache.value;
  try {
    const price = await getStripe().prices.retrieve(process.env.STRIPE_PRICE_ID);
    priceCache = {
      at: Date.now(),
      value: { amount: (price.unit_amount || 0) / 100, currency: price.currency, interval: price.recurring?.interval || "month" },
    };
  } catch (err) {
    console.error("Failed to load the Stripe price", err?.message);
    priceCache = { at: Date.now(), value: null };
  }
  return priceCache.value;
}

const ts = (s) => (s ? new Date(s * 1000) : null);

/** Writes a Stripe subscription onto its user and returns the user's id. */
export async function syncSubscription(subscription, hintUserId) {
  const db = await getDb();
  const users = db.collection("users");
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  const item = subscription.items?.data?.[0];
  const price = item?.price;

  let user = customerId ? await users.findOne({ stripeCustomerId: customerId }, { projection: { _id: 1 } }) : null;
  if (!user && hintUserId) user = { _id: hintUserId };
  if (!user && subscription.metadata?.userId) {
    const id = toObjectId(subscription.metadata.userId);
    if (id) user = { _id: id };
  }
  if (!user) {
    console.warn("Stripe subscription without a matching user", subscription.id);
    return null;
  }

  const status = subscription.status;
  const active = ["active", "trialing", "past_due"].includes(status);
  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        plan: active ? "pro" : "free",
        stripeCustomerId: customerId,
        updatedAt: new Date(),
        subscription: {
          id: subscription.id,
          status,
          priceId: price?.id || null,
          amount: price?.unit_amount != null ? price.unit_amount / 100 : null,
          currency: price?.currency || "usd",
          interval: price?.recurring?.interval || "month",
          startedAt: ts(subscription.start_date),
          // Newer API versions moved the period onto subscription items
          currentPeriodStart: ts(subscription.current_period_start ?? item?.current_period_start),
          currentPeriodEnd: ts(subscription.current_period_end ?? item?.current_period_end),
          cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
          canceledAt: ts(subscription.canceled_at),
          endedAt: ts(subscription.ended_at),
        },
      },
    }
  );
  return user._id;
}

/** Stores a paid (or failed) invoice as a payment record. Idempotent per invoice. */
export async function recordInvoice(invoice) {
  const db = await getDb();
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  const user = customerId ? await db.collection("users").findOne({ stripeCustomerId: customerId }, { projection: { _id: 1, email: 1, name: 1 } }) : null;
  const line = invoice.lines?.data?.[0];
  const paid = invoice.status === "paid";
  const doc = {
    stripeInvoiceId: invoice.id,
    userId: user?._id || null,
    email: user?.email || invoice.customer_email || "",
    name: user?.name || invoice.customer_name || "",
    amount: (paid ? invoice.amount_paid : invoice.amount_due) / 100,
    currency: invoice.currency,
    status: paid ? "paid" : invoice.status === "open" ? "failed" : invoice.status,
    reason: invoice.billing_reason || "",
    paidAt: paid ? ts(invoice.status_transitions?.paid_at) || new Date() : null,
    createdAt: ts(invoice.created) || new Date(),
    periodStart: ts(line?.period?.start),
    periodEnd: ts(line?.period?.end),
    hostedInvoiceUrl: invoice.hosted_invoice_url || "",
  };
  await db.collection("payments").updateOne({ stripeInvoiceId: invoice.id }, { $set: doc }, { upsert: true });
  if (paid && user) {
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { "subscription.lastPaymentAt": doc.paidAt, "subscription.lastPaymentAmount": doc.amount } }
    );
  }
}

export function invoiceSubscriptionId(invoice) {
  const sub = invoice.subscription ?? invoice.parent?.subscription_details?.subscription;
  return typeof sub === "string" ? sub : sub?.id || null;
}
