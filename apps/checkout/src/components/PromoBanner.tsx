"use client";

import { useState } from "react";

/**
 * Dismissible promotional bar pinned to the top of the checkout, mirroring the
 * hosted-gateway pattern. Copy is egofi's own; dismissal is remembered for the
 * session so it doesn't nag on every poll-driven re-render.
 */
export function PromoBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="relative w-full bg-primary text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-center px-10 py-2.5 text-center text-sm">
        <a href="https://egofi.dev" className="font-medium underline-offset-2 hover:underline">
          Accept crypto with zero chargebacks. Non-custodial payouts settle straight to your wallet
          →
        </a>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden>
          <path d="M4.28 3.22a.75.75 0 0 0-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06L8 9.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L9.06 8l3.72-3.72a.75.75 0 0 0-1.06-1.06L8 6.94 4.28 3.22z" />
        </svg>
      </button>
    </div>
  );
}
