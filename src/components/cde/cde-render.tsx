import { ArrowDown, ArrowDownUp, ArrowUp, ArrowUpDown, Building2, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardCheck, FileSpreadsheet, FileText, Filter, PackagePlus, Pencil, Percent, Plus, Save, Settings2, Trash2, X, type LucideIcon } from "lucide-react";
import { BORDERS, FILLS } from "@/components/mytosis/shapes";

export const ICONS: Record<string, LucideIcon> = { ArrowDown, ArrowDownUp, ArrowUp, ArrowUpDown, Building2, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardCheck, FileSpreadsheet, FileText, Filter, PackagePlus, Pencil, Percent, Plus, Save, Settings2, Trash2, X };
export type CdeStyle = { shape?: string; fill?: string; border?: string; borderWidth?: string; text?: string; fontSize?: string; description?: string };
export const FONT_SIZES = ["10px","11px","12px","13px","14px","16px","18px"];
export const FORMS = [
  { key: "", label: "Padrão" }, { key: "square", label: "Quadrado", radius: "0" }, { key: "soft", label: "Arredondado", radius: "0.375rem" },
  { key: "round", label: "Bem arredondado", radius: "0.75rem" }, { key: "pill", label: "Pílula", radius: "9999px" }, { key: "circle", label: "Redonda (WhatsApp)", radius: "50%" },
] as const;
export const WIDTHS = [{ key: "", label: "Padrão" }, { key: "0", label: "Sem borda" }, { key: "1px", label: "Fina" }, { key: "2px", label: "Média" }, { key: "3px", label: "Grossa" }];
export const TEXTS = [{ key: "default", label: "Padrão", color: "currentColor" }, { key: "dark", label: "Escuro myio", color: "var(--myio-dark)" }, { key: "green", label: "Verde myio", color: "var(--myio-green)" }, { key: "white", label: "Branco", color: "var(--card)" }];
/** Variáveis CSS + classes fixas com prioridade, para vencer os estilos !important dos botões. */
export function styleOf(st?: CdeStyle): { css: React.CSSProperties; cls: string } {
  const css: Record<string, string> = {}; const cls: string[] = [];
  if (!st) return { css, cls: "" };
  const form = FORMS.find((f) => f.key === st.shape);
  if (form && "radius" in form) { css["--cde-r"] = form.radius; cls.push("!rounded-[var(--cde-r)]"); }
  if (st.fill && st.fill !== "none") { css["--cde-bg"] = FILLS.find((f) => f.key === st.fill)?.color ?? ""; cls.push("!bg-[var(--cde-bg)]"); }
  if (st.border === "none") { cls.push("!border-0"); }
  else if (st.border) { css["--cde-bd"] = BORDERS.find((b) => b.key === st.border)?.color ?? ""; cls.push("!border-[var(--cde-bd)] !border-solid"); }
  if (st.borderWidth && st.border !== "none") { css["--cde-bw"] = st.borderWidth; cls.push("!border-[length:var(--cde-bw)] !border-solid"); }
  if (st.text && st.text !== "default") { css["--cde-tx"] = TEXTS.find((t) => t.key === st.text)?.color ?? ""; cls.push("!text-[var(--cde-tx)]"); }
  if (st.fontSize) { css["--cde-fs"] = st.fontSize; cls.push("!text-[length:var(--cde-fs)]"); }
  return { css: css as React.CSSProperties, cls: cls.join(" ") };
}

