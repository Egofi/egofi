"use client";

import { useEffect, useState } from "react";

const SunIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
    <path d="M10 2a.75.75 0 0 1 .75.75v1a.75.75 0 0 1-1.5 0v-1A.75.75 0 0 1 10 2zM10 15a.75.75 0 0 1 .75.75v1a.75.75 0 0 1-1.5 0v-1A.75.75 0 0 1 10 15zM17.25 10a.75.75 0 0 1-.75.75h-1a.75.75 0 0 1 0-1.5h1a.75.75 0 0 1 .75.75zM4.5 10a.75.75 0 0 1-.75.75h-1a.75.75 0 0 1 0-1.5h1a.75.75 0 0 1 .75.75zM15.303 15.303a.75.75 0 0 1-1.06 0l-.708-.707a.75.75 0 0 1 1.06-1.06l.708.707a.75.75 0 0 1 0 1.06zM6.464 6.464a.75.75 0 0 1-1.06 0l-.708-.707a.75.75 0 0 1 1.06-1.06l.708.707a.75.75 0 0 1 0 1.06zM4.697 15.303a.75.75 0 0 1 0-1.06l.707-.708a.75.75 0 1 1 1.06 1.06l-.707.708a.75.75 0 0 1-1.06 0zM13.536 6.464a.75.75 0 0 1 0-1.06l.707-.708a.75.75 0 0 1 1.06 1.06l-.707.708a.75.75 0 0 1-1.06 0zM10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
  </svg>
);

const MoonIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
    <path d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083z" />
  </svg>
);

/** Toggles the `.dark` class on <html> and persists the choice. The initial
 * state is set before paint by the inline script in the root layout. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("egofi_theme", next ? "dark" : "light");
    } catch {
      /* storage blocked — theme still applies for this session */
    }
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex size-9 items-center justify-center rounded-lg text-navy-500 transition-colors hover:bg-navy-100 hover:text-navy-800"
    >
      {dark ? SunIcon : MoonIcon}
    </button>
  );
}
