"use client";

import { useEffect, useState } from "react";

function formatDuration(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => new Date(expiresAt).getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(new Date(expiresAt).getTime() - Date.now());
    }, 1_000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const expired = remaining <= 0;
  const urgent = !expired && remaining < 5 * 60 * 1_000;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-sm font-semibold tabular-nums ${
        expired
          ? "bg-danger-50 text-danger-700"
          : urgent
            ? "bg-amber-50 text-amber-700"
            : "bg-navy-50 text-navy-700"
      }`}
    >
      <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden>
        <path
          fillRule="evenodd"
          d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm.75-10.25a.75.75 0 0 0-1.5 0v3.5c0 .27.144.518.378.651l2.5 1.428a.75.75 0 1 0 .744-1.302L8.75 7.815V4.75z"
          clipRule="evenodd"
        />
      </svg>
      {expired ? "Expired" : formatDuration(remaining)}
    </span>
  );
}
