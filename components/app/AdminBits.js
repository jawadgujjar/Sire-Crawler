"use client";

import { useRef } from "react";
import { ChevronDown } from "lucide-react";
import { updateQuote, setUserDisabled } from "@/app/actions/admin";
import { QUOTE_STATUSES } from "@/lib/plans";
import { cx } from "../audit/ui";

const TONE = {
  new: "bg-brand-50 text-brand ring-brand/20",
  contacted: "bg-notice-50 text-notice ring-notice/20",
  proposal: "bg-warning-50 text-warning-ink ring-warning/30",
  won: "bg-good-50 text-good-ink ring-good/20",
  lost: "bg-line-2 text-mute ring-line",
};

/** Status dropdown that saves as soon as it changes. */
export function QuoteStatusSelect({ id, status }) {
  const formRef = useRef(null);
  return (
    <form ref={formRef} action={updateQuote} className="relative">
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Quote status"
        className={cx("w-[128px] cursor-pointer appearance-none rounded-full border-0 py-1.5 pl-3 pr-7 text-xs font-bold ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-brand/40", TONE[status] || TONE.new)}
      >
        {QUOTE_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-70" />
    </form>
  );
}

export function QuoteNoteForm({ id, note }) {
  return (
    <form action={updateQuote} className="mt-3 flex flex-col gap-2 sm:flex-row">
      <input type="hidden" name="id" value={id} />
      <input
        name="note"
        defaultValue={note}
        maxLength={2000}
        placeholder="Add an internal note (only admins see this)"
        className="h-10 flex-1 rounded-xl border border-line bg-white px-3 text-sm focus:border-brand/50 focus:outline-none focus:ring-4 focus:ring-brand/10"
      />
      <button className="h-10 rounded-xl bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-3">Save note</button>
    </form>
  );
}

export function SuspendButton({ id, disabled, name }) {
  return (
    <form
      action={setUserDisabled}
      onSubmit={(e) => {
        if (!disabled && !window.confirm(`Suspend ${name}? They will be signed out and unable to log in.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="disabled" value={disabled ? "false" : "true"} />
      <button className={cx("rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-colors", disabled ? "text-good-ink ring-good/30 hover:bg-good-50" : "text-critical ring-critical/25 hover:bg-critical-50")}>
        {disabled ? "Reactivate" : "Suspend"}
      </button>
    </form>
  );
}
