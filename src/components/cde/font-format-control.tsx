import { Bold, Italic, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toggleFontFormat, type FontFormat } from "./font-format";

export function FontFormatControl({ value = {}, onChange, context, defaultWeight = "400" }: { value?: FontFormat; onChange: (value: FontFormat) => void; context: string; defaultWeight?: "400" | "600" | "700" }) {
  const weight = value.weight ?? defaultWeight;
  return <div className="min-w-0 space-y-1"><Label>Formatação da Fonte</Label><div role="group" aria-label={`Formatação da Fonte — ${context}`} className="cde-font-format flex items-center gap-1">
    <Button type="button" variant="ghost" size="icon" aria-label={`Semi-Negrito — ${context}`} title="Semi-Negrito" aria-pressed={weight === "600"} onClick={() => onChange(toggleFontFormat(value, "600", defaultWeight))}><Bold className="stroke-[1.5]" /></Button>
    <Button type="button" variant="ghost" size="icon" aria-label={`Negrito — ${context}`} title="Negrito" aria-pressed={weight === "700"} onClick={() => onChange(toggleFontFormat(value, "700", defaultWeight))}><Bold /></Button>
    <Button type="button" variant="ghost" size="icon" aria-label={`Itálico — ${context}`} title="Itálico" aria-pressed={value.italic === true} onClick={() => onChange(toggleFontFormat(value, "italic"))}><Italic /></Button>
    <Button type="button" variant="ghost" size="icon" aria-label={`Sublinhado — ${context}`} title="Sublinhado" aria-pressed={value.underline === true} onClick={() => onChange(toggleFontFormat(value, "underline"))}><Underline /></Button>
  </div></div>;
}