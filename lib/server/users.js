import "server-only";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { normalizeEmail } from "./validate";

const HASH_ROUNDS = 12;
// Compared against when the email is unknown, so response time doesn't reveal which emails exist
let dummyHash;
const getDummyHash = () => (dummyHash ||= bcrypt.hash("sire-crawler-timing-guard", HASH_ROUNDS));

export async function hashPassword(password) {
  return bcrypt.hash(password, HASH_ROUNDS);
}

export async function findUserByEmail(email) {
  const db = await getDb();
  return db.collection("users").findOne({ email: normalizeEmail(email) });
}

export async function createUser({ name, email, password, company = "", role = "user" }) {
  const db = await getDb();
  const now = new Date();
  const doc = {
    name,
    email: normalizeEmail(email),
    passwordHash: await hashPassword(password),
    company,
    phone: "",
    role,
    plan: "free",
    sessionVersion: 0,
    disabled: false,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    loginCount: 1,
  };
  const { insertedId } = await db.collection("users").insertOne(doc);
  return { ...doc, _id: insertedId };
}

/** Returns the user when the password matches, otherwise null. */
export async function verifyCredentials(email, password) {
  const user = await findUserByEmail(email);
  const ok = await bcrypt.compare(password, user?.passwordHash || (await getDummyHash()));
  return ok && user ? user : null;
}

export async function recordLogin(userId) {
  const db = await getDb();
  await db.collection("users").updateOne({ _id: userId }, { $set: { lastLoginAt: new Date() }, $inc: { loginCount: 1 } });
}

/**
 * Bootstraps the first admin from ADMIN_EMAIL / ADMIN_PASSWORD. Runs on admin
 * login attempts; does nothing once that account exists.
 */
export async function ensureEnvAdmin() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL);
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const db = await getDb();
  const existing = await db.collection("users").findOne({ email }, { projection: { role: 1 } });
  if (existing) return;
  try {
    await createUser({ name: process.env.ADMIN_NAME || "Administrator", email, password, role: "admin" });
  } catch (err) {
    if (err?.code !== 11000) throw err;
  }
}
