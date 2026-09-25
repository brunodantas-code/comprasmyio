import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileChartColumn, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { TimeAssumption } from "@/components/site-survey-time-assumptions";

type Visit = { id: string; survey_number: number; client_id: string | null; client_unit_id: string | null; project_id: string | null; technician_id: string; status: string; scheduled_start: string; scheduled_end: string | null; address: string; contact_name: string | null; contact_phone: string | null; notes: string | null; started_at: string | null; completed_at: string | null };
type Named = { id: string; name: string };
type Question = { id: string; section_id: string; prompt: string };
type Section = { id: string; title: string; position: number };
type Profile = { id: string; full_name: string };
type Point = { id: string; label: string; started_at: string | null; completed_at: string | null; completion_status: string; kind: "luc" | "environment" };
type ReportResponse = { id: string; question_id: string; answer: unknown };
type RichPart = { text: string; bold?: boolean };
type PointSummary = { title: string; parts: RichPart[]; questionIds: Set<string> };

const valueText = (answer: unknown): string => {
  if (answer && typeof answer === "object" && !Array.isArray(answer) && "value" in answer) { const item = answer as { value: unknown; detail?: unknown }; return [valueText(item.value), typeof item.detail === "string" ? item.detail : ""].filter(Boolean).join(" — "); }
  return Array.isArray(answer) ? answer.join(", ") : String(answer ?? "");
};
const durationMinutes = (start: string | null, end: string | null) => start && end ? Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)) : null;
const formatMinutes = (minutes: number | null) => minutes === null ? "Incompleto" : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}min`;
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
const ensurePeriod = (value: string) => /[.!?]$/.test(value.trim()) ? value.trim() : `${value.trim()}.`;
const findAnswer = (responses: ReportResponse[], questions: Question[], terms: string[]) => {
  const response = responses.find((item) => { const prompt = normalize(questions.find((question) => question.id === item.question_id)?.prompt ?? ""); return terms.some((term) => prompt.includes(term)); });
  return response ? { id: response.question_id, value: valueText(response.answer).trim() } : null;
};
const buildPointSummaries = (responses: ReportResponse[], questions: Question[], sections: Section[]): PointSummary[] => {
  const summaries: PointSummary[] = [];
  const used = new Set<string>();
  const addKnown = (title: string, definitions: Array<{ terms: string[]; before: string; after?: string; format?: (value: string) => string }>) => {
    const parts: RichPart[] = [];
    const ids = new Set<string>();
    for (const definition of definitions) {
      const found = findAnswer(responses, questions, definition.terms);
      if (!found?.value) continue;
      parts.push({ text: definition.before }, { text: definition.format ? definition.format(found.value) : found.value, bold: true }, { text: definition.after ?? ". " });
      ids.add(found.id); used.add(found.id);
    }
    if (parts.length) summaries.push({ title, parts, questionIds: ids });
  };
  addKnown("Hidráulica", [
    { terms: ["localizacao do hidrometro"], before: "O hidrômetro encontra-se em ", after: ", " },
    { terms: ["dificuldade de acesso"], before: "O hidrômetro possui acesso ", after: ". ", format: (value) => value.toLocaleLowerCase("pt-BR") },
    { terms: ["saida pulsada"], before: "A saída pulsada está ", after: " e ", format: (value) => (value.split("—").at(-1) ?? value).trim().toLocaleLowerCase("pt-BR") },
    { terms: ["vazao nominal"], before: "a vazão nominal é de ", after: ". " },
    { terms: ["sentido do fluxo"], before: "O sentido do fluxo de água foi classificado como ", after: ". " },
    { terms: ["tipo de flange"], before: "O flange é do tipo ", after: ". " },
    { terms: ["tipo de registro existente"], before: "O registro existente é do tipo ", after: ". " },
    { terms: ["condicao do registro"], before: "O registro encontra-se ", after: ". " },
    { terms: ["complexidade dessa instalacao", "complexidade da instalacao"], before: "A instalação é de complexidade ", after: "." },
  ]);
  addKnown("Elétrica", [
    { terms: ["localizacao do quadro eletrico", "localizacao do ponto eletrico"], before: "O quadro ou ponto elétrico encontra-se em ", after: ". " },
    { terms: ["ponto eletrico proximo"], before: "A disponibilidade de ponto elétrico próximo foi informada como ", after: ". " },
    { terms: ["bitola do cabo"], before: "A bitola do cabo de alimentação de entrada é ", after: ". " },
    { terms: ["amperagem do disjuntor"], before: "A amperagem do disjuntor de entrada é ", after: ". " },
    { terms: ["encaminhamento eletrico"], before: "O encaminhamento elétrico previsto é ", after: ". " },
    { terms: ["complexidade eletrica"], before: "A instalação elétrica é de complexidade ", after: "." },
  ]);
  const remaining = responses.filter((response) => !used.has(response.question_id) && valueText(response.answer).trim());
  for (const section of [...sections].sort((left, right) => left.position - right.position)) {
    const entries = remaining.filter((response) => questions.find((question) => question.id === response.question_id)?.section_id === section.id);
    if (!entries.length) continue;
    const parts: RichPart[] = [];
    for (const entry of entries) {
      const prompt = questions.find((question) => question.id === entry.question_id)?.prompt ?? "Informação";
      parts.push({ text: `${ensurePeriod(prompt).replace(/[.!?]$/, "")}: ` }, { text: ensurePeriod(valueText(entry.answer)), bold: true }, { text: " " });
    }
    summaries.push({ title: section.title, parts, questionIds: new Set(entries.map((entry) => entry.question_id)) });
  }
  return summaries;
};
const imageDataUrl = async (url: string) => new Promise<string>((resolve, reject) => {
  const image = new Image(); image.crossOrigin = "anonymous";
  image.onload = () => { const canvas = document.createElement("canvas"); const scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight)); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale)); const context = canvas.getContext("2d"); if (!context) return reject(new Error("Não foi possível preparar a foto.")); context.drawImage(image, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL("image/jpeg", 0.78)); };
  image.onerror = () => reject(new Error("Não foi possível carregar uma foto do relatório.")); image.src = url;
});
const calculateWorkedTime = (points: Point[]) => {
  const byDay = new Map<string, Array<[number, number]>>();
  for (const point of points) {
    if (!point.started_at || !point.completed_at) continue;
    let cursor = new Date(point.started_at);
    const end = new Date(point.completed_at);
    while (cursor < end) {
      const dayEnd = new Date(cursor); dayEnd.setHours(24, 0, 0, 0);
      const segmentEnd = new Date(Math.min(dayEnd.getTime(), end.getTime()));
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
      byDay.set(key, [...(byDay.get(key) ?? []), [cursor.getTime(), segmentEnd.getTime()]]);
      cursor = segmentEnd;
    }
  }
  let worked = 0; let overtime = 0; let night = 0;
  for (const ranges of byDay.values()) {
    const merged: Array<[number, number]> = [];
    for (const range of ranges.sort((left, right) => left[0] - right[0])) {
      const previous = merged.at(-1);
      if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]); else merged.push([...range]);
    }
    const daily = merged.reduce((total, [start, end]) => total + (end - start) / 60000, 0);
    worked += daily; overtime += Math.max(0, daily - 480);
    for (const [start, end] of merged) {
      const date = new Date(start); const midnight = new Date(date); midnight.setHours(0, 0, 0, 0);
      const five = midnight.getTime() + 5 * 3600000; const twentyTwo = midnight.getTime() + 22 * 3600000;
      night += Math.max(0, Math.min(end, five) - start) / 60000;
      night += Math.max(0, end - Math.max(start, twentyTwo)) / 60000;
    }
  }
  return { worked: Math.round(worked), overtime: Math.round(overtime), night: Math.round(night) };
};

export function SiteSurveyReportButton({ visit, clients, units, projects, technicians, questions, sections, assumptions, iconOnly = true }: { visit: Visit; clients: Named[]; units: Named[]; projects: Named[]; technicians: Profile[]; questions: Question[]; sections: Section[]; assumptions: TimeAssumption[]; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [deadlineDays, setDeadlineDays] = useState("1");
  const { data, isLoading } = useQuery({ queryKey: ["site-survey-report", visit.id], enabled: open, queryFn: async () => {
    const [{ data: lucs, error: lucError }, { data: environments, error: envError }, { data: responses, error: responseError }, { data: attachments, error: attachmentError }, { data: calls, error: callError }, { data: visitTechs }] = await Promise.all([
      supabase.from("site_survey_visit_lucs").select("id,luc_number,shop_name,started_at,completed_at,completion_status").eq("visit_id", visit.id).eq("active", true).order("luc_number"),
      supabase.from("site_survey_visit_environments").select("id,name,started_at,completed_at,completion_status").eq("visit_id", visit.id).eq("active", true).order("name"),
      supabase.from("site_survey_responses").select("id,question_id,visit_luc_id,visit_environment_id,answer").eq("visit_id", visit.id),
      supabase.from("site_survey_attachments").select("id,visit_luc_id,visit_environment_id,file_name,storage_path,content_type,attachment_kind").eq("visit_id", visit.id).order("created_at"),
      supabase.from("site_survey_generated_calls").select("id,visit_luc_id,visit_environment_id,status,internal_calls(call_number,title,description,status)").eq("visit_id", visit.id),
      supabase.from("site_survey_visit_technicians").select("technician_id").eq("visit_id", visit.id),
    ]);
    const error = lucError ?? envError ?? responseError ?? attachmentError ?? callError; if (error) throw error;
    const points: Point[] = [...(lucs ?? []).map((item) => ({ id: item.id, label: `LUC ${item.luc_number} — ${item.shop_name}`, started_at: item.started_at, completed_at: item.completed_at, completion_status: item.completion_status, kind: "luc" as const })), ...(environments ?? []).map((item) => ({ id: item.id, label: item.name, started_at: item.started_at, completed_at: item.completed_at, completion_status: item.completion_status, kind: "environment" as const }))];
    return { points, responses: responses ?? [], attachments: attachments ?? [], calls: calls ?? [], visitTechs: visitTechs ?? [] };
  } });
  const calculation = useMemo(() => {
    const points = data?.points.filter((point) => point.completion_status !== "cancelada") ?? [];
    const responses = data?.responses ?? [];
    const breakdown = assumptions.map((assumption) => {
      const occurrences = assumption.question_id ? responses.filter((response) => response.question_id === assumption.question_id && (!assumption.answer_value || valueText(response.answer).toLocaleLowerCase("pt-BR").split(/[,;—]/).map((value: string) => value.trim()).includes(assumption.answer_value.toLocaleLowerCase("pt-BR")))).length : points.length;
      return { ...assumption, occurrences, total: occurrences * assumption.minutes };
    }).filter((item) => item.occurrences > 0);
    const estimated = breakdown.reduce((total, item) => total + item.total, 0);
    const workedTime = calculateWorkedTime(points);
    const assignedCount = Math.max(1, new Set([visit.technician_id, ...(data?.visitTechs.map((item) => item.technician_id) ?? [])]).size);
    const days = estimated ? Math.ceil(estimated / (480 * assignedCount)) : 0;
    const requestedDays = Math.max(1, Number(deadlineDays) || 1);
    const techniciansNeeded = estimated ? Math.ceil(estimated / (480 * requestedDays)) : 0;
    return { breakdown, estimated, ...workedTime, assignedCount, days, techniciansNeeded };
  }, [assumptions, data, deadlineDays, visit.technician_id]);
  const pointResponses = (point: Point) => (data?.responses ?? []).filter((response) => point.kind === "luc" ? response.visit_luc_id === point.id : response.visit_environment_id === point.id);
  const stageSevenSectionIds = new Set(sections.filter((section) => section.position === 6 || normalize(section.title).includes("revisao")).map((section) => section.id));
  const stageSevenQuestionIds = new Set(questions.filter((question) => stageSevenSectionIds.has(question.section_id)).map((question) => question.id));
  const technicalTotals = useMemo(() => {
    const groups = [{ label: "Tipos de hidrômetro", terms: ["tipo de hidrometro", "tipo de registro"] }, { label: "Dificuldade de acesso", terms: ["dificuldade", "acesso ao hidrometro"] }, { label: "Quadros e pontos elétricos", terms: ["quadro eletrico", "ponto eletrico"] }, { label: "Complexidade", terms: ["complexidade"] }];
    return groups.map((group) => { const counts = new Map<string, number>(); for (const response of data?.responses ?? []) { const question = questions.find((item) => item.id === response.question_id); if (!question || !group.terms.some((term) => normalize(question.prompt).includes(term))) continue; const value = valueText(response.answer).trim(); if (value) counts.set(value, (counts.get(value) ?? 0) + 1); } return { label: group.label, values: [...counts.entries()] }; }).filter((group) => group.values.length);
  }, [data?.responses, questions]);
  const pointSummaries = (point: Point) => buildPointSummaries((pointResponses(point) as ReportResponse[]).filter((response) => !stageSevenQuestionIds.has(response.question_id)), questions, sections);
  const exportPdf = async (blackAndWhite: boolean) => {
    if (!data) return;
    const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const autoTable = autoTableModule.default;
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const ink: [number, number, number] = blackAndWhite ? [25, 25, 25] : [18, 197, 138];
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(17); pdf.text(`Site Survey #${String(visit.survey_number).padStart(12, "0")}`, 14, 18);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.text(visit.address, 14, 25);
    autoTable(pdf, { startY: 31, theme: "grid", headStyles: { fillColor: ink }, head: [["Cliente", "Projeto", "Técnico", "Situação"]], body: [[clients.find((item) => item.id === visit.client_id)?.name ?? "—", projects.find((item) => item.id === visit.project_id)?.name ?? "—", technicians.find((item) => item.id === visit.technician_id)?.full_name ?? "—", visit.status.replaceAll("_", " ")]] });
    let y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
    autoTable(pdf, { startY: y, theme: "grid", headStyles: { fillColor: ink }, head: [["Planejamento", "Valor"]], body: [["Tempo estimado", formatMinutes(calculation.estimated)], ["Tempo realizado", formatMinutes(calculation.worked)], ["Horas extras", formatMinutes(calculation.overtime)], ["Horas noturnas (22h às 5h)", formatMinutes(calculation.night)], ["Dias com equipe designada", String(calculation.days)], [`Técnicos para ${deadlineDays} dia(s)`, String(calculation.techniciansNeeded)]] });
    y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    if (technicalTotals.length) { autoTable(pdf, { startY: y, theme: "grid", headStyles: { fillColor: ink }, head: [["Totalizadores técnicos", "Quantidade"]], body: technicalTotals.flatMap((group) => group.values.map(([value, count]) => [`${group.label}: ${value}`, String(count)])) }); y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8; }
    const drawRichParagraph = (parts: RichPart[], startY: number) => {
      const left = 14; const right = 196; const lineHeight = 5; let cursorX = left; let cursorY = startY;
      for (const part of parts) {
        pdf.setFont("helvetica", part.bold ? "bold" : "normal");
        for (const token of part.text.split(/(\s+)/).filter(Boolean)) {
          const width = pdf.getTextWidth(token);
          if (cursorX + width > right && token.trim()) { cursorX = left; cursorY += lineHeight; }
          if (cursorY > 282) { pdf.addPage(); cursorY = 18; cursorX = left; }
          pdf.text(token, cursorX, cursorY); cursorX += width;
        }
      }
      pdf.setFont("helvetica", "normal");
      return cursorY + lineHeight;
    };
    for (const point of data.points) {
      if (y > 250) { pdf.addPage(); y = 18; }
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.setTextColor(...ink); pdf.text(point.label, 14, y); pdf.setTextColor(25, 25, 25); y += 5;
      const pointAnswers = pointResponses(point);
      const stageSeven = pointAnswers.filter((response) => stageSevenQuestionIds.has(response.question_id)).map((response) => valueText(response.answer)).filter(Boolean).join("; ");
      const calls = data.calls.filter((item) => point.kind === "luc" ? item.visit_luc_id === point.id : item.visit_environment_id === point.id).map((call) => { const linked = call.internal_calls as unknown as { call_number?: string; title?: string; status?: string } | null; return linked ? `#${linked.call_number ?? "—"} ${linked.title ?? "Chamado"} (${linked.status ?? call.status})` : call.status; }).join("; ");
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.text(`Início: ${point.started_at ? new Date(point.started_at).toLocaleString("pt-BR") : "não registrado"}  |  Conclusão: ${point.completed_at ? new Date(point.completed_at).toLocaleString("pt-BR") : "não registrada"}  |  Duração: ${formatMinutes(durationMinutes(point.started_at, point.completed_at))}`, 14, y); y += 7;
      for (const summary of pointSummaries(point)) {
        if (y > 268) { pdf.addPage(); y = 18; }
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.text(summary.title, 14, y); y = drawRichParagraph(summary.parts, y + 5) + 2;
      }
      if (stageSeven) { pdf.setFont("helvetica", "bold"); pdf.text("Anotações da Etapa 7", 14, y); y = drawRichParagraph([{ text: stageSeven }], y + 5) + 2; }
      if (calls) { pdf.setFont("helvetica", "bold"); pdf.text("Ações e chamados", 14, y); y = drawRichParagraph([{ text: calls }], y + 5) + 2; }
      const photos = data.attachments.filter((item) => item.content_type?.startsWith("image/") && (point.kind === "luc" ? item.visit_luc_id === point.id : item.visit_environment_id === point.id));
      let photoColumn = 0;
      for (const photo of photos) { const { data: signed } = await supabase.storage.from("site-survey-attachments").createSignedUrl(photo.storage_path, 300); if (!signed?.signedUrl) continue; if (photoColumn === 0 && y > 245) { pdf.addPage(); y = 18; } try { pdf.addImage(await imageDataUrl(signed.signedUrl), "JPEG", 14 + photoColumn * 46, y, 42, 31, undefined, "FAST"); photoColumn += 1; if (photoColumn === 4) { photoColumn = 0; y += 35; } } catch { /* Mantém o PDF disponível caso uma foto falhe. */ } }
      if (photoColumn > 0) y += 35;
    }
    pdf.save(`site-survey-${visit.survey_number}-${blackAndWhite ? "impressao" : "digital"}.pdf`);
  };
  return <><Button type="button" size={iconOnly ? "compactIcon" : "sm"} variant="ghost" aria-label={`Gerar relatório da visita ${visit.survey_number}`} title="Relatório da visita" onClick={() => setOpen(true)}><FileChartColumn className="h-4 w-4" />{iconOnly ? null : "Relatório"}</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle>Relatório Site Survey #{String(visit.survey_number).padStart(12, "0")}</DialogTitle><DialogDescription>Prévia consolidada da OS, com tempos, respostas, ações e fotos.</DialogDescription></DialogHeader>{isLoading || !data ? <p className="py-10 text-center text-muted-foreground">Preparando relatório...</p> : <div className="space-y-6"><section className="grid gap-3 border-y py-4 sm:grid-cols-3"><ReportInfo label="Cliente" value={clients.find((item) => item.id === visit.client_id)?.name ?? "—"} /><ReportInfo label="Unidade" value={units.find((item) => item.id === visit.client_unit_id)?.name ?? "—"} /><ReportInfo label="Projeto" value={projects.find((item) => item.id === visit.project_id)?.name ?? "—"} /><ReportInfo label="Técnico" value={technicians.find((item) => item.id === visit.technician_id)?.full_name ?? "—"} /><ReportInfo label="Agendamento" value={new Date(visit.scheduled_start).toLocaleString("pt-BR")} /><ReportInfo label="Contato" value={[visit.contact_name, visit.contact_phone].filter(Boolean).join(" · ") || "—"} /></section><section><h3 className="font-bold">Planejamento de capacidade</h3><div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6"><ReportInfo label="Tempo estimado" value={formatMinutes(calculation.estimated)} /><ReportInfo label="Tempo realizado" value={formatMinutes(calculation.worked)} /><ReportInfo label="Horas extras" value={formatMinutes(calculation.overtime)} /><ReportInfo label="Horas noturnas" value={formatMinutes(calculation.night)} /><ReportInfo label={`Dias com ${calculation.assignedCount} técnico(s)`} value={String(calculation.days)} /><div className="space-y-1"><Label htmlFor={`deadline-${visit.id}`} className="text-xs text-muted-foreground">Prazo desejado em dias</Label><Input id={`deadline-${visit.id}`} type="number" min="1" value={deadlineDays} onChange={(event) => setDeadlineDays(event.target.value)} /><p className="text-sm font-semibold">{calculation.techniciansNeeded} técnico(s) necessário(s)</p></div></div>{calculation.breakdown.length ? <ul className="mt-3 space-y-1 text-sm text-muted-foreground">{calculation.breakdown.map((item) => <li key={item.id}>{item.name}: {item.occurrences} × {item.minutes} min = {item.total} min</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">Cadastre premissas de tempo para calcular a estimativa.</p>}</section><section className="space-y-4"><h3 className="font-bold">Lojas e ambientes</h3>{data.points.map((point) => { const photos = data.attachments.filter((item) => point.kind === "luc" ? item.visit_luc_id === point.id : item.visit_environment_id === point.id); const calls = data.calls.filter((item) => point.kind === "luc" ? item.visit_luc_id === point.id : item.visit_environment_id === point.id); return <article key={`${point.kind}-${point.id}`} className="rounded-md border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-semibold">{point.label}</h4><p className="text-xs text-muted-foreground">{point.started_at ? new Date(point.started_at).toLocaleString("pt-BR") : "Início não registrado"} · {formatMinutes(durationMinutes(point.started_at, point.completed_at))}</p></div><span className="text-sm capitalize">{point.completion_status}</span></div><div className="mt-4 space-y-4">{pointSummaries(point).map((summary, index) => <section key={`${summary.title}-${index}`}><h5 className="text-sm font-semibold">{summary.title}</h5><p className="mt-1 text-sm leading-6">{summary.parts.map((part, partIndex) => part.bold ? <strong key={partIndex}>{part.text}</strong> : <span key={partIndex}>{part.text}</span>)}</p></section>)}</div>{calls.length ? <div className="mt-3 border-t pt-3 text-sm"><strong>Ações:</strong> {calls.map((call) => { const linked = call.internal_calls as unknown as { call_number?: string; title?: string; status?: string } | null; return linked ? `#${linked.call_number ?? "—"} ${linked.title ?? "Chamado"} (${linked.status ?? call.status})` : call.status; }).join("; ")}</div> : null}<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{photos.map((photo) => <ReportPhoto key={photo.id} path={photo.storage_path} name={photo.file_name} />)}</div></article>; })}</section><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => void exportPdf(true).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Não foi possível gerar o PDF."))}><Printer className="h-4 w-4" />PDF P&B</Button><Button type="button" onClick={() => void exportPdf(false).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Não foi possível gerar o PDF."))}><Download className="h-4 w-4" />PDF colorido</Button></div></div>}</DialogContent></Dialog></>;
}

function ReportInfo({ label, value }: { label: string; value: string }) { return <div className="border-l-2 border-myio-green pl-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>; }
function ReportPhoto({ path, name }: { path: string; name: string }) { const { data } = useQuery({ queryKey: ["site-survey-report-photo", path], queryFn: async () => { const { data, error } = await supabase.storage.from("site-survey-attachments").createSignedUrl(path, 3600); if (error) throw error; return data.signedUrl; } }); return data ? <img src={data} alt={name} className="aspect-[4/3] w-full rounded-sm border object-cover" /> : <div className="aspect-[4/3] w-full animate-pulse rounded-sm bg-muted" />; }