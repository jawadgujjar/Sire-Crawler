import AppShell from "@/components/app/AppShell";
import { requireAdmin } from "@/lib/server/dal";
import { getDb } from "@/lib/server/db";

export const metadata = { title: "Admin — Sire Crawler", robots: { index: false } };

export default async function AdminLayout({ children }) {
  const admin = await requireAdmin();
  const newQuotes = await (await getDb()).collection("quotes").countDocuments({ status: "new" });
  const nav = [
    { href: "/admin", label: "Overview", icon: "LayoutDashboard", exact: true },
    { href: "/admin/users", label: "Users", icon: "Users" },
    { href: "/admin/subscriptions", label: "Subscriptions", icon: "Receipt" },
    { href: "/admin/quotes", label: "Quote requests", icon: "MessageSquareQuote", badge: newQuotes || null },
  ];
  return (
    <AppShell user={admin} nav={nav} section="Admin portal" scope="admin">
      {children}
    </AppShell>
  );
}
