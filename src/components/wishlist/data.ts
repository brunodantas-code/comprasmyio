import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const wishlistOptions = (userId: string) => queryOptions({
  queryKey: ["wishlist", userId],
  queryFn: async () => {
    const [ideas, messages, steps, users, admin] = await Promise.all([
      supabase.from("wishlist_ideas").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("wishlist_messages").select("*").order("created_at"),
      supabase.from("wishlist_roadmap_steps").select("*").is("deleted_at", null).order("position").order("created_at"),
      supabase.rpc("wishlist_users"),
      supabase.from("erp_admins").select("user_id").eq("user_id", userId).maybeSingle(),
    ]);
    if (ideas.error) throw ideas.error;
    if (messages.error) throw messages.error;
    if (steps.error) throw steps.error;
    if (users.error) throw users.error;
    if (admin.error) throw admin.error;
    return { ideas: ideas.data, messages: messages.data, steps: steps.data, users: users.data, isAdmin: Boolean(admin.data) };
  },
  refetchInterval: 30000,
});