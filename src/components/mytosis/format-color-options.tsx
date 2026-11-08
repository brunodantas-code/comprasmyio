import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ColorCode } from "@/components/cde/color-code";

export function FormatColorOptions<K extends string>({ label, value, options, onChange, border = false, showCode = false }: {
  label: string; value: string; options: readonly { key: K; label: string; color: string }[]; onChange: (value: K) => void; border?: boolean; showCode?: boolean;
}) {
  return <div className="grid gap-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>
    <div className="flex flex-wrap items-start gap-2">{options.map((color) => <div key={color.key} className="grid justify-items-center gap-0.5">
      <Button type="button" variant="ghost" size="icon" title={color.label} aria-label={`${label} ${color.label}`} aria-pressed={value === color.key} onClick={() => onChange(color.key)} className="h-7 w-7 rounded-full !border-0 !bg-transparent !p-0 !shadow-none hover:!bg-transparent focus-visible:!ring-0">
        {border ? <span className="h-6 w-6 rounded-full border-[3px] bg-card" style={{ borderColor: color.color }} /> : <span className="h-6 w-6 rounded-full border border-border" style={{ backgroundColor: color.color }} />}
      </Button><span className="flex h-3 items-center text-primary">{value === color.key ? <Check className="size-3" /> : null}</span>{showCode ? <ColorCode color={color.color} /> : null}
    </div>)}</div>
  </div>;
}