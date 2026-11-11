"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Logo, cx } from "../audit/ui";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Checks" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#services", label: "Services" },
  { href: "/contact", label: "Contact" },
];

/** Marketing navigation. `dark` sits on the navy hero; `light` on white pages. */
export default function SiteNav({ user, tone = "dark", onHome }) {
  const [open, setOpen] = useState(false);
  const dark = tone === "dark";
  const accountHref = user?.role === "admin" ? "/admin" : "/dashboard";

  return (
    <nav className={cx("sticky top-0 z-40 border-b backdrop-blur-xl print:hidden", dark ? "border-white/10 bg-navy/90" : "border-line bg-white/85")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {onHome ? (
          <button onClick={onHome} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" aria-label="Sire Crawler home">
            <Logo light={dark} />
          </button>
        ) : (
          <Link href="/" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" aria-label="Sire Crawler home">
            <Logo light={dark} />
          </Link>
        )}

        <div className={cx("hidden items-center gap-1 text-sm font-medium lg:flex", dark ? "text-[#c5d2ec]" : "text-ink-2")}>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className={cx("rounded-lg px-3 py-1.5 transition-colors", dark ? "hover:bg-white/[0.07] hover:text-white" : "hover:bg-line-2 hover:text-ink")}>
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <Link
              href={accountHref}
              className={cx(
                "inline-flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors",
                dark ? "bg-white text-navy hover:bg-brand-50" : "bg-navy text-white hover:bg-navy-3"
              )}
            >
              {user.role === "admin" ? <ShieldCheck size={15} /> : <LayoutDashboard size={15} />}
              {user.role === "admin" ? "Admin portal" : "Dashboard"}
            </Link>
          ) : (
            <>
              <Link href="/login" className={cx("hidden h-9 items-center rounded-xl px-3.5 text-sm font-semibold transition-colors sm:inline-flex", dark ? "text-white hover:bg-white/[0.08]" : "text-ink hover:bg-line-2")}>
                Log in
              </Link>
              <Link
                href="/signup"
                className={cx(
                  "inline-flex h-9 items-center rounded-xl px-4 text-sm font-semibold transition-colors",
                  dark ? "bg-white text-navy shadow-[0_8px_24px_-10px_rgb(0_0_0/0.6)] hover:bg-brand-50" : "bg-navy text-white hover:bg-navy-3"
                )}
              >
                Sign up free
              </Link>
            </>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            className={cx("rounded-lg p-2 lg:hidden", dark ? "text-white hover:bg-white/10" : "text-ink hover:bg-line-2")}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className={cx("animate-fade-up border-t px-4 pb-4 pt-2 lg:hidden", dark ? "border-white/10" : "border-line")}>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className={cx("block rounded-lg px-3 py-2.5 text-sm font-medium", dark ? "text-[#c5d2ec] hover:bg-white/[0.07]" : "text-ink-2 hover:bg-line-2")}>
              {l.label}
            </a>
          ))}
          {!user && (
            <Link href="/login" className={cx("mt-1 block rounded-lg px-3 py-2.5 text-sm font-semibold", dark ? "text-white hover:bg-white/[0.07]" : "text-ink hover:bg-line-2")}>
              Log in
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
