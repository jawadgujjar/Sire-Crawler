"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="font-display text-7xl italic text-brand">Oops</div>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink">Something went wrong</h1>
      <p className="mt-2 max-w-md text-mute">An unexpected error occurred. Please try again — if it keeps happening, contact us.</p>
      <div className="mt-7 flex gap-3">
        <button onClick={reset} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-glow hover:bg-brand-600"><RotateCw size={16} /> Try again</button>
        <Link href="/" className="inline-flex h-11 items-center rounded-xl px-5 text-sm font-semibold text-ink ring-1 ring-inset ring-line hover:bg-canvas">Go home</Link>
      </div>
    </div>
  );
}
