"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "egofi.cookieConsent";

/**
 * Bottom cookie-consent bar, matching the hosted-checkout chrome. The choice is
 * persisted in localStorage so it isn't shown again after acceptance.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // Private mode / storage disabled — dismiss for this session anyway.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-navy-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-navy-600">
          We use cookies to ensure you get the best experience. By using egofi, you agree to our{" "}
          <a href="https://egofi.dev/terms" className="text-primary hover:underline">
            Terms of Use
          </a>{" "}
          and{" "}
          <a href="https://egofi.dev/privacy" className="text-primary hover:underline">
            Privacy Policy
          </a>
          .
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 rounded-xl border border-primary px-6 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary-50"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
