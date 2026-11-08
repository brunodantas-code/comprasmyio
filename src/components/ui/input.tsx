import * as React from "react";

import { cn } from "@/lib/utils";
import { useCdeLook } from "@/components/cde/cde-look";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, style, ...props }, ref) => {
    const look = useCdeLook(type === "password" ? "fields_password" : type === "checkbox" || type === "radio" || type === "file" || type === "hidden" ? undefined : "fields_input", true);
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
          look.className,
        )}
        style={{ ...look.style, ...style }}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
