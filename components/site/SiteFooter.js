import Link from "next/link";
import { Logo } from "../audit/ui";
import { cn as cx } from "@/lib/format";

export default function SiteFooter({ className = "" }) {
  return (
    <footer className={cx("border-t border-line bg-white print:hidden", className)}>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-mute">Technical SEO audits and digital marketing services for businesses that want to grow.</p>
        </div>
        {[
          ["Product", [["/#how", "How it works"], ["/#features", "SEO checks"], ["/#pricing", "Pricing"], ["/signup", "Create account"]]],
          ["Services", [["/contact", "Technical SEO"], ["/contact", "Website audit"], ["/contact", "Google Ads"], ["/contact", "Web design"]]],
          ["Company", [["/contact", "Contact us"], ["/contact", "Request a quote"], ["/login", "Log in"]]],
        ].map(([title, links]) => (
          <div key={title}>
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-ink">{title}</div>
            <ul className="mt-4 space-y-2.5 text-sm">
              {links.map(([href, label]) => (
                <li key={label}><Link href={href} className="text-mute transition-colors hover:text-brand">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line-2">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-mute sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} Sire Crawler. All rights reserved.</span>
          <span>Professional technical SEO auditing</span>
        </div>
      </div>
    </footer>
  );
}
