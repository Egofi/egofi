import * as React from "react";
import { cn } from "../lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-sm shadow-primary-900/20 hover:bg-primary-700 hover:shadow-md hover:shadow-primary-900/25 active:bg-primary-800 focus-visible:ring-primary-500/50",
  secondary:
    "bg-surface text-navy-800 ring-1 ring-inset ring-navy-200 shadow-xs hover:bg-navy-50 hover:ring-navy-300 active:bg-navy-100 focus-visible:ring-navy-400/50",
  ghost:
    "text-navy-600 hover:bg-navy-100/70 hover:text-navy-900 active:bg-navy-200/60 focus-visible:ring-navy-400/40",
  danger:
    "bg-danger-500 text-white shadow-sm shadow-danger-900/20 hover:bg-danger-600 hover:shadow-md active:bg-danger-700 focus-visible:ring-danger-400/50",
  accent:
    "on-dark bg-accent text-navy-950 font-semibold shadow-sm shadow-lime-900/20 hover:bg-accent-300 hover:shadow-glow active:bg-accent-500 focus-visible:ring-accent-400/60",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 text-sm h-8 gap-1.5",
  md: "px-4 text-sm h-10 gap-2",
  lg: "px-6 text-[0.9375rem] h-12 gap-2",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", loading = false, className, children, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex select-none items-center justify-center whitespace-nowrap rounded-lg font-medium",
          "transition-[background,box-shadow,transform] duration-150 outline-none",
          "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:active:scale-100",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        disabled={disabled ?? loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <span className="size-4 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin" />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
