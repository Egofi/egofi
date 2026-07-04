"use client";

import { type ReactNode, useState } from "react";

/**
 * Accordion section used by "Key things to note" and "More details" in the
 * reference checkout. Defaults open/closed per `defaultOpen`.
 */
export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-navy-100 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="text-base font-semibold text-navy-900">{title}</span>
        <svg
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`size-4 shrink-0 text-navy-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && <div className="border-t border-navy-50 px-5 py-4">{children}</div>}
    </div>
  );
}
