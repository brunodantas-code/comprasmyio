import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ICONS, styleOf, type CdeStyle } from "./cde-render";

/** Grupos do CDE que já trocam ao vivo nas telas. */
export type CdeGroup = "filter" | "plus" | "box" | "number_section" | "number_subsection" | "fields_select" | "confirm_dialog";

/** Padrão usado enquanto o CDE carrega ou se nenhum padrão estiver escolhido. */
const FALLBACK: Record<CdeGroup, string> = {
  filter: "Button|ghost|icon||Filter|size-3",
  plus: "Button|ghost|icon|text-primary|Plus|h-5 w-5",
  box: "div|||rounded-xl border bg-card text-card-foreground shadow||",
  number_section: "span|||rounded-md bg-primary text-foreground||",
  number_subsection: "span|||rounded-md bg-cde-number-soft text-primary||",
  fields_select: "SelectTrigger|||||",
  confirm_dialog: "div|||rounded-lg border bg-background||",
};

type Model = { variant: string; size: string; className: string; icon: string; iconClass: string; style?: CdeStyle };

function parseKey(key: string): Model {
  const [, variant = "", size = "", className = "", icon = "", iconClass = ""] = key.split("|");
  return { variant, size, className, icon, iconClass };
}

/** Padrões escolhidos no CDE, compartilhados por todas as telas. */
export function useCdeStandards() {
  return useQuery({
    queryKey: ["cde-standards"],
    staleTime: 60_000,
    queryFn: async () => {
      const [sel, models] = await Promise.all([
        supabase.from("cde_selected").select("group_key,variant_key,is_primary,screens"),
        supabase.from("cde_models").select("id,variant,size,class_name,icon,icon_class,style"),
      ]);
      if (sel.error) throw sel.error;
      return { selected: sel.data ?? [], models: models.data ?? [] };
    },
  });
}

/** Resolve o modelo de um grupo: secundário da tela, se houver; senão o principal. */
export function resolveCdeModel(data: ReturnType<typeof useCdeStandards>["data"], group: CdeGroup, screen?: string): Model {
  const rows = (data?.selected ?? []).filter((s) => s.group_key === group);
  const row = (screen && rows.find((s) => !s.is_primary && (s.screens ?? []).includes(screen))) || rows.find((s) => s.is_primary);
  const key = row?.variant_key ?? FALLBACK[group];
  if (key.startsWith("custom:")) {
    const m = data?.models.find((x) => x.id === key.slice(7));
    if (m) return { variant: m.variant, size: m.size, className: m.class_name, icon: m.icon, iconClass: m.icon_class, style: (m.style ?? {}) as CdeStyle };
    return parseKey(FALLBACK[group]);
  }
  return parseKey(key);
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  group: CdeGroup;
  /** Caminho da tela (ex.: "components/clients-tab.tsx") para padrões secundários. */
  screen?: string;
  /** Destaca o botão (ex.: filtro aplicado fica verde). */
  active?: boolean;
  children?: ReactNode;
};

/** Botão que segue ao vivo o padrão escolhido no CDE para o grupo. */
export const CdeButton = forwardRef<HTMLButtonElement, Props>(function CdeButton({ group, screen, active, className, children, type = "button", ...rest }, ref) {
  const { data } = useCdeStandards();
  const m = resolveCdeModel(data, group, screen);
  const { css, cls } = styleOf(m.style);
  const Icon = ICONS[m.icon];
  return (
    <Button
      ref={ref}
      type={type}
      variant={(m.variant || undefined) as never}
      size={(children ? "sm" : m.size || undefined) as never}
      style={css}
      className={cn(m.className, cls, active ? "!text-primary" : group === "filter" ? "!text-foreground hover:!text-primary" : "", className)}
      {...rest}
    >
      {Icon ? <Icon className={m.iconClass} /> : null}
      {children}
    </Button>
  );
});

/** Estilo de box (cartão) escolhido no CDE; vazio quando o padrão é o original. */
export function useCdeBoxStyle(screen?: string) {
  const { data } = useCdeStandards();
  const m = resolveCdeModel(data, "box", screen);
  return { ...styleOf(m.style), className: m.className };
}

/** Style of confirmation dialogs (exclusões etc.), chosen in CDE 5.2. */
export function useCdeConfirmStyle() {
  const { data } = useCdeStandards();
  const m = resolveCdeModel(data, "confirm_dialog");
  return { ...styleOf(m.style), className: m.className };
}

/** Fixed square dimensions also keep circular numbers truly round. */
export function CdeNumber({ children, subcategory = false }: { children: ReactNode; subcategory?: boolean }) {
  const { data } = useCdeStandards();
  const m = resolveCdeModel(data, subcategory ? "number_subsection" : "number_section", "components/cde/cde-workspace.tsx");
  const { css, cls } = styleOf(m.style);
  return <span style={css} className={cn("flex h-7 w-7 shrink-0 items-center justify-center text-sm font-bold", subcategory && "text-xs", m.className, cls)}>{children}</span>;
}
