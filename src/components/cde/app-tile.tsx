import type React from "react";
import { CodeXml, DollarSign, FileSignature, Phone, Search, Settings, UsersRound } from "lucide-react";
import { CrmFunnelIcon } from "@/components/crm-funnel-icon";
import { MytosisIcon } from "@/components/mytosis-icon";
import { CdeIcon } from "@/components/cde-icon";
import { APP_ICON_OPTICAL, type AppTileConfig } from "./app-order-config";

const APP_ICONS: Record<string, [React.ComponentType<{ className?: string; style?: React.CSSProperties }>, number]> = {
  supply: [Settings, 1.7], cash_flow: [DollarSign, 3.5], crm: [CrmFunnelIcon, 3], legal: [FileSignature, 1.8], rh: [UsersRound, 1.8],
  site_survey: [Search, 2.8], chamados: [Phone, 2.4], cde: [CdeIcon, 1.8], mytosis: [MytosisIcon, 1.8], development: [CodeXml, 2.8],
};

/** Symbol + name inside a portal app tile; shared by the portal and the CDE preview. */
export function AppTileFace({ appKey, name, tile }: { appKey: string; name: string; tile: AppTileConfig }) {
  const [Icon, stroke] = APP_ICONS[appKey] ?? [CodeXml, 2.8];
  const scale = (tile.iconPct / 100) * (APP_ICON_OPTICAL[appKey] ?? 1);
  return <><span className="flex h-11 w-full translate-y-0.5 items-center justify-center sm:h-16 sm:translate-y-1" aria-hidden="true"><Icon className="h-11 w-11 sm:h-16 sm:w-16" style={{ strokeWidth: stroke, transform: `scale(${scale})` }} /></span>
    <span className="font-normal leading-none text-[length:var(--tile-fs-m)] sm:text-[length:var(--tile-fs)]" style={{ "--tile-fs": `${tile.labelPx}px`, "--tile-fs-m": `${tile.labelPx - 2}px` } as React.CSSProperties}>{name}</span></>;
}

const APP_NAME_KEYS: Record<string, string> = { Supply: "supply", "Cash Flow": "cash_flow", CRM: "crm", Legal: "legal", RH: "rh", "Site Survey": "site_survey", Chamados: "chamados", OpDesk: "chamados", CDE: "cde", Mytosis: "mytosis", Code: "development" };

/** Small app symbol for lists (e.g. pending groups), keyed by the app display name. */
export function AppSymbol({ name, className }: { name: string; className?: string }) {
  const key = APP_NAME_KEYS[name];
  if (!key) return null;
  const [Icon] = APP_ICONS[key];
  return <Icon className={className} aria-hidden="true" />;
}
