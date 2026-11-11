import Link from "next/link";
import { Search, Mail, Phone, Globe, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { QuoteStatusSelect, QuoteNoteForm } from "@/components/app/AdminBits";
import { Card } from "@/components/audit/ui";
import { getAdminQuotes } from "@/lib/server/queries";
import { QUOTE_STATUSES } from "@/lib/plans";
import { fmtNumber, formatDateTime, cn } from "@/lib/format";

export const metadata = { title: "Quote requests — Admin" };

export default async function AdminQuotes({ searchParams }) {
  const params = await searchParams;
  const status = QUOTE_STATUSES.some((s) => s.id === params.status) ? params.status : "";
  const q = typeof params.q === "string" ? params.q : "";
  const { rows, counts } = await getAdminQuotes({ status, q });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader eyebrow="Admin portal" title="Quote requests" subtitle={`${fmtNumber(total)} request${total === 1 ? "" : "s"} from the website and dashboards`} />

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1 rounded-xl bg-line-2 p-1">
            {[{ id: "", label: "All", n: total }, ...QUOTE_STATUSES.map((s) => ({ ...s, n: counts[s.id] || 0 }))].map((s) => (
              <Link
                key={s.id}
                href={`/admin/quotes?${new URLSearchParams({ ...(s.id && { status: s.id }), ...(q && { q }) })}`}
                className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold", status === s.id ? "bg-white text-ink shadow-sm" : "text-mute hover:text-ink")}
              >
                {s.label}
                <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", status === s.id ? "bg-brand-50 text-brand" : "bg-white/70")}>{s.n}</span>
              </Link>
            ))}
          </div>
          <form className="relative lg:w-72">
            {status && <input type="hidden" name="status" value={status} />}
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input name="q" defaultValue={q} placeholder="Search requests" className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-sm focus:border-brand/50 focus:outline-none focus:ring-4 focus:ring-brand/10" />
          </form>
        </div>

        {rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-mute">No quote requests found.</p>
        ) : (
          <ul className="divide-y divide-line-2">
            {rows.map((r) => (
              <li key={r.id} className="relative px-4 py-2 sm:px-6">
                {/* Outside <summary> so changing the status doesn't toggle the row */}
                <div className="absolute right-6 top-[22px] z-10 sm:right-8"><QuoteStatusSelect id={r.id} status={r.status} /></div>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-4 rounded-xl py-3 pl-2 pr-40 hover:bg-canvas/60 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">{r.name}</span>
                        {r.company && <span className="text-sm text-mute">· {r.company}</span>}
                        {r.isUser && <span className="inline-flex items-center gap-1 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand"><UserCheck size={10} /> USER</span>}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-mute">{r.services.join(" · ")}{r.budget ? ` — ${r.budget}` : ""}</div>
                    </div>
                    <span className="hidden whitespace-nowrap text-xs text-faint sm:block">{formatDateTime(r.createdAt)}</span>
                  </summary>
                  <div className="mb-3 ml-2 mt-1 rounded-2xl bg-canvas p-5">
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <a href={`mailto:${r.email}`} className="flex items-center gap-1.5 font-semibold text-brand hover:underline"><Mail size={14} />{r.email}</a>
                      {r.phone && <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 text-ink-2 hover:text-brand"><Phone size={14} />{r.phone}</a>}
                      {r.website && <a href={r.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-ink-2 hover:text-brand"><Globe size={14} />{r.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>}
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink">{r.message}</p>
                    <div className="mt-4 text-[11px] text-faint">
                      Source: {r.source} · Received {formatDateTime(r.createdAt)}{r.updatedBy ? ` · Last updated by ${r.updatedBy}` : ""}
                    </div>
                    <QuoteNoteForm id={r.id} note={r.adminNote} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
