import { NextResponse } from "next/server";
import { getCurrentUserRecord } from "@/lib/server/dal";
import { getStripe, appUrl } from "@/lib/server/billing";
import { isSameOrigin } from "@/lib/server/validate";

/** Opens the Stripe customer portal: update card, download invoices, cancel. */
export async function POST(req) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  const user = await getCurrentUserRecord();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const stripe = getStripe();
  if (!stripe || !user.stripeCustomerId) return NextResponse.json({ error: "No billing account found." }, { status: 404 });
  try {
    const session = await stripe.billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: `${appUrl(req)}/dashboard/billing` });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe portal failed", err?.message);
    return NextResponse.json({ error: "We couldn't open billing management. Please try again." }, { status: 502 });
  }
}
