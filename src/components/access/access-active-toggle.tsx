import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * Alternate Ativo/Inativo padrão das telas de Acessos: o rótulo aparece sempre
 * ao lado do alternador (verde/preto quando ativo, vermelho quando inativo) e o
 * alternador fica sem borda, como na linha de usuário de "Usuários e aplicativos".
 */
export function AccessActiveToggle({
  active,
  disabled = false,
  onCheckedChange,
  label,
  className,
}: {
  active: boolean;
  disabled?: boolean;
  onCheckedChange: (active: boolean) => void;
  label?: string;
  className?: string;
}) {
  return (
    <label className={cn("flex shrink-0 cursor-pointer items-center gap-2", disabled && "cursor-not-allowed opacity-60", className)}>
      <span className={cn("text-xs whitespace-nowrap", active ? "text-foreground" : "text-destructive")}>
        {active ? "Ativo" : "Inativo"}
      </span>
      <Switch checked={active} disabled={disabled} onCheckedChange={onCheckedChange} aria-label={label} />
    </label>
  );
}
