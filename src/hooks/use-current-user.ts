import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "admin"
  | "comprador"
  | "solicitante"
  | "fabrica"
  | "estoquista"
  | "coo"
  | "ceo"
  | "cfo"
  | "cto"
  | "financeiro";

export type AccessProfile = "admin" | "padrao" | "restrito";
export type MenuKey = "solicitacoes" | "approvals" | "armazem" | "cadastro" | "usuarios";

export const ADMIN_ROLES: AppRole[] = ["admin", "coo", "ceo", "cfo", "cto"];

/** Somente CEO, COO e CFO (além do admin técnico) podem cadastrar projetos. */
export const PROJECT_CREATOR_ROLES: AppRole[] = ["admin", "ceo", "coo", "cfo"];

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;

      const [{ data: profile }, { data: rolesData }, { data: accessData }, { data: menuData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("user_access_profiles").select("profile").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_menu_permissions").select("menu_key, allowed").eq("user_id", user.id),
      ]);

      const roles = (rolesData ?? []).map((r) => r.role as AppRole);
      const accessProfile = (accessData?.profile ?? "padrao") as AccessProfile;
      const restrictedMenus = new Set((menuData ?? []).filter((item) => item.allowed).map((item) => item.menu_key));
      const canAccess = (menu: MenuKey) => {
        if (accessProfile === "admin") return true;
        if (accessProfile === "padrao") return menu !== "cadastro" && menu !== "usuarios";
        return restrictedMenus.has(menu);
      };
      return {
        id: user.id,
        email: user.email ?? "",
        full_name: profile?.full_name ?? "",
        roles,
        accessProfile,
        canAccess,
        isAdmin: accessProfile === "admin",
        isComprador: roles.includes("comprador"),
        isSolicitante: roles.includes("solicitante"),
        isFabrica: roles.includes("fabrica"),
        isEstoquista: roles.includes("estoquista"),
        isFinanceiro: roles.includes("financeiro"),
        canCreateProjects: roles.some((r) => PROJECT_CREATOR_ROLES.includes(r)),
      };
    },
  });
}