import { Clock, MessageSquareText, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import QuoteForm from "@/components/site/QuoteForm";
import { Card } from "@/components/audit/ui";
import { requireUser } from "@/lib/server/dal";
import { getUserQuotes } from "@/lib/server/queries";
import { QUOTE_STATUSES } from "@/lib/plans";
import { formatDay, cn } from "@/lib/format";

export const metadata = { title: "Services & quotes — Sire Crawler" };

const TONE = { new: "bg-brand-50 text-brand", contacted: "bg-notice-50 text-notice", proposal: "bg-warning-50 text-warning-ink", won: "bg-good-50 text-good-ink", lost: "bg-line-2 text-mute" };

export default async function ServicesPage() {
  const user = await requireUser();
  const quotes = await getUserQuotes(user.id);
  return (
    <>
      <PageHeader eyebrow="Services" title="Work with" accent="our experts" subtitle="Tell us what you need — SEO, ads, social media or a new website — and get a tailored proposal." />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card className="p-6 sm:p-8">
          <h2 className="text-xl font-extrabold tracking-tight text-ink">Request a quote</h2>
          <p className="mt-1 text-sm text-mute">We&apos;ve filled in your details. A specialist will reply within one business day.</p>
          <div className="mt-7">
            <QuoteForm user={user} source="dashboard" />
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <div className="px-6 pt-5">
              <h2 className="text-[15px] font-bold text-ink">Your requests</h2>
              <p className="mt-0.5 text-xs text-mute">Track the status of every quote</p>
            </div>
            {quotes.length === 0 ? (
              <p className="px-6 pb-6 pt-4 text-sm text-mute">No requests yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line-2 pb-2">
                {quotes.map((q) => (
                  <li key={q.id} className="flex items-start justify-between gap-3 px-6 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{q.services.join(", ")}</div>
                      <div className="text-xs text-mute">{formatDay(q.createdAt)}{q.website ? ` · ${q.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}` : ""}</div>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", TONE[q.status] || TONE.new)}>
                      {QUOTE_STATUSES.find((s) => s.id === q.status)?.label || "New"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {[
            { Icon: Clock, title: "Fast response", text: "Every request is reviewed by a specialist within one business day." },
            { Icon: MessageSquareText, title: "Free consultation", text: "We walk you through your audit and the biggest opportunities." },
            { Icon: ShieldCheck, title: "No obligation", text: "Clear, fixed proposals. Start only when you're ready." },
          ].map(({ Icon, title, text }) => (
            <div key={title} className="flex gap-4 rounded-2xl border border-line/80 bg-white p-5 shadow-card">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand"><Icon size={18} /></span>
              <div>
                <h3 className="text-sm font-bold text-ink">{title}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-mute">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
