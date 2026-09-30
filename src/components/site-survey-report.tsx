import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileChartColumn, LoaderCircle, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { TimeAssumption } from "@/components/site-survey-time-assumptions";
import myioLogoUrl from "@/assets/myio-logo-light.svg?url";
import nunitoRegularUrl from "@/assets/fonts/nunito-regular.ttf?url";
import nunitoBoldUrl from "@/assets/fonts/nunito-bold.ttf?url";
import nunitoExtraBoldUrl from "@/assets/fonts/nunito-extrabold.ttf?url";

type Visit = { id: string; template_id: string | null; survey_number: number; client_id: string | null; client_unit_id: string | null; project_id: string | null; technician_id: string; status: string; scheduled_start: string; scheduled_end: string | null; address: string; contact_name: string | null; contact_phone: string | null; notes: string | null; started_at: string | null; completed_at: string | null; is_manual_entry: boolean };
type Named = { id: string; name: string };
type Question = { id: string; section_id: string; prompt: string; position?: number };
type Section = { id: string; template_id: string; title: string; position: number };
type Profile = { id: string; full_name: string };
type Point = { id: string; label: string; templateId: string | null; created_at: string; started_at: string | null; completed_at: string | null; completion_status: string; cancellationReason: string | null; kind: "luc" | "environment"; skippedSectionIds: string[] };
type PointPause = { id: string; visit_luc_id: string | null; visit_environment_id: string | null; reason_id: string; started_at: string; ended_at: string | null; site_survey_pause_reasons: { name: string } | null };
type ReportResponse = { id: string; question_id: string; answer: unknown };
type RichPart = { text: string; bold?: boolean };
type PointSummary = { title: string; parts: RichPart[]; questionIds: Set<string> };
type VisitMaterial = { id: string; visit_luc_id: string | null; visit_environment_id: string | null; quantity: number; notes: string | null; site_survey_material_catalog: { name?: string } | null; site_survey_screwdriver_types: { name?: string } | null; site_survey_wrench_sizes: { name?: string } | null };
type SortKey = "type" | "created" | "technician";
type MeterMapping = { name: string; position: number };
type Intervention = { id: string; questionId: string; question: string; action: string; answer: string; pointKey: string | null; pointLabel: string; callNumber: string | null };

const valueText = (answer: unknown): string => {
  if (answer && typeof answer === "object" && !Array.isArray(answer) && "value" in answer) { const item = answer as { value: unknown; detail?: unknown }; return [valueText(item.value), typeof item.detail === "string" ? item.detail : ""].filter(Boolean).join(" — "); }
  return Array.isArray(answer) ? answer.join(", ") : String(answer ?? "");
};
const durationMinutes = (start: string | null, end: string | null) => start && end ? Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)) : null;
const pauseMinutes = (pauses: PointPause[], end: string | null = null) => Math.round(pauses.reduce((total, pause) => total + Math.max(0, new Date(pause.ended_at ?? end ?? new Date().toISOString()).getTime() - new Date(pause.started_at).getTime()), 0) / 60000);
const pointDuration = (point: Point, pauses: PointPause[]) => { const total = durationMinutes(point.started_at, point.completed_at); return total === null ? null : Math.max(0, total - pauseMinutes(pauses, point.completed_at)); };
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
const meterSpecification = (flowRate: string | null, mappings: MeterMapping[]) => {
  if (!flowRate || /nao (?:foi )?informad[oa]|sem informacao/i.test(normalize(flowRate))) return "Especificação do hidrômetro não informada";
  const numbers = flowRate.match(/\d+(?:[,.]\d+)?/g)?.map((number) => Number(number.replace(",", "."))) ?? [];
  const rate = numbers.at(-1);
  if (rate === undefined) return "Especificação do hidrômetro não informada";
  const mapping = [...mappings].sort((a, b) => a.position - b.position).find(({ name }) => {
    const limits = name.split(/\s+-\s+/)[0].match(/\d+(?:[,.]\d+)?/g)?.map((number) => Number(number.replace(",", "."))) ?? [];
    if (normalize(name).startsWith("entre") && limits.length >= 2) return rate > limits[0] && rate <= limits[1];
    if (normalize(name).startsWith("ate") && limits.length) return rate <= limits[0];
    return false;
  });
  return mapping?.name.match(/\bDN\s*\d+\b/i)?.[0]?.replace(/\s+/g, "") ?? "Especificação do hidrômetro não informada";
};
const buildPointSummaries = (responses: ReportResponse[], questions: Question[], sections: Section[], skippedSectionIds: string[], meterMappings: MeterMapping[]): PointSummary[] => {
  const summaries: PointSummary[] = [];
  const skipped = new Set(skippedSectionIds);
  const hydraulicSections = ["agua", "hidrometro", "hidraulica"];
  const electricalSections = ["eletrica", "eletrico"];
  const activeResponses = responses.filter((response) => !skipped.has(questions.find((question) => question.id === response.question_id)?.section_id ?? ""));
  const get = (terms: string[], sectionTerms?: string[]) => findAnswer(activeResponses, questions, terms, sections, sectionTerms);
  const questionOrder = (questionId: string) => {
    const question = questions.find((item) => item.id === questionId);
    const section = sections.find((item) => item.id === question?.section_id);
    return (section?.position ?? 0) * 10000 + (question?.position ?? 0);
  };
  const getAll = (terms: string[], sectionTerms?: string[]) => activeResponses
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
  const proseValue = (value: string) => {
    const text = clean(value);
    return /^(outro|outros)\s*(?:—|–|-)\s*/i.test(normalize(text)) ? text.replace(/^(outro|outros)\s*(?:—|–|-)\s*/i, "").trim() : /^(outro|outros)$/i.test(normalize(text)) ? "" : text;
  };
  const lower = (value: string) => proseValue(value).toLocaleLowerCase("pt-BR");
  const isUninformed = (value: string) => /^(nao informad[oa]|nao foi informad[oa]|sem informacao)$/i.test(normalize(value));
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
    const content = proseValue(answer.value);
    if (!content) return false;
    parts.push({ text: before }, { text: content, bold: true }, { text: after });
    return true;
  };

  const sectionFor = (terms: string[]) => sections.find((section) => section.position >= 3 && terms.some((term) => normalize(section.title).includes(term)));
  const hydraulicSection = sectionFor(hydraulicSections);
  const electricalSection = sectionFor(electricalSections);
  const hydraulic: RichPart[] = [];
  const hydraulicIds = new Set<string>();
  const hydraulicAnswer = (terms: string[]) => {
    const answer = get(terms, hydraulicSections);
    if (answer) hydraulicIds.add(answer.id);
    return answer;
  };
  const locations = getAll(["localizacao do hidrometro", "posicao do hidrometro"], hydraulicSections);
  locations.forEach((answer) => hydraulicIds.add(answer.id));
  const locationDetail = hydraulicAnswer(["detalhar para facilitar", "facilitar sua localizacao"]);
  const access = hydraulicAnswer(["dificuldade de acesso", "acesso ao hidrometro"]);
  if (locations.length) {
    hydraulic.push({ text: "O hidrômetro encontra-se " });
    hydraulic.push({ text: placePhrase(proseValue(locations[0].value)), bold: true });
    const remainingLocations = locations.slice(1).map((location) => lower(proseValue(location.value))).filter(Boolean);
    const detail = locationDetail ? lower(proseValue(locationDetail.value)).replace(/^(?:localizad[oa]\s+)?(?:o\s+)?hidr[oô]metro\s+(?:fica|est[aá]|encontra-se)?\s*/i, "").trim() : "";
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
    const pulseUnavailable = normalize(pulseStatus).includes("inoperante") || normalize(pulseStatus) === "nao";
    if (pulseUnavailable) hydraulic.push({ text: "Não existe saída pulsada ou encontra-se inoperante", bold: true }, { text: flowRate ? ` e a vazão nominal ${isUninformed(proseValue(flowRate.value)) ? "" : "é de "}` : ". " });
    else hydraulic.push({ text: pulseWorks ? "Possui saída pulsada " : "A saída pulsada encontra-se " }, { text: pulseWorks ? "funcional" : pulseStatus, bold: true }, { text: flowRate ? ` e a vazão nominal ${isUninformed(proseValue(flowRate.value)) ? "" : "é de "}` : ". " });
  }
  if (flowRate) { const rate = proseValue(flowRate.value); hydraulic.push({ text: pulse ? "" : `A vazão nominal ${isUninformed(rate) ? "" : "é de "}` }, { text: isUninformed(rate) || !rate ? "não foi informada" : rate, bold: true }, { text: ". " }); }
  const flow = hydraulicAnswer(["sentido do fluxo"]);
  if (flow) hydraulic.push({ text: "O sentido do fluxo de água foi classificado como " }, { text: normalize(flow.value).includes("desacordo") || normalize(flow.value).includes("incorret") ? "incorreto" : normalize(flow.value).includes("acordo") || normalize(flow.value).includes("corret") ? "correto" : lower(flow.value), bold: true }, { text: ". " });
  const flange = hydraulicAnswer(["tipo de flange"]);
  if (flange) hydraulic.push({ text: "O flange é do tipo " }, { text: lower(flange.value), bold: true }, { text: ". " });
  const registerType = hydraulicAnswer(["tipo de registro existente"]);
  const registerCondition = hydraulicAnswer(["condicao do registro"]);
  if (registerType) hydraulic.push({ text: "O registro existente é do tipo " }, { text: lower(registerType.value), bold: true }, { text: registerCondition ? " e encontra-se " : ". " });
  if (registerCondition) hydraulic.push({ text: registerType ? "" : "O registro encontra-se " }, { text: lower(registerCondition.value), bold: true }, { text: ". " });
  const diameter = hydraulicAnswer(["diametro da tubulacao"]);
  if (diameter) { const size = proseValue(diameter.value); hydraulic.push({ text: `O diâmetro da tubulação de água ${isUninformed(size) || !size ? "" : "é de "}` }, { text: isUninformed(size) || !size ? "não foi informado" : size, bold: true }, { text: ". " }); }
  const nearbyPower = hydraulicAnswer(["ponto de eletrica proximo", "ponto eletrico proximo"]);
  if (nearbyPower) hydraulic.push({ text: lower(nearbyPower.value).startsWith("sim") ? "Existe ponto de elétrica próximo ao hidrômetro" : "Não existe ponto de elétrica próximo ao hidrômetro", bold: true }, { text: ". " });
  const routing = hydraulicAnswer(["encaminhamento da eletrica", "encaminhamento eletrico"]);
  if (routing) add(hydraulic, "O encaminhamento deve ser realizado por meio de ", { ...routing, value: lower(routing.value) }, ". ");
  const hydraulicComplexity = hydraulicAnswer(["complexidade dessa instalacao", "complexidade da instalacao"]);
  if (hydraulicComplexity) hydraulic.push({ text: "A instalação é de complexidade " }, { text: lower(hydraulicComplexity.value), bold: true }, { text: ". " });
  const consumptionLevel = hydraulicAnswer(["classificacao do perfil de consumo", "perfil de consumo classificado"]);
  const consumptionProfile = hydraulicAnswer(["perfil de consumo da loja"]);
  const profileNotInformed = consumptionProfile && /^(nao informado|nao informada|sem informacao|nao foi informado)$/.test(normalize(lower(consumptionProfile.value)));
  if (consumptionLevel) hydraulic.push({ text: "O perfil de consumo da loja é " }, { text: lower(consumptionLevel.value), bold: true }, { text: consumptionProfile && !profileNotInformed ? ", contemplando " : ". " });
  if (consumptionProfile) {
    const profile = lower(consumptionProfile.value);
    if (profileNotInformed) {
      hydraulic.push({ text: "O perfil de consumo da loja não foi informado." });
    } else {
      hydraulic.push({ text: consumptionLevel ? "" : "O perfil de consumo da loja contempla " }, { text: profile, bold: true }, { text: "." });
    }
  }
  if (hydraulicSection?.id && skipped.has(hydraulicSection.id)) summaries.push({ title: hydraulicSection.title, parts: [{ text: "Não realizada." }], questionIds: hydraulicIds });
  else if (hydraulic.length) summaries.push({ title: `${hydraulicSection?.title.replace(/hidrômetros/i, "Hidrômetros") ?? "Água e Hidrômetros"} - ${meterSpecification(flowRate?.value ?? null, meterMappings)}`, parts: hydraulic, questionIds: hydraulicIds });

  const electrical: RichPart[] = [];
  const electricalIds = new Set<string>();
  const electricalAnswer = (terms: string[]) => {
    const answer = get(terms, electricalSections);
    if (answer) electricalIds.add(answer.id);
    return answer;
  };
  const cable = electricalAnswer(["bitola do cabo"]);
  const breaker = electricalAnswer(["amperagem do disjuntor"]);
  if (cable) add(electrical, "A bitola do cabo de alimentação de entrada é de ", cable, breaker ? " e a amperagem do disjuntor de entrada é de " : ". ");
  if (breaker) electrical.push({ text: cable ? "" : "A amperagem do disjuntor de entrada é de " }, { text: detailOnly(breaker.value), bold: true }, { text: ". " });
  const panelLocation = electricalAnswer(["localizacao do quadro eletrico", "onde se encontra o quadro eletrico"]);
  if (panelLocation?.value && !/^[-.\s]+$/.test(panelLocation.value)) electrical.push({ text: "O quadro elétrico se encontra " }, { text: placePhrase(panelLocation.value), bold: true }, { text: ". " });
  const electricalComplexity = electricalAnswer(["complexidade eletrica", "complexidade dessa instalacao", "complexidade da instalacao"]);
  if (electricalComplexity?.value && !/^[-.\s]+$/.test(electricalComplexity.value)) electrical.push({ text: "A instalação elétrica é de complexidade " }, { text: lower(electricalComplexity.value), bold: true }, { text: "." });
  if (electricalSection?.id && skipped.has(electricalSection.id)) summaries.push({ title: electricalSection.title, parts: [{ text: "Não realizada." }], questionIds: electricalIds });
  else if (electrical.length) summaries.push({ title: electricalSection?.title ?? "Instalação elétrica", parts: electrical, questionIds: electricalIds });
  return summaries;
};
const imageDataUrl = async (url: string, monochrome = false, cropRatio?: number) => new Promise<string>((resolve, reject) => {
  const image = new Image(); image.crossOrigin = "anonymous";
  image.onload = () => { const canvas = document.createElement("canvas"); const scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight)); canvas.width = cropRatio ? 840 : Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = cropRatio ? Math.round(840 / cropRatio) : Math.max(1, Math.round(image.naturalHeight * scale)); const context = canvas.getContext("2d"); if (!context) return reject(new Error("Não foi possível preparar a foto.")); context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height); if (cropRatio) { const sourceWidth = Math.min(image.naturalWidth, image.naturalHeight * cropRatio); const sourceHeight = sourceWidth / cropRatio; context.drawImage(image, (image.naturalWidth - sourceWidth) / 2, (image.naturalHeight - sourceHeight) / 2, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height); } else context.drawImage(image, 0, 0, canvas.width, canvas.height); if (monochrome) { const pixels = context.getImageData(0, 0, canvas.width, canvas.height); for (let index = 0; index < pixels.data.length; index += 4) { const isBackground = pixels.data[index] > 245 && pixels.data[index + 1] > 245 && pixels.data[index + 2] > 245; const value = isBackground ? 255 : 0; pixels.data[index] = value; pixels.data[index + 1] = value; pixels.data[index + 2] = value; } context.putImageData(pixels, 0, 0); } resolve(canvas.toDataURL("image/jpeg", 0.9)); };
  image.onerror = () => reject(new Error("Não foi possível carregar uma foto do relatório.")); image.src = url;
});
const fileBase64 = async (url: string) => {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return btoa(binary);
};
const calculateWorkedTime = (points: Point[], pauses: PointPause[]) => {
  const byDay = new Map<string, Array<[number, number]>>();
  const pausesByDay = new Map<string, Array<[number, number]>>();
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
  for (const pause of pauses) {
    const point = points.find((item) => item.id === (pause.visit_luc_id ?? pause.visit_environment_id) && item.kind === (pause.visit_luc_id ? "luc" : "environment"));
    if (!point?.started_at || !point.completed_at) continue;
    let cursor = new Date(Math.max(new Date(pause.started_at).getTime(), new Date(point.started_at).getTime()));
    const end = new Date(Math.min(new Date(pause.ended_at ?? point.completed_at).getTime(), new Date(point.completed_at).getTime()));
    while (cursor < end) {
      const dayEnd = new Date(cursor); dayEnd.setHours(24, 0, 0, 0);
      const segmentEnd = new Date(Math.min(dayEnd.getTime(), end.getTime()));
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
      pausesByDay.set(key, [...(pausesByDay.get(key) ?? []), [cursor.getTime(), segmentEnd.getTime()]]);
      cursor = segmentEnd;
    }
  }
  const merge = (ranges: Array<[number, number]>) => {
    const merged: Array<[number, number]> = [];
    for (const range of ranges.sort((left, right) => left[0] - right[0])) {
      const previous = merged.at(-1);
      if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]); else merged.push([...range]);
    }
    return merged;
  };
  let worked = 0; let paused = 0; let overtime = 0; let night = 0;
  for (const [key, ranges] of byDay) {
    const merged = merge(ranges);
    const mergedPauses = merge(pausesByDay.get(key) ?? []);
    const daily = merged.reduce((total, [start, end]) => total + (end - start) / 60000, 0);
    const dailyPaused = mergedPauses.reduce((total, [start, end]) => total + merged.reduce((overlap, [workStart, workEnd]) => overlap + Math.max(0, Math.min(end, workEnd) - Math.max(start, workStart)) / 60000, 0), 0);
    worked += daily - dailyPaused; paused += dailyPaused; overtime += Math.max(0, daily - 480);
    for (const [start, end] of merged) {
      const date = new Date(start); const midnight = new Date(date); midnight.setHours(0, 0, 0, 0);
      const five = midnight.getTime() + 5 * 3600000; const twentyTwo = midnight.getTime() + 22 * 3600000;
      night += Math.max(0, Math.min(end, five) - start) / 60000;
      night += Math.max(0, end - Math.max(start, twentyTwo)) / 60000;
    }
  }
  return { worked: Math.round(worked), paused: Math.round(paused), useful: Math.round(worked + paused), overtime: Math.round(overtime), night: Math.round(night) };
};

export function SiteSurveyReportButton({ visit, clients, units, projects, technicians, questions, sections, assumptions, iconOnly = true }: { visit: Visit; clients: Named[]; units: Named[]; projects: Named[]; technicians: Profile[]; questions: Question[]; sections: Section[]; assumptions: TimeAssumption[]; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [deadlineDays, setDeadlineDays] = useState("1");
  const [includePhotos, setIncludePhotos] = useState(true);
  const [primarySort, setPrimarySort] = useState<SortKey>("created");
  const [secondarySort, setSecondarySort] = useState<SortKey | "none">("none");
  const [generatingPdf, setGeneratingPdf] = useState<"bw" | "color" | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["site-survey-report", visit.id], enabled: open, queryFn: async () => {
    const [{ data: lucs, error: lucError }, { data: environments, error: envError }, { data: responses, error: responseError }, { data: attachments, error: attachmentError }, { data: calls, error: callError }, { data: visitTechs }, { data: materials, error: materialError }, { data: pauses, error: pauseError }, { data: meterCatalogs, error: meterError }] = await Promise.all([
       supabase.from("site_survey_visit_lucs").select("id,luc_number,shop_name,created_at,started_at,completed_at,completion_status,skipped_section_ids,cancellation_reason_id,site_survey_cancellation_reasons(name)").eq("visit_id", visit.id).eq("active", true).order("luc_number"),
        supabase.from("site_survey_visit_environments").select("id,name,template_id,created_at,started_at,completed_at,completion_status,skipped_section_ids").eq("visit_id", visit.id).eq("active", true).order("name"),
      supabase.from("site_survey_responses").select("id,question_id,visit_luc_id,visit_environment_id,answer").eq("visit_id", visit.id),
      supabase.from("site_survey_attachments").select("id,visit_luc_id,visit_environment_id,file_name,storage_path,content_type,attachment_kind").eq("visit_id", visit.id).order("created_at"),
       supabase.from("site_survey_generated_calls").select("id,question_id,trigger_value,visit_luc_id,visit_environment_id,status,site_survey_question_actions(site_survey_action_catalog(name)),internal_calls(call_number,title,description,status)").eq("visit_id", visit.id),
      supabase.from("site_survey_visit_technicians").select("technician_id,visit_luc_id,visit_environment_id").eq("visit_id", visit.id),
      supabase.from("site_survey_visit_materials").select("id,visit_luc_id,visit_environment_id,quantity,notes,site_survey_material_catalog(name),site_survey_screwdriver_types(name),site_survey_wrench_sizes(name)").eq("visit_id", visit.id).order("created_at"),
      supabase.from("site_survey_point_pauses").select("id,visit_luc_id,visit_environment_id,reason_id,started_at,ended_at,site_survey_pause_reasons(name)").eq("visit_id", visit.id).order("started_at"),
       supabase.from("site_survey_custom_catalogs").select("name,site_survey_custom_catalog_items(name,position,active)").ilike("name", "De-Para de Hidrômetros").eq("active", true),
    ]);
    const error = lucError ?? envError ?? responseError ?? attachmentError ?? callError ?? materialError ?? pauseError ?? meterError; if (error) throw error;
      const points: Point[] = [...(lucs ?? []).map((item) => { const reason = item.site_survey_cancellation_reasons as unknown as { name?: string } | null; return { id: item.id, label: `LUC ${item.luc_number} — ${item.shop_name}`, templateId: visit.template_id, created_at: item.created_at, started_at: item.started_at, completed_at: item.completed_at, completion_status: item.completion_status, cancellationReason: reason?.name ?? null, kind: "luc" as const, skippedSectionIds: Array.isArray(item.skipped_section_ids) ? item.skipped_section_ids.filter((id): id is string => typeof id === "string") : [] }; }), ...(environments ?? []).map((item) => ({ id: item.id, label: item.name, templateId: item.template_id ?? visit.template_id, created_at: item.created_at, started_at: item.started_at, completed_at: item.completed_at, completion_status: item.completion_status, cancellationReason: null, kind: "environment" as const, skippedSectionIds: Array.isArray(item.skipped_section_ids) ? item.skipped_section_ids.filter((id): id is string => typeof id === "string") : [] }))];
    return { points, responses: responses ?? [], attachments: attachments ?? [], calls: calls ?? [], visitTechs: visitTechs ?? [], materials: (materials ?? []) as unknown as VisitMaterial[], pauses: (pauses ?? []) as PointPause[], meterMappings: (meterCatalogs ?? []).flatMap((catalog) => catalog.site_survey_custom_catalog_items.filter((item) => item.active).map((item) => ({ name: item.name, position: item.position }))) };
  } });
  const calculation = useMemo(() => {
    const points = data?.points.filter((point) => point.completion_status !== "cancelada") ?? [];
    const responses = data?.responses ?? [];
    const breakdown = assumptions.map((assumption) => {
      const occurrences = assumption.question_id ? responses.filter((response) => response.question_id === assumption.question_id && (!assumption.answer_value || valueText(response.answer).toLocaleLowerCase("pt-BR").split(/[,;—]/).map((value: string) => value.trim()).includes(assumption.answer_value.toLocaleLowerCase("pt-BR")))).length : points.length;
      return { ...assumption, occurrences, total: occurrences * assumption.minutes };
    }).filter((item) => item.occurrences > 0);
    const estimated = breakdown.reduce((total, item) => total + item.total, 0);
    const workedTime = calculateWorkedTime(points, data?.pauses ?? []);
    const assignedCount = Math.max(1, new Set([visit.technician_id, ...(data?.visitTechs.map((item) => item.technician_id) ?? [])]).size);
    const days = estimated ? Math.ceil(estimated / (480 * assignedCount)) : 0;
    const requestedDays = Math.max(1, Number(deadlineDays) || 1);
    const techniciansNeeded = estimated ? Math.ceil(estimated / (480 * requestedDays)) : 0;
    return { breakdown, estimated, ...workedTime, pauseCount: data?.pauses.length ?? 0, assignedCount, days, techniciansNeeded };
  }, [assumptions, data, deadlineDays, visit.technician_id]);
  const reportSections = sections.filter((section) => section.template_id === visit.template_id);
  const sectionsForPoint = (point: Point) => sections.filter((section) => section.template_id === point.templateId);
  const reviewSectionForPoint = (point: Point) => sectionsForPoint(point).find((section) => section.position === 6 || normalize(section.title).includes("revisao"));
  const pointResponses = (point: Point) => (data?.responses ?? []).filter((response) => point.kind === "luc" ? response.visit_luc_id === point.id : response.visit_environment_id === point.id);
  const pausesForPoint = (point: Point) => (data?.pauses ?? []).filter((pause) => point.kind === "luc" ? pause.visit_luc_id === point.id : pause.visit_environment_id === point.id);
  const technicianForPoint = (point: Point) => {
    const assigned = data?.visitTechs.filter((item) => point.kind === "luc" ? item.visit_luc_id === point.id : item.visit_environment_id === point.id) ?? [];
    const ids = assigned.length ? assigned.map((item) => item.technician_id) : [visit.technician_id, ...(data?.visitTechs.filter((item) => !item.visit_luc_id && !item.visit_environment_id).map((item) => item.technician_id) ?? [])];
    return [...new Set(ids.map((id) => technicians.find((person) => person.id === id)?.full_name).filter((name): name is string => Boolean(name)))].sort((a, b) => a.localeCompare(b, "pt-BR")).join(", ") || "—";
  };
  const sortedPoints = useMemo(() => {
    const compare = (a: Point, b: Point, key: SortKey) => key === "type" ? (a.kind === b.kind ? 0 : a.kind === "luc" ? -1 : 1) : key === "created" ? a.created_at.localeCompare(b.created_at) : technicianForPoint(a).localeCompare(technicianForPoint(b), "pt-BR");
    return [...(data?.points ?? [])].sort((a, b) => compare(a, b, primarySort) || (secondarySort !== "none" ? compare(a, b, secondarySort) : 0) || a.created_at.localeCompare(b.created_at) || a.label.localeCompare(b.label, "pt-BR"));
  }, [data?.points, data?.visitTechs, technicians, visit.technician_id, primarySort, secondarySort]);
  const interventions = useMemo<Intervention[]>(() => (data?.calls ?? []).flatMap((call) => {
    const actionRule = call.site_survey_question_actions as unknown as { site_survey_action_catalog: { name: string } | null } | null;
    const action = actionRule?.site_survey_action_catalog?.name ?? "";
    if (!normalize(action).includes("intervencao do cliente") || call.status === "cancelado") return [];
    const linked = call.internal_calls as unknown as { call_number?: string; status?: string } | null;
    if (linked?.status === "cancelado") return [];
    const point = data?.points.find((item) => item.kind === (call.visit_luc_id ? "luc" : "environment") && item.id === (call.visit_luc_id ?? call.visit_environment_id));
    return [{ id: call.id, questionId: call.question_id, question: questions.find((item) => item.id === call.question_id)?.prompt ?? "Pergunta não disponível", action, answer: call.trigger_value, pointKey: point ? `${point.kind}-${point.id}` : null, pointLabel: point?.label ?? "Visita geral", callNumber: linked?.call_number ?? null }];
  }), [data?.calls, data?.points, questions]);
  const interventionTotals = useMemo(() => {
    const groups = new Map<string, { action: string; question: string; answer: string; items: Intervention[] }>();
    for (const item of interventions) {
      const key = JSON.stringify([item.action, item.questionId, item.answer]);
      const group = groups.get(key) ?? { action: item.action, question: item.question, answer: item.answer, items: [] };
      group.items.push(item);
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => a.action.localeCompare(b.action, "pt-BR") || a.question.localeCompare(b.question, "pt-BR") || a.answer.localeCompare(b.answer, "pt-BR"));
  }, [interventions]);
  const materialSectionForPoint = (point: Point) => sectionsForPoint(point).find((section) => section.position >= 3 && normalize(section.title).includes("materiais") && normalize(section.title).includes("equipamentos"));
  const materialSectionTitle = (point: Point) => materialSectionForPoint(point)?.title ?? "Materiais e equipamentos";
  const reviewTitle = (point: Point) => reviewSectionForPoint(point)?.title ?? "Revisão, pendências, fotos e encerramento";
  const reviewSkipped = (point: Point) => { const section = reviewSectionForPoint(point); return Boolean(section && point.skippedSectionIds.includes(section.id)); };
  const pointNotes = (point: Point) => { const section = reviewSectionForPoint(point); return section && !point.skippedSectionIds.includes(section.id) ? pointResponses(point).filter((response) => questions.some((question) => question.id === response.question_id && question.section_id === section.id)).map((response) => valueText(response.answer)).filter(Boolean).join("; ") : ""; };
  const technicalTotals = useMemo(() => {
    const groups = [{ label: "Tipos de hidrômetro", terms: ["tipo de hidrometro", "tipo de registro"] }, { label: "Dificuldade de acesso", terms: ["dificuldade", "acesso ao hidrometro"] }, { label: "Quadros e pontos elétricos", terms: ["quadro eletrico", "ponto eletrico"] }, { label: "Complexidade", terms: ["complexidade"] }];
    return groups.map((group) => { const counts = new Map<string, number>(); for (const response of data?.responses ?? []) { const question = questions.find((item) => item.id === response.question_id); if (!question || !group.terms.some((term) => normalize(question.prompt).includes(term))) continue; const value = valueText(response.answer).trim(); if (value) counts.set(value, (counts.get(value) ?? 0) + 1); } return { label: group.label, values: [...counts.entries()] }; }).filter((group) => group.values.length);
  }, [data?.responses, questions]);
  const pointSummaries = (point: Point) => { const pointSections = sectionsForPoint(point); const reviewId = reviewSectionForPoint(point)?.id; return buildPointSummaries((pointResponses(point) as ReportResponse[]).filter((response) => !reviewId || !questions.some((question) => question.id === response.question_id && question.section_id === reviewId)), questions, pointSections, point.skippedSectionIds, data?.meterMappings ?? []); };
  const pointMaterials = (point: Point) => (data?.materials ?? []).filter((item) => point.kind === "luc" ? item.visit_luc_id === point.id : item.visit_environment_id === point.id);
  const materialSentence = (point: Point) => {
    const materialSection = materialSectionForPoint(point);
    if (materialSection && point.skippedSectionIds.includes(materialSection.id)) return "Não realizada.";
    const materials = pointMaterials(point);
    if (!materials.length) {
      const specialQuestion = questions.find((question) => normalize(question.prompt).includes("equipamento") && normalize(question.prompt).includes("ferramenta especial") && (!materialSection || question.section_id === materialSection.id));
      const answer = pointResponses(point).find((response) => response.question_id === specialQuestion?.id);
      return answer && /^(nao|não)$/i.test(valueText(answer.answer).trim()) ? `Para a instalação ${point.kind === "luc" ? "nessa loja" : "nesse ambiente"}, não é necessário utilizar equipamento ou ferramenta especial.` : "";
    }
    const descriptions = materials.map((item) => {
      const details = [item.site_survey_screwdriver_types?.name, item.site_survey_wrench_sizes?.name, item.notes].filter(Boolean).join(" — ");
      return `${item.quantity} × ${item.site_survey_material_catalog?.name ?? "ferramenta"}${details ? ` (${details})` : ""}`;
    });
    const list = descriptions.length === 1 ? descriptions[0] : `${descriptions.slice(0, -1).join(", ")} e ${descriptions.at(-1)}`;
    return `Para a instalação ${point.kind === "luc" ? "nessa loja" : "nesse ambiente"}, é necessário utilizar ${list}.`;
  };
  const exportPdf = async (blackAndWhite: boolean, withPhotos: boolean) => {
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
    if (!visit.is_manual_entry) autoTable(pdf, { startY: y, theme: "plain", styles: { font: "Nunito", fontSize: 8, textColor: dark, lineColor: soft, lineWidth: { bottom: 0.12 } }, headStyles: tableHead, columnStyles: { 1: { halign: "center" } }, head: [["Planejamento", "Valor"]], body: [["Tempo estimado", formatMinutes(calculation.estimated)], ["Tempo em visita", formatMinutes(calculation.worked)], ["Quantidade de pausas", String(calculation.pauseCount)], ["Tempo de pausas (horas úteis)", formatMinutes(calculation.paused)], ["Total de horas úteis", formatMinutes(calculation.useful)], ["Horas extras", formatMinutes(calculation.overtime)], ["Horas noturnas (22h às 5h)", formatMinutes(calculation.night)], ["Dias com equipe designada", String(calculation.days)], [`Técnicos para ${deadlineDays} dia(s)`, String(calculation.techniciansNeeded)]] });
    if (!visit.is_manual_entry) y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 11;
    const totalsBody = technicalTotals.flatMap((group) => group.values.map(([value, count], index) => [index === 0 ? group.label : "", value, String(count)]));
    totalsBody.push(["Chamados", "Total", String(data.calls.filter((item) => item.internal_calls).length)]);
    autoTable(pdf, { startY: y, theme: "plain", styles: { font: "Nunito", fontSize: 8, textColor: dark, lineColor: soft, lineWidth: { bottom: 0.12 } }, headStyles: tableHead, columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 }, 2: { halign: "center", cellWidth: 28 } }, head: [["Totalizadores técnicos", "Classificação", "Quantidade"]], body: totalsBody });
    y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
    if (interventionTotals.length) {
      autoTable(pdf, { startY: y, theme: "plain", margin: { top: 18, bottom: 18, left: 14, right: 14 }, styles: { font: "Nunito", fontSize: 8, textColor: dark, lineColor: soft, lineWidth: { bottom: 0.12 }, overflow: "linebreak" }, headStyles: tableHead, columnStyles: { 2: { halign: "center", cellWidth: 21 } }, head: [["Intervenções do cliente", "Pergunta / resposta", "Qtd.", "Lojas e ambientes"]], body: interventionTotals.map((group) => [group.action, `${group.question} — ${group.answer}`, String(group.items.length), [...new Set(group.items.map((item) => item.pointLabel))].join("; ")]) });
      y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
    }
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
    for (const point of sortedPoints) {
      if (y > 250) { pdf.addPage(); y = 18; }
      pdf.setFont("Nunito", "extrabold"); pdf.setFontSize(12); pdf.setTextColor(...purple); pdf.text(point.label, 14, y); pdf.setDrawColor(...purple); pdf.setLineWidth(0.35); pdf.line(14, y + 2, 196, y + 2); pdf.setTextColor(...dark); y += 8;
      pdf.setFont("Nunito", "normal"); pdf.setFontSize(9); for (const line of pdf.splitTextToSize(`Técnico(s): ${technicianForPoint(point)}`, 182)) { pdf.text(line, 14, y); y += 5; } y += 1;
      const stageSeven = pointNotes(point);
      const tools = materialSentence(point);
      const calls = data.calls.filter((item) => Boolean(item.internal_calls) && (point.kind === "luc" ? item.visit_luc_id === point.id : item.visit_environment_id === point.id)).map((call) => { const linked = call.internal_calls as unknown as { call_number?: string; title?: string; status?: string } | null; return linked ? `#${linked.call_number ?? "—"} ${linked.title ?? "Chamado"} (${linked.status ?? call.status})` : call.status; }).join("; ");
      if (!visit.is_manual_entry) { pdf.setFont("Nunito", "normal"); pdf.setFontSize(9); pdf.text(`Início: ${point.started_at ? new Date(point.started_at).toLocaleString("pt-BR") : "não registrado"}  |  Conclusão: ${point.completed_at ? new Date(point.completed_at).toLocaleString("pt-BR") : "não registrada"}  |  Duração: ${formatMinutes(pointDuration(point, pausesForPoint(point)))}`, 14, y); y += 6; }
      const pointPauses = pausesForPoint(point);
      if (!visit.is_manual_entry && pointPauses.length) { for (const pause of pointPauses) { if (y > 270) { pdf.addPage(); y = 18; } pdf.setFontSize(8); pdf.text(`Pausa: ${pause.site_survey_pause_reasons?.name ?? "Motivo registrado"} — ${formatMinutes(durationMinutes(pause.started_at, pause.ended_at))}${pause.ended_at ? "" : " (em andamento)"}`, 14, y); y += 5; } }
      if (point.completion_status === "cancelada") { pdf.setFont("Nunito", "bold"); pdf.setTextColor(...purple); pdf.text(`Cancelada — Motivo: ${point.cancellationReason ?? "não informado"}`, 14, y); pdf.setTextColor(...dark); y += 7; }
      for (const summary of pointSummaries(point)) {
        if (y > 260) { pdf.addPage(); y = 18; }
        pdf.setFont("Nunito", "bold"); pdf.setFontSize(10); pdf.text(summary.title, 14, y); pdf.setFontSize(9); y = drawRichParagraph(summary.parts, y + 7) + 4;
      }
       if (tools) { if (y > 262) { pdf.addPage(); y = 18; } pdf.setFont("Nunito", "bold"); pdf.text(materialSectionTitle(point), 14, y); y = drawRichParagraph([{ text: tools }], y + 5) + 2; }
       if (reviewSkipped(point)) { if (y > 262) { pdf.addPage(); y = 18; } pdf.setFont("Nunito", "bold"); pdf.text(reviewTitle(point), 14, y); pdf.setFontSize(9); y = drawRichParagraph([{ text: "Não realizada." }], y + 5) + 2; }
       if (stageSeven) { if (y > 262) { pdf.addPage(); y = 18; } pdf.setFont("Nunito", "bold"); pdf.text(reviewTitle(point), 14, y); y += 5; pdf.setFontSize(9); pdf.text("Observações finais da visita", 14, y); y = drawRichParagraph([{ text: stageSeven }], y + 5) + 2; }
      if (calls) { if (y > 262) { pdf.addPage(); y = 18; } pdf.setFont("Nunito", "bold"); pdf.text("Ações e chamados", 14, y); y = drawRichParagraph([{ text: calls }], y + 5) + 2; }
      const photos = withPhotos ? data.attachments.filter((item) => item.content_type?.startsWith("image/") && (point.kind === "luc" ? item.visit_luc_id === point.id : item.visit_environment_id === point.id)) : [];
      let photoColumn = 0;
      for (const photo of photos) { const { data: signed } = await supabase.storage.from("site-survey-attachments").createSignedUrl(photo.storage_path, 300); if (!signed?.signedUrl) continue; if (photoColumn === 0 && y > 245) { pdf.addPage(); y = 18; } try { pdf.addImage(await imageDataUrl(signed.signedUrl, false, 42 / 31), "JPEG", 14 + photoColumn * 46, y, 42, 31, undefined, "FAST"); photoColumn += 1; if (photoColumn === 4) { photoColumn = 0; y += 35; } } catch { /* Mantém o PDF disponível caso uma foto falhe. */ } }
      if (photoColumn > 0) y += 35;
      const pointInterventions = interventions.filter((item) => item.pointKey === `${point.kind}-${point.id}`);
      if (pointInterventions.length) {
        if (y > 255) { pdf.addPage(); y = 18; }
        pdf.setFont("Nunito", "bold"); pdf.setFontSize(10); pdf.text("Ações — intervenção do cliente", 14, y); y += 6;
        pdf.setFontSize(9);
        for (const item of pointInterventions) y = drawRichParagraph([{ text: `${item.question} — ${item.answer}. ${item.action}${item.callNumber ? ` (chamado #${item.callNumber})` : ""}.` }], y + 1) + 2;
      }
      y += 10;
    }
    const generalInterventions = interventions.filter((item) => item.pointKey === null);
    if (generalInterventions.length) {
      if (y > 255) { pdf.addPage(); y = 18; }
      pdf.setFont("Nunito", "bold"); pdf.setFontSize(10); pdf.text("Ações gerais — intervenção do cliente", 14, y); y += 6; pdf.setFontSize(9);
      for (const item of generalInterventions) y = drawRichParagraph([{ text: `${item.question} — ${item.answer}. ${item.action}${item.callNumber ? ` (chamado #${item.callNumber})` : ""}.` }], y + 1) + 2;
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
      await exportPdf(blackAndWhite, includePhotos);
      toast.success("Relatório gerado com sucesso.", { id: toastId });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o relatório. Tente novamente.", { id: toastId });
    } finally {
      setGeneratingPdf(null);
    }
  };
  return <><Button type="button" size={iconOnly ? "compactIcon" : "sm"} variant="ghost" aria-label={`Gerar relatório da visita ${visit.survey_number}`} title="Relatório da visita" onClick={() => setOpen(true)}><FileChartColumn className="h-4 w-4" />{iconOnly ? null : "Relatório"}</Button><Dialog open={open} onOpenChange={(nextOpen) => { if (!generatingPdf) setOpen(nextOpen); }}><DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle>Relatório Site Survey #{String(visit.survey_number).padStart(12, "0")}</DialogTitle><DialogDescription>Prévia consolidada da OS, com respostas, ações e fotos.</DialogDescription></DialogHeader>{isLoading || !data ? <p className="py-10 text-center text-muted-foreground">Preparando relatório...</p> : <div className="space-y-6"><section className="grid gap-3 border-y py-4 sm:grid-cols-3"><ReportInfo label="Cliente" value={clients.find((item) => item.id === visit.client_id)?.name ?? "—"} /><ReportInfo label="Unidade" value={units.find((item) => item.id === visit.client_unit_id)?.name ?? "—"} /><ReportInfo label="Projeto" value={projects.find((item) => item.id === visit.project_id)?.name ?? "—"} /><ReportInfo label="Técnico" value={technicians.find((item) => item.id === visit.technician_id)?.full_name ?? "—"} /><ReportInfo label={visit.is_manual_entry ? "Data da visita" : "Agendamento"} value={new Date(visit.scheduled_start).toLocaleString("pt-BR")} /><ReportInfo label="Contato" value={[visit.contact_name, visit.contact_phone].filter(Boolean).join(" · ") || "—"} /></section>{!visit.is_manual_entry ? <section><h3 className="font-bold">Planejamento de capacidade</h3><div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6"><ReportInfo label="Tempo estimado" value={formatMinutes(calculation.estimated)} /><ReportInfo label="Tempo em visita" value={formatMinutes(calculation.worked)} /><ReportInfo label="Quantidade de pausas" value={String(calculation.pauseCount)} /><ReportInfo label="Tempo de pausas" value={formatMinutes(calculation.paused)} /><ReportInfo label="Horas úteis" value={formatMinutes(calculation.useful)} /><ReportInfo label="Horas extras" value={formatMinutes(calculation.overtime)} /><ReportInfo label="Horas noturnas" value={formatMinutes(calculation.night)} /><ReportInfo label={`Dias com ${calculation.assignedCount} técnico(s)`} value={String(calculation.days)} /><ReportInfo label="Total de chamados" value={String(data.calls.filter((item) => item.internal_calls).length)} /><div className="space-y-1"><Label htmlFor={`deadline-${visit.id}`} className="text-xs text-muted-foreground">Prazo desejado em dias</Label><Input id={`deadline-${visit.id}`} type="number" min="1" value={deadlineDays} onChange={(event) => setDeadlineDays(event.target.value)} /><p className="text-sm font-semibold">{calculation.techniciansNeeded} técnico(s) necessário(s)</p></div></div>{calculation.breakdown.length ? <ul className="mt-3 space-y-1 text-sm text-muted-foreground">{calculation.breakdown.map((item) => <li key={item.id}>{item.name}: {item.occurrences} × {item.minutes} min = {item.total} min</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">Cadastre premissas de tempo para calcular a estimativa.</p>}</section> : null}{interventionTotals.length ? <section className="space-y-3"><h3 className="font-bold">Totalizadores — intervenções do cliente</h3><div className="overflow-x-auto"><table className="w-full min-w-[620px] border-collapse text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="py-2 pr-3">Tipo de intervenção</th><th className="py-2 pr-3">Pergunta / resposta</th><th className="py-2 pr-3">Qtd.</th><th className="py-2">Lojas e ambientes</th></tr></thead><tbody>{interventionTotals.map((group) => <tr key={JSON.stringify([group.action, group.items[0]?.questionId, group.answer])} className="border-b align-top"><td className="py-2 pr-3 font-medium">{group.action}</td><td className="py-2 pr-3">{group.question} — {group.answer}</td><td className="py-2 pr-3">{group.items.length}</td><td className="py-2">{[...new Set(group.items.map((item) => item.pointLabel))].join("; ")}</td></tr>)}</tbody></table></div></section> : null}<section className="space-y-6"><h3 className="font-bold">Lojas e ambientes</h3>{sortedPoints.map((point) => { const photos = data.attachments.filter((item) => (includePhotos || !item.content_type?.startsWith("image/")) && (point.kind === "luc" ? item.visit_luc_id === point.id : item.visit_environment_id === point.id)); const calls = data.calls.filter((item) => Boolean(item.internal_calls) && (point.kind === "luc" ? item.visit_luc_id === point.id : item.visit_environment_id === point.id)); const stageSeven = pointNotes(point); const tools = materialSentence(point); return <article key={`${point.kind}-${point.id}`} className="border-b border-border pb-6"><div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-semibold text-accent">{point.label}</h4><p className="text-xs text-muted-foreground">Técnico(s): {technicianForPoint(point)}</p>{!visit.is_manual_entry ? <p className="text-xs text-muted-foreground">{point.started_at ? new Date(point.started_at).toLocaleString("pt-BR") : "Início não registrado"} · {formatMinutes(pointDuration(point, pausesForPoint(point)))}</p> : null}{!visit.is_manual_entry && pausesForPoint(point).length ? <p className="mt-1 text-xs text-muted-foreground">Pausas: {pausesForPoint(point).length} · {formatMinutes(pauseMinutes(pausesForPoint(point), point.completed_at))}</p> : null}{point.completion_status === "cancelada" ? <p className="mt-1 text-sm font-semibold text-accent">Motivo do cancelamento: {point.cancellationReason ?? "não informado"}</p> : null}</div><span className="text-sm capitalize">{point.completion_status}</span></div><div className="mt-5 space-y-5">{pointSummaries(point).map((summary, index) => <section key={`${summary.title}-${index}`}><h5 className="text-sm font-semibold">{summary.title}</h5><p className="mt-2 text-sm leading-[1.15]">{summary.parts.map((part, partIndex) => part.bold ? <strong key={partIndex}>{part.text}</strong> : <span key={partIndex}>{part.text}</span>)}</p></section>)}{tools ? <section><h5 className="text-sm font-semibold">{materialSectionTitle}</h5><p className="mt-2 text-sm leading-[1.15]">{tools}</p></section> : null}{reviewSkipped(point) ? <section><h5 className="text-sm font-semibold">{reviewTitle}</h5><p className="mt-2 text-sm leading-[1.15]">Não realizada.</p></section> : null}{stageSeven ? <section><h5 className="text-sm font-semibold">{reviewTitle}</h5><p className="mt-2 text-sm font-semibold">Observações finais da visita</p><p className="mt-2 text-sm leading-[1.15]">{stageSeven}</p></section> : null}</div>{calls.length ? <div className="mt-4 border-t pt-3 text-sm"><strong>Ações:</strong> {calls.map((call) => { const linked = call.internal_calls as unknown as { call_number?: string; title?: string; status?: string } | null; return linked ? `#${linked.call_number ?? "—"} ${linked.title ?? "Chamado"} (${linked.status ?? call.status})` : call.status; }).join("; ")}</div> : null}{photos.length > 0 ? <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{photos.map((photo) => <ReportPhoto key={photo.id} path={photo.storage_path} name={photo.file_name} />)}</div> : null}{(() => { const actions = interventions.filter((item) => item.pointKey === `${point.kind}-${point.id}`); return actions.length ? <section className="mt-4 border-t pt-3 text-sm"><h5 className="font-semibold">Ações — intervenção do cliente</h5><ul className="mt-2 space-y-1">{actions.map((item) => <li key={item.id}>{item.question} — {item.answer}. {item.action}{item.callNumber ? ` (chamado #${item.callNumber})` : ""}.</li>)}</ul></section> : null; })()}</article>; })}</section>{interventions.some((item) => item.pointKey === null) ? <section className="space-y-2 border-t pt-4 text-sm"><h3 className="font-bold">Ações gerais — intervenção do cliente</h3><ul className="space-y-1">{interventions.filter((item) => item.pointKey === null).map((item) => <li key={item.id}>{item.question} — {item.answer}. {item.action}{item.callNumber ? ` (chamado #${item.callNumber})` : ""}.</li>)}</ul></section> : null}{generatingPdf ? <p className="flex items-center justify-end gap-2 text-sm font-semibold" role="status" aria-live="polite"><LoaderCircle className="h-4 w-4 animate-spin" />Relatório em elaboração. Aguarde…</p> : null}<div className="grid gap-3 border-t pt-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor={`sort-primary-${visit.id}`} className="text-sm">Ordenar PDF por</Label><Select value={primarySort} onValueChange={(value: SortKey) => { setPrimarySort(value); if (secondarySort === value) setSecondarySort("none"); }}><SelectTrigger id={`sort-primary-${visit.id}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="created">Horário / sequência do cadastro</SelectItem><SelectItem value="type">Tipo — lojas antes de ambientes</SelectItem><SelectItem value="technician">Técnico da visita</SelectItem></SelectContent></Select></div><div className="space-y-1.5"><Label htmlFor={`sort-secondary-${visit.id}`} className="text-sm">Depois, ordenar por</Label><Select value={secondarySort} onValueChange={(value: SortKey | "none") => setSecondarySort(value)}><SelectTrigger id={`sort-secondary-${visit.id}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem segunda ordenação</SelectItem>{primarySort !== "created" ? <SelectItem value="created">Horário / sequência do cadastro</SelectItem> : null}{primarySort !== "type" ? <SelectItem value="type">Tipo — lojas antes de ambientes</SelectItem> : null}{primarySort !== "technician" ? <SelectItem value="technician">Técnico da visita</SelectItem> : null}</SelectContent></Select></div></div><div className="grid grid-cols-2 items-center gap-2 sm:flex sm:justify-end"><div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:mr-3"><Checkbox id={`report-photos-${visit.id}`} checked={includePhotos} disabled={Boolean(generatingPdf)} onCheckedChange={(checked) => setIncludePhotos(checked === true)} /><Label htmlFor={`report-photos-${visit.id}`} className="cursor-pointer text-sm font-medium">Incluir fotos</Label></div><Button type="button" variant="outline" disabled={Boolean(generatingPdf)} aria-busy={generatingPdf === "bw"} onClick={() => void handleExportPdf(true)}>{generatingPdf === "bw" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}{generatingPdf === "bw" ? "Gerando…" : "PDF P&B"}</Button><Button type="button" disabled={Boolean(generatingPdf)} aria-busy={generatingPdf === "color"} onClick={() => void handleExportPdf(false)}>{generatingPdf === "color" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{generatingPdf === "color" ? "Gerando…" : "PDF colorido"}</Button></div></div>}</DialogContent></Dialog></>;
}

function ReportInfo({ label, value }: { label: string; value: string }) { return <div className="border-l-2 border-myio-green pl-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>; }
function ReportPhoto({ path, name }: { path: string; name: string }) { const { data } = useQuery({ queryKey: ["site-survey-report-photo", path], queryFn: async () => { const { data, error } = await supabase.storage.from("site-survey-attachments").createSignedUrl(path, 3600); if (error) throw error; return data.signedUrl; } }); return data ? <img src={data} alt={name} className="aspect-[4/3] w-full rounded-sm border object-cover" /> : <div className="aspect-[4/3] w-full animate-pulse rounded-sm bg-muted" />; }