"use client";

import { useEffect, useState } from "react";

function formatDuration(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * "After that time the rate will update" — the rate-lock countdown plus a thin
 * progress bar that fills as the lock window elapses (reference checkout).
 */
export function RateProgress({
  rateLockedUntil,
  startedAt,
}: {
  rateLockedUntil: string;
  startedAt: string;
}) {
  const end = new Date(rateLockedUntil).getTime();
  const start = new Date(startedAt).getTime();
  const total = Math.max(end - start, 1);

  // Seed from `start` (deterministic on both server and client) so the first
  // render matches during hydration. Switch to the real clock only after mount.
  const [now, setNow] = useState(start);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(end - now, 0);
  const elapsedFraction = Math.min(Math.max((now - start) / total, 0), 1);
  const expired = remaining <= 0;
  const urgent = !expired && remaining < 5 * 60 * 1_000;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-navy-500">
          {expired ? "Rate has been refreshed" : "After that time the rate will update"}
        </p>
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums ${
            expired ? "text-danger-600" : urgent ? "text-amber-600" : "text-navy-700"
          }`}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden>
            <path
              fillRule="evenodd"
              d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm.75-10.25a.75.75 0 0 0-1.5 0v3.5c0 .27.144.518.378.651l2.5 1.428a.75.75 0 1 0 .744-1.302L8.75 7.815V4.75z"
              clipRule="evenodd"
            />
          </svg>
          {formatDuration(remaining)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
            expired ? "bg-danger-400" : urgent ? "bg-amber-400" : "bg-primary"
          }`}
          style={{ width: `${elapsedFraction * 100}%` }}
        />
      </div>
    </div>
  );
}
