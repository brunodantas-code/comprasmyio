import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { resolveTag, tagCss, useTagConfig, type TagLook } from "@/components/cde/tag-style";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        status: "border-status-border bg-status text-status-foreground shadow-sm hover:bg-status",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  /** CDE preview: explicit look instead of the saved one. */
  cdeLook?: TagLook;
}

const textOf = (n: React.ReactNode): string => (typeof n === "string" || typeof n === "number" ? String(n) : Array.isArray(n) ? n.map(textOf).join("") : "");

/** Tags read their CDE look (item Tags) by visible label; unconfigured tags keep the caller's classes. */
function Badge({ className, variant, style, children, cdeLook, ...props }: BadgeProps) {
  const cfg = useTagConfig();
  const plain = textOf(children);
  const r = plain ? resolveTag(cfg, plain) : null;
  const look = cdeLook ?? r?.look;
  const shown = r && cdeLook === undefined && r.text !== plain && (typeof children === "string" || typeof children === "number" || Array.isArray(children)) ? r.text : children;
  return <div className={cn(badgeVariants({ variant }), className)} style={look ? { ...style, ...tagCss(look) } : style} {...props}>{shown}</div>;
}

export { Badge, badgeVariants };
