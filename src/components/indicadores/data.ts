import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
export type Objective = Database["public"]["Tables"]["indicadores_objectives"]["Row"];
export type Metric = Database["public"]["Tables"]["indicadores_metrics"]["Row"];
export type Cycle = Database["public"]["Tables"]["indicadores_cycles"]["Row"];
export type Checkin = Database["public"]["Tables"]["indicadores_checkins"]["Row"];
async function allCheckins() {
  const data: Checkin[] = [];
  for (let start = 0; ; start += 500) {
    const result = await supabase.from('indicadores_checkins').select('*').order('recorded_at', { ascending: false }).order('id').range(start, start + 499);
    if (result.error) throw result.error;
    data.push(...result.data);
    if (result.data.length < 500) break;
  }
  return { data, error: null };
}
export const indicadoresOptions = queryOptions({
  queryKey: ["indicadores"],
  queryFn: async () => {
    const auth = await supabase.auth.getUser();
    if (!auth.data.user) throw new Error("Sessão não encontrada");
    const [objectives, metrics, cycles, checkins, users, role, imported] = await Promise.all([
      supabase.from("indicadores_objectives").select("*").order("created_at"),
      supabase.from("indicadores_metrics").select("*").order("created_at"),
      supabase.from("indicadores_cycles").select("*").order("starts_on", { ascending: false }),
      allCheckins(),
      supabase.rpc("indicadores_users"),
      supabase.rpc("indicadores_role", { _user_id: auth.data.user.id }),
      supabase.from('indicadores_import_records').select('*').in('source_table', ['dimensions','team_members','team_member_dimensions','objective_owners','meetings','meeting_participants','profiles']),
    ]);
    for (const r of [objectives, metrics, cycles, checkins, users, role, imported])
      if (r.error) throw r.error;
    return {
      objectives: objectives.data ?? [],
      metrics: metrics.data ?? [],
      cycles: cycles.data ?? [],
      checkins: checkins.data ?? [],
      users: users.data ?? [],
      role: role.data,
      imported: imported.data ?? [],
      userId: auth.data.user.id,
    };
  },
});
export type IndicadoresData = Awaited<ReturnType<NonNullable<typeof indicadoresOptions.queryFn>>>;
