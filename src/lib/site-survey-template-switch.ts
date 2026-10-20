import { supabase } from "@/integrations/supabase/client";

type Q = { id: string; prompt: string; question_key?: string | null };
const norm = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Mapeia perguntas do checklist antigo para o novo pela chave fixa ou pelo mesmo enunciado. */
export function matchTemplateQuestions(oldQuestions: Q[], newQuestions: Q[]): Map<string, string> {
  const byKey = new Map<string, string>(); const byPrompt = new Map<string, string>();
  for (const q of newQuestions) { if (q.question_key) byKey.set(q.question_key, q.id); const p = norm(q.prompt); if (p && !byPrompt.has(p)) byPrompt.set(p, q.id); }
  const result = new Map<string, string>();
  for (const q of oldQuestions) {
    const target = (q.question_key && byKey.get(q.question_key)) || byPrompt.get(norm(q.prompt));
    if (target && target !== q.id) result.set(q.id, target);
  }
  return result;
}

/** Copia respostas e fotos equivalentes ao trocar o checklist de um ponto, sem apagar as originais. */
export async function carryAnswersToTemplate(params: { visitId: string; kind: "luc" | "environment"; pointId: string; fromTemplateId: string | null; toTemplateId: string | null; userId: string }): Promise<number> {
  const { visitId, kind, pointId, fromTemplateId, toTemplateId, userId } = params;
  if (!fromTemplateId || !toTemplateId || fromTemplateId === toTemplateId) return 0;
  const { data: sections, error: sErr } = await supabase.from("site_survey_sections").select("id,template_id").in("template_id", [fromTemplateId, toTemplateId]);
  if (sErr) throw sErr;
  const oldIds = (sections ?? []).filter((s) => s.template_id === fromTemplateId).map((s) => s.id);
  const newIds = (sections ?? []).filter((s) => s.template_id === toTemplateId).map((s) => s.id);
  if (!oldIds.length || !newIds.length) return 0;
  const { data: questions, error: qErr } = await supabase.from("site_survey_questions").select("id,prompt,question_key,section_id").in("section_id", [...oldIds, ...newIds]);
  if (qErr) throw qErr;
  const map = matchTemplateQuestions((questions ?? []).filter((q) => oldIds.includes(q.section_id)), (questions ?? []).filter((q) => newIds.includes(q.section_id) && q.active !== false));
  if (!map.size) return 0;
  const column = kind === "luc" ? "visit_luc_id" : "visit_environment_id";
  const { data: responses, error: rErr } = await supabase.from("site_survey_responses").select("question_id,answer,question_snapshot").eq("visit_id", visitId).eq(column, pointId);
  if (rErr) throw rErr;
  const existing = new Set((responses ?? []).map((r) => r.question_id));
  const rows = (responses ?? []).filter((r) => map.has(r.question_id) && !existing.has(map.get(r.question_id)!)).map((r) => ({ visit_id: visitId, question_id: map.get(r.question_id)!, answer: r.answer, question_snapshot: r.question_snapshot, answered_by: userId, [column]: pointId }));
  if (rows.length) { const { error } = await supabase.from("site_survey_responses").insert(rows as never); if (error) throw error; }
  const { data: photos, error: aErr } = await supabase.from("site_survey_attachments").select("id,question_id").eq("visit_id", visitId).eq(column, pointId).in("question_id", [...map.keys()]);
  if (aErr) throw aErr;
  for (const photo of photos ?? []) { const { error } = await supabase.from("site_survey_attachments").update({ question_id: map.get(photo.question_id!)! }).eq("id", photo.id); if (error) throw error; }
  return rows.length;
}
