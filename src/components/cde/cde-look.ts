import * as React from "react";
import { resolveCdeModel, useCdeStandards, type CdeGroup } from "./cde-button";
import { styleOf } from "./cde-render";
import { COMMON_ACTION_GROUPS, inheritActionLook } from "./action-standard";

/** Groups applied automatically by shared ui components (Button/Input/Textarea). */
export type AutoGroup = "action_standard" | "add" | "save" | "cancel" | "confirm" | "trash" | "pencil" | "toggle" | "move" | "sort" | "export" | "send" | "attach" | "clear" | "organize" | "fields_input" | "fields_textarea" | "fields_password";

export type LibraryBinding = { group: AutoGroup; label: string };
export function readButtonBindings(raw?: string): Record<string, LibraryBinding> {
  try {
    const value: unknown = JSON.parse(raw ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, binding]) => binding && typeof binding === "object" && typeof binding.group === "string" && typeof binding.label === "string"));
  } catch { return {}; }
}
export function useButtonBinding(label: string) {
  const { data } = useCdeStandards();
  const bindings = readButtonBindings(data?.selected.find(s => s.group_key === "button_bindings" && s.is_primary)?.variant_key);
  return bindings[label.trim()];
}

const ICON_GROUP: Record<string, AutoGroup> = {
  Pencil: "pencil", PencilLine: "pencil", SquarePen: "pencil", PenLine: "pencil",
  Trash: "trash", Trash2: "trash",
  ChevronDown: "toggle", ChevronUp: "toggle",
  ArrowUp: "move", ArrowDown: "move",
  ArrowUpDown: "sort", ArrowDownUp: "sort",
};

function text(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join(" ");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return text(node.props.children);
  return "";
}
function iconName(node: React.ReactNode): string | undefined {
  const list = React.Children.toArray(node);
  for (const n of list) {
    if (React.isValidElement(n)) {
      const t = n.type as { displayName?: string };
      if (t?.displayName && ICON_GROUP[t.displayName]) return t.displayName;
    }
  }
  return undefined;
}

/** Detects which CDE action group a button belongs to from its label or icon. */
export function detectButtonGroup(children: React.ReactNode, label?: string): AutoGroup | undefined {
  // A known icon wins (e.g. a chevron labelled "Recolher Salvar" is still a toggle).
  const icon = iconName(children);
  if (icon) return ICON_GROUP[icon];
  const visible = text(children).trim();
  const t = (visible || label || "").toLowerCase();
  if (/\b(pdf|excel|exportar)\b/.test(t)) return "export";
  if (/\b(agrupar|consolidar)\b|custo por etiqueta|indicadores de prazos/.test(t)) return "organize";
  if (/\b(limpar|limpando)\b/.test(t)) return "clear";
  if (/\b(anexar|anexando)\b/.test(t)) return "attach";
  if (/\b(enviar|enviando)\b/.test(t)) return "send";
  if (/\b(salvar|salvando)\b/.test(t)) return "save";
  if (/\b(cancelar|cancelando)\b/.test(t)) return "cancel";
  if (/\b(confirmar|concluir|confirmando|concluindo)\b/.test(t)) return "confirm";
  if (/\b(excluir|excluindo)\b/.test(t)) return "trash";
  if (/\b(adicionar|criar|novo|nova)\b/.test(t)) return "add";
  return undefined;
}

/** Visual (CDE style) of the chosen standard for a group; empty when no standard is chosen. */
export function useCdeLook(group: AutoGroup | undefined, withClass = false, screen?: string, specific = false): { className: string; style: React.CSSProperties; variant?: string; size?: string; icon?: string; iconClass?: string; label?: string } {
  const { data } = useCdeStandards();
  if (!group) return { className: "", style: {} };
  const effectiveGroup = group === "organize" && !(data?.selected ?? []).some(s => s.group_key === "organize" && s.is_primary) ? "save" : group;
  const rows = (data?.selected ?? []).filter((s) => s.group_key === effectiveGroup && (screen ? !s.is_primary && s.screens.includes(screen) : s.is_primary));
  const own = !rows.length && screen ? primaryCdeLook(data, effectiveGroup, withClass) : primaryCdeLook(data, effectiveGroup, withClass, rows);
  const row = rows[0];
  const modelStyle = row?.variant_key.startsWith("custom:") ? data?.models.find(m => m.id === row.variant_key.slice(7))?.style as import("./cde-render").CdeStyle | undefined : undefined;
  if (!COMMON_ACTION_GROUPS.has(group) || specific || rows.some(r => !r.is_primary) || modelStyle?.actionSpecific || (group === "confirm" && modelStyle?.actionSpecific !== false)) return own;
  const commonGroup = data?.selected.some(s => s.group_key === "action_standard" && s.is_primary) ? "action_standard" : "save";
  const common = primaryCdeLook(data, commonGroup, true);
  return common.variant ? inheritActionLook(own, common) : own;
}

function primaryCdeLook(data: ReturnType<typeof useCdeStandards>["data"], effectiveGroup: AutoGroup, withClass: boolean, selectedRows?: NonNullable<ReturnType<typeof useCdeStandards>["data"]>["selected"]) {
  const rows = selectedRows ?? (data?.selected ?? []).filter(s => s.group_key === effectiveGroup && s.is_primary);
  if (!rows.length) return { className: "", style: {} };
  // Field subgroups may hold several standards: prefer the one with real customization.
  const row = rows.find((r) => r.variant_key.startsWith("custom:") || (r.variant_key.split("|")[3] ?? "").trim()) ?? rows[0];
  const m = resolveCdeModel({ selected: [{ ...row, is_primary: true }], models: data?.models ?? [] }, effectiveGroup as CdeGroup);
  const { css, cls } = styleOf(m.style);
  const custom = row.variant_key.startsWith("custom:") ? data?.models.find(model => model.id === row.variant_key.slice(7)) : undefined;
  return { className: [withClass ? m.className : "", cls].filter(Boolean).join(" "), style: css, variant: m.variant, size: m.size, icon: m.icon, iconClass: m.iconClass, label: custom?.label };
}
