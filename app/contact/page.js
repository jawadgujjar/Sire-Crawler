import { Clock, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import QuoteForm from "@/components/site/QuoteForm";
import { getCurrentUser } from "@/lib/server/dal";
import { SERVICES } from "@/lib/plans";

export const metadata = {
  title: "Request a quote — Sire Crawler",
  description: "Get a free quote for technical SEO, website audits, Google Ads, social media and web design.",
};

export default async function ContactPage({ searchParams }) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const service = typeof params.service === "string" && SERVICES.includes(params.service) ? [params.service] : [];
  const website = typeof params.website === "string" ? params.website.slice(0, 200) : "";

  return (
    <div className="min-h-screen bg-canvas">
      <SiteNav user={user} tone="dark" />
      <section className="relative overflow-hidden bg-navy">
        <div className="hero-grid absolute inset-0" />
        <div className="pointer-events-none absolute -top-48 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-brand/40 blur-[130px]" />
        <div className="relative mx-auto max-w-4xl px-4 pb-40 pt-16 text-center sm:px-6 sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-[#c5d2ec]">
            <Sparkles size={13} className="text-[#9ec5f4]" /> Digital marketing services
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.06] tracking-[-0.03em] text-white sm:text-6xl">
            Let&apos;s grow your traffic,
            <span className="block font-display font-normal italic text-[#b9d3fb]">together</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-[#b7c6e6]">
            From in-depth website audits to full-service SEO, ads and design. Tell us about your project and get a tailored proposal.
          </p>
        </div>
      </section>

      <section className="relative mx-auto -mt-28 max-w-6xl px-4 pb-24 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-3xl border border-line/80 bg-white p-6 shadow-float sm:p-10">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink">Request a free quote</h2>
            <p className="mt-1 text-sm text-mute">Takes about two minutes. Fields marked optional can be skipped.</p>
            <div className="mt-8">
              <QuoteForm user={user} source="contact" defaultServices={service} defaultWebsite={website} />
            </div>
          </div>
          <aside className="space-y-4">
            {[
              { Icon: Clock, title: "Reply within 1 business day", text: "A specialist — not a bot — reviews every request." },
              { Icon: MessageSquareText, title: "Free consultation", text: "We walk you through your audit results and the biggest opportunities." },
              { Icon: ShieldCheck, title: "No obligation", text: "Clear, fixed proposals. You decide if and when to start." },
            ].map(({ Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-line/80 bg-white p-6 shadow-card">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand"><Icon size={19} /></span>
                <h3 className="mt-4 text-[15px] font-bold text-ink">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-mute">{text}</p>
              </div>
            ))}
            <div className="sheen relative overflow-hidden rounded-2xl bg-navy p-6 text-white">
              <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-brand/60 blur-[60px]" />
              <div className="relative">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#9ec5f4]">Services</div>
                <ul className="mt-3 space-y-1.5 text-sm text-[#d5def0]">
                  {SERVICES.map((s) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
