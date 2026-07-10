"use client";

import * as React from "react";
import { Oval } from "react-loader-spinner";
import { cn } from "../lib/cn";

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** One of the three tokens, or an explicit pixel diameter. */
  size?: "sm" | "md" | "lg" | number;
  /** Announced to screen readers. */
  label?: string;
}

// Diameters chosen to match the old border-ring spinner (size-4 / size-6 / size-8)
// so every existing call site keeps its layout.
const TOKEN_PX = { sm: 16, md: 24, lg: 32 } as const;

function toPx(size: SpinnerProps["size"]): number {
  return typeof size === "number" ? size : TOKEN_PX[size ?? "md"];
}

/**
 * Oval draws inside a viewBox of ~`40 + strokeWidth`, so a fixed stroke renders
 * thinner as the SVG shrinks. Invert that: pick a target *rendered* thickness
 * and solve for the user-space stroke, so the ring keeps a consistent ~2–3px
 * weight from 16px up to 56px. (A naive `strokeWidth={2}` renders as 0.8px at
 * size 16 — nearly invisible.)
 */
function toStroke(px: number): number {
  const rendered = px <= 20 ? 2 : px <= 36 ? 2.4 : 2.8;
  return Number(((40 * rendered) / (px - rendered)).toFixed(2));
}

/**
 * `prefers-reduced-motion` can't stop react-loader-spinner: it animates via SMIL
 * (`<animateTransform>`), which CSS motion-reduction does not reach. So we swap
 * the spinner for a static ring when reduction is requested.
 *
 * Starts `false` on both server and first client render (matching, so no
 * hydration mismatch), then updates after mount.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Brand loading spinner: a two-tone ring (react-loader-spinner's Oval) — a faint
 * full-circle track under a bright rotating arc. Both tones come from
 * `currentColor` (the track is the same hue at reduced opacity), so it defaults
 * to the brand primary and recolours with any `text-*` class — `text-white` on a
 * dark surface, for instance.
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  label = "Loading",
  className,
  ...props
}) => {
  const reduced = usePrefersReducedMotion();
  const px = toPx(size);
  const stroke = toStroke(px);

  return (
    // <output> carries an implicit role="status" (a polite live region), which is
    // the right semantics for a spinner and satisfies a11y linting without a
    // redundant role.
    <output aria-label={label} className={cn("inline-flex text-primary", className)} {...props}>
      {reduced ? (
        // SMIL can't be paused by CSS, so show a static ring (no animation) —
        // one open side keeps it reading as a spinner rather than a plain circle.
        <span
          aria-hidden
          className="inline-block rounded-full border-current border-t-transparent opacity-70"
          style={{ width: px, height: px, borderWidth: Math.max(2, Math.round(px / 12)) }}
        />
      ) : (
        <Oval
          width={px}
          height={px}
          strokeWidth={stroke}
          color="currentColor"
          secondaryColor="currentColor"
          ariaLabel={label}
          wrapperClass="leading-none"
        />
      )}
    </output>
  );
};
