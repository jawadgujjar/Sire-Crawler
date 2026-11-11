"use client";

import { useState } from "react";
import {
  Globe, SlidersHorizontal, ArrowRight, ShieldCheck, Gauge, Network, FileText, Code2,
  Bot, Map, Zap, Trash2, Monitor, Smartphone, ChevronDown, CircleAlert, Check,
  ScanSearch, ListChecks, FileDown, FileSpreadsheet, Printer, Lock, Crown, Headset, Search, MousePointerClick, Megaphone, PenTool,
} from "lucide-react";
import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { CHECKS } from "@/lib/audit/checks";
import { Button, Card, Segmented, Toggle, ScoreGauge, ScoreRing, SeverityIcon, StackedBar, cx, fmt, formatDate, formatMoney } from "./ui";

export const DEFAULT_OPTIONS = {
  maxPages: 100,
  speed: "normal",
  userAgent: "desktop",
  respectRobots: true,
  useSitemap: true,
  includeSubdomains: false,
  checkExternal: true,
  checkImages: true,
  stripTracking: true,
  include: "",
  exclude: "",
};

const FEATURES = [
  { Icon: Bot, title: "Crawlability", text: "Status codes, robots.txt, sitemaps, canonicals, noindex, redirects and crawl depth." },
  { Icon: ShieldCheck, title: "HTTPS & Security", text: "SSL certificate validity, HTTP→HTTPS redirects, mixed content and HSTS." },
  { Icon: Gauge, title: "Site Performance", text: "Load time, HTML weight, compression, render-blocking and resource counts." },
  { Icon: Network, title: "Internal Linking", text: "Broken links and images, orphaned pages, redirect chains and link equity flow." },
  { Icon: FileText, title: "On-Page SEO", text: "Titles, meta descriptions, headings, duplicate and thin content, alt text." },
  { Icon: Code2, title: "Markup & International", text: "Schema.org structured data, Open Graph, Twitter cards, lang and hreflang." },
];

const SERVICE_CARDS = [
  { Icon: Search, title: "Technical SEO", text: "We fix every issue in your audit and keep your site healthy." },
  { Icon: MousePointerClick, title: "Google Ads (PPC)", text: "Campaigns built and managed for profitable growth." },
  { Icon: Megaphone, title: "Social media marketing", text: "Content and paid social that builds your brand." },
  { Icon: PenTool, title: "Web design & development", text: "Fast, beautiful websites engineered to convert." },
];


const STEPS = [
  { Icon: Globe, title: "Enter your domain", text: "Choose how many pages to audit and fine-tune the crawler, or start straight away with sensible defaults." },
  { Icon: ScanSearch, title: "We crawl like a search engine", text: "Robots.txt, sitemaps, every internal link, SSL and redirects — analysed live as each page is fetched." },
  { Icon: FileDown, title: "Fix what matters first", text: "Get a health score, prioritised issues with clear fixes, and exports ready for your team or client." },
];

export default function Landing({ onStart, error, history, onOpenHistory, onRemoveHistory, options, setOptions, user, proPrice, compact = false }) {
  const [url, setUrl] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const set = (key) => (value) => setOptions((o) => ({ ...o, [key]: value }));

  const submit = (e) => {
    e.preventDefault();
    onStart(url);
  };

  const recent = history.slice(0, 6);
  const plan = user ? { maxPages: user.maxPages, speeds: user.speeds, pro: user.plan === "pro" } : { maxPages: PLANS.free.maxPages, speeds: PLANS.free.speeds, pro: false };
  const [lockNote, setLockNote] = useState("");
  const lockMessage = user ? "Upgrade to Pro in your dashboard to unlock this." : "Sign up and upgrade to Pro to unlock this.";

  return (
    <div>
      {/* ── Hero ── */}
      <section id="audit" className="relative scroll-mt-16 overflow-hidden bg-navy">
        <div className="hero-grid absolute inset-0" />
        <div className="pointer-events-none absolute -top-48 left-1/2 h-[560px] w-[1000px] -translate-x-1/2 rounded-full bg-brand/45 blur-[130px]" />
        <div className="pointer-events-none absolute bottom-0 right-[-10%] h-[340px] w-[560px] rounded-full bg-[#4f86ff]/20 blur-[110px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className={cx("relative mx-auto max-w-4xl px-4 text-center sm:px-6", compact ? "pb-16 pt-12 sm:pt-16" : "pb-44 pt-16 sm:pt-24")}>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-[#c5d2ec] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5ce65c] shadow-[0_0_10px_#5ce65c]" />
            Technical SEO Site Audit · {CHECKS.length} checks
          </span>
          {compact ? (
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-[-0.03em] text-white sm:text-5xl">
              Run a new <span className="font-display font-normal italic text-[#b9d3fb]">site audit</span>
            </h1>
          ) : (
            <h1 className="mx-auto mt-7 max-w-3xl text-[40px] font-extrabold leading-[1.04] tracking-[-0.035em] text-white sm:text-[68px]">
              Find and fix every issue
              <span className="block font-display text-[46px] font-normal italic tracking-[-0.01em] text-[#b9d3fb] sm:text-[78px]">holding your site back</span>
            </h1>
          )}
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#b7c6e6] sm:text-lg">
            Sire Crawler audits up to 1,000 pages, scores your site health and hands you a prioritised list of errors, warnings and notices — each with a clear explanation and fix.
          </p>

          <div className="mx-auto mt-10 max-w-3xl">
          <Card className="p-2 text-left shadow-float">
            <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">Website address</span>
                <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter a domain, e.g. example.com"
                  aria-label="Website address"
                  autoComplete="url"
                  inputMode="url"
                  spellCheck={false}
                  className="h-14 w-full rounded-xl bg-canvas pl-12 pr-4 text-[15px] font-medium text-ink placeholder:text-faint focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </label>
              <Button type="submit" size="lg" className="h-14 px-8">
                Start Site Audit
                <ArrowRight size={18} />
              </Button>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-2 pt-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mute">
                <span><b className="font-semibold text-ink">{fmt(options.maxPages)}</b> pages</span>
                <span className="flex items-center gap-1">{options.userAgent === "mobile" ? <Smartphone size={13} /> : <Monitor size={13} />}{options.userAgent === "mobile" ? "Mobile" : "Desktop"} crawler</span>
                <span>robots.txt {options.respectRobots ? "respected" : "ignored"}</span>
                {options.useSitemap && <span>Sitemap URLs included</span>}
              </div>
              <button
                type="button"
                onClick={() => setShowSettings((s) => !s)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand-50"
                aria-expanded={showSettings}
              >
                <SlidersHorizontal size={14} />
                Audit settings
                <ChevronDown size={14} className={cx("transition-transform", showSettings && "rotate-180")} />
              </button>
            </div>

            {showSettings && (
              <div className="animate-fade-up grid gap-6 border-t border-line p-5 md:grid-cols-2">
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">Pages to crawl</div>
                    <Segmented
                      value={options.maxPages}
                      onChange={set("maxPages")}
                      options={[50, 100, 250, 500, 1000].map((n) => ({
                        value: n,
                        label: fmt(n),
                        disabled: n > plan.maxPages,
                        badge: n > plan.maxPages ? "Pro" : undefined,
                        title: n > plan.maxPages ? `Pro plan: audit up to 1,000 pages` : undefined,
                        onDisabledClick: () => setLockNote(lockMessage),
                      }))}
                    />
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">Crawl speed</div>
                    <Segmented
                      value={options.speed}
                      onChange={set("speed")}
                      options={[
                        { value: "gentle", label: "Gentle" },
                        { value: "normal", label: "Normal" },
                        { value: "fast", label: "Fast", icon: <Zap size={12} />, disabled: !plan.speeds.includes("fast"), badge: plan.speeds.includes("fast") ? undefined : "Pro", onDisabledClick: () => setLockNote(lockMessage) },
                      ]}
                    />
                    {lockNote && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand">
                        <Lock size={12} /> {lockNote}{" "}
                        <a href={user ? "/dashboard/billing" : "/signup"} className="font-bold underline underline-offset-2">{user ? "Upgrade" : "Sign up free"}</a>
                      </p>
                    )}
                    <p className="mt-1.5 text-xs text-mute">Use Gentle for small or shared hosting. A robots.txt crawl-delay always slows the crawl down.</p>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">User agent</div>
                    <Segmented
                      value={options.userAgent}
                      onChange={set("userAgent")}
                      options={[
                        { value: "desktop", label: "Desktop", icon: <Monitor size={12} /> },
                        { value: "mobile", label: "Mobile", icon: <Smartphone size={12} /> },
                      ]}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mute">Only crawl URLs containing</span>
                      <textarea
                        value={options.include}
                        onChange={(e) => set("include")(e.target.value)}
                        rows={3}
                        placeholder={"/blog/\n/products/*"}
                        className="w-full resize-none rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-xs text-ink placeholder:text-faint focus:border-brand/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/15"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mute">Skip URLs containing</span>
                      <textarea
                        value={options.exclude}
                        onChange={(e) => set("exclude")(e.target.value)}
                        rows={3}
                        placeholder={"/cart\n/wp-admin/\n?sort="}
                        className="w-full resize-none rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-xs text-ink placeholder:text-faint focus:border-brand/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/15"
                      />
                    </label>
                  </div>
                </div>
                <div className="-m-3 space-y-0.5">
                  <Toggle checked={options.respectRobots} onChange={set("respectRobots")} label="Respect robots.txt" description="Skip URLs disallowed for our crawler and honour crawl-delay." />
                  <Toggle checked={options.useSitemap} onChange={set("useSitemap")} label="Crawl sitemap URLs" description="Add URLs from sitemap.xml to find orphaned pages." />
                  <Toggle checked={options.checkExternal} onChange={set("checkExternal")} label="Check external links" description="Verify up to 200 outgoing links for 404s and dead domains." />
                  <Toggle checked={options.checkImages} onChange={set("checkImages")} label="Check internal images" description="Find broken images on your own domain." />
                  <Toggle checked={options.includeSubdomains} onChange={set("includeSubdomains")} label="Include subdomains" description="Treat blog.example.com etc. as part of the site." />
                  <Toggle checked={options.stripTracking} onChange={set("stripTracking")} label="Ignore tracking parameters" description="Treat ?utm_source= and similar as the same page." />
                </div>
              </div>
            )}
          </Card>

          {error && (
            <div role="alert" className="animate-fade-up mt-4 flex items-start gap-3 rounded-xl border border-critical/20 bg-critical-50 px-4 py-3 text-left text-sm text-ink">
              <CircleAlert size={18} className="mt-0.5 shrink-0 text-critical" />
              <span>{error}</span>
            </div>
          )}

            <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-[#b7c6e6]">
              {(compact
                ? [`Up to ${fmt(plan.maxPages)} pages on your plan`, "Saved to your dashboard", "Export to CSV, JSON & PDF"]
                : ["No sign-up required", `Free audits up to ${PLANS.free.maxPages} pages`, "Export to CSV, JSON & PDF"]
              ).map((t) => (
                <li key={t} className="flex items-center gap-1.5"><Check size={14} className="text-[#9ec5f4]" />{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Product preview ── */}
      {!compact && (
        <section className="relative mx-auto -mt-32 max-w-5xl px-4 sm:px-6" aria-label="Sample report preview">
          <ReportPreview />
        </section>
      )}

      {/* ── Recent audits ── */}
      {recent.length > 0 && (
        <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
          <SectionHeading eyebrow="Your workspace" title="Recent audits" text="Saved in this browser. Run an audit again to track progress over time." align="left" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((h) => (
              <Card key={h.id} className="group flex items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift">
                <ScoreRing score={h.score} size={52} stroke={5} />
                <button className="min-w-0 flex-1 text-left" onClick={() => onOpenHistory(h)}>
                  <div className="truncate text-sm font-bold text-ink group-hover:text-brand">{h.host}</div>
                  <div className="text-xs text-mute">{formatDate(h.finishedAt)} · {fmt(h.pages)} pages</div>
                  <div className="mt-1 flex gap-3 text-xs font-semibold tabular-nums">
                    <span className="flex items-center gap-1 text-ink-2"><SeverityIcon severity="error" size={12} />{fmt(h.counts.error)}</span>
                    <span className="flex items-center gap-1 text-ink-2"><SeverityIcon severity="warning" size={12} />{fmt(h.counts.warning)}</span>
                    <span className="flex items-center gap-1 text-ink-2"><SeverityIcon severity="notice" size={12} />{fmt(h.counts.notice)}</span>
                  </div>
                </button>
                <button
                  onClick={() => onRemoveHistory(h.id)}
                  className="rounded-lg p-2 text-faint opacity-0 transition-all hover:bg-critical-50 hover:text-critical group-hover:opacity-100 focus:opacity-100"
                  aria-label={`Remove ${h.host} from history`}
                >
                  <Trash2 size={15} />
                </button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {!compact && (
        <>
          {/* ── How it works ── */}
          <section id="how" className="mx-auto mt-24 max-w-6xl scroll-mt-24 px-4 sm:px-6">
            <SectionHeading eyebrow="How it works" title={<>From domain to action plan <em className="font-display font-normal text-brand">in minutes</em></>} />
            <ol className="grid gap-4 md:grid-cols-3">
              {STEPS.map(({ Icon, title, text }, i) => (
                <li key={title} className="relative">
                  <Card className="edge-gradient h-full p-7">
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-white shadow-[0_10px_24px_-12px_rgb(7_21_56/0.8)]">
                        <Icon size={20} />
                      </span>
                      <span className="font-display text-5xl italic leading-none text-line">0{i + 1}</span>
                    </div>
                    <h3 className="mt-5 text-base font-bold text-ink">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-mute">{text}</p>
                  </Card>
                </li>
              ))}
            </ol>
          </section>

          {/* ── Features ── */}
          <section id="features" className="mx-auto mt-24 max-w-6xl scroll-mt-24 px-4 sm:px-6">
            <SectionHeading
              eyebrow={`${CHECKS.length} checks · 7 thematic reports`}
              title={<>Every technical SEO check, <em className="font-display font-normal text-brand">in one report</em></>}
              text="Thematic reports show exactly where your site is strong and where it's losing traffic."
            />
            <div className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line shadow-card sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ Icon, title, text }) => (
                <div key={title} className="group bg-white p-7 transition-colors hover:bg-[#fbfcff]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand ring-1 ring-inset ring-brand/10 transition-transform group-hover:scale-105">
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-5 text-base font-bold text-ink">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-mute">{text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Pricing ── */}
          <section id="pricing" className="mx-auto mt-24 max-w-5xl scroll-mt-24 px-4 sm:px-6">
            <SectionHeading
              eyebrow="Pricing"
              title={<>Start free, <em className="font-display font-normal text-brand">upgrade</em> when you grow</>}
              text="Free audits forever. Pro unlocks deeper crawls and paid data tools."
            />
            <div className="grid gap-5 md:grid-cols-2">
              <Card className="edge-gradient flex flex-col p-8">
                <div className="text-sm font-bold text-ink">{PLANS.free.name}</div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-5xl font-extrabold tracking-tight text-ink">$0</span>
                  <span className="text-sm text-mute">forever</span>
                </div>
                <p className="mt-2 text-sm text-mute">{PLANS.free.tagline}</p>
                <ul className="mt-7 flex-1 space-y-3">
                  {PLANS.free.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-ink-2"><Check size={16} className="mt-0.5 shrink-0 text-good" />{f}</li>
                  ))}
                </ul>
                <Link href={user ? "/dashboard" : "/signup"} className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-white text-[15px] font-semibold text-ink ring-1 ring-inset ring-line transition-colors hover:bg-canvas">
                  {user ? "Go to dashboard" : "Create free account"}
                </Link>
              </Card>
              <div className="sheen relative flex flex-col overflow-hidden rounded-2xl bg-navy p-8 text-white shadow-float">
                <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand/60 blur-[90px]" />
                <div className="relative flex items-center justify-between">
                  <span className="text-sm font-bold">{PLANS.pro.name}</span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#b9d3fb] ring-1 ring-inset ring-white/15">Most popular</span>
                </div>
                <div className="relative mt-3 flex items-baseline gap-1.5">
                  {proPrice ? (
                    <>
                      <span className="text-5xl font-extrabold tracking-tight">{formatMoney(proPrice.amount, proPrice.currency)}</span>
                      <span className="text-sm text-[#b7c6e6]">/ {proPrice.interval}</span>
                    </>
                  ) : (
                    <span className="font-display text-4xl italic">Premium</span>
                  )}
                </div>
                <p className="relative mt-2 text-sm text-[#b7c6e6]">{PLANS.pro.tagline}</p>
                <ul className="relative mt-7 flex-1 space-y-3">
                  {PLANS.pro.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-[#d5def0]"><Check size={16} className="mt-0.5 shrink-0 text-[#9ec5f4]" />{f}</li>
                  ))}
                </ul>
                <Link
                  href={user ? "/dashboard/billing" : "/signup?next=/dashboard/billing"}
                  className="relative mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-[15px] font-semibold text-navy transition-colors hover:bg-brand-50"
                >
                  <Crown size={17} /> {user?.plan === "pro" ? "Manage subscription" : "Upgrade to Pro"}
                </Link>
              </div>
            </div>
          </section>

          {/* ── Services CTA ── */}
          <section id="services" className="mx-auto mt-24 max-w-6xl scroll-mt-24 px-4 sm:px-6">
            <div className="grid items-center gap-10 overflow-hidden rounded-3xl border border-line/80 bg-white p-8 shadow-card sm:p-12 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Done-for-you services</div>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-[40px] sm:leading-[1.1]">
                  Let our experts <em className="font-display font-normal text-brand">grow</em> your business
                </h2>
                <p className="mt-4 text-mute">
                  Found issues in your audit? Our team handles the fixes — plus full digital marketing, from SEO and Google Ads to social media and web design.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/contact" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-navy px-7 text-[15px] font-semibold text-white shadow-[0_14px_30px_-14px_rgb(7_21_56/0.9)] transition-colors hover:bg-navy-3">
                    Get a free quote <ArrowRight size={18} />
                  </Link>
                  <Link href="/contact?service=Website%20audit" className="inline-flex h-12 items-center justify-center rounded-xl px-6 text-[15px] font-semibold text-ink ring-1 ring-inset ring-line transition-colors hover:bg-canvas">
                    Book an expert audit
                  </Link>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {SERVICE_CARDS.map(({ Icon, title, text }) => (
                  <Link key={title} href={`/contact?service=${encodeURIComponent(title)}`} className="group rounded-2xl border border-line-2 bg-canvas/60 p-5 transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:bg-white hover:shadow-card">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand shadow-sm ring-1 ring-inset ring-line group-hover:bg-brand group-hover:text-white">
                      <Icon size={18} />
                    </span>
                    <h3 className="mt-4 text-sm font-bold text-ink">{title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-mute">{text}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ── Closing CTA ── */}
          <section id="formats" className="mx-auto mb-20 mt-24 max-w-6xl scroll-mt-24 px-4 sm:px-6">
            <div className="sheen relative overflow-hidden rounded-3xl bg-navy px-6 py-14 text-center shadow-float sm:px-12">
              <div className="hero-grid absolute inset-0 opacity-70" />
              <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-[700px] -translate-x-1/2 rounded-full bg-brand/40 blur-[100px]" />
              <div className="relative">
                <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Client-ready reports, <em className="font-display font-normal text-[#b9d3fb]">beautifully</em> simple
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-[#b7c6e6]">Share a polished PDF with clients, hand developers the raw data, or work through issues in a spreadsheet.</p>
                <div className="mx-auto mt-10 grid max-w-4xl gap-px overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10 sm:grid-cols-4">
                  {[
                    { k: "1,000", v: "pages per audit", Icon: ScanSearch },
                    { k: `${CHECKS.length}`, v: "SEO checks", Icon: ListChecks },
                    { k: "PDF", v: "client summary", Icon: Printer },
                    { k: "CSV · JSON", v: "raw data exports", Icon: FileSpreadsheet },
                  ].map(({ k, v, Icon }) => (
                    <div key={v} className="bg-navy/60 px-4 py-6 backdrop-blur">
                      <Icon size={18} className="mx-auto text-[#9ec5f4]" />
                      <div className="mt-2 text-2xl font-extrabold tracking-tight text-white">{k}</div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8fa3cf]">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <a
                    href="#audit"
                    className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-7 text-[15px] font-semibold text-navy shadow-[0_14px_34px_-14px_rgb(0_0_0/0.7)] transition-colors hover:bg-brand-50"
                  >
                    Run your first audit <ArrowRight size={18} />
                  </a>
                  <Link
                    href="/contact?service=Website%20audit"
                    className="inline-flex h-12 items-center gap-2 rounded-xl px-7 text-[15px] font-semibold text-white ring-1 ring-inset ring-white/25 transition-colors hover:bg-white/10"
                  >
                    <Headset size={18} /> Talk to an expert
                  </Link>
                </div>
                <p className="mt-6 flex items-center justify-center gap-2 text-xs text-[#8fa3cf]">
                  <Map size={13} /> Reads robots.txt and sitemaps, honours crawl-delay and identifies itself as SireCrawler.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SectionHeading({ eyebrow, title, text, align = "center" }) {
  return (
    <div className={cx("mb-10", align === "center" ? "mx-auto max-w-3xl text-center" : "mb-5")}>
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand">{eyebrow}</div>
      <h2 className={cx("mt-2 font-extrabold tracking-tight text-ink", align === "center" ? "text-3xl sm:text-[40px] sm:leading-[1.1]" : "text-xl")}>{title}</h2>
      {text && <p className={cx("text-mute", align === "center" ? "mt-3" : "mt-1 text-sm")}>{text}</p>}
    </div>
  );
}

/** Illustrative product shot built from the real report components. */
function ReportPreview() {
  const cats = [
    ["Crawlability", 96], ["HTTPS", 100], ["Performance", 88], ["Linking", 94], ["On-Page SEO", 81], ["Markup", 90],
  ];
  return (
    <div className="overflow-hidden rounded-[22px] border border-white/60 bg-white shadow-float" aria-hidden="true">
      <div className="flex items-center gap-3 border-b border-line bg-canvas/80 px-4 py-3">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f2c4c4]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f6dfaa]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#c4e6c4]" />
        </span>
        <span className="mx-auto flex items-center gap-2 rounded-lg bg-white px-3 py-1 text-[11px] font-medium text-mute ring-1 ring-line">
          <Globe size={11} /> Site Audit · example.com
        </span>
        <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">Sample</span>
      </div>
      <div className="grid gap-5 p-5 sm:p-7 md:grid-cols-[230px_1fr]">
        <div className="flex flex-col items-center rounded-2xl border border-line-2 p-4 text-center">
          <div className="self-start text-xs font-bold text-ink">Site Health</div>
          <div className="mt-2"><ScoreGauge score={92} size={180} /></div>
          <span className="mt-2 rounded-full bg-good-50 px-3 py-1 text-[11px] font-bold text-good-ink">Excellent</span>
        </div>
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[["error", "Errors", 4], ["warning", "Warnings", 37], ["notice", "Notices", 112]].map(([sev, label, n]) => (
              <div key={sev} className="rounded-2xl border border-line-2 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-2"><SeverityIcon severity={sev} size={13} />{label}</div>
                <div className="mt-1.5 text-2xl font-extrabold tracking-tight text-ink">{n}</div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-line-2 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-ink">Crawled pages</span>
              <span className="font-semibold tabular-nums text-mute">250</span>
            </div>
            <div className="mt-3">
              <StackedBar
                height={10}
                segments={[
                  { label: "Healthy", value: 168, color: "#0ca30c" },
                  { label: "Have issues", value: 61, color: "#fab219" },
                  { label: "Redirects", value: 14, color: "#ec835a" },
                  { label: "Broken", value: 4, color: "#d03b3b" },
                  { label: "Blocked", value: 3, color: "#a3adc2" },
                ]}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cats.map(([label, score]) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-line-2 px-3 py-2.5">
                <ScoreRing score={score} size={34} stroke={4} />
                <span className="truncate text-xs font-semibold text-ink-2">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
