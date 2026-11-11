import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/session";

// Clears a session cookie that is still signed but no longer valid (user
// suspended, password changed, account removed). Without this, proxy.js would
// keep bouncing between /login and /dashboard.
export async function GET(req) {
  const to = req.nextUrl.searchParams.get("to") === "admin" ? "/admin/login" : "/login";
  const res = NextResponse.redirect(new URL(`${to}?expired=1`, req.nextUrl));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
