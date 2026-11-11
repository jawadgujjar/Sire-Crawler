"use client";

import { useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, CircleAlert, CircleCheck, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { cx } from "./audit/ui";

const inputBase =
  "w-full rounded-xl border bg-white px-3.5 text-[15px] text-ink placeholder:text-faint transition-all focus:outline-none focus:ring-4";
const inputTone = (error) => (error ? "border-critical/50 focus:border-critical focus:ring-critical/10" : "border-line focus:border-brand/50 focus:ring-brand/10 hover:border-[#cfd8e8]");

export function Field({ label, hint, error, children, optional, className = "" }) {
  return (
    <div className={className}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-semibold text-ink">{label}</span>
          {optional && <span className="text-xs text-faint">Optional</span>}
        </div>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-critical"><CircleAlert size={13} />{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-mute">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ label, hint, error, optional, className, icon, ...props }) {
  const id = useId();
  return (
    <Field label={label && <label htmlFor={id}>{label}</label>} hint={hint} error={error} optional={optional} className={className}>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint">{icon}</span>}
        <input id={id} aria-invalid={Boolean(error)} className={cx(inputBase, inputTone(error), "h-12", icon && "pl-10")} {...props} />
      </div>
    </Field>
  );
}

export function PasswordInput({ label, hint, error, className, ...props }) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <Field label={label && <label htmlFor={id}>{label}</label>} hint={hint} error={error} className={className}>
      <div className="relative">
        <input id={id} type={show ? "text" : "password"} aria-invalid={Boolean(error)} className={cx(inputBase, inputTone(error), "h-12 pr-11")} {...props} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-faint transition-colors hover:text-ink"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </Field>
  );
}

export function TextArea({ label, hint, error, optional, className, ...props }) {
  const id = useId();
  return (
    <Field label={label && <label htmlFor={id}>{label}</label>} hint={hint} error={error} optional={optional} className={className}>
      <textarea id={id} aria-invalid={Boolean(error)} className={cx(inputBase, inputTone(error), "min-h-32 resize-y py-3 leading-relaxed")} {...props} />
    </Field>
  );
}

export function SelectInput({ label, hint, error, optional, className, children, ...props }) {
  const id = useId();
  return (
    <Field label={label && <label htmlFor={id}>{label}</label>} hint={hint} error={error} optional={optional} className={className}>
      <div className="relative">
        <select id={id} className={cx(inputBase, inputTone(error), "h-12 appearance-none pr-10")} {...props}>
          {children}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-mute" />
      </div>
    </Field>
  );
}

export function SubmitButton({ children, pendingLabel = "Please wait…", className = "", variant = "primary" }) {
  const { pending } = useFormStatus();
  return <PrimaryButton type="submit" pending={pending} pendingLabel={pendingLabel} className={className} variant={variant}>{children}</PrimaryButton>;
}

export function PrimaryButton({ children, pending, pendingLabel = "Please wait…", className = "", variant = "primary", ...props }) {
  const variants = {
    primary: "bg-brand text-white shadow-glow hover:bg-brand-600",
    dark: "bg-navy text-white shadow-[0_12px_28px_-14px_rgb(7_21_56/0.9)] hover:bg-navy-3",
    secondary: "bg-white text-ink ring-1 ring-inset ring-line hover:bg-canvas",
  };
  return (
    <button
      disabled={pending || props.disabled}
      className={cx(
        "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-[15px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      {...props}
    >
      {pending ? <><LoaderCircle size={17} className="animate-spin" />{pendingLabel}</> : children}
    </button>
  );
}

export function FormAlert({ tone = "error", children }) {
  if (!children) return null;
  const good = tone === "success";
  return (
    <div role={good ? "status" : "alert"} className={cx("flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ring-1 ring-inset", good ? "bg-good-50 text-good-ink ring-good/20" : "bg-critical-50 text-ink ring-critical/20")}>
      {good ? <CircleCheck size={17} className="mt-0.5 shrink-0" /> : <CircleAlert size={17} className="mt-0.5 shrink-0 text-critical" />}
      <span>{children}</span>
    </div>
  );
}
