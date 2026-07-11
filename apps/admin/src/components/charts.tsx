"use client";

import { cn } from "@egofi/ui";
import { useId, useRef, useState } from "react";

// The dashboard uses single-hue magnitude marks (brand primary) with text
// labels carrying identity — the brand accent set fails categorical CVD/contrast
// checks, so colour is never the only signal here. Status uses reserved
// semantic colours with an icon + label.

// ── Stat tile ───────────────────────────────────────────────────────────────

export function StatTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneRing: Record<string, string> = {
    default: "",
    success: "ring-success-200",
    warning: "ring-amber-200",
    danger: "ring-danger-200",
  };
  const toneText: Record<string, string> = {
    default: "text-navy-950",
    success: "text-success-700",
    warning: "text-amber-700",
    danger: "text-danger-600",
  };
  return (
    <div
      className={cn("rounded-2xl bg-white p-5 shadow-card ring-1 ring-navy-100", toneRing[tone])}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-navy-400">{label}</p>
      <p className={cn("mt-1.5 text-2xl font-bold tabular-nums tracking-tight", toneText[tone])}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-navy-400">{sub}</p>}
    </div>
  );
}

// ── Bar list (horizontal magnitude) ──────────────────────────────────────────

export interface BarItem {
  label: string;
  value: number;
  /** Secondary text shown right-aligned (e.g. a USD figure). */
  sub?: string;
  href?: string;
}

export function BarList({
  items,
  formatValue = (n) => n.toLocaleString(),
  empty = "No data yet",
}: {
  items: BarItem[];
  formatValue?: (n: number) => string;
  empty?: string;
}) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-navy-400">{empty}</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const pct = Math.max(2, Math.round((item.value / max) * 100));
        const row = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium text-navy-800">{item.label}</span>
              <span className="shrink-0 tabular-nums text-navy-500">
                {formatValue(item.value)}
                {item.sub ? <span className="ml-2 text-navy-400">{item.sub}</span> : null}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-navy-100">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </>
        );
        return (
          <li key={item.label}>
            {item.href ? (
              <a href={item.href} className="block rounded-lg p-1 -m-1 hover:bg-navy-50">
                {row}
              </a>
            ) : (
              row
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ── Area chart (single series over time, with hover crosshair) ────────────────

export interface SeriesPoint {
  t: string; // ISO
  value: number;
}

export function AreaChart({
  points,
  formatValue = (n) => n.toLocaleString(),
  height = 240,
}: {
  points: SeriesPoint[];
  formatValue?: (n: number) => string;
  height?: number;
}) {
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 720;
  const H = height;
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  if (points.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-sm text-navy-400">
        No data in this range yet.
      </div>
    );
  }

  const max = Math.max(...points.map((p) => p.value), 1);
  const n = points.length;
  const x = (i: number) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => padT + plotH - (v / max) * plotH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  const areaPath = `${linePath} L${x(n - 1)},${padT + plotH} L${x(0)},${padT + plotH} Z`;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - padL) / plotW) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const hoverPoint = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Time series chart"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* horizontal gridlines at 0/50/100% */}
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={padL}
            x2={W - padR}
            y1={padT + plotH * f}
            y2={padT + plotH * f}
            stroke="#E2E8F0"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="#1D4ED8"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />

        {hoverPoint && (
          <>
            <line
              x1={x(hover as number)}
              x2={x(hover as number)}
              y1={padT}
              y2={padT + plotH}
              stroke="#94A3B8"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={x(hover as number)}
              cy={y(hoverPoint.value)}
              r="4"
              fill="#1D4ED8"
              stroke="#fff"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>

      {/* x-axis labels: first, middle, last */}
      <div className="mt-1 flex justify-between px-1 text-[11px] text-navy-400">
        <span>{fmtDate(points[0]!.t)}</span>
        {n > 2 && <span>{fmtDate(points[Math.floor(n / 2)]!.t)}</span>}
        <span>{fmtDate(points[n - 1]!.t)}</span>
      </div>

      {hoverPoint && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-lg bg-navy-950 px-3 py-1.5 text-center text-xs text-white shadow-lg">
          <div className="font-semibold tabular-nums">{formatValue(hoverPoint.value)}</div>
          <div className="text-navy-300">{fmtDate(hoverPoint.t)}</div>
        </div>
      )}
    </div>
  );
}
