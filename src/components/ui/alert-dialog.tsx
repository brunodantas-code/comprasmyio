import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { CdeCloseIcon, useCdeConfirmStyle } from "@/components/cde/cde-button";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { PopupExpandButton, popupExpandedClass } from "./popup-expand";

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, style, children, onCloseAutoFocus, ...props }, ref) => {
  const cde = useCdeConfirmStyle();
  const [expanded, setExpanded] = React.useState(false);
  return (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid max-h-[92dvh] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto overscroll-contain border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
        cde.className, cde.cls,
        className,
        expanded && popupExpandedClass,
      )}
      style={{ ...cde.css, ...style }}
      {...props}
      onCloseAutoFocus={(event) => { setExpanded(false); onCloseAutoFocus?.(event); }}
    >
      <div data-popup-toolbar className="pointer-events-none sticky top-0 z-30 flex min-h-8 shrink-0 items-start justify-end gap-2">
        <PopupExpandButton expanded={expanded} onToggle={() => setExpanded(value => !value)} />
        <AlertDialogPrimitive.Cancel className="pointer-events-auto rounded-sm bg-background p-0.5 opacity-70 transition-opacity hover:opacity-100" aria-label="Fechar" title="Fechar"><CdeCloseIcon /></AlertDialogPrimitive.Cancel>
      </div>
      {children}
    </AlertDialogPrimitive.Content>
  </AlertDialogPortal>
  );
});
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 pr-16 text-center sm:text-left", className)} {...props} />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("grid grid-cols-2 gap-3 sm:flex sm:justify-end sm:gap-0 sm:space-x-2", className)}
    {...props}
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, style, ...props }, ref) => {
  return <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants({ variant: "ghost" }), "order-1 w-full sm:order-none sm:w-auto", "!border-0 !shadow-none !bg-transparent !text-foreground hover:!bg-muted", className)} style={style} {...props} />;
});
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, style, ...props }, ref) => {
  return <AlertDialogPrimitive.Cancel ref={ref} className={cn(buttonVariants({ variant: "ghost" }), "order-2 mt-0 w-full sm:order-none sm:w-auto", "!border-0 !shadow-none !bg-transparent !text-foreground hover:!bg-muted", className)} style={style} {...props} />;
});
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
