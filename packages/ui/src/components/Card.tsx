import type * as React from "react";
import { cn } from "../lib/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Adds a subtle hover-lift — use for clickable cards. */
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  children,
  interactive = false,
  ...props
}) => (
  <div
    className={cn(
      "rounded-2xl border border-navy-100/80 bg-surface shadow-card",
      interactive &&
        "cursor-pointer transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-card-hover",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<CardProps> = ({ className, children, ...props }) => (
  <div className={cn("flex flex-col gap-1.5 p-6", className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3 className={cn("text-lg font-semibold tracking-tight text-navy-950", className)} {...props}>
    {children}
  </h3>
);

export const CardContent: React.FC<CardProps> = ({ className, children, ...props }) => (
  <div className={cn("p-6 pt-0", className)} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<CardProps> = ({ className, children, ...props }) => (
  <div className={cn("flex items-center gap-3 p-6 pt-0", className)} {...props}>
    {children}
  </div>
);
