import { NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/server/session";

// Optimistic redirects from the session cookie only (no database calls).
// Every protected page and API also checks the user itself via lib/server/dal.js.
export default async function proxy(req) {
  const { pathname, search } = req.nextUrl;
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);

  const isAdminLogin = pathname === "/admin/login";
  const isAdminArea = pathname.startsWith("/admin") && !isAdminLogin;
  const isDashboard = pathname.startsWith("/dashboard");
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (isDashboard && !session) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (isAdminArea && session?.role !== "admin") {
    return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
  }
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL(session.role === "admin" ? "/admin" : "/dashboard", req.nextUrl));
  }
  if (isAdminLogin && session?.role === "admin") {
    return NextResponse.redirect(new URL("/admin", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/signup"],
};
