import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Admin sign in — Sire Crawler", robots: { index: false } };

export default async function AdminLoginPage({ searchParams }) {
  const { expired } = await searchParams;
  return (
    <AuthShell
      panel="admin"
      eyebrow={<span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} /> Restricted area</span>}
      title="Admin sign in"
      subtitle="Only administrator accounts can access this portal."
      footer={<Link href="/" className="font-semibold text-brand hover:underline">← Back to website</Link>}
    >
      <LoginForm scope="admin" notice={expired ? "Your session has ended. Please sign in again." : null} />
    </AuthShell>
  );
}
