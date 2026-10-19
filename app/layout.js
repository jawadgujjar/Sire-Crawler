import "./globals.css";

export const metadata = {
  title: "Sire Crawler — Professional SEO Site Auditor",
  description: "Audit any website in seconds. Sire Crawler analyzes every page for SEO issues, broken links, missing tags, and performance problems.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
