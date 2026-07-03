import type * as React from "react";
import { cn } from "../lib/cn";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent"
  | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Renders a small status dot before the label. */
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-navy-50 text-navy-700 ring-1 ring-inset ring-navy-100",
  success: "bg-success-50 text-success-800 ring-1 ring-inset ring-success-200",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
  danger: "bg-danger-50 text-danger-800 ring-1 ring-inset ring-danger-200",
  info: "bg-info-50 text-info-800 ring-1 ring-inset ring-info-200",
  accent: "bg-accent-100 text-lime-900 ring-1 ring-inset ring-accent-300",
  outline: "border border-navy-200 text-navy-600",
};

const dotStyles: Record<BadgeVariant, string> = {
  default: "bg-navy-400",
  success: "bg-success-500",
  warning: "bg-amber-500",
  danger: "bg-danger-500",
  info: "bg-info-500",
  accent: "bg-accent-500",
  outline: "bg-navy-400",
};

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  dot = false,
  className,
  children,
  ...props
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
      variantStyles[variant],
      className,
    )}
    {...props}
  >
    {dot && <span className={cn("size-1.5 rounded-full", dotStyles[variant])} />}
    {children}
  </span>
);
