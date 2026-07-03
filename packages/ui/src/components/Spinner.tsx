import * as React from "react";
import { cn } from "../lib/cn";

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: "size-4 border-2",
  md: "size-6 border-2",
  lg: "size-8 border-[3px]",
};

export const Spinner: React.FC<SpinnerProps> = ({ size = "md", className, ...props }) => (
  <span
    role="status"
    aria-label="Loading"
    className={cn(
      "inline-block rounded-full border-current border-t-transparent animate-spin text-primary",
      sizeStyles[size],
      className,
    )}
    {...props}
  />
);
