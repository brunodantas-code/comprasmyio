import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const accessProfileSchema = z.enum(["admin", "padrao", "restrito"]);

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("user_id")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Somente usuários Admin podem realizar esta ação.");
}

export const setUserAccessProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid(), profile: accessProfileSchema }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id, deleted_at")
      .eq("id", data.userId)
      .maybeSingle();
    if (targetError || !target || target.deleted_at) throw new Error("Usuário não encontrado ou excluído.");

    if (data.profile === "admin") {
      const { count, error: countError } = await supabaseAdmin
        .from("user_access_profiles")
        .select("user_id, profiles!inner(deleted_at)", { count: "exact", head: true })
        .eq("profile", "admin")
        .is("profiles.deleted_at", null)
        .neq("user_id", data.userId);
      if (countError) throw countError;
      if ((count ?? 0) >= 2) throw new Error("O limite de dois usuários com perfil Admin foi atingido.");
    }

    const { error: profileError } = await supabaseAdmin
      .from("user_access_profiles")
      .upsert({ user_id: data.userId, profile: data.profile }, { onConflict: "user_id" });
    if (profileError) throw profileError;

    if (data.profile === "admin") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
      if (error) throw error;
    }
    return { ok: true };
  });

export const requestUserDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Você não pode solicitar a exclusão da sua própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id, deleted_at")
      .eq("id", data.userId)
      .maybeSingle();
    if (targetError || !target || target.deleted_at) throw new Error("Usuário não encontrado ou já excluído.");

    const { data: pending } = await supabaseAdmin
      .from("user_deletion_requests")
      .select("id")
      .eq("target_user_id", data.userId)
      .in("status", ["pendente", "aprovada"])
      .maybeSingle();
    if (pending) throw new Error("Já existe uma exclusão pendente para este usuário.");

    const { error } = await supabaseAdmin.from("user_deletion_requests").insert({
      target_user_id: data.userId,
      requested_by: context.userId,
    });
    if (error) throw error;
    return { ok: true };
  });

export const decideUserDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ requestId: z.string().uuid(), approve: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: request, error: requestError } = await supabaseAdmin
      .from("user_deletion_requests")
      .select("id, target_user_id, requested_by, status")
      .eq("id", data.requestId)
      .maybeSingle();
    if (requestError || !request) throw new Error("Solicitação não encontrada.");
    if (request.status !== "pendente") throw new Error("Esta solicitação já foi decidida.");
    if (request.requested_by === context.userId) throw new Error("A exclusão deve ser autorizada por outro Admin.");

    if (!data.approve) {
      const { error } = await supabaseAdmin
        .from("user_deletion_requests")
        .update({ status: "rejeitada", decided_by: context.userId, decided_at: new Date().toISOString() })
        .eq("id", data.requestId)
        .eq("status", "pendente");
      if (error) throw error;
      return { ok: true, status: "rejeitada" as const };
    }

    const decidedAt = new Date().toISOString();
    const { error: approveError } = await supabaseAdmin
      .from("user_deletion_requests")
      .update({ status: "aprovada", decided_by: context.userId, decided_at: decidedAt })
      .eq("id", data.requestId)
      .eq("status", "pendente");
    if (approveError) throw approveError;

    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(request.target_user_id, {
      ban_duration: "876000h",
    });
    if (banError) {
      await supabaseAdmin.from("user_deletion_requests").update({ status: "falhou", failure_reason: banError.message }).eq("id", data.requestId);
      throw new Error("Não foi possível remover o acesso do usuário.");
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ deleted_at: new Date().toISOString(), deleted_by: context.userId })
      .eq("id", request.target_user_id);
    if (profileError) throw profileError;

    await Promise.all([
      supabaseAdmin.from("user_roles").delete().eq("user_id", request.target_user_id),
      supabaseAdmin.from("user_menu_permissions").delete().eq("user_id", request.target_user_id),
      supabaseAdmin.from("user_access_profiles").delete().eq("user_id", request.target_user_id),
    ]);
    const { error: completeError } = await supabaseAdmin
      .from("user_deletion_requests")
      .update({ status: "executada", completed_at: new Date().toISOString() })
      .eq("id", data.requestId);
    if (completeError) throw completeError;
    return { ok: true, status: "executada" as const };
  });