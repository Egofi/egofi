import type * as React from "react";
import { cn } from "../lib/cn";

/**
 * Shimmering placeholder for loading states. Prefer this over a bare spinner —
 * it preserves layout and reads as "content is arriving," not "something hung."
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("relative overflow-hidden rounded-md bg-navy-100/70", className)} {...props}>
      <div className="absolute inset-0 -translate-x-full bg-shimmer animate-shimmer" />
    </div>
  );
}
