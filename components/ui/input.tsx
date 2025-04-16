import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "border-primary-grey-600 bg-primary-grey-800 placeholder:text-primary-grey-500 flex h-10 w-full rounded-md border px-3 py-2 text-sm text-primary-grey-300 focus:outline-none focus:ring-2 focus:ring-primary-green disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
