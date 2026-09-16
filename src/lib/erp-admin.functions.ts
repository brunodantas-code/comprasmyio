import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const appKeySchema = z.enum(["supply", "cash_flow", "crm", "legal", "rh", "development"]);

async function assertErpAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("erp_admins")
    .select("user_id")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error || !data) throw new Error("Somente Admins do ERP podem realizar esta ação.");
}

export const getErpUsersAndAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertErpAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profiles, error: profilesError }, { data: accesses, error: accessError }, { data: admins, error: adminsError }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, email").is("deleted_at", null).order("full_name"),
      supabaseAdmin.from("user_app_access").select("user_id, app_key"),
      supabaseAdmin.from("erp_admins").select("user_id"),
    ]);
    if (profilesError) throw profilesError;
    if (accessError) throw accessError;
    if (adminsError) throw adminsError;
    return {
      users: profiles ?? [],
      accesses: accesses ?? [],
      adminIds: (admins ?? []).map((admin) => admin.user_id),
    };
  });

export const setErpAppAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid(), appKey: appKeySchema, allowed: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertErpAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.allowed) {
      const { error } = await supabaseAdmin.from("user_app_access").upsert(
        { user_id: data.userId, app_key: data.appKey, granted_by: context.userId },
        { onConflict: "user_id,app_key" },
      );
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("user_app_access")
        .delete()
        .eq("user_id", data.userId)
        .eq("app_key", data.appKey);
      if (error) throw error;
    }
    return { ok: true };
  });
