import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import addTextUsage from "./add-text-usage.json";
import { ICONS, styleOf, type CdeStyle } from "./cde-render";

/** Grupos do CDE que já trocam ao vivo nas telas. */
export type CdeGroup = "filter" | "plus" | "box" | "number_section" | "number_subsection" | "fields_select" | "confirm_dialog" | "close" | "toggle" | "color_swatch";

/** Padrão usado enquanto o CDE carrega ou se nenhum padrão estiver escolhido. */
const FALLBACK: Record<CdeGroup, string> = {
  filter: "Button|ghost|icon||Filter|size-3",
  plus: "Button|ghost|icon|text-primary|Plus|h-5 w-5",
  box: "div|||rounded-xl border bg-card text-card-foreground shadow||",
  number_section: "span|||rounded-md bg-primary text-foreground||",
  number_subsection: "span|||rounded-md bg-cde-number-soft text-primary||",
  fields_select: "SelectTrigger|||||",
  confirm_dialog: "div|||rounded-lg border bg-background||",
  close: "button|||rounded-sm opacity-70 hover:opacity-100|X|h-4 w-4",
  toggle: "Button|ghost|compactIcon|text-primary|ChevronDown|h-4 w-4",
  color_swatch: "span|||rounded-none||",
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

/** Texto editado no CDE (grupo add_text) para um botão + com texto; devolve o original sem edição. */
export function parseAddTextOverrides(raw?: string | null): Record<string, string> {
  try { const v = JSON.parse(raw ?? "{}"); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; } catch { return {}; }
}
const ADD_TEXT_ALIASES: Record<string, string> = Object.fromEntries((addTextUsage as { file: string; label: string; shared?: string }[]).filter((e) => e.shared).map((e) => [`${e.file}|${e.label}`, e.shared!]));
/** Override key; linked buttons (same meaning in several screens) share one edited text. */
export function addTextKey(screen: string, text: string) { const k = `${screen}|${text}`; return ADD_TEXT_ALIASES[k] ?? k; }
export function useCdeAddLabel(screen: string | undefined, text: ReactNode): ReactNode {
  const { data } = useCdeStandards();
  if (!screen || typeof text !== "string") return text;
  const raw = data?.selected.find((s) => s.group_key === "add_text" && s.is_primary)?.variant_key;
  const v = parseAddTextOverrides(raw)[addTextKey(screen, text)];
  return v?.trim() ? v : text;
}

/** Botão que segue ao vivo o padrão escolhido no CDE para o grupo. */
export const CdeButton = forwardRef<HTMLButtonElement, Props>(function CdeButton({ group, screen, active, className, children, type = "button", ...rest }, ref) {
  const { data } = useCdeStandards();
  const m = resolveCdeModel(data, group, screen);
  const label = useCdeAddLabel(group === "plus" ? screen : undefined, children);
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
      {group === "toggle" ? (rest["aria-expanded"] ? <ICONS.ChevronUp className={m.iconClass} /> : <ICONS.ChevronDown className={m.iconClass} />) : Icon ? <Icon className={m.iconClass} /> : null}
      {label}
    </Button>
  );
});

/** Inline arrow for a labelled expanding header; shares the toggle look without styling its text. */
export function CdeToggleIcon({ open }: { open?: boolean }) {
  const { data } = useCdeStandards();
  const m = resolveCdeModel(data, "toggle", "components/cde/cde-workspace.tsx");
  const { css, cls } = styleOf(m.style);
  const Icon = open ? ICONS.ChevronUp : ICONS.ChevronDown;
  return <span style={css} className={cn(buttonVariants({ variant: (m.variant || "ghost") as never, size: (m.size || "compactIcon") as never }), "ml-auto shrink-0", m.className, cls)}><Icon className={m.iconClass || "h-4 w-4"} /></span>;
}

/** Every color picker shares the saved swatch shape; square until a choice is saved. */
export function useCdeSwatchStyle() {
  const { data } = useCdeStandards();
  const m = resolveCdeModel(data, "color_swatch");
  const { css, cls } = styleOf(m.style);
  return { css, cls: cn(m.className, cls) };
}

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

/** Inline label for + buttons that are not CdeButton; follows CDE text edits. */
export function CdeAddLabel({ screen, text }: { screen: string; text: string }) {
  return <>{useCdeAddLabel(screen, text)}</>;
}

/** X of windows/side panels (CDE 4.6 Fechar); position stays with the caller. */
export function CdeCloseIcon() {
  const { data } = useCdeStandards();
  const m = resolveCdeModel(data, "close");
  const { css, cls } = styleOf(m.style);
  const Icon = ICONS[m.icon] ?? ICONS.X;
  return <span style={css} className={cn("inline-flex items-center justify-center", cls)}><Icon className={m.iconClass || "h-4 w-4"} /></span>;
}
