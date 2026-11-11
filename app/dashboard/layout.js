import { requireUser } from "@/lib/server/dal";

export const metadata = { title: "Dashboard — Sire Crawler", robots: { index: false } };

// Every /dashboard route needs a signed-in user (proxy.js only does an optimistic check)
export default async function DashboardGuard({ children }) {
  await requireUser();
  return children;
}
