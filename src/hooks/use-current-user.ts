import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "admin"
  | "comprador"
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

const normalizeTitle = (value: string | null | undefined) =>
  (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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
      let jobTitle: { id: string; name: string } | null = null;
      if (profile?.job_title_id) {
        const { data: title } = await supabase
          .from("job_titles")
          .select("id,name")
          .eq("id", profile.job_title_id)
          .maybeSingle();
        jobTitle = title ?? null;
      }
      const titleKey = normalizeTitle(jobTitle?.name);
      const accessProfile = (accessData?.profile ?? "restrito") as AccessProfile;
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
        jobTitle,
        accessProfile,
        canAccess,
        isAdmin: accessProfile === "admin",
        isComprador: titleKey === "supply" || titleKey === "time de supply",
        isFabrica: titleKey === "fabrica",
        isEstoquista: titleKey === "estoquista",
        isFinanceiro: titleKey === "financeiro",
        canCreateProjects: accessProfile === "admin" || ["ceo", "coo", "cfo"].includes(titleKey),
      };
    },
  });
}