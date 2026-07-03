"use client";

import { cn } from "@egofi/ui";
import { useState } from "react";

export function CopyButton({
  text,
  label,
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2_000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
        copied
          ? "bg-success-50 text-success-700"
          : "text-primary hover:bg-primary-50 active:bg-primary-100",
        className,
      )}
      aria-label={copied ? "Copied" : `Copy ${label ?? "to clipboard"}`}
    >
      {copied ? (
        <>
          <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden>
            <path
              fillRule="evenodd"
              d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207z"
              clipRule="evenodd"
            />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden>
            <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h4.5A1.5 1.5 0 0 1 13 3.5v7a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5v-7z" />
            <path d="M3 5.75A1.75 1.75 0 0 1 4.75 4H5v6.5A2.5 2.5 0 0 0 7.5 13H11v.25A1.75 1.75 0 0 1 9.25 15h-4.5A1.75 1.75 0 0 1 3 13.25v-7.5z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}
