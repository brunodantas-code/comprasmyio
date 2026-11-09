import * as React from "react";
import { resolveCdeModel, useCdeStandards, type CdeGroup } from "./cde-button";
import { styleOf } from "./cde-render";

/** Groups applied automatically by shared ui components (Button/Input/Textarea). */
export type AutoGroup = "save" | "cancel" | "confirm" | "trash" | "pencil" | "toggle" | "move" | "sort" | "export" | "send" | "attach" | "clear" | "organize" | "fields_input" | "fields_textarea" | "fields_password";

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
  return undefined;
}

/** Visual (CDE style) of the chosen standard for a group; empty when no standard is chosen. */
export function useCdeLook(group: AutoGroup | undefined, withClass = false): { className: string; style: React.CSSProperties; variant?: string; size?: string; icon?: string; iconClass?: string; label?: string } {
  const { data } = useCdeStandards();
  if (!group) return { className: "", style: {} };
  const effectiveGroup = group === "organize" && !(data?.selected ?? []).some(s => s.group_key === "organize" && s.is_primary) ? "save" : group;
  const rows = (data?.selected ?? []).filter((s) => s.group_key === effectiveGroup && s.is_primary);
  if (!rows.length) return { className: "", style: {} };
  // Field subgroups may hold several standards: prefer the one with real customization.
  const row = rows.find((r) => r.variant_key.startsWith("custom:") || (r.variant_key.split("|")[3] ?? "").trim()) ?? rows[0];
  const m = resolveCdeModel({ selected: [row], models: data?.models ?? [] }, effectiveGroup as CdeGroup);
  const { css, cls } = styleOf(m.style);
  const custom = row.variant_key.startsWith("custom:") ? data?.models.find(model => model.id === row.variant_key.slice(7)) : undefined;
  return { className: [withClass ? m.className : "", cls].filter(Boolean).join(" "), style: css, variant: m.variant, size: m.size, icon: m.icon, iconClass: m.iconClass, label: custom?.label };
}
