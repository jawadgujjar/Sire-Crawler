"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ScanSearch, Sparkles, Headset, CreditCard, Settings, LogOut, Menu, X,
  Users, Receipt, MessageSquareQuote, ShieldCheck, ExternalLink, Crown,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Logo, cx } from "../audit/ui";

// Icons are resolved here because server layouts can't pass components as props
const ICONS = { LayoutDashboard, ScanSearch, Sparkles, Headset, CreditCard, Settings, Users, Receipt, MessageSquareQuote, ShieldCheck };

function isActive(pathname, href, exact) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({ user, nav, section, scope = "user", promo, children }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open]);

  const initials = (user?.name || user?.email || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const current = nav.find((n) => isActive(pathname, n.href, n.exact));

  const sidebar = (
    <div className="relative flex h-full flex-col overflow-y-auto bg-navy text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top_left,rgb(59_111_240/0.35),transparent_70%)]" />
      <div className="relative flex h-16 shrink-0 items-center justify-between px-5">
        <Link href={scope === "admin" ? "/admin" : "/dashboard"} onClick={() => setOpen(false)}><Logo light /></Link>
        <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-[#c5d2ec] hover:bg-white/10 lg:hidden" aria-label="Close menu"><X size={18} /></button>
      </div>

      <div className="sheen relative mx-4 mt-2 flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-inset ring-white/10">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f86ff] to-navy-2 text-sm font-bold ring-1 ring-inset ring-white/20">{initials}</span>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{user.name}</div>
          <div className="flex items-center gap-1.5 text-xs text-[#9fb2d8]">
            {scope === "admin" ? (
              <><ShieldCheck size={12} /> Administrator</>
            ) : user.plan === "pro" ? (
              <><Crown size={12} className="text-[#f6d27a]" /> Pro plan</>
            ) : (
              "Free plan"
            )}
          </div>
        </div>
      </div>

      <nav className="relative mt-6 px-3" aria-label="Main">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8fa3cf]">{section}</div>
        <ul className="space-y-0.5">
          {nav.map((item) => {
            const Icon = ICONS[item.icon] || LayoutDashboard;
            const active = isActive(pathname, item.href, item.exact);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                    active ? "bg-white text-navy shadow-[0_8px_24px_-12px_rgb(0_0_0/0.5)]" : "text-[#c5d2ec] hover:bg-white/[0.07] hover:text-white"
                  )}
                >
                  <Icon size={17} className={active ? "text-brand" : "text-[#8fa3cf] group-hover:text-white"} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums", active ? "bg-brand-50 text-brand" : "bg-white/10 text-[#c5d2ec]")}>{item.badge}</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="relative mt-auto space-y-3 p-4">
        {promo}
        <Link href="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#9fb2d8] transition-colors hover:bg-white/[0.07] hover:text-white">
          <ExternalLink size={14} /> View website
        </Link>
        <form action={logout}>
          <input type="hidden" name="scope" value={scope} />
          <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#9fb2d8] transition-colors hover:bg-white/[0.07] hover:text-white">
            <LogOut size={14} /> Log out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="sticky top-0 hidden h-screen w-[268px] shrink-0 lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-navy/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="animate-slide-in-left absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-float">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-ink hover:bg-line-2 lg:hidden" aria-label="Open menu"><Menu size={20} /></button>
              <span className="lg:hidden"><Logo compact /></span>
              <nav className="hidden min-w-0 items-center gap-1.5 text-sm text-mute sm:flex" aria-label="Breadcrumb">
                <span>{section}</span>
                {current && <><span className="text-faint">/</span><span className="truncate font-semibold text-ink">{current.label}</span></>}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              {scope === "user" && (
                <Link href="/dashboard/audit" className="inline-flex h-9 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-brand-600">
                  <ScanSearch size={15} /> <span className="hidden sm:inline">New audit</span>
                </Link>
              )}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-bold text-white" title={user.email}>{initials}</span>
            </div>
          </div>
        </header>
        <main className="w-full max-w-[1320px] flex-1 px-4 pb-16 pt-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

/** Page title block used at the top of every dashboard and admin page. */
export function PageHeader({ eyebrow, title, accent, subtitle, actions }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">{eyebrow}</div>}
        <h1 className="mt-1 text-[28px] font-extrabold leading-tight tracking-tight text-ink sm:text-[32px]">
          {title}
          {accent && <span className="font-display font-normal italic text-brand"> {accent}</span>}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-mute">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
