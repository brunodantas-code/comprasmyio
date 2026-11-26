/**
 * Single simplified colour palette for every CDE colour picker.
 * One entry per colour: no duplicated names, no duplicated values, no "myio" suffix.
 * Keys already saved in cde_selected keep resolving (see COLOR_LEGACY), so nothing saved is lost.
 */
export type ColorOption = { key: string; label: string; value: string };

/** "No choice saved" entry: kept first so lookups fall back to it, never offered in the pickers. */
export const PADRAO_COLOR: ColorOption = { key: "padrao", label: "Sem escolha", value: "" };

/** The only list offered to the user. Every label and every value appears exactly once. */
export const COLOR_PALETTE: ColorOption[] = [
  { key: "transparente", label: "Sem cor", value: "transparent" },
  { key: "branco", label: "Branco", value: "var(--myio-white)" },
  { key: "cinza_claro", label: "Cinza claro", value: "color-mix(in oklab, var(--muted) 50%, transparent)" },
  { key: "cinza_escuro", label: "Cinza escuro", value: "oklch(0.86 0 0)" },
  { key: "cinza_texto", label: "Cinza (texto)", value: "var(--muted-foreground)" },
  { key: "preto", label: "Preto", value: "var(--cde-palette-black)" },
  { key: "vermelho", label: "Vermelho", value: "var(--destructive)" },
  { key: "verde_claro", label: "Verde claro", value: "var(--myio-green-tint)" },
  { key: "verde", label: "Verde", value: "var(--myio-green)" },
  { key: "lilas", label: "Lilás", value: "var(--myio-lilac)" },
  { key: "roxo", label: "Roxo", value: "var(--myio-purple)" },
  { key: "escuro", label: "Escuro", value: "var(--myio-dark)" },
  { key: "roxo_noite", label: "Roxo noite", value: "var(--erp-landing)" },
  { key: "roxo_profundo", label: "Roxo profundo", value: "var(--erp-landing-soft)" },
  { key: "lilas_suave", label: "Lilás suave", value: "var(--erp-landing-muted)" },
];

/** Colours no longer offered, kept resolvable so records saved while they were visible keep their look. */
export const COLOR_LEGACY: ColorOption[] = [
  { key: "atual:_branco_/_verde_claro", label: "Branco", value: "var(--card)" },
  { key: "fundo", label: "Fundo", value: "var(--background)" },
];

/** Resolve any saved key; unknown or missing keys fall back to "no choice". */
export const colorOption = (key?: string): ColorOption =>
  COLOR_PALETTE.find((o) => o.key === key) ?? COLOR_LEGACY.find((o) => o.key === key) ?? PADRAO_COLOR;

/** Keep the first entry of every colour value, so composing a list can never repeat a colour. */
export const uniqueByValue = <T extends { value: string }>(list: readonly T[]): T[] => {
  const seen = new Set<string>();
  return list.filter((o) => (seen.has(o.value) ? false : (seen.add(o.value), true)));
};

/** Palette entries still missing from a hand-built list (used by the table header pickers). */
export const paletteExtras = (existing: readonly { value: string }[]): ColorOption[] =>
  uniqueByValue(COLOR_PALETTE.filter((o) => !existing.some((e) => e.value === o.value)));

/** A picker list that starts with the look in use today, followed by every other palette colour once. */
export const withDefault = (label: string, value: string): ColorOption[] => [
  { key: "padrao", label, value },
  ...uniqueByValue(COLOR_PALETTE.filter((o) => o.value !== value)),
];
