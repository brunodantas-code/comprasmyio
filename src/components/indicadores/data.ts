import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
export type Objective = Database["public"]["Tables"]["indicadores_objectives"]["Row"];
export type Metric = Database["public"]["Tables"]["indicadores_metrics"]["Row"];
export type Cycle = Database["public"]["Tables"]["indicadores_cycles"]["Row"];
export type Checkin = Database["public"]["Tables"]["indicadores_checkins"]["Row"];
export const indicadoresOptions = queryOptions({
  queryKey: ["indicadores"],
  queryFn: async () => {
    const auth = await supabase.auth.getUser();
    if (!auth.data.user) throw new Error("Sessão não encontrada");
    const [objectives, metrics, cycles, checkins, users, role] = await Promise.all([
      supabase.from("indicadores_objectives").select("*").order("created_at"),
      supabase.from("indicadores_metrics").select("*").order("created_at"),
      supabase.from("indicadores_cycles").select("*").order("starts_on", { ascending: false }),
      supabase.from("indicadores_checkins").select("*").order("recorded_at", { ascending: false }),
      supabase.rpc("indicadores_users"),
      supabase.rpc("indicadores_role", { _user_id: auth.data.user.id }),
    ]);
    for (const r of [objectives, metrics, cycles, checkins, users, role])
      if (r.error) throw r.error;
    return {
      objectives: objectives.data ?? [],
      metrics: metrics.data ?? [],
      cycles: cycles.data ?? [],
      checkins: checkins.data ?? [],
      users: users.data ?? [],
      role: role.data,
      userId: auth.data.user.id,
    };
  },
});
export type IndicadoresData = Awaited<ReturnType<NonNullable<typeof indicadoresOptions.queryFn>>>;
