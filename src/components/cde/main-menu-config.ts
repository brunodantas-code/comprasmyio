import { ArrowLeft, BookOpen, ClipboardList, KeyRound, LayoutGrid, LifeBuoy, LogOut, Moon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MENU_ITEMS = [
  { id: "manual", label: "Manual do Usuário", icon: BookOpen },
  { id: "back", label: "Voltar", icon: ArrowLeft },
  { id: "theme", label: "Modo escuro", icon: Moon },
  { id: "password", label: "Alterar senha", icon: KeyRound },
  { id: "logout", label: "Sair", icon: LogOut },
  { id: "portal", label: "Todos os apps", icon: LayoutGrid, to: "/portal", optional: true },
  { id: "pendentes", label: "Minhas Pendências", icon: ClipboardList, to: "/pendentes", optional: true },
  { id: "chamados", label: "Abrir chamado (Code)", icon: LifeBuoy, to: "/chamados", optional: true },
] as const;
/** Optional entries start hidden until an admin enables them in the CDE. */
const OPTIONAL_IDS = MENU_ITEMS.filter((i) => "optional" in i).map((i) => i.id);
export type MenuId = typeof MENU_ITEMS[number]["id"];
export type MenuConfig = { order: MenuId[]; hidden: MenuId[] };
export function parseMenuConfig(raw?: string): MenuConfig {
  const defaults = MENU_ITEMS.map((i) => i.id);
  try {
    const parsed = JSON.parse(raw ?? "{}");
    const valid = (v: unknown): v is MenuId => defaults.some((id) => id === v);
    const order: MenuId[] = Array.isArray(parsed.order) ? parsed.order.filter(valid) : [];
    const hidden: MenuId[] = Array.isArray(parsed.hidden) ? parsed.hidden.filter(valid).filter((id: MenuId) => id !== "logout") : [];
    const unseen = OPTIONAL_IDS.filter((id) => !order.includes(id));
    return { order: [...new Set([...order, ...defaults])], hidden: [...new Set([...hidden, ...unseen])] };
  } catch { return { order: defaults, hidden: [...OPTIONAL_IDS] }; }
}
export function useMainMenuConfig() {
  return useQuery({ queryKey: ["cde-main-menu"], queryFn: async () => {
    const { data, error } = await supabase.from("cde_selected").select("variant_key").eq("group_key", "main_menu").eq("is_primary", true).maybeSingle();
    if (error) throw error;
    return parseMenuConfig(data?.variant_key);
  } });
}