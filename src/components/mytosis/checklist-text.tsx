import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ChecklistText({ id, value, onChange, maxLength, multiline = false, label, hint, autoFocus = false }: { id?: string; value: string; onChange: (value: string) => void; maxLength?: number; multiline?: boolean; label: string; hint?: string; autoFocus?: boolean }) {
  const classes = "min-w-0 rounded-none border-0 border-b border-border bg-transparent px-0 shadow-none focus-visible:border-primary focus-visible:ring-0";
  return <div className="min-w-0 space-y-1">
    {multiline ? <Textarea id={id} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLength} className={classes} placeholder={hint} autoFocus={autoFocus} /> : <Input id={id} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLength} className={`h-10 ${classes}`} autoFocus={autoFocus} />}
    <div className="flex items-start justify-between gap-2 text-[11px] leading-tight text-muted-foreground"><span>{hint}</span><span className="shrink-0 tabular-nums">{value.length}{maxLength ? `/${maxLength}` : " caracteres"}</span></div>
  </div>;
}