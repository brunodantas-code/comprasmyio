import * as React from "react";

import { cn } from "@/lib/utils";
import { useTitleText } from "@/components/cde/title-text";
import { useCdeBoxStyle } from "@/components/cde/cde-button";
import { useCardClassificationBorder } from "@/components/cde/card-border";
import type { CardBorderConfig, CardClassification } from "@/components/cde/card-border-config";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { classification?: CardClassification; classificationPreview?: CardBorderConfig }>(
  ({ className, style, classification, classificationPreview, ...props }, ref) => {
    // Box segue ao vivo o padrão escolhido no CDE.
    const box = useCdeBoxStyle();
    const border = useCardClassificationBorder(classification, classificationPreview);
    return (
      <div
        ref={ref}
        style={{ ...box.css, ...style, ...border.style }}
        className={cn(box.className || "rounded-xl border bg-card text-card-foreground shadow", box.cls, className)}
        {...props}
        {...border.attributes}
      />
    );
  },
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-4 sm:p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const text = useTitleText("titulo", children);
    // Título e subtítulo seguem tamanho e formatação escolhidos no CDE (Cabeçalhos e Listas).
    return <div ref={ref} className={cn("cde-title leading-none tracking-tight", className)} {...props}>{text}</div>;
  },
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const text = useTitleText("subtitulo", children);
    return <div ref={ref} className={cn("cde-subtitle", className)} {...props}>{text}</div>;
  },
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4 pt-0 sm:p-6 sm:pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-wrap items-center gap-2 p-4 pt-0 sm:p-6 sm:pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
