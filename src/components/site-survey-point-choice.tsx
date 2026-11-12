import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { SurveyPointChoice } from "@/lib/site-survey-point-choice";

const choices: { value: SurveyPointChoice; label: string }[] = [
  { value: "shop", label: "Loja" },
  { value: "kiosk", label: "Quiosque" },
  { value: "depot", label: "Depósito" },
  { value: "environment", label: "Ambiente" },
  { value: "vacant", label: "Loja Vaga" },
  { value: "vacant_kiosk", label: "Quiosque Vago" },
];

export function SiteSurveyPointChoice({ value, onChange, idPrefix }: { value: SurveyPointChoice | null; onChange: (value: SurveyPointChoice | null) => void; idPrefix: string }) {
  return <div className="grid min-w-0 grid-cols-3 gap-x-3 gap-y-4" role="group" aria-label="Tipo do ponto">
    {choices.map((choice) => <div key={choice.value} className="flex min-w-0 items-center gap-2">
      <Checkbox id={`${idPrefix}-${choice.value}`} checked={value === choice.value} onCheckedChange={() => onChange(value === choice.value ? null : choice.value)} className="shrink-0" />
      <Label htmlFor={`${idPrefix}-${choice.value}`} className="min-w-0 cursor-pointer text-xs leading-snug sm:text-sm">{choice.label}</Label>
    </div>)}
  </div>;
}