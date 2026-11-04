import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MytosisLink, MytosisNode } from "@/lib/mytosis";
import { resolveDefaultFormat } from "@/lib/mytosis-format";
import type { BoxTask } from "@/lib/mytosis-tasks";

export type MytosisUser = { id: string; full_name: string; email: string | null };

export function useMytosisData() {
  return useQuery({
    queryKey: ["mytosis"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const [nodes, links, settings, users, role, tasks, attachments] = await Promise.all([
        supabase.from("mytosis_nodes").select("id,locator,kind,title,description,parent_id,responsible_id,due_date,weight,progress,position,created_at,is_process,shape,fill_color,border_color,title_font_size,title_color,control_color,description_font_size,text_align,text_vertical_align,custom_format,linked_node_id").order("locator"),
        supabase.from("mytosis_links").select("predecessor_id,successor_id,style,color"),
        supabase.from("mytosis_settings").select("box_width,box_height,box_format").eq("id", 1).maybeSingle(),
        supabase.rpc("mytosis_users"),
        supabase.rpc("mytosis_role", { _user_id: auth.user?.id ?? "" }),
        supabase.from("mytosis_tasks").select("*").order("created_at"),
        supabase.from("mytosis_node_attachments").select("node_id"),
      ]);
      if (nodes.error) throw nodes.error;
      if (links.error) throw links.error;
      if (tasks.error) throw tasks.error;
      if (attachments.error) throw attachments.error;
      return {
        attachmentNodeIds: [...new Set((attachments.data ?? []).map((file) => file.node_id))],
        userId: auth.user?.id ?? "",
        tasks: (tasks.data ?? []) as BoxTask[],
        nodes: (nodes.data ?? []).map((n) => ({ ...n, weight: Number(n.weight), progress: Number(n.progress) })) as MytosisNode[],
        links: (links.data ?? []) as MytosisLink[],
        box: { width: settings.data?.box_width ?? 240, height: settings.data?.box_height ?? 96 },
        defaultFormat: resolveDefaultFormat(settings.data?.box_format),
        users: (users.data ?? []) as MytosisUser[],
        role: (role.data as string | null) ?? null,
      };
    },
  });
}

export type MytosisData = NonNullable<ReturnType<typeof useMytosisData>["data"]>;

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;
