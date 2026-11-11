"use client";

import { useState } from "react";
import { ArrowRight, Check, CircleCheckBig } from "lucide-react";
import { SERVICES, BUDGETS } from "@/lib/plans";
import { TextInput, TextArea, SelectInput, PrimaryButton, FormAlert, Field } from "../forms";
import { cx } from "../audit/ui";

/** Quote / contact request. Posts to /api/quotes and shows up in the admin portal. */
export default function QuoteForm({ user, source = "contact", defaultServices = [], defaultWebsite = "", compact = false }) {
  const [values, setValues] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    company: user?.company || "",
    website: defaultWebsite,
    services: defaultServices.filter((s) => SERVICES.includes(s)),
    budget: "",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const toggle = (service) =>
    setValues((v) => ({ ...v, services: v.services.includes(service) ? v.services.filter((s) => s !== service) : [...v.services, service] }));

  async function submit(e) {
    e.preventDefault();
    setPending(true);
    setMessage("");
    setErrors({});
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, source, company_url: e.target.company_url?.value || "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setDone(true);
      else if (data.errors) setErrors(data.errors);
      else setMessage(data.error || "Something went wrong. Please try again.");
    } catch {
      setMessage("We couldn't send your request. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="animate-fade-up flex flex-col items-center px-4 py-12 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-good-50 text-good-ink ring-1 ring-inset ring-good/20">
          <CircleCheckBig size={30} />
        </span>
        <h3 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">Thank you, {values.name.split(" ")[0]}!</h3>
        <p className="mt-2 max-w-sm text-mute">Your request has been received. A specialist will review it and reply to <b className="text-ink">{values.email}</b> within one business day.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <input type="text" name="company_url" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <FormAlert>{message}</FormAlert>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput label="Full name" value={values.name} onChange={set("name")} autoComplete="name" placeholder="Jane Smith" error={errors.name} />
        <TextInput label="Email" type="email" value={values.email} onChange={set("email")} autoComplete="email" placeholder="you@company.com" error={errors.email} />
        <TextInput label="Phone / WhatsApp" type="tel" value={values.phone} onChange={set("phone")} autoComplete="tel" placeholder="+1 555 000 0000" optional />
        <TextInput label="Company" value={values.company} onChange={set("company")} autoComplete="organization" placeholder="Acme Inc." optional />
      </div>
      <TextInput label="Website" value={values.website} onChange={set("website")} placeholder="example.com" error={errors.website} optional />

      <Field label="What can we help with?" error={errors.services}>
        <div className="flex flex-wrap gap-2">
          {SERVICES.map((s) => {
            const on = values.services.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                aria-pressed={on}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold ring-1 ring-inset transition-all",
                  on ? "bg-navy text-white ring-navy" : "bg-white text-ink-2 ring-line hover:ring-brand/40 hover:text-ink"
                )}
              >
                {on && <Check size={13} strokeWidth={3} />}
                {s}
              </button>
            );
          })}
        </div>
      </Field>

      {!compact && (
        <SelectInput label="Monthly budget" value={values.budget} onChange={set("budget")} optional>
          <option value="">Select a range</option>
          {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
        </SelectInput>
      )}
      <TextArea label="Project details" value={values.message} onChange={set("message")} placeholder="Tell us about your goals, timeline and anything we should know." error={errors.message} rows={compact ? 4 : 5} />

      <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-xs text-mute">We reply within one business day. No spam, ever.</p>
        <PrimaryButton type="submit" pending={pending} pendingLabel="Sending…" variant="dark" className="w-full sm:w-auto">
          Request a free quote <ArrowRight size={17} />
        </PrimaryButton>
      </div>
    </form>
  );
}
