"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, isDbConfigured } from "@/lib/server/db";
import { createSession, deleteSession } from "@/lib/server/session";
import { createUser, verifyCredentials, recordLogin, ensureEnvAdmin, hashPassword } from "@/lib/server/users";
import { getCurrentUserRecord } from "@/lib/server/dal";
import { str, normalizeEmail, isEmail, passwordProblem, rateLimit, clientIp } from "@/lib/server/validate";
import bcrypt from "bcryptjs";

const SESSION_ERROR = "Sign-in is not available: the server's AUTH_SECRET is missing or shorter than 32 characters. Please contact the site owner.";

/** Creates the session cookie; returns an error message instead of crashing on a misconfigured server. */
async function startSession(user) {
  try {
    await createSession(user);
    return null;
  } catch (err) {
    console.error("Could not create a session", err?.message);
    return SESSION_ERROR;
  }
}

const NO_DB = { message: "Accounts are not available yet: the database is not configured. Please contact the site owner." };

/** Only allow redirects to paths on this site. */
function safeNext(value, fallback) {
  const next = str(value, 300);
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

async function limited(scope, email) {
  const ip = clientIp(await headers());
  const byIp = rateLimit(`${scope}:ip:${ip}`, { limit: 20, windowMs: 15 * 60 * 1000 });
  const byEmail = email ? rateLimit(`${scope}:email:${email}`, { limit: 8, windowMs: 15 * 60 * 1000 }) : { ok: true };
  return !byIp.ok || !byEmail.ok;
}

export async function signup(prev, formData) {
  if (!isDbConfigured()) return NO_DB;
  const values = {
    name: str(formData.get("name"), 80),
    email: normalizeEmail(formData.get("email")),
    company: str(formData.get("company"), 120),
  };
  const password = String(formData.get("password") || "");
  if (str(formData.get("website_url"))) return { values, message: "Something went wrong. Please try again." }; // honeypot

  const errors = {};
  if (values.name.length < 2) errors.name = "Please enter your full name.";
  if (!isEmail(values.email)) errors.email = "Please enter a valid email address.";
  const pw = passwordProblem(password);
  if (pw) errors.password = pw;
  if (!formData.get("terms")) errors.terms = "Please accept the terms to continue.";
  if (Object.keys(errors).length) return { values, errors };

  if (await limited("signup", null)) return { values, message: "Too many attempts. Please wait a few minutes and try again." };

  let user;
  try {
    user = await createUser({ ...values, password });
  } catch (err) {
    if (err?.code === 11000) return { values, errors: { email: "An account with this email already exists. Try logging in." } };
    console.error("Signup failed", err);
    return { values, message: "We couldn't create your account right now. Please try again." };
  }
  const sessionError = await startSession(user);
  if (sessionError) return { values, message: sessionError };
  redirect(safeNext(formData.get("next"), "/dashboard"));
}

export async function login(prev, formData) {
  if (!isDbConfigured()) return NO_DB;
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") || "");
  const admin = formData.get("scope") === "admin";
  const values = { email };

  if (!isEmail(email) || !password) return { values, message: "Please enter your email and password." };
  if (await limited(admin ? "admin-login" : "login", email)) {
    return { values, message: "Too many sign-in attempts. Please wait 15 minutes and try again." };
  }

  let user;
  try {
    if (admin) await ensureEnvAdmin();
    user = await verifyCredentials(email, password);
  } catch (err) {
    console.error("Login failed", err);
    return { values, message: "We couldn't sign you in right now. Please try again." };
  }
  if (!user) return { values, message: "That email and password don't match. Please try again." };
  if (user.disabled) return { values, message: "This account has been suspended. Please contact support." };
  if (admin && user.role !== "admin") return { values, message: "This account doesn't have admin access." };

  const sessionError = await startSession(user);
  if (sessionError) return { values, message: sessionError };
  await recordLogin(user._id).catch(() => {});
  redirect(user.role === "admin" && admin ? "/admin" : safeNext(formData.get("next"), user.role === "admin" ? "/admin" : "/dashboard"));
}

export async function logout(formData) {
  await deleteSession();
  redirect(formData?.get?.("scope") === "admin" ? "/admin/login" : "/");
}

export async function updateProfile(prev, formData) {
  const user = await getCurrentUserRecord();
  if (!user) redirect("/login");
  const values = {
    name: str(formData.get("name"), 80),
    company: str(formData.get("company"), 120),
    phone: str(formData.get("phone"), 40),
  };
  if (values.name.length < 2) return { values, errors: { name: "Please enter your full name." } };
  const db = await getDb();
  await db.collection("users").updateOne({ _id: user._id }, { $set: { ...values, updatedAt: new Date() } });
  return { values, success: "Your profile has been saved." };
}

export async function changePassword(prev, formData) {
  const current = await getCurrentUserRecord();
  if (!current) redirect("/login");
  const currentPassword = String(formData.get("currentPassword") || "");
  const next = String(formData.get("newPassword") || "");
  const errors = {};
  const pw = passwordProblem(next);
  if (pw) errors.newPassword = pw;
  if (next !== String(formData.get("confirmPassword") || "")) errors.confirmPassword = "The passwords don't match.";
  if (Object.keys(errors).length) return { errors };
  if (await limited("password", current.email)) return { message: "Too many attempts. Please wait a few minutes." };

  const db = await getDb();
  const full = await db.collection("users").findOne({ _id: current._id }, { projection: { passwordHash: 1, sessionVersion: 1, role: 1 } });
  if (!(await bcrypt.compare(currentPassword, full.passwordHash))) return { errors: { currentPassword: "Your current password is incorrect." } };

  const sessionVersion = (full.sessionVersion || 0) + 1;
  await db.collection("users").updateOne(
    { _id: current._id },
    { $set: { passwordHash: await hashPassword(next), sessionVersion, updatedAt: new Date() } }
  );
  // Other devices are signed out; keep this one signed in
  await createSession({ _id: current._id, role: full.role, sessionVersion });
  return { success: "Your password has been changed. Other devices have been signed out." };
}
