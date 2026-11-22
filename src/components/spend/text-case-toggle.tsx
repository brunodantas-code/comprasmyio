import { CaseSensitive } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SpendTextCaseToggle({ active, onChange }: { active: boolean; onChange: (active: boolean) => void }) {
  return <Button type="button" variant="ghost" size="icon" aria-label="Primeira letra maiúscula" title={active ? "Exibir descrições originais" : "Converter descrições: somente primeira letra maiúscula"} aria-pressed={active} onClick={() => onChange(!active)}><CaseSensitive /></Button>;
}