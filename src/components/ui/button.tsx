import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { detectButtonGroup, useCdeLook, useButtonBinding } from "@/components/cde/cde-look";
import { ICONS } from "@/components/cde/cde-render";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-primary !bg-transparent !text-primary shadow-sm hover:!bg-primary hover:!text-primary-foreground focus-visible:!bg-primary focus-visible:!text-primary-foreground active:!bg-primary active:!text-primary-foreground",
        destructive: "!bg-primary !text-primary-foreground shadow-sm hover:!bg-primary/90 hover:!text-primary-foreground",
        action:
          "border border-primary !bg-transparent !text-primary shadow-sm hover:!bg-primary hover:!text-primary-foreground focus-visible:!bg-primary focus-visible:!text-primary-foreground active:!bg-primary active:!text-primary-foreground",
        outline:
          "border border-primary !bg-transparent !text-primary shadow-sm hover:!bg-primary hover:!text-primary-foreground focus-visible:!bg-primary focus-visible:!text-primary-foreground active:!bg-primary active:!text-primary-foreground",
        secondary: "!bg-primary !text-primary-foreground shadow-sm hover:!bg-primary/90 hover:!text-primary-foreground",
        ghost: "!bg-transparent !text-foreground hover:!bg-muted hover:!text-foreground",
        link: "!bg-primary !text-primary-foreground underline-offset-4 hover:!bg-primary/90 hover:!text-primary-foreground hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        compactIcon: "h-6 w-6 shrink-0 !p-0 shadow-none [&_svg]:size-3.5",
      },
    },
    compoundVariants: [
      {
        size: "compactIcon",
        variant: ["default", "secondary", "destructive", "link"],
        className: "border border-action-border !bg-action !text-action-foreground hover:!bg-action-hover hover:!text-action-hover-foreground",
      },
      {
        size: "compactIcon",
        variant: ["ghost", "outline"],
        className: "border-0 !bg-transparent !text-myio-green hover:!bg-muted hover:!text-myio-green",
      },
      {
        size: "compactIcon",
        variant: "action",
        className: "border border-primary !bg-transparent !text-primary hover:!bg-primary hover:!text-primary-foreground focus-visible:!bg-primary focus-visible:!text-primary-foreground active:!bg-primary active:!text-primary-foreground",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const actionLabelPattern = /\b(salvar|salvando|salvo|excluir|excluindo|cancelar|cancelando|confirmar|confirmando|concluir|concluindo)\b/i;

function buttonText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(buttonText).join(" ");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return buttonText(node.props.children);
  return "";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const visibleText = buttonText(children).trim();
    const accessibleLabel = visibleText || [props["aria-label"], props.title].filter(Boolean).join(" ");
    // CdeButton (style passed) keeps its own CDE variant; never re-skin it by label.
    const resolvedVariant = !style && actionLabelPattern.test(accessibleLabel) ? "action" : variant;
    // CDE: action buttons follow the chosen standard live; CdeButton passes its own style and is skipped.
    const binding = useButtonBinding(accessibleLabel);
    const group = binding?.group ?? detectButtonGroup(children, [props["aria-label"], props.title].filter(Boolean).join(" "));
    const look = useCdeLook(style ? undefined : group, true);
    const standardSave = !style && !asChild && (group === "save" || group === "trash" || !!binding);
    const SaveIcon = ICONS[look.icon || (group === "trash" ? "Trash2" : "Save")] ?? ICONS.Save;
    const content = standardSave ? <><SaveIcon className={look.iconClass || "h-4 w-4"} />{visibleText ? binding?.label || look.label?.trim() || (group === "trash" ? "Excluir" : "Salvar") : null}</> : children;
    const cdeVariant = look.variant ? look.variant as VariantProps<typeof buttonVariants>["variant"] : resolvedVariant;
    const cdeSize = look.size ? look.size as VariantProps<typeof buttonVariants>["size"] : size;
    return (
      <Comp className={cn(buttonVariants({ variant: cdeVariant, size: cdeSize, className }), look.className)} style={style ?? (look.variant || look.className ? look.style : undefined)} ref={ref} {...props}>{content}</Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
