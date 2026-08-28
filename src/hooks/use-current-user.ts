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
  | "cto";

export const ADMIN_ROLES: AppRole[] = ["admin", "coo", "ceo", "cfo", "cto"];

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;

      const [{ data: profile }, { data: rolesData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      const roles = (rolesData ?? []).map((r) => r.role as AppRole);
      return {
        id: user.id,
        email: user.email ?? "",
        full_name: profile?.full_name ?? "",
        roles,
        isAdmin: roles.some((r) => ADMIN_ROLES.includes(r)),
        isComprador: roles.includes("comprador"),
        isSolicitante: roles.includes("solicitante"),
        isFabrica: roles.includes("fabrica"),
        isEstoquista: roles.includes("estoquista"),
      };
    },
  });
}