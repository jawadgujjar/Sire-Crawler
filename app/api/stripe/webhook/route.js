import { NextResponse } from "next/server";
import { getStripe, syncSubscription, recordInvoice, invoiceSubscriptionId } from "@/lib/server/billing";
import { toObjectId } from "@/lib/server/db";

// Stripe → app: keeps plans, subscription dates and payments in sync.
// Configure this URL in Stripe with the events listed in README.md.
export async function POST(req) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });

  const signature = req.headers.get("stripe-signature");
  const payload = await req.text(); // raw body, required for signature verification
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch (err) {
    console.warn("Rejected Stripe webhook", err?.message);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    const obj = event.data.object;
    switch (event.type) {
      case "checkout.session.completed":
        if (obj.mode === "subscription" && obj.subscription) {
          const sub = await stripe.subscriptions.retrieve(typeof obj.subscription === "string" ? obj.subscription : obj.subscription.id);
          await syncSubscription(sub, toObjectId(obj.client_reference_id));
        }
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
        await syncSubscription(obj);
        break;
      case "invoice.paid":
      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        await recordInvoice(obj);
        const subId = invoiceSubscriptionId(obj);
        if (subId) await syncSubscription(await stripe.subscriptions.retrieve(subId));
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // A 500 makes Stripe retry the event later
    console.error(`Failed to handle Stripe event ${event.type}`, err);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
