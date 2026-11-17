import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AccessCapabilities } from "@/lib/access-management";

export const accessManagementOptions = queryOptions({
  queryKey: ["access-management-context"],
  staleTime: 30_000,
  queryFn: async (): Promise<AccessCapabilities> => {
    const { data: auth, error } = await supabase.auth.getUser();
    if (error || !auth.user) throw error ?? new Error("Sessão não encontrada");
    const id = auth.user.id;
    const [erp, roles, surveyUsers, surveyProfiles, mytosis, codeAccess] = await Promise.all([
      supabase.from("erp_admins").select("user_id").eq("user_id", id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", id).eq("role", "admin").maybeSingle(),
      supabase.rpc("has_site_survey_permission", { _user_id: id, _permission: "site_survey_usuarios" }),
      supabase.rpc("has_site_survey_permission", { _user_id: id, _permission: "site_survey_perfis" }),
      supabase.rpc("mytosis_role", { _user_id: id }),
      supabase.from("user_app_access").select("user_id").eq("user_id", id).eq("app_key", "development").maybeSingle(),
    ]);
    for (const result of [erp, roles, surveyUsers, surveyProfiles, mytosis, codeAccess]) if (result.error) throw result.error;
    return {
      erpAdmin: Boolean(erp.data), supplyAdmin: Boolean(roles.data),
      surveyUsers: Boolean(erp.data || surveyUsers.data), surveyProfiles: Boolean(erp.data || surveyProfiles.data),
      mytosisAdmin: mytosis.data === "admin", codeAdmin: Boolean(erp.data && codeAccess.data),
    };
  },
});