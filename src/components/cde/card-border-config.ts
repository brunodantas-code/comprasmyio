export const CARD_BORDER_GROUP = "card_classification_border";
export const CARD_BORDER_APPS = [{ key: "indicadores", label: "Indicadores" }, { key: "crm", label: "CRM" }] as const;
export const CARD_BORDER_MODES = [{ key: "none", label: "Sem classificação" }, { key: "department", label: "Departamento/Setor" }, { key: "status", label: "Status" }, { key: "responsible", label: "Responsável" }] as const;
export const CARD_BORDER_COLORS = [
  { key: "verde", label: "Verde myio" }, { key: "verde_claro", label: "Verde claro myio" },
  { key: "roxo", label: "Roxo myio" }, { key: "lilas", label: "Lilás myio" },
  { key: "escuro", label: "Escuro myio" }, { key: "vermelho", label: "Vermelho" },
  { key: "preto", label: "Preto" }, { key: "cinza_escuro", label: "Cinza escuro" },
  { key: "cinza", label: "Cinza médio" }, { key: "cinza_claro", label: "Cinza claro" },
  { key: "cinza_muito_claro", label: "Cinza muito claro" }, { key: "branco", label: "Branco" },
] as const;
export type CardBorderApp = typeof CARD_BORDER_APPS[number]["key"];
export type CardBorderMode = typeof CARD_BORDER_MODES[number]["key"];
export type CardBorderColor = typeof CARD_BORDER_COLORS[number]["key"];
export type CardBorderRule = { mode: CardBorderMode; edge: "top" | "all"; width: number; colors: Partial<Record<Exclude<CardBorderMode, "none">, Record<string, CardBorderColor>>> };
export type CardBorderConfig = Partial<Record<CardBorderApp, CardBorderRule>>;
export type CardClassification = { app: CardBorderApp; department?: string; status?: string; responsible?: string };
export const DEFAULT_CARD_BORDER: CardBorderRule = { mode: "none", edge: "top", width: 2, colors: {} };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function parseCardBorders(raw?: string | null): CardBorderConfig {
  try {
    const parsed: unknown = JSON.parse(raw ?? "{}");
    if (!object(parsed)) return {};
    const config: CardBorderConfig = {};
    for (const app of CARD_BORDER_APPS) {
      const rule = parsed[app.key];
      if (!object(rule)) continue;
      const mode = CARD_BORDER_MODES.find(m => m.key === rule['mode'])?.key ?? "none";
      const colors: CardBorderRule['colors'] = {};
      for (const dimension of ["department", "status", "responsible"] as const) {
        const source = object(rule['colors']) ? rule['colors'][dimension] : null;
        if (!object(source)) continue;
        colors[dimension] = Object.fromEntries(Object.entries(source).flatMap(([key, value]) => {
          const color = CARD_BORDER_COLORS.find(c => c.key === value);
          return color ? [[key, color.key]] : [];
        }));
      }
      const width = typeof rule['width'] === "number" && Number.isFinite(rule['width']) ? Math.min(4, Math.max(1, Math.round(rule['width']))) : 2;
      config[app.key] = { mode, edge: rule['edge'] === "all" ? "all" : "top", width, colors };
    }
    return config;
  } catch { return {}; }
}

export function resolveCardBorder(config: CardBorderConfig, classification?: CardClassification) {
  if (!classification) return null;
  const rule = config[classification.app];
  if (!rule || rule.mode === "none") return null;
  const value = classification[rule.mode];
  const color = value ? rule.colors[rule.mode]?.[value] : undefined;
  if (!color) return null;
  return { color, edge: rule.edge, width: rule.width };
}