import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/server/db";
import { getCurrentUserRecord } from "@/lib/server/dal";
import { str, normalizeEmail, isEmail, normalizeWebsite, rateLimit, clientIp, isSameOrigin } from "@/lib/server/validate";
import { SERVICES, BUDGETS } from "@/lib/plans";

export async function POST(req) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  if (!isDbConfigured()) return NextResponse.json({ error: "Our contact form is temporarily unavailable. Please email us instead." }, { status: 503 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (str(body?.company_url)) return NextResponse.json({ ok: true }); // honeypot: pretend success

  const values = {
    name: str(body?.name, 80),
    email: normalizeEmail(body?.email),
    phone: str(body?.phone, 40),
    company: str(body?.company, 120),
    website: normalizeWebsite(body?.website),
    services: Array.isArray(body?.services) ? body.services.filter((s) => SERVICES.includes(s)).slice(0, SERVICES.length) : [],
    budget: BUDGETS.includes(body?.budget) ? body.budget : "",
    message: str(body?.message, 3000),
    source: ["landing", "contact", "dashboard", "report"].includes(body?.source) ? body.source : "contact",
  };

  const errors = {};
  if (values.name.length < 2) errors.name = "Please enter your name.";
  if (!isEmail(values.email)) errors.email = "Please enter a valid email address.";
  if (values.website === null) errors.website = "Please enter a valid website, e.g. example.com";
  if (!values.services.length) errors.services = "Choose at least one service.";
  if (values.message.length < 10) errors.message = "Tell us a little about your project (at least 10 characters).";
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 422 });

  const limit = rateLimit(`quote:${clientIp(req.headers)}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) return NextResponse.json({ error: "You've sent several requests already. We'll be in touch soon." }, { status: 429 });

  const user = await getCurrentUserRecord();
  const db = await getDb();
  await db.collection("quotes").insertOne({
    ...values,
    userId: user?._id || null,
    status: "new",
    adminNote: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    ip: clientIp(req.headers),
    userAgent: str(req.headers.get("user-agent"), 300),
  });
  return NextResponse.json({ ok: true });
}
