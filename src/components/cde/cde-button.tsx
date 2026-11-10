import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import addTextUsage from "./add-text-usage.json";
import { ICONS, styleOf, type CdeStyle } from "./cde-render";
import { COMMON_ACTION_GROUPS, isSpecificAction } from "./action-standard";

/** Grupos do CDE que já trocam ao vivo nas telas. */
export type CdeGroup = "action_standard" | "filter" | "plus" | "box" | "number_section" | "number_subsection" | "fields_select" | "confirm_dialog" | "close" | "toggle" | "color_swatch" | "send" | "attach" | "clear" | "organize" | "restricted";

/** Padrão usado enquanto o CDE carrega ou se nenhum padrão estiver escolhido. */
const FALLBACK: Record<CdeGroup, string> = {
  action_standard: "Button|outline|default|||",
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
  send: "Button|outline|default||Send|h-4 w-4",
  attach: "Button|outline|default||Paperclip|h-4 w-4",
  clear: "Button|outline|sm||||",
  organize: "Button|outline|sm||||",
  restricted: "span|ghost||text-foreground|Lock|h-3.5 w-3.5",
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
        supabase.from("cde_models").select("id,group_key,name,tag,variant,size,class_name,icon,icon_class,label,style"),
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
  cdeId?: string;
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
  const specific = !children || isSpecificAction({ className, modelStyle: m.style, secondary: data?.selected.some(s => s.group_key === group && !s.is_primary && !!screen && s.screens.includes(screen)) });
  const common = resolveCdeModel(data, "action_standard");
  const visual = COMMON_ACTION_GROUPS.has(group) && !specific ? common : m;
  const { css, cls } = styleOf(visual.style);
  const Icon = ICONS[m.icon];
  return (
    <Button
      ref={ref}
      type={type}
      actionKind={specific ? "specific" : "standard"}
      variant={(visual.variant || undefined) as never}
      size={(visual.size || undefined) as never}
      style={css}
      className={cn(visual.className, cls, children && "!w-auto !min-w-max shrink-0", active ? "!text-primary" : group === "filter" ? "!text-foreground hover:!text-primary" : "", className)}
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
  // Swatches take only the CDE shape: fill/border/text would hide the palette colors being shown.
  const { css, cls } = styleOf(m.style?.shape ? { shape: m.style.shape } : undefined);
  return { css, cls };
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

/** All sequential markers share the live numbering standard; hierarchy keeps its own group. */
export function useCdeNumberStyle(screen?: string, subcategory = false) {
  const { data } = useCdeStandards();
  const m = resolveCdeModel(data, subcategory ? "number_subsection" : "number_section", screen);
  const { css, cls } = styleOf(m.style);
  return { css, className: cn("inline-flex h-7 min-w-7 shrink-0 items-center justify-center px-1 text-sm font-bold tabular-nums", subcategory && "text-xs", m.className, cls) };
}

export function CdeNumber({ children, subcategory = false, screen = "components/cde/cde-workspace.tsx", className, ...props }: React.ComponentProps<"span"> & { subcategory?: boolean; screen?: string }) {
  const look = useCdeNumberStyle(screen, subcategory);
  return <span {...props} data-cde-number="" style={look.css} className={cn(look.className, className)}>{children}</span>;
}

/** Numeric drag/edit controls keep their behavior but use the same look as passive numbers. */
export function CdeNumberButton({ children, screen, subcategory = false, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { screen: string; subcategory?: boolean }) {
  const look = useCdeNumberStyle(screen, subcategory);
  return <Button {...props} type={props.type ?? "button"} variant="ghost" data-cde-number="" style={look.css} className={cn(look.className, "p-0", className)}>{children}</Button>;
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

/** Cadeado dos itens de acesso restrito; segue o padrão do CDE (5.3). */
export function CdeLockIcon({ screen, className }: { screen?: string; className?: string }) {
  const { data } = useCdeStandards();
  const m = resolveCdeModel(data, "restricted", screen);
  const { css, cls } = styleOf(m.style);
  const Icon = ICONS[m.icon] ?? ICONS.Lock;
  return <span style={css} aria-hidden="true" className={cn("inline-flex shrink-0 items-center", m.className, cls, className)}>{Icon ? <Icon className={m.iconClass || "h-3.5 w-3.5"} /> : null}</span>;
}
