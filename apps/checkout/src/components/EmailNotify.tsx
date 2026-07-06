"use client";

import { createApiClient } from "@egofi/sdk";
import { useState } from "react";

const api = createApiClient();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * "Leave your email and we'll notify you when the seller receives your payment."
 * Posts to POST /checkout/sessions/:id/notify.
 */
export function EmailNotify({ invoiceId }: { invoiceId: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError("Enter a valid email address");
      setStatus("error");
      return;
    }
    setStatus("saving");
    setError(null);
    try {
      await api.checkout.subscribeNotify(invoiceId, value);
      setStatus("done");
    } catch {
      setError("Couldn't save your email. Try again.");
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-success-200 bg-success-50 px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-medium text-success-700">
          <svg viewBox="0 0 16 16" fill="currentColor" className="size-4 shrink-0" aria-hidden>
            <path
              fillRule="evenodd"
              d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207z"
              clipRule="evenodd"
            />
          </svg>
          We'll email you the moment the seller receives your payment.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-navy-100 bg-white px-5 py-4">
      <p className="text-sm text-navy-600">
        Leave your email and we'll notify you when the seller receives your payment
      </p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="Email for status updates"
          aria-label="Email for status updates"
          aria-invalid={status === "error"}
          className="min-w-0 flex-1 rounded-xl border border-navy-200 px-3.5 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 focus:border-primary"
        />
        <button
          type="submit"
          disabled={status === "saving"}
          className="shrink-0 rounded-xl border border-primary px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-50 disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Confirm"}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-danger-600">{error}</p>}
    </div>
  );
}
