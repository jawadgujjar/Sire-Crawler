import "server-only";
import { getDb, toObjectId } from "./db";

const iso = (d) => (d instanceof Date ? d.toISOString() : d || null);

// ─── User dashboard ───────────────────────────────────────────────────────────

export async function getUserAudits(userId, limit = 20) {
  const db = await getDb();
  const rows = await db.collection("audits").find({ userId: toObjectId(userId) }).sort({ finishedAt: -1 }).limit(limit).toArray();
  return rows.map((a) => ({
    id: String(a._id),
    host: a.host,
    startUrl: a.startUrl,
    finishedAt: iso(a.finishedAt),
    score: a.score,
    pages: a.pages,
    counts: a.counts,
  }));
}

export async function getUserAuditStats(userId) {
  const db = await getDb();
  const [row] = await db
    .collection("audits")
    .aggregate([
      { $match: { userId: toObjectId(userId) } },
      { $group: { _id: null, audits: { $sum: 1 }, pages: { $sum: "$pages" }, sites: { $addToSet: "$host" } } },
    ])
    .toArray();
  return { audits: row?.audits || 0, pages: row?.pages || 0, sites: row?.sites?.length || 0 };
}

export async function getUserQuotes(userId) {
  const db = await getDb();
  const rows = await db.collection("quotes").find({ userId: toObjectId(userId) }).sort({ createdAt: -1 }).limit(20).toArray();
  return rows.map((q) => ({ id: String(q._id), services: q.services, status: q.status, website: q.website, createdAt: iso(q.createdAt) }));
}

export async function getUserPayments(userId) {
  const db = await getDb();
  const rows = await db.collection("payments").find({ userId: toObjectId(userId) }).sort({ createdAt: -1 }).limit(24).toArray();
  return rows.map(paymentRow);
}

function paymentRow(p) {
  return {
    id: String(p._id),
    userId: p.userId ? String(p.userId) : null,
    name: p.name,
    email: p.email,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    reason: p.reason,
    paidAt: iso(p.paidAt),
    createdAt: iso(p.createdAt),
    periodStart: iso(p.periodStart),
    periodEnd: iso(p.periodEnd),
    hostedInvoiceUrl: p.hostedInvoiceUrl,
  };
}

// ─── Admin ────────────────────────────────────────────────────────────────────

const ACTIVE = ["active", "trialing", "past_due"];

export async function getAdminOverview() {
  const db = await getDb();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const in7Days = new Date(now.getTime() + 7 * 86400000);
  const users = db.collection("users");

  const [totalUsers, newThisMonth, newThisWeek, activeSubs, revenueAll, revenueMonth, openQuotes, totalQuotes, audits, renewalsSoon, signupsByDay] = await Promise.all([
    users.countDocuments({ role: { $ne: "admin" } }),
    users.countDocuments({ role: { $ne: "admin" }, createdAt: { $gte: monthStart } }),
    users.countDocuments({ role: { $ne: "admin" }, createdAt: { $gte: weekAgo } }),
    users.find({ "subscription.status": { $in: ACTIVE } }, { projection: { subscription: 1 } }).toArray(),
    db.collection("payments").aggregate([{ $match: { status: "paid" } }, { $group: { _id: "$currency", total: { $sum: "$amount" }, count: { $sum: 1 } } }]).toArray(),
    db.collection("payments").aggregate([{ $match: { status: "paid", paidAt: { $gte: monthStart } } }, { $group: { _id: "$currency", total: { $sum: "$amount" } } }]).toArray(),
    db.collection("quotes").countDocuments({ status: "new" }),
    db.collection("quotes").countDocuments({}),
    db.collection("audits").countDocuments({}),
    users.countDocuments({ "subscription.status": { $in: ACTIVE }, "subscription.cancelAtPeriodEnd": { $ne: true }, "subscription.currentPeriodEnd": { $gte: now, $lte: in7Days } }),
    users
      .aggregate([
        { $match: { role: { $ne: "admin" }, createdAt: { $gte: new Date(now.getTime() - 29 * 86400000) } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  // Monthly recurring revenue, normalising yearly/weekly prices to a month
  const perMonth = { month: 1, year: 1 / 12, week: 52 / 12, day: 365 / 12 };
  const mrr = activeSubs.reduce((sum, u) => sum + (u.subscription.amount || 0) * (perMonth[u.subscription.interval] ?? 1), 0);
  const currency = activeSubs[0]?.subscription.currency || revenueAll[0]?._id || "usd";

  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: signupsByDay.find((s) => s._id === key)?.count || 0 });
  }

  return {
    totalUsers,
    newThisMonth,
    newThisWeek,
    activeSubscriptions: activeSubs.length,
    mrr,
    currency,
    revenueTotal: revenueAll.reduce((s, r) => s + r.total, 0),
    paymentsCount: revenueAll.reduce((s, r) => s + r.count, 0),
    revenueMonth: revenueMonth.reduce((s, r) => s + r.total, 0),
    openQuotes,
    totalQuotes,
    audits,
    renewalsSoon,
    signups: days,
  };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getAdminUsers({ q = "", plan = "", page = 1, pageSize = 25 }) {
  const db = await getDb();
  const filter = {};
  if (q) {
    const re = new RegExp(escapeRegex(q.slice(0, 100)), "i");
    filter.$or = [{ name: re }, { email: re }, { company: re }];
  }
  if (plan === "pro") filter["subscription.status"] = { $in: ACTIVE };
  if (plan === "free") filter["subscription.status"] = { $nin: ACTIVE };
  if (plan === "admin") filter.role = "admin";
  const total = await db.collection("users").countDocuments(filter);
  const rows = await db
    .collection("users")
    .aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
      { $lookup: { from: "audits", localField: "_id", foreignField: "userId", as: "a", pipeline: [{ $project: { _id: 1 } }] } },
      { $addFields: { auditCount: { $size: "$a" } } },
      { $project: { passwordHash: 0, a: 0 } },
    ])
    .toArray();
  return {
    total,
    page,
    pageSize,
    rows: rows.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      company: u.company,
      phone: u.phone,
      role: u.role,
      disabled: Boolean(u.disabled),
      pro: ACTIVE.includes(u.subscription?.status),
      subscriptionStatus: u.subscription?.status || null,
      createdAt: iso(u.createdAt),
      lastLoginAt: iso(u.lastLoginAt),
      loginCount: u.loginCount || 0,
      auditCount: u.auditCount,
    })),
  };
}

export async function getAdminSubscriptions({ status = "" }) {
  const db = await getDb();
  const filter = { "subscription.id": { $exists: true } };
  if (status === "active") filter["subscription.status"] = { $in: ACTIVE };
  if (status === "canceled") filter["subscription.status"] = { $nin: ACTIVE };
  const users = await db.collection("users").find(filter, { projection: { passwordHash: 0 } }).sort({ "subscription.currentPeriodEnd": 1 }).limit(500).toArray();
  const totals = await db
    .collection("payments")
    .aggregate([{ $match: { status: "paid", userId: { $in: users.map((u) => u._id) } } }, { $group: { _id: "$userId", total: { $sum: "$amount" }, count: { $sum: 1 } } }])
    .toArray();
  const byUser = new Map(totals.map((t) => [String(t._id), t]));
  const soon = Date.now() + 7 * 86400000;
  return users.map((u) => {
    const s = u.subscription;
    const t = byUser.get(String(u._id));
    return {
      userId: String(u._id),
      name: u.name,
      email: u.email,
      status: s.status,
      active: ACTIVE.includes(s.status),
      amount: s.amount,
      currency: s.currency,
      interval: s.interval,
      startedAt: iso(s.startedAt),
      currentPeriodEnd: iso(s.currentPeriodEnd),
      cancelAtPeriodEnd: Boolean(s.cancelAtPeriodEnd),
      dueSoon: ACTIVE.includes(s.status) && !s.cancelAtPeriodEnd && s.currentPeriodEnd instanceof Date && s.currentPeriodEnd.getTime() <= soon,
      canceledAt: iso(s.canceledAt),
      lastPaymentAt: iso(s.lastPaymentAt),
      lastPaymentAmount: s.lastPaymentAmount ?? null,
      totalPaid: t?.total || 0,
      paymentsCount: t?.count || 0,
    };
  });
}

export async function getAdminPayments(limit = 50) {
  const db = await getDb();
  const rows = await db.collection("payments").find({}).sort({ createdAt: -1 }).limit(limit).toArray();
  return rows.map(paymentRow);
}

export async function getAdminQuotes({ status = "", q = "" }) {
  const db = await getDb();
  const filter = {};
  if (status) filter.status = status;
  if (q) {
    const re = new RegExp(escapeRegex(q.slice(0, 100)), "i");
    filter.$or = [{ name: re }, { email: re }, { company: re }, { website: re }, { message: re }];
  }
  const [rows, counts] = await Promise.all([
    db.collection("quotes").find(filter).sort({ createdAt: -1 }).limit(200).toArray(),
    db.collection("quotes").aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
  ]);
  return {
    counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    rows: rows.map((r) => ({
      id: String(r._id),
      name: r.name,
      email: r.email,
      phone: r.phone,
      company: r.company,
      website: r.website,
      services: r.services || [],
      budget: r.budget,
      message: r.message,
      source: r.source,
      status: r.status,
      adminNote: r.adminNote || "",
      isUser: Boolean(r.userId),
      createdAt: iso(r.createdAt),
      updatedBy: r.updatedBy || "",
    })),
  };
}

export async function getRecentQuotes(limit = 5) {
  const { rows } = await getAdminQuotes({});
  return rows.slice(0, limit);
}

export async function getRecentUsers(limit = 6) {
  const { rows } = await getAdminUsers({ pageSize: limit });
  return rows;
}
