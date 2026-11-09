import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TITLE_COLORS, type TitleColorKey } from "./title-colors";
import { useCdeSwatchStyle } from "@/components/cde/cde-button";
import { cn } from "@/lib/utils";

export function ColorOptions({ label, value, onChange, defaultLabel = "Automática" }: {
  label: string; value: TitleColorKey | null; onChange: (value: TitleColorKey | null) => void; defaultLabel?: string;
}) {
  const swatch = useCdeSwatchStyle();
  return <div className="grid gap-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>
    <div className="flex flex-wrap items-start gap-2">
      <Button type="button" variant="ghost" aria-pressed={value === null} onClick={() => onChange(null)} className="h-7 border-0 px-2 text-xs shadow-none">{defaultLabel}{value === null ? <Check className="size-3" /> : null}</Button>
      {TITLE_COLORS.map((color) => <div key={color.key} className="grid justify-items-center gap-0.5">
        <Button type="button" variant="ghost" size="icon" style={swatch.css} title={color.label} aria-label={`${label} ${color.label}`} aria-pressed={value === color.key} onClick={() => onChange(color.key)} className={cn("h-7 w-7 !border-0 !bg-transparent !p-0 !shadow-none hover:!bg-transparent focus-visible:!ring-0", swatch.cls)}>
          <span className={cn("h-6 w-6", swatch.cls)} style={{ ...swatch.css, backgroundColor: color.color }} />
        </Button><span className="flex h-3 items-center text-primary">{value === color.key ? <Check className="size-3" /> : null}</span>
      </div>)}
    </div>
  </div>;
}