import { fillOf } from "./shapes";

export const TITLE_COLORS = [
  { key: "black", label: "Preto", color: "var(--mytosis-text-dark)" },
  { key: "white", label: "Branco", color: "var(--mytosis-text-light)" },
  { key: "green", label: "Verde myio", color: "var(--myio-green)" },
  { key: "purple", label: "Roxo myio", color: "var(--myio-purple)" },
  { key: "dark", label: "Escuro myio", color: "var(--myio-dark)" },
  { key: "gray", label: "Cinza", color: "var(--mytosis-gray-line)" },
] as const;

export type TitleColorKey = typeof TITLE_COLORS[number]["key"];

export function titleColorOf(color: string | null | undefined, fillKey: string | null | undefined) {
  const selected = TITLE_COLORS.find((item) => item.key === color);
  if (selected) return selected.color;
  const fill = fillOf(fillKey);
  return fill.dark ? "var(--mytosis-text-light)" : fill.key === "purple-mid" ? "var(--mytosis-text-dark)" : "var(--foreground)";
}