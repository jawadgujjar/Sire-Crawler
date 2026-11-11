import Link from "next/link";
import { Check } from "lucide-react";
import { Logo } from "../audit/ui";

/** Split-screen auth layout: brand panel on the left, form on the right. */
export default function AuthShell({ eyebrow, title, subtitle, children, footer, panel = "user" }) {
  const admin = panel === "admin";
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      <aside className="sheen relative hidden overflow-hidden bg-navy lg:flex lg:flex-col">
        <div className="hero-grid absolute inset-0" />
        <div className="pointer-events-none absolute -left-32 -top-40 h-[520px] w-[620px] rounded-full bg-brand/45 blur-[130px]" />
        <div className="pointer-events-none absolute -bottom-40 right-[-20%] h-[380px] w-[520px] rounded-full bg-[#4f86ff]/20 blur-[110px]" />
        <div className="relative flex flex-1 flex-col justify-between p-12 xl:p-16">
          <Link href="/" className="w-fit"><Logo light /></Link>
          <div className="max-w-lg">
            {admin ? (
              <>
                <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white xl:text-5xl">
                  Admin <span className="font-display font-normal italic text-[#b9d3fb]">control centre</span>
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-[#b7c6e6]">Users, subscriptions, revenue and every quote request — in one secure place.</p>
              </>
            ) : (
              <>
                <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white xl:text-5xl">
                  See your site the way <span className="font-display font-normal italic text-[#b9d3fb]">search engines do</span>
                </h2>
                <ul className="mt-8 space-y-4">
                  {["Free technical SEO audits of up to 100 pages", "Every audit saved to your dashboard", "Upgrade to Pro for 1,000-page audits and data tools"].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-[15px] text-[#d5def0]">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20"><Check size={12} strokeWidth={3} className="text-[#9ec5f4]" /></span>
                      {t}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <p className="text-xs text-[#8fa3cf]">© {new Date().getFullYear()} Sire Crawler · Professional technical SEO auditing</p>
        </div>
      </aside>

      <main className="flex flex-col">
        <div className="flex h-16 items-center px-6 lg:hidden">
          <Link href="/"><Logo /></Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-[420px] animate-fade-up">
            {eyebrow && <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand">{eyebrow}</div>}
            <h1 className="mt-2 text-[32px] font-extrabold leading-tight tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] text-mute">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-center text-sm text-mute">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
