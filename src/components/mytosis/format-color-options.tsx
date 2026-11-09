import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ColorCode } from "@/components/cde/color-code";
import { useCdeSwatchStyle } from "@/components/cde/cde-button";
import { cn } from "@/lib/utils";

export function FormatColorOptions<K extends string>({ label, value, options, onChange, border = false, showCode = false }: {
  label: string; value: string; options: readonly { key: K; label: string; color: string }[]; onChange: (value: K) => void; border?: boolean; showCode?: boolean;
}) {
  const swatch = useCdeSwatchStyle();
  return <div className="grid gap-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>
    <div className="flex flex-wrap items-start gap-2">{options.map((color) => <div key={color.key} className="grid justify-items-center gap-0.5">
      <Button type="button" variant="ghost" size="icon" style={swatch.css} title={color.label} aria-label={`${label} ${color.label}`} aria-pressed={value === color.key} onClick={() => onChange(color.key)} className={cn("h-7 w-7 !border-0 !bg-transparent !p-0 !shadow-none hover:!bg-transparent focus-visible:!ring-0", swatch.cls)}>
        {border ? <span className={cn("h-6 w-6 border-[3px] bg-card", swatch.cls, color.color === "transparent" && "!border-dashed !border-muted-foreground/50")} style={{ ...swatch.css, ...(color.color === "transparent" ? {} : { borderColor: color.color }) }} /> : <span className={cn("h-6 w-6 border border-border", swatch.cls)} style={{ ...swatch.css, backgroundColor: color.color }} />}
      </Button><span className="flex h-3 items-center text-primary">{value === color.key ? <Check className="size-3" /> : null}</span>{showCode ? <ColorCode color={color.color} /> : null}
    </div>)}</div>
  </div>;
}