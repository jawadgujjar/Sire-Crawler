"use client";

import { useState } from "react";
import { Crown, CreditCard } from "lucide-react";
import { PrimaryButton } from "../forms";

/** Starts Stripe Checkout (upgrade) or opens the Stripe customer portal (manage). */
export default function BillingButton({ action = "checkout", variant = "primary", className = "", children }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setPending(true);
    setError("");
    try {
      const res = await fetch(`/api/billing/${action}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(data.error || "Something went wrong. Please try again.");
    } catch {
      setError("We couldn't reach the server. Please check your connection.");
    }
    setPending(false);
  }

  return (
    <div className={className}>
      <PrimaryButton type="button" onClick={go} pending={pending} pendingLabel="Redirecting…" variant={variant} className="w-full">
        {children || (action === "checkout" ? <><Crown size={17} /> Upgrade to Pro</> : <><CreditCard size={17} /> Manage billing</>)}
      </PrimaryButton>
      {error && <p role="alert" className="mt-2 text-xs font-medium text-critical">{error}</p>}
    </div>
  );
}
