import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { getCurrentUserRecord } from "@/lib/server/dal";
import { str, isSameOrigin } from "@/lib/server/validate";

const num = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : 0);

/** Saves a compact audit summary to the signed-in user's account. */
export async function POST(req) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  const user = await getCurrentUserRecord();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let s;
  try {
    s = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const finishedAt = new Date(s?.finishedAt);
  if (!s?.host || Number.isNaN(finishedAt.getTime())) return NextResponse.json({ error: "Invalid audit." }, { status: 400 });

  const doc = {
    userId: user._id,
    host: str(s.host, 253),
    startUrl: str(s.startUrl, 2000),
    finishedAt,
    durationMs: num(s.durationMs),
    score: Math.min(100, num(s.score)),
    pages: num(s.pages),
    counts: { error: num(s.counts?.error), warning: num(s.counts?.warning), notice: num(s.counts?.notice) },
    categories: Object.fromEntries(Object.entries(s.categories || {}).slice(0, 20).map(([k, v]) => [str(k, 40), Math.min(100, num(v))])),
    issues: Object.fromEntries(Object.entries(s.issues || {}).slice(0, 120).map(([k, v]) => [str(k, 60), num(v)])),
    maxPages: num(s.options?.maxPages),
    createdAt: new Date(),
  };
  const db = await getDb();
  // Same audit saved twice (e.g. a re-render) updates in place
  await db.collection("audits").updateOne({ userId: user._id, host: doc.host, finishedAt }, { $set: doc }, { upsert: true });
  return NextResponse.json({ ok: true });
}
