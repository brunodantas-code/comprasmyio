import type React from "react";
import { CodeXml } from "lucide-react";
import { APP_ICONS } from "@/lib/app-icons";
import { APP_ICON_OPTICAL, APP_NAME_COLORS, APP_TILE_DEFAULT, appDisplay, appKeyForName, useAppTile, type AppTileConfig } from "./app-order-config";

export const APP_DESCRIPTIONS: Record<string, string[]> = {
  spend: ["Gestão de cartões", "e despesas"],
  supply: ["Solicitações", "e Estoque"], cash_flow: ["Gestão financeira"], crm: ["Vendas e", "Relacionamento"],
  legal: ["Contratos", "Atas de Reunião", "Jurídico"], rh: ["Gestão de Pessoas"], site_survey: ["Visitas técnicas"],
  chamados: ["Suporte ao cliente", "e operação"], development: ["Melhorias e Bugs"], mytosis: ["Fluxogramas", "e processos"], cde: ["Padrões de", "interface"],
  wishlist: ["Desejos e", "inovação"],
  projects: ["Planejamento e", "controle de projetos"],
  indicadores: ["OKRs e KPIs", "Resultados e metas"],
};

export function appDescription(tile: AppTileConfig, appKey: string): string {
  return tile.apps?.[appKey]?.description ?? APP_DESCRIPTIONS[appKey]?.join("\n") ?? "";
}

/** Shared saved caption and typography for portal tiles and both CDE previews. */
export function AppTileDescription({ appKey, tile, mobile = false }: { appKey: string; tile: AppTileConfig; mobile?: boolean }) {
  const saved = tile.apps?.[appKey];
  const color = APP_NAME_COLORS.find(option => option.key === saved?.descriptionColor);
  const vars = {
    "--app-caption-size": `${saved?.descriptionPx ?? (mobile ? 10.88 : 14)}px`,
    "--app-caption-color": color && color.key !== "padrao" ? color.value : "var(--tile-below,var(--muted-foreground))",
  } as React.CSSProperties;
  return <p style={vars} className={`${mobile ? "mt-2 w-full" : "mt-3 w-28 max-w-full"} break-words text-center text-[length:var(--app-caption-size)] leading-normal text-[color:var(--app-caption-color)]`}>{appDescription(tile, appKey).split("\n").map((line, index) => <span key={index} className="block">{line || "\u00a0"}</span>)}</p>;
}

/** Symbol + name inside a portal app tile; shared by the portal and the CDE preview. */
export function AppTileFace({ appKey, name, tile, mobile = false }: { appKey: string; name: string; tile: AppTileConfig; mobile?: boolean }) {
  const [Icon, stroke] = APP_ICONS[appKey] ?? [CodeXml, 2.8];
  const display = appDisplay(tile, appKey, tile.labelPx, name);
  const scale = ((mobile ? tile.mobileIconPct : tile.iconPct) / 100) * (APP_ICON_OPTICAL[appKey] ?? 1);
  return <><span className={`flex w-full items-center justify-center ${mobile ? "translate-y-0.5 h-[length:var(--mobile-symbol-box,44px)]" : "h-16 translate-y-1"}`} aria-hidden="true"><Icon className={`text-[color:var(--tile-symbol,currentColor)] max-w-[65%] ${mobile ? "h-[length:var(--mobile-symbol-box,44px)] w-[length:var(--mobile-symbol-box,44px)]" : "h-16 w-16"}`} style={{ strokeWidth: stroke, transform: `scale(${mobile ? Math.min(scale, 1.4) : scale})` }} /></span>
    <span className={`max-w-full whitespace-normal break-words text-center font-normal leading-none text-[color:var(--tile-inside,currentColor)] ${mobile ? "text-[length:var(--tile-fs-m)]" : "text-[length:var(--tile-fs)]"}`} style={{ "--tile-fs": `${display.labelPx}px`, "--tile-fs-m": `${Math.min(display.labelPx - 2, 11)}px`, ...(display.color ? { color: display.color } : {}) } as React.CSSProperties}>{display.name}</span></>;
}

const APP_NAME_KEYS: Record<string, string> = { Spend: "spend", Supply: "supply", "Finance": "cash_flow", CRM: "crm", Legal: "legal", RH: "rh", "Site Survey": "site_survey", Chamados: "chamados", OpDesk: "chamados", CDE: "cde", Mytosis: "mytosis", Code: "development", Wishlist: "wishlist", Projects: "projects", Indicadores: "indicadores" };

/** Small app symbol for lists (e.g. pending groups), keyed by the app display name. */
export function AppSymbol({ name, className }: { name: string; className?: string }) {
  const tile = useAppTile().data ?? APP_TILE_DEFAULT;
  const key = APP_NAME_KEYS[name] ?? appKeyForName(name, tile);
  const entry = APP_ICONS[key];
  if (!entry) return null;
  const [Icon] = entry;
  return <Icon className={className} aria-hidden="true" />;
}
