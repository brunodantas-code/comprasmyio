import { ArrowLeft, BookOpen, KeyRound, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MENU_ITEMS = [
  { id: "manual", label: "Manual do Usuário", icon: BookOpen },
  { id: "back", label: "Voltar", icon: ArrowLeft },
  { id: "password", label: "Alterar senha", icon: KeyRound },
  { id: "logout", label: "Sair", icon: LogOut },
] as const;
export type MenuId = typeof MENU_ITEMS[number]["id"];
export type MenuConfig = { order: MenuId[]; hidden: MenuId[] };
export function parseMenuConfig(raw?: string): MenuConfig {
  const defaults = MENU_ITEMS.map((i) => i.id);
  try {
    const parsed = JSON.parse(raw ?? "{}");
    const valid = (v: unknown): v is MenuId => defaults.some((id) => id === v);
    const order: MenuId[] = Array.isArray(parsed.order) ? parsed.order.filter(valid) : [];
    const hidden: MenuId[] = Array.isArray(parsed.hidden) ? parsed.hidden.filter(valid).filter((id: MenuId) => id !== "logout") : [];
    return { order: [...new Set([...order, ...defaults])], hidden: [...new Set(hidden)] };
  } catch { return { order: defaults, hidden: [] }; }
}
export function useMainMenuConfig() {
  return useQuery({ queryKey: ["cde-main-menu"], queryFn: async () => {
    const { data, error } = await supabase.from("cde_selected").select("variant_key").eq("group_key", "main_menu").eq("is_primary", true).maybeSingle();
    if (error) throw error;
    return parseMenuConfig(data?.variant_key);
  } });
}