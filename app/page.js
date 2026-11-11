import SireCrawler from "@/components/SireCrawler";
import { getCurrentUser } from "@/lib/server/dal";
import { getProPrice } from "@/lib/server/billing";

export default async function Home() {
  const [user, proPrice] = await Promise.all([getCurrentUser(), getProPrice()]);
  return <SireCrawler user={user} proPrice={proPrice} />;
}
