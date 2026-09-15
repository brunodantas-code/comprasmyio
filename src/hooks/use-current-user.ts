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

export type AccessProfile = string;
export type AccessProfileBase = "admin" | "padrao" | "restrito";
export type MenuKey =
  | "solicitacoes" | "solicitacoes_minhas" | "solicitacoes_novas"
  | "approvals" | "approvals_pendentes" | "approvals_meus" | "approvals_todos" | "approvals_consolidado"
  | "armazem" | "armazem_fabrica" | "armazem_estoque_myio" | "armazem_expedicao" | "armazem_homologacao"
  | "armazem_transporte" | "armazem_cliente" | "armazem_tecnico" | "armazem_perdido" | "armazem_itens_avariados"
  | "armazem_checar_qr" | "armazem_almoxarifado" | "armazem_ferramentas_ativos"
  | "cadastro" | "cadastro_projetos" | "cadastro_clientes" | "cadastro_centros" | "cadastro_cargos" | "cadastro_lembretes" | "cadastro_diversos"
  | "usuarios" | "usuarios_lista" | "usuarios_acesso_restrito" | "usuarios_workflow" | "usuarios_logs" | "usuarios_backup";

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
        supabase.from("user_access_profiles").select("profile,profile_definition_id,is_customized,access_profile_definitions(name,base_profile,access_profile_permissions(menu_key,allowed))").eq("user_id", user.id).maybeSingle(),
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
      const definition = accessData?.access_profile_definitions as { name: string; base_profile: AccessProfileBase; access_profile_permissions?: Array<{ menu_key: string; allowed: boolean }> } | null | undefined;
      const isCustomized = accessData?.is_customized ?? true;
      const accessProfile = (isCustomized ? "customizado" : accessData?.profile_definition_id ?? "restrito") as AccessProfile;
      const accessProfileBase = (definition?.base_profile ?? accessData?.profile ?? "restrito") as AccessProfileBase;
      const individualMenus = new Set((menuData ?? []).filter((item) => item.allowed).map((item) => item.menu_key));
      const profileMenus = new Set((definition?.access_profile_permissions ?? []).filter((item) => item.allowed).map((item) => item.menu_key));
      const canAccess = (menu: MenuKey) => {
        if (accessProfileBase === "admin") return true;
        return (isCustomized ? individualMenus : profileMenus).has(menu);
      };
      return {
        id: user.id,
        email: user.email ?? "",
        full_name: profile?.full_name ?? "",
        roles,
        jobTitle,
        accessProfile,
        accessProfileBase,
        accessProfileName: isCustomized ? "Customizado" : definition?.name ?? "Restrito",
        canAccess,
        isAdmin: accessProfileBase === "admin",
        isComprador: titleKey === "supply" || titleKey === "time de supply",
        isFabrica: titleKey === "fabrica",
        isEstoquista: titleKey === "estoquista",
        isFinanceiro: titleKey === "financeiro",
        canCreateProjects: accessProfileBase === "admin" || ["ceo", "coo", "cfo"].includes(titleKey),
      };
    },
  });
}