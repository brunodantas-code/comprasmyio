import * as React from "react";

import { cn } from "@/lib/utils";
import { useCdeLook } from "@/components/cde/cde-look";
import { finishNumberInputDraft, numberInputDraftValue } from "./number-input-draft";
import { useFieldContentWidth } from './field-content-width';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & { bufferedNumber?: boolean }>(
  ({ className, type, style, bufferedNumber = false, ...props }, ref) => {
    const [numberDraft, setNumberDraft] = React.useState<string | null>(null);
    const fieldRef = React.useRef<HTMLInputElement>(null);
    useFieldContentWidth(fieldRef);
    const buffered = bufferedNumber && type === "number" && props.value !== undefined;
    const min = props.min === undefined ? undefined : Number(props.min);
    const max = props.max === undefined ? undefined : Number(props.max);
    const look = useCdeLook(type === "password" ? "fields_password" : type === "checkbox" || type === "radio" || type === "file" || type === "hidden" ? undefined : "fields_input", true);
    const isSearch = type === "search" || /^(buscar|pesquisar|filtrar|search)\b/i.test(props.placeholder ?? "") || /^(buscar|pesquisar)\b/i.test(props["aria-label"] ?? "");
    return (
      <input
        type={type}
        data-search-field={isSearch ? "true" : undefined}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
          look.className,
        )}
        style={{ ...look.style, ...style }}
        ref={node => { fieldRef.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }}
        {...props}
        {...(buffered ? {
          value: numberDraft ?? props.value,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            setNumberDraft(event.currentTarget.value);
            if (numberInputDraftValue(event.currentTarget.value, min, max) !== null) props.onChange?.(event);
          },
          onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
            if (numberDraft !== null) {
              event.currentTarget.value = finishNumberInputDraft(numberDraft, String(props.value ?? ""), min, max);
              props.onChange?.({ ...event, type: "change", target: event.currentTarget });
            }
            setNumberDraft(null);
            props.onBlur?.(event);
          },
        } : {})}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
