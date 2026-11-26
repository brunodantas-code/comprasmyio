import { Bold, Italic, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { FontFormat } from "./font-format";

export function FontFormatControl({ value = {}, onChange, context, defaultWeight = "400" }: { value?: FontFormat; onChange: (value: FontFormat) => void; context: string; defaultWeight?: "400" | "600" | "700" }) {
  const weight = value.weight ?? defaultWeight;
  return <div className="min-w-0 space-y-1"><Label>Formatação da Fonte</Label><div role="group" aria-label={`Formatação da Fonte — ${context}`} className="flex items-center gap-1">
    <Button variant="ghost" size="icon" aria-label={`Semi-Negrito — ${context}`} title="Semi-Negrito" aria-pressed={weight === "600"} onClick={() => onChange({ ...value, weight: weight === "600" ? "400" : "600" })}><Bold className="stroke-[1.5]" /></Button>
    <Button variant="ghost" size="icon" aria-label={`Negrito — ${context}`} title="Negrito" aria-pressed={weight === "700"} onClick={() => onChange({ ...value, weight: weight === "700" ? "400" : "700" })}><Bold /></Button>
    <Button variant="ghost" size="icon" aria-label={`Itálico — ${context}`} title="Itálico" aria-pressed={value.italic === true} onClick={() => onChange({ ...value, italic: !value.italic })}><Italic /></Button>
    <Button variant="ghost" size="icon" aria-label={`Sublinhado — ${context}`} title="Sublinhado" aria-pressed={value.underline === true} onClick={() => onChange({ ...value, underline: !value.underline })}><Underline /></Button>
  </div></div>;
}