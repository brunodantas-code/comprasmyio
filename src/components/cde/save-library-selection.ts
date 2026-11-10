import { supabase } from "@/integrations/supabase/client";

/** JSON belongs in the request body, never in a URL filter. */
export async function saveLibrarySelection(group: "button_bindings" | "button_library_retired", variantKey: string, userId: string, exists: boolean) {
  const payload = { variant_key: variantKey, chosen_by: userId };
  const request = exists
    ? supabase.from("cde_selected").update(payload).eq("group_key", group).eq("is_primary", true)
    : supabase.from("cde_selected").insert({ ...payload, group_key: group, is_primary: true });
  const { data, error } = await request.select("group_key").single();
  if (error) throw error;
  if (!data) throw new Error("A alteração não foi salva. Atualize a página e tente novamente.");
}