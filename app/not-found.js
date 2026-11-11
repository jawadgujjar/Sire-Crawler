import Link from "next/link";
import { Logo } from "@/components/audit/ui";

export const metadata = { title: "Page not found — Sire Crawler" };

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-navy px-6 text-center">
      <div className="hero-grid absolute inset-0" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[800px] -translate-x-1/2 rounded-full bg-brand/40 blur-[120px]" />
      <div className="relative">
        <Link href="/" className="inline-block"><Logo light /></Link>
        <div className="mt-10 font-display text-[120px] italic leading-none text-[#b9d3fb]">404</div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">This page doesn&apos;t exist</h1>
        <p className="mx-auto mt-2 max-w-md text-[#b7c6e6]">The link may be broken or the page may have moved.</p>
        <Link href="/" className="mt-8 inline-flex h-12 items-center rounded-xl bg-white px-6 text-[15px] font-semibold text-navy hover:bg-brand-50">Back to home</Link>
      </div>
    </div>
  );
}
