import * as React from "react";
import { cn } from "@/lib/utils";

export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        "h-4 w-4 rounded border border-white/20 bg-transparent text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950",
        className,
      )}
      ref={ref}
      type="checkbox"
      {...props}
    />
  ),
);

Checkbox.displayName = "Checkbox";
