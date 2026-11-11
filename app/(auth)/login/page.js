import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Log in — Sire Crawler" };

export default async function LoginPage({ searchParams }) {
  const { next = "", expired } = await searchParams;
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in to your account"
      subtitle="Pick up where you left off with your audits."
      footer={<>New to Sire Crawler? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand hover:underline">Create a free account</Link></>}
    >
      <LoginForm next={typeof next === "string" ? next : ""} notice={expired ? "Your session has ended. Please log in again." : null} />
    </AuthShell>
  );
}
