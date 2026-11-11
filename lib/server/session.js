import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "sire_session";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

// Development-only fallback. It must be deterministic: proxy.js and the app are
// bundled separately, so a random per-module secret would not match.
const DEV_SECRET = "sire-crawler-development-secret-do-not-use-in-production";
let warned = false;

function secretKey() {
  let secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters.");
    }
    if (!warned) {
      warned = true;
      console.warn("[auth] AUTH_SECRET is not set; using the development secret.");
    }
    secret = DEV_SECRET;
  }
  return new TextEncoder().encode(secret);
}

export async function signSession({ userId, role, version }) {
  return new SignJWT({ role, v: version || 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload?.sub ? { userId: payload.sub, role: payload.role, version: payload.v || 0 } : null;
  } catch {
    return null;
  }
}

export async function createSession(user) {
  const token = await signSession({ userId: user._id, role: user.role, version: user.sessionVersion });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readSession() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function deleteSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
