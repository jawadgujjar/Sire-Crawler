import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { SuspendButton } from "@/components/app/AdminBits";
import { Card } from "@/components/audit/ui";
import { requireAdmin } from "@/lib/server/dal";
import { getAdminUsers } from "@/lib/server/queries";
import { fmtNumber, formatDay, formatDateTime, cn } from "@/lib/format";

export const metadata = { title: "Users — Admin" };

const FILTERS = [["", "All"], ["free", "Free"], ["pro", "Pro"], ["admin", "Admins"]];

export default async function AdminUsers({ searchParams }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const plan = FILTERS.some(([id]) => id === params.plan) ? params.plan : "";
  const page = Math.max(1, Number.parseInt(params.page, 10) || 1);
  const data = await getAdminUsers({ q, plan, page });
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const href = (p) => `/admin/users?${new URLSearchParams({ ...(q && { q }), ...(plan && { plan }), ...(p > 1 && { page: String(p) }) })}`;

  return (
    <>
      <PageHeader eyebrow="Admin portal" title="Users" subtitle={`${fmtNumber(data.total)} account${data.total === 1 ? "" : "s"}${q ? ` matching “${q}”` : ""}`} />
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-xl bg-line-2 p-1">
            {FILTERS.map(([id, label]) => (
              <Link
                key={id}
                href={`/admin/users?${new URLSearchParams({ ...(q && { q }), ...(id && { plan: id }) })}`}
                className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition-all", plan === id ? "bg-white text-ink shadow-sm" : "text-mute hover:text-ink")}
              >
                {label}
              </Link>
            ))}
          </div>
          <form className="relative sm:w-72">
            {plan && <input type="hidden" name="plan" value={plan} />}
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input name="q" defaultValue={q} placeholder="Search name, email or company" className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-sm focus:border-brand/50 focus:outline-none focus:ring-4 focus:ring-brand/10" />
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas/70 text-left text-[11px] font-bold uppercase tracking-wider text-mute">
                <th className="px-6 py-3">User</th>
                <th className="px-3 py-3">Plan</th>
                <th className="px-3 py-3">Joined</th>
                <th className="px-3 py-3">Last login</th>
                <th className="px-3 py-3 text-right">Logins</th>
                <th className="px-3 py-3 text-right">Audits</th>
                <th className="px-6 py-3 text-right">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-2">
              {data.rows.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-mute">No users found.</td></tr>
              )}
              {data.rows.map((u) => (
                <tr key={u.id} className={cn("transition-colors hover:bg-canvas/60", u.disabled && "opacity-60")}>
                  <td className="px-6 py-3">
                    <div className="font-semibold text-ink">{u.name}{u.disabled && <span className="ml-2 rounded bg-critical-50 px-1.5 py-0.5 text-[10px] font-bold text-critical">SUSPENDED</span>}</div>
                    <div className="text-xs text-mute">{u.email}{u.company ? ` · ${u.company}` : ""}{u.phone ? ` · ${u.phone}` : ""}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", u.role === "admin" ? "bg-navy text-white" : u.pro ? "bg-brand text-white" : "bg-line-2 text-mute")}>
                      {u.role === "admin" ? "Admin" : u.pro ? "Pro" : "Free"}
                    </span>
                    {u.subscriptionStatus && !u.pro && <div className="mt-1 text-[11px] text-faint">was {u.subscriptionStatus}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-ink-2">{formatDay(u.createdAt)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-mute">{formatDateTime(u.lastLoginAt)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-ink-2">{fmtNumber(u.loginCount)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-ink-2">{fmtNumber(u.auditCount)}</td>
                  <td className="px-6 py-3">
                    <div className="flex justify-end">{u.role !== "admin" && u.id !== admin.id ? <SuspendButton id={u.id} disabled={u.disabled} name={u.name} /> : <span className="text-xs text-faint">—</span>}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-6 py-3.5 text-xs text-mute">
            <span>Page {page} of {pages}</span>
            <div className="flex gap-2">
              {page > 1 && <Link href={href(page - 1)} className="rounded-lg px-3 py-1.5 font-semibold text-ink ring-1 ring-inset ring-line hover:bg-canvas">Previous</Link>}
              {page < pages && <Link href={href(page + 1)} className="rounded-lg px-3 py-1.5 font-semibold text-ink ring-1 ring-inset ring-line hover:bg-canvas">Next</Link>}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
