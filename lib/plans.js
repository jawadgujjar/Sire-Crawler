// Plan definitions shared by the server (enforcement) and the UI (labels, locks).

export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    maxPages: 100,
    speeds: ["gentle", "normal"],
    tagline: "Everything you need to audit a small site.",
    features: [
      "Site Audit up to 100 pages",
      `58 technical SEO checks`,
      "Health score & thematic reports",
      "CSV, JSON & PDF exports",
      "Audit history in your dashboard",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    maxPages: 1000,
    speeds: ["gentle", "normal", "fast"],
    tagline: "For agencies and growing sites that need depth.",
    features: [
      "Site Audit up to 1,000 pages",
      "Fast crawl mode",
      "Keyword research",
      "Backlink analysis",
      "Rank tracking",
      "Priority support",
    ],
  },
};

export const PRO_TOOLS = [
  { id: "keywords", name: "Keyword Research", description: "Search volume, difficulty, CPC and related keyword ideas for any market." },
  { id: "backlinks", name: "Backlink Analysis", description: "Referring domains, anchor text, new and lost links for any domain." },
  { id: "rank-tracking", name: "Rank Tracking", description: "Daily Google positions for your target keywords, desktop and mobile." },
  { id: "traffic", name: "Traffic Analytics", description: "Estimated organic traffic, top pages and competitor comparison." },
];

/** Active subscription statuses that unlock Pro. */
export const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

export function planFor(user) {
  if (!user) return PLANS.free;
  if (user.role === "admin") return PLANS.pro;
  return user.plan === "pro" && ACTIVE_STATUSES.includes(user.subscription?.status) ? PLANS.pro : PLANS.free;
}

export const SERVICES = [
  "Technical SEO",
  "Website audit",
  "Local SEO",
  "Content marketing",
  "Google Ads (PPC)",
  "Social media marketing",
  "Web design & development",
  "Conversion optimisation",
];

export const BUDGETS = ["Under $500 / month", "$500 – $1,500 / month", "$1,500 – $5,000 / month", "$5,000+ / month", "Not sure yet"];

export const QUOTE_STATUSES = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "proposal", label: "Proposal sent" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];
