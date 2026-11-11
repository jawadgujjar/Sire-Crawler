import SireCrawler from "@/components/SireCrawler";
import { requireUser } from "@/lib/server/dal";

export const metadata = { title: "New site audit — Sire Crawler" };

export default async function DashboardAuditPage() {
  const user = await requireUser();
  return <SireCrawler user={user} embedded />;
}
