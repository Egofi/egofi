import * as React from "react";
import { cn } from "../lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-navy-800">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-lg border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-900",
            "placeholder:text-navy-300 outline-none transition-all duration-150",
            "hover:border-navy-300",
            "focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10",
            "disabled:bg-navy-50 disabled:text-navy-400 disabled:cursor-not-allowed",
            error &&
              "border-danger-400 hover:border-danger-400 focus:border-danger-500 focus:ring-danger-500/10",
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-danger-600">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-sm text-navy-400">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
