import type React from "react";
import { CodeXml, DollarSign, FileSignature, Lightbulb, Phone, Search, Settings, UsersRound } from "lucide-react";
import { CrmFunnelIcon } from "@/components/crm-funnel-icon";
import { MytosisIcon } from "@/components/mytosis-icon";
import { CdeIcon } from "@/components/cde-icon";
import { APP_ICON_OPTICAL, type AppTileConfig } from "./app-order-config";

const APP_ICONS: Record<string, [React.ComponentType<{ className?: string; style?: React.CSSProperties }>, number]> = {
  supply: [Settings, 1.7], cash_flow: [DollarSign, 3.5], crm: [CrmFunnelIcon, 3], legal: [FileSignature, 1.8], rh: [UsersRound, 1.8],
  site_survey: [Search, 2.8], chamados: [Phone, 2.4], cde: [CdeIcon, 1.8], mytosis: [MytosisIcon, 1.8], development: [CodeXml, 2.8],
  wishlist: [Lightbulb, 2],
};

export const APP_DESCRIPTIONS: Record<string, string[]> = {
  supply: ["Solicitações", "e Estoque"], cash_flow: ["Gestão financeira"], crm: ["Vendas e", "Relacionamento"],
  legal: ["Contratos", "Atas de Reunião", "Jurídico"], rh: ["Gestão de Pessoas"], site_survey: ["Visitas técnicas"],
  chamados: ["Suporte ao cliente", "e operação"], development: ["Melhorias e Bugs"], mytosis: ["Fluxogramas", "e processos"], cde: ["Padrões de", "interface"],
  wishlist: ["Desejos e", "inovação"],
};

/** Symbol + name inside a portal app tile; shared by the portal and the CDE preview. */
export function AppTileFace({ appKey, name, tile, mobile = false }: { appKey: string; name: string; tile: AppTileConfig; mobile?: boolean }) {
  const [Icon, stroke] = APP_ICONS[appKey] ?? [CodeXml, 2.8];
  const scale = ((mobile ? tile.mobileIconPct : tile.iconPct) / 100) * (APP_ICON_OPTICAL[appKey] ?? 1);
  return <><span className={`flex w-full items-center justify-center ${mobile ? "translate-y-0.5 h-[length:var(--mobile-symbol-box,44px)]" : "h-16 translate-y-1"}`} aria-hidden="true"><Icon className={`text-[color:var(--tile-symbol,currentColor)] max-w-[65%] ${mobile ? "h-[length:var(--mobile-symbol-box,44px)] w-[length:var(--mobile-symbol-box,44px)]" : "h-16 w-16"}`} style={{ strokeWidth: stroke, transform: `scale(${mobile ? Math.min(scale, 1.4) : scale})` }} /></span>
    <span className={`max-w-full whitespace-nowrap font-normal leading-none text-[color:var(--tile-inside,currentColor)] ${mobile ? "text-[length:var(--tile-fs-m)]" : "text-[length:var(--tile-fs)]"}`} style={{ "--tile-fs": `${tile.labelPx}px`, "--tile-fs-m": `${Math.min(tile.labelPx - 2, 11)}px` } as React.CSSProperties}>{name}</span></>;
}

const APP_NAME_KEYS: Record<string, string> = { Supply: "supply", "Cash Flow": "cash_flow", CRM: "crm", Legal: "legal", RH: "rh", "Site Survey": "site_survey", Chamados: "chamados", OpDesk: "chamados", CDE: "cde", Mytosis: "mytosis", Code: "development", Wishlist: "wishlist" };

/** Small app symbol for lists (e.g. pending groups), keyed by the app display name. */
export function AppSymbol({ name, className }: { name: string; className?: string }) {
  const key = APP_NAME_KEYS[name];
  if (!key) return null;
  const [Icon] = APP_ICONS[key];
  return <Icon className={className} aria-hidden="true" />;
}
