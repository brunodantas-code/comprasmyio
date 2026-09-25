import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileChartColumn, LoaderCircle, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { TimeAssumption } from "@/components/site-survey-time-assumptions";
import myioLogoUrl from "@/assets/myio-logo-light.svg?url";
import nunitoRegularUrl from "@/assets/fonts/nunito-regular.ttf?url";
import nunitoBoldUrl from "@/assets/fonts/nunito-bold.ttf?url";
import nunitoExtraBoldUrl from "@/assets/fonts/nunito-extrabold.ttf?url";

type Visit = { id: string; survey_number: number; client_id: string | null; client_unit_id: string | null; project_id: string | null; technician_id: string; status: string; scheduled_start: string; scheduled_end: string | null; address: string; contact_name: string | null; contact_phone: string | null; notes: string | null; started_at: string | null; completed_at: string | null };
type Named = { id: string; name: string };
type Question = { id: string; section_id: string; prompt: string; position?: number };
type Section = { id: string; title: string; position: number };
type Profile = { id: string; full_name: string };
type Point = { id: string; label: string; started_at: string | null; completed_at: string | null; completion_status: string; cancellationReason: string | null; kind: "luc" | "environment" };
type ReportResponse = { id: string; question_id: string; answer: unknown };
type RichPart = { text: string; bold?: boolean };
type PointSummary = { title: string; parts: RichPart[]; questionIds: Set<string> };
type VisitMaterial = { id: string; visit_luc_id: string | null; visit_environment_id: string | null; quantity: number; notes: string | null; site_survey_material_catalog: { name?: string } | null; site_survey_screwdriver_types: { name?: string } | null; site_survey_wrench_sizes: { name?: string } | null };

const valueText = (answer: unknown): string => {
  if (answer && typeof answer === "object" && !Array.isArray(answer) && "value" in answer) { const item = answer as { value: unknown; detail?: unknown }; return [valueText(item.value), typeof item.detail === "string" ? item.detail : ""].filter(Boolean).join(" — "); }
  return Array.isArray(answer) ? answer.join(", ") : String(answer ?? "");
};
const durationMinutes = (start: string | null, end: string | null) => start && end ? Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)) : null;
const formatMinutes = (minutes: number | null) => minutes === null ? "Incompleto" : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}min`;
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
const findAnswer = (responses: ReportResponse[], questions: Question[], terms: string[], sections?: Section[], sectionTerms?: string[]) => {
  const response = responses.find((item) => {
    const question = questions.find((candidate) => candidate.id === item.question_id);
    const prompt = normalize(question?.prompt ?? "");
    const section = normalize(sections?.find((candidate) => candidate.id === question?.section_id)?.title ?? "");
    return terms.some((term) => prompt.includes(term)) && (!sectionTerms?.length || sectionTerms.some((term) => section.includes(term)));
  });
  return response ? { id: response.question_id, value: valueText(response.answer).trim() } : null;
};
const buildPointSummaries = (responses: ReportResponse[], questions: Question[], sections: Section[]): PointSummary[] => {
  const summaries: PointSummary[] = [];
  const hydraulicSections = ["agua", "hidrometro", "hidraulica"];
  const electricalSections = ["eletrica", "eletrico"];
  const get = (terms: string[], sectionTerms?: string[]) => findAnswer(responses, questions, terms, sections, sectionTerms);
  const questionOrder = (questionId: string) => {
    const question = questions.find((item) => item.id === questionId);
    const section = sections.find((item) => item.id === question?.section_id);
    return (section?.position ?? 0) * 10000 + (question?.position ?? 0);
  };
  const getAll = (terms: string[], sectionTerms?: string[]) => responses
    .filter((response) => {
      const question = questions.find((item) => item.id === response.question_id);
      const prompt = normalize(question?.prompt ?? "");
      const section = normalize(sections.find((item) => item.id === question?.section_id)?.title ?? "");
      return terms.some((term) => prompt.includes(term)) && (!sectionTerms?.length || sectionTerms.some((term) => section.includes(term)));
    })
    .map((response) => ({ id: response.question_id, value: valueText(response.answer).trim() }))
    .filter((answer) => answer.value)
    .sort((left, right) => questionOrder(left.id) - questionOrder(right.id));
  const clean = (value: string) => value.replace(/[.!?]+$/, "").trim();
  const lower = (value: string) => clean(value).toLocaleLowerCase("pt-BR");
  const statusOnly = (value: string) => lower((value.split("—").at(-1) ?? value).trim());
  const detailOnly = (value: string) => clean((value.split("—").at(-1) ?? value).trim());
  const placePhrase = (value: string) => {
    const place = lower(value);
    if (/^(loja|sobreloja|parede|galeria|cozinha|subestacao)/.test(place)) return `na ${place}`;
    if (/^(armario|quadro|busway)/.test(place)) return `no ${place}`;
    return `em ${place}`;
  };
  const add = (parts: RichPart[], before: string, answer: ReturnType<typeof get>, after = "") => {
    if (!answer?.value) return false;
    parts.push({ text: before }, { text: clean(answer.value), bold: true }, { text: after });
    return true;
  };

  const hydraulic: RichPart[] = [];
  const hydraulicIds = new Set<string>();
  const hydraulicAnswer = (terms: string[]) => {
    const answer = get(terms, hydraulicSections) ?? get(terms);
    if (answer) hydraulicIds.add(answer.id);
    return answer;
  };
  const locations = getAll(["localizacao do hidrometro", "posicao do hidrometro"], hydraulicSections);
  locations.forEach((answer) => hydraulicIds.add(answer.id));
  const locationDetail = hydraulicAnswer(["detalhar para facilitar", "facilitar sua localizacao"]);
  const access = hydraulicAnswer(["dificuldade de acesso", "acesso ao hidrometro"]);
  if (locations.length) {
    hydraulic.push({ text: "O hidrômetro encontra-se " });
    hydraulic.push({ text: placePhrase(locations[0].value), bold: true });
    const remainingLocations = locations.slice(1).map((location) => lower(location.value));
    const detail = locationDetail ? lower(locationDetail.value) : "";
    if (remainingLocations.length || detail) {
      const location = remainingLocations[0] ?? "";
      const detailAlreadyDescribesLocation = location && detail.startsWith(placePhrase(location));
      const description = detailAlreadyDescribesLocation
        ? detail
        : [location ? placePhrase(location) : "", detail].filter(Boolean).join(" ");
      hydraulic.push({ text: ", localizado " }, { text: description, bold: true });
      for (const extraLocation of remainingLocations.slice(1)) hydraulic.push({ text: ", " }, { text: placePhrase(extraLocation), bold: true });
    }
    if (access) hydraulic.push({ text: ", de " }, { text: lower(access.value), bold: true }, { text: " acesso. " }); else hydraulic.push({ text: ". " });
  }
  const pulse = hydraulicAnswer(["condicao da saida pulsada", "saida pulsada"]);
  const flowRate = hydraulicAnswer(["vazao nominal", "vazao do hidrometro"]);
  if (pulse) {
    const pulseStatus = statusOnly(pulse.value);
    const pulseWorks = /^(sim|operante|funcional|funcionando)/.test(pulseStatus);
    hydraulic.push(
      { text: pulseWorks ? "Possui saída pulsada " : "A saída pulsada encontra-se " },
      { text: pulseWorks ? "funcional" : pulseStatus, bold: true },
      { text: flowRate ? " e a vazão nominal é de " : ". " },
    );
  }
  if (flowRate) hydraulic.push({ text: pulse ? "" : "A vazão nominal é de " }, { text: clean(flowRate.value), bold: true }, { text: ". " });
  const flow = hydraulicAnswer(["sentido do fluxo"]);
  if (flow) hydraulic.push({ text: "O sentido do fluxo de água foi classificado como " }, { text: normalize(flow.value).includes("desacordo") || normalize(flow.value).includes("incorret") ? "incorreto" : normalize(flow.value).includes("acordo") || normalize(flow.value).includes("corret") ? "correto" : lower(flow.value), bold: true }, { text: ". " });
  const flange = hydraulicAnswer(["tipo de flange"]);
  if (flange) hydraulic.push({ text: "O flange é do tipo " }, { text: lower(flange.value), bold: true }, { text: ". " });
  const registerType = hydraulicAnswer(["tipo de registro existente"]);
  const registerCondition = hydraulicAnswer(["condicao do registro"]);
  if (registerType) hydraulic.push({ text: "O registro existente é do tipo " }, { text: lower(registerType.value), bold: true }, { text: registerCondition ? " e encontra-se " : ". " });
  if (registerCondition) hydraulic.push({ text: registerType ? "" : "O registro encontra-se " }, { text: lower(registerCondition.value), bold: true }, { text: ". " });
  add(hydraulic, "O diâmetro da tubulação de água é de ", hydraulicAnswer(["diametro da tubulacao"]), ". ");
  const nearbyPower = hydraulicAnswer(["ponto de eletrica proximo", "ponto eletrico proximo"]);
  if (nearbyPower) hydraulic.push({ text: lower(nearbyPower.value).startsWith("sim") ? "Existe ponto de elétrica próximo ao hidrômetro" : "Não existe ponto de elétrica próximo ao hidrômetro", bold: true }, { text: ". " });
  add(hydraulic, "O encaminhamento deve ser realizado por meio de ", hydraulicAnswer(["encaminhamento da eletrica", "encaminhamento eletrico"]), ". ");
  const hydraulicComplexity = hydraulicAnswer(["complexidade dessa instalacao", "complexidade da instalacao"]);
  if (hydraulicComplexity) hydraulic.push({ text: "A instalação é de complexidade " }, { text: lower(hydraulicComplexity.value), bold: true }, { text: ". " });
  const consumptionLevel = hydraulicAnswer(["classificacao do perfil de consumo", "perfil de consumo classificado"]);
  const consumptionProfile = hydraulicAnswer(["perfil de consumo da loja"]);
  if (consumptionLevel) hydraulic.push({ text: "O perfil de consumo da loja é " }, { text: lower(consumptionLevel.value), bold: true }, { text: consumptionProfile ? ", contemplando " : "." });
  if (consumptionProfile) hydraulic.push({ text: consumptionLevel ? "" : "O perfil de consumo da loja contempla " }, { text: lower(consumptionProfile.value), bold: true }, { text: "." });
  if (hydraulic.length) summaries.push({ title: "Hidráulica", parts: hydraulic, questionIds: hydraulicIds });

  const electrical: RichPart[] = [];
  const electricalIds = new Set<string>();
  const electricalAnswer = (terms: string[]) => {
    const answer = get(terms, electricalSections) ?? get(terms);
    if (answer) electricalIds.add(answer.id);
    return answer;
  };
  const cable = electricalAnswer(["bitola do cabo"]);
  const breaker = electricalAnswer(["amperagem do disjuntor"]);
  if (cable) add(electrical, "A bitola do cabo de alimentação de entrada é de ", cable, breaker ? " e a amperagem do disjuntor de entrada é de " : ". ");
  if (breaker) electrical.push({ text: cable ? "" : "A amperagem do disjuntor de entrada é de " }, { text: detailOnly(breaker.value), bold: true }, { text: ". " });
  const panelLocation = electricalAnswer(["localizacao do quadro eletrico", "onde se encontra o quadro eletrico"]);
  if (panelLocation) electrical.push({ text: "O quadro elétrico se encontra " }, { text: placePhrase(panelLocation.value), bold: true }, { text: ". " });
  const electricalComplexity = electricalAnswer(["complexidade eletrica", "complexidade dessa instalacao", "complexidade da instalacao"]);
  if (electricalComplexity) electrical.push({ text: "A instalação elétrica é de complexidade " }, { text: lower(electricalComplexity.value), bold: true }, { text: "." });
  if (electrical.length) summaries.push({ title: "Elétrica", parts: electrical, questionIds: electricalIds });
  return summaries;
};
const imageDataUrl = async (url: string, monochrome = false) => new Promise<string>((resolve, reject) => {
  const image = new Image(); image.crossOrigin = "anonymous";
  image.onload = () => { const canvas = document.createElement("canvas"); const scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight)); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale)); const context = canvas.getContext("2d"); if (!context) return reject(new Error("Não foi possível preparar a foto.")); context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height); if (monochrome) { const pixels = context.getImageData(0, 0, canvas.width, canvas.height); for (let index = 0; index < pixels.data.length; index += 4) { const isBackground = pixels.data[index] > 245 && pixels.data[index + 1] > 245 && pixels.data[index + 2] > 245; const value = isBackground ? 255 : 0; pixels.data[index] = value; pixels.data[index + 1] = value; pixels.data[index + 2] = value; } context.putImageData(pixels, 0, 0); } resolve(canvas.toDataURL("image/jpeg", 0.9)); };
  image.onerror = () => reject(new Error("Não foi possível carregar uma foto do relatório.")); image.src = url;
});
const fileBase64 = async (url: string) => {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return btoa(binary);
};
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
  const [generatingPdf, setGeneratingPdf] = useState<"bw" | "color" | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["site-survey-report", visit.id], enabled: open, queryFn: async () => {
    const [{ data: lucs, error: lucError }, { data: environments, error: envError }, { data: responses, error: responseError }, { data: attachments, error: attachmentError }, { data: calls, error: callError }, { data: visitTechs }, { data: materials, error: materialError }] = await Promise.all([
      supabase.from("site_survey_visit_lucs").select("id,luc_number,shop_name,started_at,completed_at,completion_status,cancellation_reason_id,site_survey_cancellation_reasons(name)").eq("visit_id", visit.id).eq("active", true).order("luc_number"),
      supabase.from("site_survey_visit_environments").select("id,name,started_at,completed_at,completion_status").eq("visit_id", visit.id).eq("active", true).order("name"),
      supabase.from("site_survey_responses").select("id,question_id,visit_luc_id,visit_environment_id,answer").eq("visit_id", visit.id),
      supabase.from("site_survey_attachments").select("id,visit_luc_id,visit_environment_id,file_name,storage_path,content_type,attachment_kind").eq("visit_id", visit.id).order("created_at"),
      supabase.from("site_survey_generated_calls").select("id,visit_luc_id,visit_environment_id,status,internal_calls(call_number,title,description,status)").eq("visit_id", visit.id),
      supabase.from("site_survey_visit_technicians").select("technician_id").eq("visit_id", visit.id),
      supabase.from("site_survey_visit_materials").select("id,visit_luc_id,visit_environment_id,quantity,notes,site_survey_material_catalog(name),site_survey_screwdriver_types(name),site_survey_wrench_sizes(name)").eq("visit_id", visit.id).order("created_at"),
    ]);
    const error = lucError ?? envError ?? responseError ?? attachmentError ?? callError ?? materialError; if (error) throw error;
    const points: Point[] = [...(lucs ?? []).map((item) => { const reason = item.site_survey_cancellation_reasons as unknown as { name?: string } | null; return { id: item.id, label: `LUC ${item.luc_number} — ${item.shop_name}`, started_at: item.started_at, completed_at: item.completed_at, completion_status: item.completion_status, cancellationReason: reason?.name ?? null, kind: "luc" as const }; }), ...(environments ?? []).map((item) => ({ id: item.id, label: item.name, started_at: item.started_at, completed_at: item.completed_at, completion_status: item.completion_status, cancellationReason: null, kind: "environment" as const }))];
    return { points, responses: responses ?? [], attachments: attachments ?? [], calls: calls ?? [], visitTechs: visitTechs ?? [], materials: (materials ?? []) as unknown as VisitMaterial[] };
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
  const pointMaterials = (point: Point) => (data?.materials ?? []).filter((item) => point.kind === "luc" ? item.visit_luc_id === point.id : item.visit_environment_id === point.id);
  const materialSentence = (point: Point) => {
    const materials = pointMaterials(point);
    if (!materials.length) return "";
    const descriptions = materials.map((item) => {
      const details = [item.site_survey_screwdriver_types?.name, item.site_survey_wrench_sizes?.name, item.notes].filter(Boolean).join(" — ");
      return `${item.quantity} × ${item.site_survey_material_catalog?.name ?? "ferramenta"}${details ? ` (${details})` : ""}`;
    });
    const list = descriptions.length === 1 ? descriptions[0] : `${descriptions.slice(0, -1).join(", ")} e ${descriptions.at(-1)}`;
    return `Para a instalação ${point.kind === "luc" ? "nessa loja" : "nesse ambiente"}, é necessário utilizar ${list}.`;
  };
  const exportPdf = async (blackAndWhite: boolean) => {
    if (!data) return;
    const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const autoTable = autoTableModule.default;
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const purple: [number, number, number] = blackAndWhite ? [28, 28, 28] : [103, 58, 182];
    const green: [number, number, number] = blackAndWhite ? [95, 95, 95] : [15, 196, 130];
    const dark: [number, number, number] = [11, 0, 35];
    const soft: [number, number, number] = [238, 236, 243];
    const reportNumber = String(visit.survey_number).padStart(12, "0");
    const clientName = clients.find((item) => item.id === visit.client_id)?.name ?? "—";
    const unitName = units.find((item) => item.id === visit.client_unit_id)?.name ?? "—";
    const projectName = projects.find((item) => item.id === visit.project_id)?.name ?? "—";
    const technicianName = technicians.find((item) => item.id === visit.technician_id)?.full_name ?? "—";
    const issueDate = new Date(visit.completed_at ?? visit.scheduled_start).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const [regularFont, boldFont, extraBoldFont, logoDataUrl] = await Promise.all([fileBase64(nunitoRegularUrl), fileBase64(nunitoBoldUrl), fileBase64(nunitoExtraBoldUrl), imageDataUrl(myioLogoUrl, blackAndWhite)]);
    pdf.addFileToVFS("Nunito-Regular.ttf", regularFont); pdf.addFont("Nunito-Regular.ttf", "Nunito", "normal");
    pdf.addFileToVFS("Nunito-Bold.ttf", boldFont); pdf.addFont("Nunito-Bold.ttf", "Nunito", "bold");
    pdf.addFileToVFS("Nunito-ExtraBold.ttf", extraBoldFont); pdf.addFont("Nunito-ExtraBold.ttf", "Nunito", "extrabold");
    pdf.setFont("Nunito", "normal");

    // Capa técnica, inspirada no relatório institucional enviado.
    pdf.addImage(logoDataUrl, "PNG", 16, 18, 40, 13);
    pdf.setFont("Nunito", "extrabold"); pdf.setTextColor(...dark); pdf.setFontSize(31); pdf.text("Site Survey", 16, 101);
    pdf.setTextColor(...purple); pdf.text("Relatório", 16, 115);
    pdf.setFont("Nunito", "normal"); pdf.setFontSize(13); pdf.setTextColor(85, 82, 94); pdf.text(unitName, 16, 128);
    pdf.setDrawColor(...purple); pdf.setLineWidth(0.3); pdf.line(16, 218, 194, 218);
    const coverRows = [["Cliente", clientName], ["Data de emissão", issueDate], ["Unidade", unitName], ["Número da visita", `SS-${reportNumber}`]];
    coverRows.forEach(([label, value], index) => { const rowY = 228 + index * 10; pdf.setFontSize(8); pdf.setFont("Nunito", "bold"); pdf.setTextColor(120, 116, 128); pdf.text(label, 16, rowY); pdf.setFontSize(11); pdf.setTextColor(...dark); pdf.text(value, 194, rowY, { align: "right", maxWidth: 122 }); });
    pdf.setFontSize(7); pdf.setTextColor(145, 141, 151); pdf.text("myio Automação Ltda — Relatório de Site Survey", 16, 282); pdf.setFillColor(...green); pdf.rect(181, 280.5, 13, 1.3, "F");

    pdf.addPage();
    pdf.setFont("Nunito", "extrabold"); pdf.setTextColor(...purple); pdf.setFontSize(17); pdf.text("01", 14, 24); pdf.setFontSize(14); pdf.text("Visão geral", 28, 24);
    const tableHead = { fillColor: [255, 255, 255] as [number, number, number], textColor: purple, fontStyle: "bold" as const, lineColor: purple, lineWidth: { top: 0, right: 0, bottom: 0.35, left: 0 } };
    autoTable(pdf, { startY: 34, theme: "plain", styles: { font: "Nunito", fontSize: 8, textColor: dark, lineColor: soft, lineWidth: { bottom: 0.12 } }, headStyles: tableHead, head: [["Cliente", "Projeto", "Técnico", "Situação"]], body: [[clientName, projectName, technicianName, visit.status.replaceAll("_", " ")]] });
    let y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 11;
    autoTable(pdf, { startY: y, theme: "plain", styles: { font: "Nunito", fontSize: 8, textColor: dark, lineColor: soft, lineWidth: { bottom: 0.12 } }, headStyles: tableHead, columnStyles: { 1: { halign: "center" } }, head: [["Planejamento", "Valor"]], body: [["Tempo estimado", formatMinutes(calculation.estimated)], ["Tempo realizado", formatMinutes(calculation.worked)], ["Horas extras", formatMinutes(calculation.overtime)], ["Horas noturnas (22h às 5h)", formatMinutes(calculation.night)], ["Dias com equipe designada", String(calculation.days)], [`Técnicos para ${deadlineDays} dia(s)`, String(calculation.techniciansNeeded)]] });
    y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 11;
    const totalsBody = technicalTotals.flatMap((group) => group.values.map(([value, count], index) => [index === 0 ? group.label : "", value, String(count)]));
    totalsBody.push(["Chamados", "Total", String(data.calls.length)]);
    autoTable(pdf, { startY: y, theme: "plain", styles: { font: "Nunito", fontSize: 8, textColor: dark, lineColor: soft, lineWidth: { bottom: 0.12 } }, headStyles: tableHead, columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 }, 2: { halign: "center", cellWidth: 28 } }, head: [["Totalizadores técnicos", "Classificação", "Quantidade"]], body: totalsBody });
    y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
    const drawRichParagraph = (parts: RichPart[], startY: number) => {
      const left = 14; const right = 196; const lineHeight = 3.7; const maxWidth = right - left;
      const words = parts.flatMap((part) => part.text.trim().split(/\s+/).filter(Boolean).map((text) => ({ text, bold: Boolean(part.bold) }))).reduce<Array<{ text: string; bold: boolean }>>((tokens, token) => {
        if (/^[,.;:!?]+$/.test(token.text) && tokens.length) tokens[tokens.length - 1].text += token.text;
        else tokens.push(token);
        return tokens;
      }, []);
      const lines: Array<Array<{ text: string; bold: boolean; width: number }>> = [];
      let line: Array<{ text: string; bold: boolean; width: number }> = [];
      let lineWidth = 0;
      for (const word of words) {
        pdf.setFont("Nunito", word.bold ? "bold" : "normal");
        const width = pdf.getTextWidth(word.text);
        pdf.setFont("Nunito", "normal");
        const spaceWidth = pdf.getTextWidth(" ");
        if (line.length && lineWidth + spaceWidth + width > maxWidth) { lines.push(line); line = []; lineWidth = 0; }
        line.push({ ...word, width }); lineWidth += (line.length > 1 ? spaceWidth : 0) + width;
      }
      if (line.length) lines.push(line);
      let cursorY = startY;
      lines.forEach((currentLine, index) => {
        if (cursorY > 276) { pdf.addPage(); cursorY = 18; }
        const wordsWidth = currentLine.reduce((total, word) => total + word.width, 0);
        const isLastLine = index === lines.length - 1;
        const gap = currentLine.length > 1 ? (isLastLine ? pdf.getTextWidth(" ") : (maxWidth - wordsWidth) / (currentLine.length - 1)) : 0;
        let cursorX = left;
        currentLine.forEach((word) => { pdf.setFont("Nunito", word.bold ? "bold" : "normal"); pdf.text(word.text, cursorX, cursorY); cursorX += word.width + gap; });
        cursorY += lineHeight;
      });
      pdf.setFont("Nunito", "normal");
      return cursorY;
    };
    for (const point of data.points) {
      if (y > 250) { pdf.addPage(); y = 18; }
      pdf.setFont("Nunito", "extrabold"); pdf.setFontSize(12); pdf.setTextColor(...purple); pdf.text(point.label, 14, y); pdf.setDrawColor(...purple); pdf.setLineWidth(0.35); pdf.line(14, y + 2, 196, y + 2); pdf.setTextColor(...dark); y += 8;
      const pointAnswers = pointResponses(point);
      const stageSeven = pointAnswers.filter((response) => stageSevenQuestionIds.has(response.question_id)).map((response) => valueText(response.answer)).filter(Boolean).join("; ");
      const tools = materialSentence(point);
      const calls = data.calls.filter((item) => point.kind === "luc" ? item.visit_luc_id === point.id : item.visit_environment_id === point.id).map((call) => { const linked = call.internal_calls as unknown as { call_number?: string; title?: string; status?: string } | null; return linked ? `#${linked.call_number ?? "—"} ${linked.title ?? "Chamado"} (${linked.status ?? call.status})` : call.status; }).join("; ");
      pdf.setFont("Nunito", "normal"); pdf.setFontSize(9); pdf.text(`Início: ${point.started_at ? new Date(point.started_at).toLocaleString("pt-BR") : "não registrado"}  |  Conclusão: ${point.completed_at ? new Date(point.completed_at).toLocaleString("pt-BR") : "não registrada"}  |  Duração: ${formatMinutes(durationMinutes(point.started_at, point.completed_at))}`, 14, y); y += 6;
      if (point.completion_status === "cancelada") { pdf.setFont("Nunito", "bold"); pdf.setTextColor(...purple); pdf.text(`Cancelada — Motivo: ${point.cancellationReason ?? "não informado"}`, 14, y); pdf.setTextColor(...dark); y += 7; }
      for (const summary of pointSummaries(point)) {
        if (y > 260) { pdf.addPage(); y = 18; }
        pdf.setFont("Nunito", "bold"); pdf.setFontSize(10); pdf.text(summary.title, 14, y); pdf.setFontSize(9); y = drawRichParagraph(summary.parts, y + 7) + 4;
      }
      if (tools) { if (y > 262) { pdf.addPage(); y = 18; } pdf.setFont("Nunito", "bold"); pdf.text("Ferramentas", 14, y); y = drawRichParagraph([{ text: tools }], y + 5) + 2; }
      if (stageSeven) { if (y > 262) { pdf.addPage(); y = 18; } pdf.setFont("Nunito", "bold"); pdf.text("Anotações da Etapa 7", 14, y); y = drawRichParagraph([{ text: stageSeven }], y + 5) + 2; }
      if (calls) { if (y > 262) { pdf.addPage(); y = 18; } pdf.setFont("Nunito", "bold"); pdf.text("Ações e chamados", 14, y); y = drawRichParagraph([{ text: calls }], y + 5) + 2; }
      const photos = data.attachments.filter((item) => item.content_type?.startsWith("image/") && (point.kind === "luc" ? item.visit_luc_id === point.id : item.visit_environment_id === point.id));
      let photoColumn = 0;
      for (const photo of photos) { const { data: signed } = await supabase.storage.from("site-survey-attachments").createSignedUrl(photo.storage_path, 300); if (!signed?.signedUrl) continue; if (photoColumn === 0 && y > 245) { pdf.addPage(); y = 18; } try { pdf.addImage(await imageDataUrl(signed.signedUrl), "JPEG", 14 + photoColumn * 46, y, 42, 31, undefined, "FAST"); photoColumn += 1; if (photoColumn === 4) { photoColumn = 0; y += 35; } } catch { /* Mantém o PDF disponível caso uma foto falhe. */ } }
      if (photoColumn > 0) y += 35;
      y += 10;
    }
    const totalPages = pdf.getNumberOfPages();
    for (let page = 2; page <= totalPages; page += 1) {
      pdf.setPage(page); pdf.setDrawColor(...soft); pdf.setLineWidth(0.25); pdf.line(14, 12, 196, 12);
      pdf.setFont("Nunito", "bold"); pdf.setFontSize(7); pdf.setTextColor(...purple); pdf.text(`SS-${reportNumber}`, 14, 9);
      pdf.setFont("Nunito", "normal"); pdf.setTextColor(125, 121, 132); pdf.text(`${unitName} — Relatório de Site Survey`, 196, 9, { align: "right" });
      pdf.line(14, 287, 196, 287); pdf.setFontSize(7); pdf.text("myio Automação Ltda", 14, 292); pdf.text(`Página ${page} de ${totalPages}`, 196, 292, { align: "right" });
    }
    pdf.save(`site-survey-${visit.survey_number}-${blackAndWhite ? "impressao" : "digital"}.pdf`);
  };
  const handleExportPdf = async (blackAndWhite: boolean) => {
    if (generatingPdf) return;
    const format = blackAndWhite ? "bw" : "color";
    setGeneratingPdf(format);
    const toastId = toast.loading("Relatório em elaboração. Aguarde…");
    try {
      await exportPdf(blackAndWhite);
      toast.success("Relatório gerado com sucesso.", { id: toastId });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o relatório. Tente novamente.", { id: toastId });
    } finally {
      setGeneratingPdf(null);
    }
  };
  return <><Button type="button" size={iconOnly ? "compactIcon" : "sm"} variant="ghost" aria-label={`Gerar relatório da visita ${visit.survey_number}`} title="Relatório da visita" onClick={() => setOpen(true)}><FileChartColumn className="h-4 w-4" />{iconOnly ? null : "Relatório"}</Button><Dialog open={open} onOpenChange={(nextOpen) => { if (!generatingPdf) setOpen(nextOpen); }}><DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle>Relatório Site Survey #{String(visit.survey_number).padStart(12, "0")}</DialogTitle><DialogDescription>Prévia consolidada da OS, com tempos, respostas, ações e fotos.</DialogDescription></DialogHeader>{isLoading || !data ? <p className="py-10 text-center text-muted-foreground">Preparando relatório...</p> : <div className="space-y-6"><section className="grid gap-3 border-y py-4 sm:grid-cols-3"><ReportInfo label="Cliente" value={clients.find((item) => item.id === visit.client_id)?.name ?? "—"} /><ReportInfo label="Unidade" value={units.find((item) => item.id === visit.client_unit_id)?.name ?? "—"} /><ReportInfo label="Projeto" value={projects.find((item) => item.id === visit.project_id)?.name ?? "—"} /><ReportInfo label="Técnico" value={technicians.find((item) => item.id === visit.technician_id)?.full_name ?? "—"} /><ReportInfo label="Agendamento" value={new Date(visit.scheduled_start).toLocaleString("pt-BR")} /><ReportInfo label="Contato" value={[visit.contact_name, visit.contact_phone].filter(Boolean).join(" · ") || "—"} /></section><section><h3 className="font-bold">Planejamento de capacidade</h3><div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6"><ReportInfo label="Tempo estimado" value={formatMinutes(calculation.estimated)} /><ReportInfo label="Tempo realizado" value={formatMinutes(calculation.worked)} /><ReportInfo label="Horas extras" value={formatMinutes(calculation.overtime)} /><ReportInfo label="Horas noturnas" value={formatMinutes(calculation.night)} /><ReportInfo label={`Dias com ${calculation.assignedCount} técnico(s)`} value={String(calculation.days)} /><ReportInfo label="Total de chamados" value={String(data.calls.length)} /><div className="space-y-1"><Label htmlFor={`deadline-${visit.id}`} className="text-xs text-muted-foreground">Prazo desejado em dias</Label><Input id={`deadline-${visit.id}`} type="number" min="1" value={deadlineDays} onChange={(event) => setDeadlineDays(event.target.value)} /><p className="text-sm font-semibold">{calculation.techniciansNeeded} técnico(s) necessário(s)</p></div></div>{calculation.breakdown.length ? <ul className="mt-3 space-y-1 text-sm text-muted-foreground">{calculation.breakdown.map((item) => <li key={item.id}>{item.name}: {item.occurrences} × {item.minutes} min = {item.total} min</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">Cadastre premissas de tempo para calcular a estimativa.</p>}</section><section className="space-y-6"><h3 className="font-bold">Lojas e ambientes</h3>{data.points.map((point) => { const photos = data.attachments.filter((item) => point.kind === "luc" ? item.visit_luc_id === point.id : item.visit_environment_id === point.id); const calls = data.calls.filter((item) => point.kind === "luc" ? item.visit_luc_id === point.id : item.visit_environment_id === point.id); const stageSeven = pointResponses(point).filter((response) => stageSevenQuestionIds.has(response.question_id)).map((response) => valueText(response.answer)).filter(Boolean).join("; "); const tools = materialSentence(point); return <article key={`${point.kind}-${point.id}`} className="border-b border-border pb-6"><div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-semibold text-accent">{point.label}</h4><p className="text-xs text-muted-foreground">{point.started_at ? new Date(point.started_at).toLocaleString("pt-BR") : "Início não registrado"} · {formatMinutes(durationMinutes(point.started_at, point.completed_at))}</p>{point.completion_status === "cancelada" ? <p className="mt-1 text-sm font-semibold text-accent">Motivo do cancelamento: {point.cancellationReason ?? "não informado"}</p> : null}</div><span className="text-sm capitalize">{point.completion_status}</span></div><div className="mt-5 space-y-5">{pointSummaries(point).map((summary, index) => <section key={`${summary.title}-${index}`}><h5 className="text-sm font-semibold">{summary.title}</h5><p className="mt-2 text-sm leading-[1.15]">{summary.parts.map((part, partIndex) => part.bold ? <strong key={partIndex}>{part.text}</strong> : <span key={partIndex}>{part.text}</span>)}</p></section>)}{tools ? <section><h5 className="text-sm font-semibold">Ferramentas</h5><p className="mt-2 text-sm leading-[1.15]">{tools}</p></section> : null}{stageSeven ? <section><h5 className="text-sm font-semibold">Anotações da Etapa 7</h5><p className="mt-2 text-sm leading-[1.15]">{stageSeven}</p></section> : null}</div>{calls.length ? <div className="mt-4 border-t pt-3 text-sm"><strong>Ações:</strong> {calls.map((call) => { const linked = call.internal_calls as unknown as { call_number?: string; title?: string; status?: string } | null; return linked ? `#${linked.call_number ?? "—"} ${linked.title ?? "Chamado"} (${linked.status ?? call.status})` : call.status; }).join("; ")}</div> : null}<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{photos.map((photo) => <ReportPhoto key={photo.id} path={photo.storage_path} name={photo.file_name} />)}</div></article>; })}</section>{generatingPdf ? <p className="flex items-center justify-end gap-2 text-sm font-semibold" role="status" aria-live="polite"><LoaderCircle className="h-4 w-4 animate-spin" />Relatório em elaboração. Aguarde…</p> : null}<div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end"><Button type="button" variant="outline" disabled={Boolean(generatingPdf)} aria-busy={generatingPdf === "bw"} onClick={() => void handleExportPdf(true)}>{generatingPdf === "bw" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}{generatingPdf === "bw" ? "Gerando…" : "PDF P&B"}</Button><Button type="button" disabled={Boolean(generatingPdf)} aria-busy={generatingPdf === "color"} onClick={() => void handleExportPdf(false)}>{generatingPdf === "color" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{generatingPdf === "color" ? "Gerando…" : "PDF colorido"}</Button></div></div>}</DialogContent></Dialog></>;
}

function ReportInfo({ label, value }: { label: string; value: string }) { return <div className="border-l-2 border-myio-green pl-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>; }
function ReportPhoto({ path, name }: { path: string; name: string }) { const { data } = useQuery({ queryKey: ["site-survey-report-photo", path], queryFn: async () => { const { data, error } = await supabase.storage.from("site-survey-attachments").createSignedUrl(path, 3600); if (error) throw error; return data.signedUrl; } }); return data ? <img src={data} alt={name} className="aspect-[4/3] w-full rounded-sm border object-cover" /> : <div className="aspect-[4/3] w-full animate-pulse rounded-sm bg-muted" />; }