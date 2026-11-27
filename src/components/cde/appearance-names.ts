import type { AppAppearance } from "./appearance-colors";

/**
 * Brand colour names that follow the active theme.
 * A picker swatch is painted by the live theme, so a saved "Verde myio" token
 * really shows purple under Roxo and a grey under P&B: the name has to say what
 * the dot shows. Keys are the exact words used by APP_TILE_COLORS / APP_NAME_COLORS,
 * longest first, so a longer phrase is never cut by its own shorter prefix.
 */
const THEME_WORDS: [string, Partial<Record<AppAppearance, string>>][] = [
  ["Atual: branco / verde claro", { purple: "Atual: branco / lilás claro", grayscale: "Atual: branco / cinza claro" }],
  ["Roxo noite myio (tela de acesso)", { grayscale: "Preto myio (tela de acesso)" }],
  ["Roxo profundo myio (tela de acesso)", { grayscale: "Preto profundo myio (tela de acesso)" }],
  ["Lilás suave myio (tela de acesso)", { grayscale: "Cinza suave myio (tela de acesso)" }],
  ["Verde claro myio", { purple: "Lilás claro myio", grayscale: "Cinza muito claro myio" }],
  ["Verde myio", { purple: "Roxo myio", grayscale: "Cinza myio" }],
  ["Lilás myio", { grayscale: "Cinza claro myio" }],
  ["Roxo myio", { grayscale: "Cinza escuro myio" }],
  ["Escuro myio", { grayscale: "Preto myio" }],
];

/** The token that always follows the theme (green → roxo → cinza). */
const THEME_PRIMARY = "var(--myio-green)";

/** Name of one saved colour in the theme the user is looking at. */
export function themeColorLabel(label: string, appearance: AppAppearance): string {
  if (appearance === "green") return label;
  for (const [word, byAppearance] of THEME_WORDS) {
    if (label.startsWith(word)) return (byAppearance[appearance] ?? word) + label.slice(word.length);
  }
  return label;
}

/**
 * Options of a picker, named by the colour the swatch actually shows.
 * When the theme makes the theme-following colour repeat the name of a fixed
 * brand colour (Roxo theme: the green token becomes the brand purple), the
 * theme-following one keeps a marker so the two choices stay distinguishable.
 */
export function themedColorOptions<T extends { label: string; value: string }>(list: readonly T[], appearance: AppAppearance): T[] {
  const named = list.map((option) => ({ ...option, label: themeColorLabel(option.label, appearance) })) as T[];
  const times = new Map<string, number>();
  for (const option of named) times.set(option.label, (times.get(option.label) ?? 0) + 1);
  return named.map((option) =>
    (times.get(option.label) ?? 0) > 1 && option.value === THEME_PRIMARY ? { ...option, label: `${option.label} (do tema)` } : option,
  );
}
