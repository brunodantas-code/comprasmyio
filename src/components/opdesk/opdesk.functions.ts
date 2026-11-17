import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { taskValuesSchema, type OpdeskData, type Task, type TaskLog, type TaskAttachment } from "./task-model";

export const getOpdeskData = createServerFn({ method:"GET" }).middleware([requireSupabaseAuth]).handler(async ({context}):Promise<OpdeskData> => {
  const access=await context.supabase.rpc("opdesk_has_access");
  if (access.error || !access.data) throw new Error("Acesso negado ao OpDesk");
  const [tasks,clients,users,responsibles,observations]=await Promise.all([
    context.supabase.from("opdesk_tasks").select("*").order("task_number"),
    context.supabase.from("opdesk_clients").select("*").order("name"),
    context.supabase.rpc("opdesk_directory"),
    context.supabase.from("opdesk_responsibles").select("*"),
    context.supabase.from("opdesk_task_observations").select("*").order("created_at",{ascending:false}),
  ]);
  for (const r of [tasks,clients,users,responsibles,observations]) if (r.error) throw new Error(r.error.message);
  return {tasks:(tasks.data ?? []) as unknown as Task[],clients:clients.data ?? [],users:users.data ?? [],responsibleIds:(responsibles.data ?? []).map(r=>r.user_id),registrations:responsibles.data ?? [],observations:observations.data ?? [],userId:context.userId};
});
export const saveOpdeskTask = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(input=>z.object({id:z.string().uuid().nullable(),values:taskValuesSchema,expected:z.string().nullable()}).parse(input)).handler(async ({data,context}) => {
  const result=data.id
    ? await context.supabase.rpc("opdesk_save_task",{_id:data.id,_values:data.values,_expected_updated_at:data.expected ?? undefined})
    : await context.supabase.rpc("opdesk_create_task",{_values:data.values});
  if(result.error) throw new Error(result.error.message);
  return result.data as unknown as Task;
});
export const deleteOpdeskTask = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(input=>z.object({id:z.string().uuid(),expected:z.string()}).parse(input)).handler(async ({data,context}) => {
  const result=await context.supabase.rpc("opdesk_delete_task",{_id:data.id,_expected_updated_at:data.expected});
  if(result.error) throw new Error(result.error.message); return {ok:true};
});
export const addOpdeskObservation = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(input=>z.object({id:z.string().uuid(),text:z.string().trim().min(1).max(6000)}).parse(input)).handler(async ({data,context}) => {
  const result=await context.supabase.rpc("opdesk_add_observation",{_task_id:data.id,_text:data.text});
  if(result.error) throw new Error(result.error.message); return {id:result.data};
});
export const getOpdeskTaskDetails = createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).inputValidator(input=>z.object({id:z.string().uuid()}).parse(input)).handler(async ({data,context}):Promise<{logs:TaskLog[];attachments:TaskAttachment[]}> => {
  const task=await context.supabase.from("opdesk_tasks").select("id").eq("id",data.id).maybeSingle();
  if(task.error || !task.data) throw new Error("Tarefa não encontrada");
  const [logs,attachments]=await Promise.all([context.supabase.from("opdesk_task_logs").select("*").eq("task_id",data.id).order("created_at",{ascending:false}),context.supabase.from("opdesk_task_attachments").select("*").eq("task_id",data.id).order("created_at",{ascending:false})]);
  for(const r of [logs,attachments]) if(r.error) throw new Error(r.error.message);
  return {logs:logs.data ?? [],attachments:attachments.data ?? []};
});
export const saveOpdeskClient = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(input=>z.object({id:z.string().uuid().nullable(),name:z.string().trim().min(1).max(180)}).parse(input)).handler(async ({data,context})=>{
  const result=data.id ? await context.supabase.from("opdesk_clients").update({name:data.name}).eq("id",data.id).select("*").single() : await context.supabase.from("opdesk_clients").insert({name:data.name,created_by:context.userId}).select("*").single();
  if(result.error)throw new Error(result.error.message);return result.data;
});
export const removeOpdeskClient = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(input=>z.object({id:z.string().uuid()}).parse(input)).handler(async ({data,context})=>{
  const result=await context.supabase.from("opdesk_clients").delete().eq("id",data.id).select("id");if(result.error)throw new Error(result.error.message);if(!result.data?.length)throw new Error("Sem acesso ao cliente");return {ok:true};
});
export const setOpdeskResponsible = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(input=>z.object({userId:z.string().uuid(),registered:z.boolean()}).parse(input)).handler(async ({data,context})=>{
  if(!data.registered){const result=await context.supabase.rpc("opdesk_remove_responsible",{_user_id:data.userId});if(result.error)throw new Error(result.error.message);return {ok:true};}
  const result=await context.supabase.from("opdesk_responsibles").insert({user_id:data.userId}).select("user_id");
  if(result.error)throw new Error(result.error.message);if(!result.data?.length)throw new Error("Sem acesso ao responsável");return {ok:true};
});