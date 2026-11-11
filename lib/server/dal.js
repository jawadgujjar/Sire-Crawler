import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getDb, isDbConfigured, toObjectId } from "./db";
import { readSession } from "./session";
import { planFor } from "@/lib/plans";

/** The signed-in user's full record, or null. Deduplicated per request. */
export const getCurrentUserRecord = cache(async () => {
  // Read the cookie first so every page using this renders per request
  const session = await readSession();
  if (!session || !isDbConfigured()) return null;
  const _id = toObjectId(session.userId);
  if (!_id) return null;
  try {
    const db = await getDb();
    const user = await db.collection("users").findOne({ _id }, { projection: { passwordHash: 0 } });
    if (!user || user.disabled) return null;
    // Password changes bump sessionVersion, which signs out older sessions
    if ((user.sessionVersion || 0) !== session.version) return null;
    return user;
  } catch (err) {
    console.error("Failed to load the current user", err);
    return null;
  }
});

/** Safe, serialisable view of a user for client components. */
export function toPublicUser(user) {
  if (!user) return null;
  const plan = planFor(user);
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    company: user.company || "",
    phone: user.phone || "",
    role: user.role,
    plan: plan.id,
    maxPages: plan.maxPages,
    speeds: plan.speeds,
    createdAt: user.createdAt?.toISOString?.() || null,
    subscription: user.subscription
      ? {
          status: user.subscription.status,
          amount: user.subscription.amount ?? null,
          currency: user.subscription.currency || "usd",
          interval: user.subscription.interval || "month",
          currentPeriodEnd: user.subscription.currentPeriodEnd?.toISOString?.() || null,
          cancelAtPeriodEnd: Boolean(user.subscription.cancelAtPeriodEnd),
        }
      : null,
  };
}

export const getCurrentUser = cache(async () => toPublicUser(await getCurrentUserRecord()));

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect((await readSession()) ? "/api/auth/reset" : "/login");
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect((await readSession()) ? "/api/auth/reset?to=admin" : "/admin/login");
  return user;
}
