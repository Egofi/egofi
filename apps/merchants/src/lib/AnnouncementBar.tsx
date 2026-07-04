"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "egofi.merchant.announcement.v1";

/**
 * Slim, dismissible product announcement pinned above the dashboard header —
 * the merchant-console equivalent of the hosted-gateway promo strip. Dismissal
 * persists so it doesn't reappear on every navigation.
 */
export function AnnouncementBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      // storage disabled — dismiss for this session anyway
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="relative flex items-center justify-center gap-2 bg-brand-gradient px-10 py-2 text-center text-sm text-white">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/15">
        <svg viewBox="0 0 16 16" fill="currentColor" className="size-3 text-accent" aria-hidden>
          <path d="M8 1.5a.75.75 0 0 1 .67.415l1.7 3.445 3.802.553a.75.75 0 0 1 .416 1.279l-2.75 2.681.649 3.785a.75.75 0 0 1-1.088.79L8 12.938l-3.4 1.787a.75.75 0 0 1-1.088-.79l.649-3.785-2.75-2.68a.75.75 0 0 1 .416-1.28l3.801-.553 1.7-3.445A.75.75 0 0 1 8 1.5z" />
        </svg>
      </span>
      <a href="/settings/settlement" className="font-medium underline-offset-2 hover:underline">
        Non-custodial by design — your settlements go straight to your own wallet. Set your payout
        addresses →
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden>
          <path d="M4.28 3.22a.75.75 0 0 0-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06L8 9.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L9.06 8l3.72-3.72a.75.75 0 0 0-1.06-1.06L8 6.94 4.28 3.22z" />
        </svg>
      </button>
    </div>
  );
}
