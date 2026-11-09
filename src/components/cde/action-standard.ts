import type { CdeStyle } from "./cde-render";

export const COMMON_ACTION_GROUPS = new Set(["action_standard", "add", "save", "cancel", "confirm", "trash", "export", "send", "attach", "clear", "organize", "plus"]);
export function isSpecificAction(options: { group?: string; label?: string; className?: string; customStyle?: boolean; secondary?: boolean; modelStyle?: CdeStyle }) {
  return Boolean(options.customStyle || options.secondary || options.modelStyle?.actionSpecific ||
    (options.group === "confirm" && options.modelStyle?.actionSpecific !== false) ||
    /(?:^|\s)(?:[^\s:]+:)*!?(?:h-|min-h-|max-h-|size-|rounded|border|bg-)/.test(options.className ?? ""));
}

/** Keep action identity (icon/label), inherit only the shared visual geometry and palette. */
type ActionVisual = { variant?: string; size?: string; className: string; style: React.CSSProperties };
export function inheritActionLook<T extends ActionVisual>(own: T, common: ActionVisual): T {
  return { ...own, variant: common.variant, size: common.size, className: common.className, style: common.style };
}