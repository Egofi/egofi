"use client";

import { cn } from "@egofi/ui";
import { useEffect, useRef, useState } from "react";

const LANGUAGES = [
  { code: "EN", label: "English", flag: "🇬🇧" },
  { code: "ES", label: "Español", flag: "🇪🇸" },
  { code: "FR", label: "Français", flag: "🇫🇷" },
  { code: "DE", label: "Deutsch", flag: "🇩🇪" },
  { code: "PT", label: "Português", flag: "🇵🇹" },
] as const;

/**
 * Header language selector matching the reference console chrome. The console
 * copy is English, so this is presentational — it updates the visible label
 * without pulling in an i18n runtime.
 */
export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<(typeof LANGUAGES)[number]>(LANGUAGES[0]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-navy-600 transition-colors hover:bg-navy-100"
      >
        <span aria-hidden>{current.flag}</span>
        <span className="hidden sm:inline">{current.code}</span>
        <svg
          viewBox="0 0 16 16"
          fill="currentColor"
          className={cn("size-3.5 text-navy-400 transition-transform", open && "rotate-180")}
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <ul className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-navy-100 bg-white py-1 shadow-xl animate-scale-in">
          {LANGUAGES.map((lang) => (
            <li key={lang.code}>
              <button
                type="button"
                aria-current={lang.code === current.code}
                onClick={() => {
                  setCurrent(lang);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-navy-50",
                  lang.code === current.code ? "font-semibold text-primary" : "text-navy-700",
                )}
              >
                <span aria-hidden>{lang.flag}</span>
                {lang.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
