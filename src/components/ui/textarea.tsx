import * as React from "react";

import { cn } from "@/lib/utils";
import { useCdeLook } from "@/components/cde/cde-look";
import { useFieldContentWidth } from './field-content-width';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, style, ...props }, ref) => {
    const look = useCdeLook("fields_textarea", true);
    const fieldRef = React.useRef<HTMLTextAreaElement>(null);
    useFieldContentWidth(fieldRef);
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
          look.className,
        )}
        style={{ ...look.style, ...style }}
        ref={node => { fieldRef.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
