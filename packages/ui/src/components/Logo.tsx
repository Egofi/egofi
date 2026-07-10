import type * as React from "react";
import { cn } from "../lib/cn";

export interface LogoProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  /** Rendered edge length in px — the badge is square. Below ~32px the wordmark inside stops being legible. */
  size?: number;
  /** Each app serves the badge from its own `public/`. Override only for a CDN. */
  src?: string;
}

/**
 * The egofi badge: a navy disc carrying the wordmark. It already spells the
 * brand, so never pair it with a text "egofi." — that reads as the name twice.
 * The disc is a deeper indigo than navy-950, so on the dark brand panels the
 * text wordmark still looks cleaner than this does.
 */
export const Logo: React.FC<LogoProps> = ({
  size = 40,
  src = "/logo.png",
  className,
  ...props
}) => (
  // `props` is spread first so `alt` provably survives — LogoProps omits it.
  <img
    {...props}
    src={src}
    alt="egofi"
    width={size}
    height={size}
    decoding="async"
    className={cn("shrink-0 select-none", className)}
  />
);
