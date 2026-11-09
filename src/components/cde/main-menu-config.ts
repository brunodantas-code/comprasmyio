import { PenLine, ArrowLeft, BookOpen, ClipboardList, DollarSign, FileSignature, KeyRound, LayoutGrid, LifeBuoy, LogOut, Moon, Phone, Search, Settings, Settings2, UsersRound } from "lucide-react";
import { CrmFunnelIcon } from "@/components/crm-funnel-icon";
import { MytosisIcon } from "@/components/mytosis-icon";
import { CdeIcon } from "@/components/cde-icon";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MENU_ITEMS = [
  { id: "manual", label: "Manual do Usuário", icon: BookOpen },
  { id: "signature", label: "Minha assinatura", icon: PenLine },
  { id: "back", label: "Voltar", icon: ArrowLeft },
  { id: "theme", label: "Modo escuro", icon: Moon },
  { id: "password", label: "Alterar senha", icon: KeyRound },
  { id: "logout", label: "Sair", icon: LogOut },
  { id: "portal", label: "Todos os apps", icon: LayoutGrid, to: "/portal", optional: true },
  { id: "access", label: "Acessos (somente Admin do ERP)", icon: Settings2 },
  { id: "pendentes", label: "Minhas Pendências", icon: ClipboardList, to: "/pendentes" },
  { id: "chamados", label: "Abrir chamado (Code)", icon: LifeBuoy, to: "/development", optional: true },
  { id: "app_supply", label: "Supply", icon: Settings, to: "/dashboard", optional: true },
  { id: "app_cash_flow", label: "Cash Flow", icon: DollarSign, to: "/cash-flow", optional: true },
  { id: "app_crm", label: "CRM", icon: CrmFunnelIcon, to: "/crm", optional: true },
  { id: "app_legal", label: "Legal", icon: FileSignature, to: "/legal", optional: true },
  { id: "app_rh", label: "RH", icon: UsersRound, to: "/rh", optional: true },
  { id: "app_site_survey", label: "Site Survey", icon: Search, to: "/site-survey", optional: true },
  { id: "app_opdesk", label: "OpDesk", icon: Phone, to: "/chamados", optional: true },
  { id: "app_mytosis", label: "Mytosis", icon: MytosisIcon, to: "/mytosis", optional: true },
  { id: "app_cde", label: "CDE", icon: CdeIcon, to: "/cde", optional: true },
] as const;
/** Optional entries start hidden until an admin enables them in the CDE. */
const OPTIONAL_IDS = MENU_ITEMS.filter((i) => "optional" in i).map((i) => i.id);
export type MenuId = typeof MENU_ITEMS[number]["id"];
export const USER_INFO_OPTIONS = [
  { key: "name", label: "Somente o nome" },
  { key: "job", label: "Nome e cargo" },
  { key: "profile", label: "Nome e perfil de usuário" },
  { key: "both", label: "Nome, cargo e perfil" },
] as const;
export type UserInfoMode = typeof USER_INFO_OPTIONS[number]["key"];
export type MenuConfig = { order: MenuId[]; hidden: MenuId[]; v?: number; userInfo?: UserInfoMode };
/** Text shown below the user name in every app header. */
export function userInfoLine(mode: UserInfoMode | undefined, jobTitle?: string | null, profile?: string | null) {
  const parts = mode === "job" ? [jobTitle] : mode === "profile" ? [profile] : mode === "both" ? [jobTitle, profile] : [];
  return parts.filter(Boolean).join(" · ");
}
/** v2: Minhas Pendências became visible by default; older saved configs drop it from hidden once. */
const CONFIG_VERSION = 2;
export function parseMenuConfig(raw?: string): MenuConfig {
  const defaults = MENU_ITEMS.map((i) => i.id);
  try {
    const parsed = JSON.parse(raw ?? "{}");
    const valid = (v: unknown): v is MenuId => defaults.some((id) => id === v);
    const order: MenuId[] = Array.isArray(parsed.order) ? parsed.order.filter(valid) : [];
    const hidden: MenuId[] = Array.isArray(parsed.hidden) ? parsed.hidden.filter(valid).filter((id: MenuId) => id !== "logout" && (parsed.v >= CONFIG_VERSION || id !== "pendentes")) : [];
    const userInfo: UserInfoMode = USER_INFO_OPTIONS.some((o) => o.key === parsed.userInfo) ? parsed.userInfo : "name";
    const unseen = OPTIONAL_IDS.filter((id) => !order.includes(id));
    return { order: [...new Set([...order, ...defaults])], hidden: [...new Set([...hidden, ...unseen])], v: CONFIG_VERSION, userInfo };
  } catch { return { order: defaults, hidden: [...OPTIONAL_IDS], v: CONFIG_VERSION, userInfo: "name" }; }
}
export function useMainMenuConfig() {
  return useQuery({ queryKey: ["cde-main-menu"], queryFn: async () => {
    const { data, error } = await supabase.from("cde_selected").select("variant_key").eq("group_key", "main_menu").eq("is_primary", true).maybeSingle();
    if (error) throw error;
    return parseMenuConfig(data?.variant_key);
  } });
}