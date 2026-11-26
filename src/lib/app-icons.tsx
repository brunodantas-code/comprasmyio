import type { ComponentType, CSSProperties } from "react";
import { CodeXml, DollarSign, FileSignature, FolderKanban, Lightbulb, Phone, Search, Settings, UsersRound, ChartNoAxesCombined } from "lucide-react";
import { CrmFunnelIcon } from "@/components/crm-funnel-icon";
import { MytosisIcon } from "@/components/mytosis-icon";
import { CdeIcon } from "@/components/cde-icon";
import { SpendIcon } from "@/components/spend/icons";

/** One symbol registry for Home, CDE previews and generated shortcut assets. */
export const APP_ICONS: Record<string, [ComponentType<{ className?: string; style?: CSSProperties }>, number]> = {
  spend: [SpendIcon, 2], supply: [Settings, 1.7], cash_flow: [DollarSign, 3.5],
  crm: [CrmFunnelIcon, 3], legal: [FileSignature, 1.8], rh: [UsersRound, 1.8],
  site_survey: [Search, 2.8], chamados: [Phone, 2.4], cde: [CdeIcon, 1.8],
  mytosis: [MytosisIcon, 1.8], development: [CodeXml, 2.8], wishlist: [Lightbulb, 2],
  projects: [FolderKanban, 2], indicadores: [ChartNoAxesCombined, 2],
};