import Link from "next/link";
import { Crown, ArrowRight } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { requireUser } from "@/lib/server/dal";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "LayoutDashboard", exact: true },
  { href: "/dashboard/audit", label: "Site Audit", icon: "ScanSearch" },
  { href: "/dashboard/tools", label: "Pro tools", icon: "Sparkles" },
  { href: "/dashboard/services", label: "Services & quotes", icon: "Headset" },
  { href: "/dashboard/billing", label: "Billing", icon: "CreditCard" },
  { href: "/dashboard/settings", label: "Settings", icon: "Settings" },
];

export default async function DashboardLayout({ children }) {
  const user = await requireUser();
  const promo =
    user.plan === "pro" ? null : (
      <Link href="/dashboard/billing" className="sheen relative block overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-navy-2 p-4 ring-1 ring-inset ring-white/15 transition-transform hover:-translate-y-0.5">
        <Crown size={18} className="text-[#f6d27a]" />
        <div className="mt-2 text-sm font-bold">Upgrade to Pro</div>
        <p className="mt-0.5 text-xs leading-relaxed text-[#c5d2ec]">1,000-page audits, keyword research, backlinks and rank tracking.</p>
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold">See plans <ArrowRight size={12} /></span>
      </Link>
    );
  return (
    <AppShell user={user} nav={NAV} section="Workspace" scope="user" promo={promo}>
      {children}
    </AppShell>
  );
}
