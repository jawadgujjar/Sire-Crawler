import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Create your account — Sire Crawler" };

export default async function SignupPage({ searchParams }) {
  const { next = "" } = await searchParams;
  return (
    <AuthShell
      eyebrow="Free forever plan"
      title="Create your account"
      subtitle="Start auditing in under a minute. No credit card required."
      footer={<>Already have an account? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand hover:underline">Log in</Link></>}
    >
      <SignupForm next={typeof next === "string" ? next : ""} />
    </AuthShell>
  );
}
