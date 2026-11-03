import { Plus_Jakarta_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

// Display serif, used sparingly for editorial accents in headlines
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata = {
  title: "Sire Crawler — Technical SEO Site Audit",
  description: "Crawl up to 1,000 pages and get a complete technical SEO audit: site health score, 50+ checks, broken links, duplicates, HTTPS, performance and structured data.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${serif.variable}`}>
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla) add attributes to <body> before React hydrates */}
      <body className="font-sans" suppressHydrationWarning>{children}</body>
    </html>
  );
}
