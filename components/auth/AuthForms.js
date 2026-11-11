"use client";

import { useActionState } from "react";
import { Mail, User, Building2, ArrowRight } from "lucide-react";
import { login, signup } from "@/app/actions/auth";
import { TextInput, PasswordInput, SubmitButton, FormAlert } from "../forms";

export function LoginForm({ next = "", scope = "user", notice }) {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="scope" value={scope} />
      {notice && !state?.message && <FormAlert tone="success">{notice}</FormAlert>}
      <FormAlert>{state?.message}</FormAlert>
      <TextInput
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        defaultValue={state?.values?.email}
        icon={<Mail size={16} />}
        required
        autoFocus
      />
      <PasswordInput label="Password" name="password" autoComplete="current-password" placeholder="Your password" required />
      <SubmitButton className="w-full" pendingLabel="Signing in…">
        {scope === "admin" ? "Sign in to admin" : "Log in"} <ArrowRight size={17} />
      </SubmitButton>
    </form>
  );
}

export function SignupForm({ next = "" }) {
  const [state, action] = useActionState(signup, undefined);
  const e = state?.errors || {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {/* Honeypot: hidden from people, filled by bots */}
      <input type="text" name="website_url" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <FormAlert>{state?.message}</FormAlert>
      <TextInput label="Full name" name="name" autoComplete="name" placeholder="Jane Smith" defaultValue={state?.values?.name} error={e.name} icon={<User size={16} />} required autoFocus />
      <TextInput label="Work email" name="email" type="email" autoComplete="email" placeholder="you@company.com" defaultValue={state?.values?.email} error={e.email} icon={<Mail size={16} />} required />
      <TextInput label="Company" name="company" autoComplete="organization" placeholder="Acme Inc." defaultValue={state?.values?.company} icon={<Building2 size={16} />} optional />
      <PasswordInput label="Password" name="password" autoComplete="new-password" placeholder="At least 8 characters" error={e.password} hint="Use 8+ characters with a letter and a number." required />
      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-2">
          <input type="checkbox" name="terms" className="mt-0.5 h-4 w-4 rounded border-line accent-[#1d4ed8]" />
          <span>I agree to the terms of service and privacy policy.</span>
        </label>
        {e.terms && <p className="mt-1.5 text-xs font-medium text-critical">{e.terms}</p>}
      </div>
      <SubmitButton className="w-full" pendingLabel="Creating your account…">
        Create free account <ArrowRight size={17} />
      </SubmitButton>
    </form>
  );
}
