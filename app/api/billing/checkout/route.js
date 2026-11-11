import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { getCurrentUserRecord } from "@/lib/server/dal";
import { getStripe, isStripeConfigured, appUrl } from "@/lib/server/billing";
import { isSameOrigin } from "@/lib/server/validate";
import { planFor } from "@/lib/plans";

export async function POST(req) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  const user = await getCurrentUserRecord();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  if (!isStripeConfigured()) return NextResponse.json({ error: "Online payments are not set up yet. Please contact us to upgrade." }, { status: 503 });
  if (planFor(user).id === "pro" && user.role !== "admin") return NextResponse.json({ error: "You're already on Pro." }, { status: 409 });

  const stripe = getStripe();
  const base = appUrl(req);
  try {
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name, metadata: { userId: String(user._id) } });
      customerId = customer.id;
      const db = await getDb();
      await db.collection("users").updateOne({ _id: user._id }, { $set: { stripeCustomerId: customerId } });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: String(user._id),
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      subscription_data: { metadata: { userId: String(user._id) } },
      allow_promotion_codes: true,
      success_url: `${base}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/dashboard/billing?checkout=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout failed", err?.message);
    return NextResponse.json({ error: "We couldn't start the checkout. Please try again in a moment." }, { status: 502 });
  }
}
