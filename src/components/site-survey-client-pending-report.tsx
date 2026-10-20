import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { buildClientPendingGroups, duplicateNamePoints, unidentifiedLucPoints, splitUnidentifiedByName, vacantShopPoints, type ClientPendingPoint, type ClientPendingResponse } from "@/lib/site-survey-client-pending";
import nunitoRegularUrl from "@/assets/fonts/nunito-regular.ttf?url";
import nunitoBoldUrl from "@/assets/fonts/nunito-bold.ttf?url";
import { surveyPointType } from "@/lib/site-survey-point-type";
import { clipRoundedPhoto } from "@/lib/site-survey-photo";
import { textColumnWidth } from "@/lib/site-survey-pdf-measure";
import { encodeCustomerAnswerMap, type CustomerAnswerField } from "@/lib/site-survey-customer-answer-import";

type Props = {
  visit: { id: string; survey_number: number; completed_at: string | null; scheduled_start: string };
  client: string; unit: string; project: string; points: ClientPendingPoint[];
  questions: { id: string; prompt: string; question_key?: string | null; conditioned_on_question_id?: string | null; conditioned_operator?: string | null; conditioned_value?: string | null }[];
};

/* Checkbox verde do app dentro do PDF: desmarcado por padrão (borda verde) e, ao marcar, fundo verde com ✓. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const styleGreenCheckbox = (pdf: any, box: any) => {
  // Verde do app (#0fc482) em RGB 0–1.
  const green = "0.059 0.769 0.510";
  const f2 = (n: number) => n.toFixed(2);
  const appearance = pdf.AcroFormAppearance;
  // Marcado: fundo verde com o ✓ escuro, como no app.
  const on = (formObject: any) => {
    const w = appearance.internal.getWidth(formObject), h = appearance.internal.getHeight(formObject);
    const xobj = appearance.CheckBox.OffPushDown(formObject);
    const fontKey = formObject.scope.internal.getFont(formObject.fontName, formObject.fontStyle).id;
    const size = Math.min(h * 0.8, w * 0.8);
    xobj.stream = [
      `${green} rg`, `0 0 ${f2(w)} ${f2(h)} re`, "f",
      "0 0 0 rg", "BT", `/${fontKey} ${f2(size)} Tf`,
      `${f2(w / 2 - size * 0.38)} ${f2(h / 2 - size * 0.32)} Td`, "(3) Tj", "ET",
    ].join("\n");
    return xobj;
  };
  // Desmarcado: fundo branco com borda verde.
  const off = (formObject: any) => {
    const w = appearance.internal.getWidth(formObject), h = appearance.internal.getHeight(formObject);
    const xobj = appearance.CheckBox.OffPushDown(formObject);
    xobj.stream = [
      "1 1 1 rg", `0 0 ${f2(w)} ${f2(h)} re`, "f",
      `${green} RG`, "0.4 w", `0 0 ${f2(w)} ${f2(h)} re`, "S",
    ].join("\n");
    return xobj;
  };
  box.appearanceStreamContent = { N: { On: on, Off: off }, D: { On: on, Off: off } };
  box.appearanceState = "Off";
  box.value = "Off";
};

/* Caixa verde editável no PDF: desmarcada por padrão, fundo verde com ✓ ao marcar. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addGreenCheckbox = (pdf: any, fieldName: string, x: number, midY: number, size = 3.5) => {
  const CheckBoxClass = (pdf.AcroForm as unknown as { CheckBox: new () => Record<string, unknown> }).CheckBox;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const box = new CheckBoxClass() as any;
  box.fieldName = fieldName; box.readOnly = false;
  box.fontName = "zapfdingbats"; box.fontStyle = "normal";
  styleGreenCheckbox(pdf, box);
  box.x = x; box.y = midY - size / 2; box.width = size; box.height = size;
  pdf.addField(box);
};

export function SiteSurveyClientPendingReport({ visit, client, unit, project, points, questions }: Props) {
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<Blob | null>(null);
  const filename = `site-survey-${visit.survey_number}-pendencias-cliente.pdf`;
  const download = (blob: Blob) => {
    const url = URL.createObjectURL(blob), anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };
  const exportReport = async () => {
    if (busy) return;
    if (prepared) { download(prepared); setPrepared(null); return; }
    setBusy(true);
    const toastId = toast.loading("Preparando relatório de pendências para o cliente…");
    try {
      const loadResponses = async () => {
        const rows: ClientPendingResponse[] = [];
        for (let from = 0; ; from += 1000) {
          const result = await supabase.from("site_survey_responses").select("question_id,visit_luc_id,visit_environment_id,answer,question_snapshot").eq("visit_id", visit.id).order("id").range(from, from + 999);
          if (result.error) throw new Error(result.error.message);
          rows.push(...(result.data ?? []));
          if ((result.data?.length ?? 0) < 1000) return rows;
        }
      };
      const loadCalls = async () => {
        const rows = [];
        for (let from = 0; ; from += 1000) {
          const result = await supabase.from("site_survey_generated_calls").select("internal_call_id,question_id,status,trigger_value,visit_luc_id,visit_environment_id,site_survey_question_actions(site_survey_action_catalog(name)),internal_calls(call_number,title,description,status)").eq("visit_id", visit.id).order("created_at").order("id").range(from, from + 999);
          if (result.error) throw new Error(result.error.message);
          rows.push(...(result.data ?? []));
          if ((result.data?.length ?? 0) < 1000) return rows;
        }
      };
      const loadPoints = async () => {
        const fresh: ClientPendingPoint[] = [];
        for (let from = 0; ; from += 1000) {
          const result = await supabase.from("site_survey_visit_lucs").select("id,luc_number,shop_name,location,meter_number,point_type,classification_type").eq("visit_id", visit.id).eq("active", true).order("id").range(from, from + 999);
          if (result.error) throw new Error(result.error.message);
          fresh.push(...(result.data ?? []).map((point) => ({ value: `luc:${point.id}`, label: [point.luc_number ? `LUC ${point.luc_number}` : "", point.shop_name, point.location].filter(Boolean).join(" — "), pointType: surveyPointType(point), lucNumber: point.luc_number, name: point.shop_name, location: point.location, meterNumber: point.meter_number })));
          if ((result.data?.length ?? 0) < 1000) break;
        }
        for (let from = 0; ; from += 1000) {
const result = await supabase.from("site_survey_visit_environments").select("id,name,location,point_type,luc_number").eq("visit_id", visit.id).eq("active", true).order("id").range(from, from + 999);
          if (result.error) throw new Error(result.error.message);
          fresh.push(...(result.data ?? []).map((point) => ({ value: `environment:${point.id}`, label: [point.luc_number ? `LUC ${point.luc_number}` : "", point.name, point.location].filter(Boolean).join(" — "), location: point.location, lucNumber: point.luc_number, pointType: surveyPointType(point, "environment") })));
          if ((result.data?.length ?? 0) < 1000) break;
        }
        return fresh;
      };
      const loadTexts = async () => {
        const rows = [];
        for (let from = 0; ; from += 1000) {
          const result = await supabase.from("site_survey_report_texts").select("id,name,question_id,answer_value,report_answer").order("id").range(from, from + 999);
          if (result.error) throw new Error(result.error.message);
          rows.push(...(result.data ?? []));
          if ((result.data?.length ?? 0) < 1000) return rows;
        }
      };
      const loadFacades = async () => {
        const rows = [];
        for (let from = 0; ; from += 1000) {
          const result = await supabase.from("site_survey_attachments").select("visit_luc_id,visit_environment_id,storage_path,file_name,content_type").eq("visit_id", visit.id).eq("attachment_kind", "facade").order("created_at").order("id").range(from, from + 999);
          if (result.error) throw new Error(result.error.message);
          rows.push(...(result.data ?? []));
          if ((result.data?.length ?? 0) < 1000) return rows;
        }
      };
      const [responses, calls, freshPoints, texts, facades, { jsPDF }, { default: autoTable }] = await Promise.all([loadResponses(), loadCalls(), loadPoints(), loadTexts(), loadFacades(), import("jspdf"), import("jspdf-autotable")]);
      if (calls.some((call) => call.internal_call_id && !call.internal_calls)) throw new Error("Não foi possível consultar todos os chamados vinculados. Verifique seu acesso aos chamados antes de gerar o relatório.");
      const groups = buildClientPendingGroups(freshPoints.length ? freshPoints : points, responses, questions, calls, texts);
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const loadFont = async (url: string) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Não foi possível carregar a fonte do relatório.");
        let binary = "";
        for (const byte of new Uint8Array(await response.arrayBuffer())) binary += String.fromCharCode(byte);
        return btoa(binary);
      };
      const [regular, bold] = await Promise.all([loadFont(nunitoRegularUrl), loadFont(nunitoBoldUrl)]);
      pdf.addFileToVFS("Nunito-Regular.ttf", regular); pdf.addFont("Nunito-Regular.ttf", "Nunito", "normal");
      pdf.addFileToVFS("Nunito-Bold.ttf", bold); pdf.addFont("Nunito-Bold.ttf", "Nunito", "bold");
      const token = (name: string): [number, number, number] => {
        const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Não foi possível preparar as cores do relatório.");
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); ctx.fillRect(0, 0, 1, 1);
        const color = ctx.getImageData(0, 0, 1, 1).data;
        return [color[0], color[1], color[2]];
      };
      const ink = token("--myio-dark"), accent = token("--myio-purple"), green = token("--myio-green");
      const number = String(visit.survey_number).padStart(12, "0");
      // Intervenções/chamados não entram: existe o relatório específico de intervenções.
      const questionCount = groups.reduce((count, group) => count + group.questions.length, 0);
      const date = (value: string) => new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      pdf.setFont("Nunito", "bold"); pdf.setFontSize(20); pdf.setTextColor(...accent); pdf.text("myio | Site Survey", 14, 22);
      pdf.setFontSize(15); pdf.setTextColor(...ink); pdf.text("Pendências para o cliente", 14, 32);
      pdf.setDrawColor(...green); pdf.line(14, 37, 196, 37);
      const table = (startY: number, head: string[], body: string[][], padding = 3) => {
        autoTable(pdf, { startY, theme: "plain", pageBreak: "auto", margin: { top: 20, bottom: 20, left: 14, right: 14 }, styles: { font: "Nunito", fontSize: 9, textColor: ink, cellPadding: padding, overflow: "linebreak" }, headStyles: { fontStyle: "bold", textColor: accent, lineWidth: { bottom: 0.3 }, lineColor: green }, head: [head], body, rowPageBreak: "avoid" });
        return (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
      };
      let y = table(42, ["Visita", "Cliente / unidade", "Projeto"], [[`SS-${number}\nData da visita: ${date(visit.completed_at ?? visit.scheduled_start)}\nEmissão: ${date(new Date().toISOString())}`, [client, unit].filter(Boolean).join("\n") || "—", project || "—"]]);
      if (questionCount > 0) {
        pdf.setFont("Nunito", "normal"); pdf.setFontSize(10); pdf.text(`${questionCount} pergunta(s) aguardando resposta do cliente`, 14, y); y += 10;
      }
      const answerFields: CustomerAnswerField[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const TextFieldClass = (pdf.AcroForm as any).TextField as new () => any;
      for (const group of groups) {
        if (!group.questions.length) continue;
        const kind = ({ shop: "Loja", kiosk: "Quiosque", environment: "Ambiente", vacant: "Loja vaga", vacant_kiosk: "Quiosque vago", general: "Geral" } as Record<string, string>)[group.pointType] ?? "Ponto";
        // Cada pergunta ganha uma linha de resposta editável logo abaixo; o mapa vai nos metadados para a importação.
        const body = group.questions.flatMap((text, index) => [[`${index + 1}. ${text}`], [""]]);
        const fieldsForGroup = group.questions.map((text) => { const field = `cq_${answerFields.length}`; answerFields.push({ field, point: group.value, label: `${kind} — ${group.label}`, question: text }); return field; });
        autoTable(pdf, {
          startY: y, theme: "plain", pageBreak: "auto", margin: { top: 20, bottom: 20, left: 14, right: 14 },
          styles: { font: "Nunito", fontSize: 9, textColor: ink, cellPadding: 1.5, overflow: "linebreak" },
          headStyles: { fontStyle: "bold", textColor: accent, lineWidth: { bottom: 0.3 }, lineColor: green },
          head: [[`${kind} — ${group.label}`]], body, rowPageBreak: "avoid",
          didParseCell: (cell) => { if (cell.section === "body" && cell.row.index % 2 === 1) cell.cell.styles.minCellHeight = 13; },
          didDrawCell: (cell) => {
            if (cell.section !== "body" || cell.row.index % 2 !== 1) return;
            const x = cell.cell.x + 2, top = cell.cell.y + 1, w = cell.cell.width - 4, h = cell.cell.height - 2.5;
            pdf.setDrawColor(...green); pdf.setLineWidth(0.3); pdf.roundedRect(x, top, w, h, 1, 1, "S");
            const field = new TextFieldClass();
            field.fieldName = fieldsForGroup[(cell.row.index - 1) / 2]; field.multiline = true; field.fontSize = 9; field.readOnly = false;
            field.x = x + 0.5; field.y = top + 0.5; field.width = w - 1; field.height = h - 1;
            pdf.addField(field);
          },
        });
        y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
      }
      const sectionHeading = (title: string, description: string, minimumBody = 24) => {
        pdf.setFont("Nunito", "normal"); pdf.setFontSize(10);
        const lines = pdf.splitTextToSize(description, 182) as string[];
        const height = 13 + lines.length * 4.5;
        if (y + height + minimumBody > 274) { pdf.addPage(); y = 23; }
        y += 3;
        pdf.setFont("Nunito", "bold"); pdf.setFontSize(14); pdf.setTextColor(...accent);
        pdf.text(title, 14, y); y += 7;
        pdf.setFont("Nunito", "normal"); pdf.setFontSize(10); pdf.setTextColor(...ink);
        pdf.text(lines, 14, y); y += lines.length * 4.5 + 3;
        return y;
      };
      const advanceTable = () => { y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6; };
      // Lojas/quiosques vagos ("Vaga") têm seção própria; não são nome de ponto a identificar.
      const missingLucs = unidentifiedLucPoints(freshPoints).filter((point) => point.pointType !== "vacant" && point.pointType !== "vacant_kiosk" && !/^vag[ao]$/i.test((point.name ?? "").trim()));
      if (missingLucs.length) {
        const thumbnails = new Map<string, string>();
        // Serial decoding bounds memory even when originals are large.
        // Falha numa foto não impede o relatório: o ponto sai "Sem foto".
        const withTimeout = <T,>(promise: Promise<T>) => Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 20000))]);
        for (const point of missingLucs) {
          try {
            const attachment = facades.find((item) => point.value === (item.visit_luc_id ? `luc:${item.visit_luc_id}` : `environment:${item.visit_environment_id}`));
            if (!attachment) continue;
            const { data: original, error } = await withTimeout(supabase.storage.from("site-survey-attachments").download(attachment.storage_path));
            if (error || !original) continue;
            let blob = original;
            if (/\.(heic|heif)$/i.test(attachment.file_name) || /image\/hei[cf]/i.test(attachment.content_type ?? "")) {
              const { heicTo } = await import("heic-to/csp");
              blob = await withTimeout(heicTo({ blob, type: "image/jpeg", quality: 0.85 }));
            }
            const url = URL.createObjectURL(blob);
            try {
              const image = new Image(); image.src = url; await withTimeout(image.decode());
              const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 240;
              const context = canvas.getContext("2d");
              if (!context) continue;
              // Quadrado com bordas arredondadas, como nas fachadas do Histórico.
              clipRoundedPhoto(context, 240, 240);
              const side = Math.min(image.naturalWidth, image.naturalHeight);
              context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 240, 240);
              thumbnails.set(point.value, canvas.toDataURL("image/png"));
            } finally { URL.revokeObjectURL(url); }
          } catch { /* foto indisponível: segue sem thumbnail */ }
        }
        const [namedGroup, unnamedGroup] = splitUnidentifiedByName(missingLucs);
        let lucFieldIndex = 0;
        let nameFieldIndex = 0;
        const renderGroup = (initialGroup: ClientPendingPoint[], title: string, subtitle: string, withNameField = false) => {
        let group = initialGroup;
        if (!group.length) return;
        // Pontos "Sem foto" vão para o final, preservando a ordem dos demais.
        group = [...group.filter((point) => thumbnails.has(point.value)), ...group.filter((point) => !thumbnails.has(point.value))];
        sectionHeading(title, subtitle, 35);
        const lucType = (point: ClientPendingPoint) => point.pointType === "kiosk" ? "Quiosque" : "Loja";
        // O tipo nunca pode quebrar ao meio: a coluna recebe a largura do rótulo mais longo.
        const lucTypeWidth = textColumnWidth(pdf, group.map(lucType), 3, 20, 30);
        // Sem nenhum número de medidor na tabela, a coluna não aparece (padrão do Cadastro).
        const lucMeter = group.some((point) => Boolean(point.meterNumber?.trim()));
        // Foto no mesmo tamanho dos demais thumbnails do relatório.
        const photoSize = 18;
        const meterWidth = textColumnWidth(pdf, ["Nº do medidor", ...group.map((point) => point.meterNumber || "—")], 4, 22, 40);
        // Campo do nome só na seção sem LUC e sem nome identificados.
        const nameColumn = lucMeter ? 4 : 3;
        const lucWidths = [photoSize + 6, 32, ...(lucMeter ? [meterWidth] : []), lucTypeWidth, 46];
        lucWidths.push(182 - lucWidths.reduce((total, width) => total + width, 0));
        autoTable(pdf, {
          startY: y, theme: "plain", margin: { top: 20, bottom: 20, left: 14, right: 14 },
          styles: { font: "Nunito", fontSize: 9, textColor: ink, cellPadding: 1.8, overflow: "linebreak", valign: "middle" },
          headStyles: { fontStyle: "bold", textColor: accent, lineWidth: { bottom: 0.3 }, lineColor: green },
          bodyStyles: { minCellHeight: photoSize + 4 }, rowPageBreak: "avoid", showHead: "everyPage",
          columnStyles: Object.fromEntries(lucWidths.map((width, index) => [index, { cellWidth: width }])),
          head: [["Foto", "LUC", ...(lucMeter ? ["Nº do medidor"] : []), "Tipo", "Nome da loja", "Localização"]],
          body: group.map((point) => [thumbnails.has(point.value) ? "" : "Sem foto", point.lucNumber?.trim() || "Sem LUC", ...(lucMeter ? [point.meterNumber || "—"] : []), lucType(point), point.name ?? point.label, point.location || "—"]),
          didParseCell: (cell) => {
            if (cell.section === "body" && (cell.column.index === 1 || (withNameField && cell.column.index === nameColumn))) { cell.cell.styles.valign = "top"; cell.cell.styles.minCellHeight = Math.max(photoSize + 4, 16); }
            if (lucMeter && cell.column.index === 2) cell.cell.styles.overflow = "visible";
          },
          didDrawCell: (cell) => {
            if (cell.section === "body" && cell.column.index === 1) {
              // Campo editável para o cliente informar o LUC, logo abaixo de "Não identificado".
              const x = cell.cell.x + 1.5, w = cell.cell.width - 3, top = cell.cell.y + 7, h = 6;
              pdf.setDrawColor(...green); pdf.setLineWidth(0.3); pdf.roundedRect(x, top, w, h, 1, 1, "S");
              const field = new TextFieldClass();
              field.fieldName = `luc_${lucFieldIndex++}`; field.fontSize = 9; field.readOnly = false;
              field.x = x + 0.4; field.y = top + 0.4; field.width = w - 0.8; field.height = h - 0.8;
              pdf.addField(field);
              return;
            }
            if (withNameField && cell.section === "body" && cell.column.index === nameColumn) {
              // Campo editável para o cliente informar o nome, logo abaixo de "Não identificado".
              const x = cell.cell.x + 1.5, w = cell.cell.width - 3, top = cell.cell.y + 7, h = 6;
              pdf.setDrawColor(...green); pdf.setLineWidth(0.3); pdf.roundedRect(x, top, w, h, 1, 1, "S");
              const field = new TextFieldClass();
              field.fieldName = `nome_${nameFieldIndex++}`; field.fontSize = 9; field.readOnly = false;
              field.x = x + 0.4; field.y = top + 0.4; field.width = w - 0.8; field.height = h - 0.8;
              pdf.addField(field);
              return;
            }
            if (cell.section !== "body" || cell.column.index !== 0) return;
            const point = group[cell.row.index];
            const thumbnail = point ? thumbnails.get(point.value) : undefined;
            if (thumbnail) pdf.addImage(thumbnail, "PNG", cell.cell.x + 3, cell.cell.y + (cell.cell.height - photoSize) / 2, photoSize, photoSize);
          },
        });
        advanceTable();
        };
        renderGroup(namedGroup, "Lojas e quiosques com nome identificado e sem LUC", `${namedGroup.length} ponto(s) para identificação do LUC`);
        renderGroup(unnamedGroup, "Lojas e quiosques sem LUC e sem nome identificados", `${unnamedGroup.length} ponto(s) para identificação do LUC e do nome`, true);
      }
      const duplicated = duplicateNamePoints(freshPoints.length ? freshPoints : points);
      if (duplicated.length) {
        sectionHeading("Lojas e quiosques com nomes repetidos", "Confirme que os pontos abaixo, de mesmo nome e LUCs diferentes, existem de fato no shopping e não são erro de cadastro.");
        // Sem nenhum número de medidor na tabela, a coluna não aparece (padrão do Cadastro).
        const dupMeter = duplicated.some((group) => group.some((point) => Boolean(point.meterNumber?.trim())));
        const dupType = (point: ClientPendingPoint) => point.pointType === "kiosk" ? "Quiosque" : point.pointType === "vacant" ? "Loja vaga" : point.pointType === "vacant_kiosk" ? "Quiosque vago" : "Loja";
        const dupBody = duplicated.flatMap((group) => group.map((point) => [point.name ?? point.label, point.lucNumber?.trim() || "Sem LUC", ...(dupMeter ? [point.meterNumber || "—"] : []), dupType(point), point.location || "—", ""]));
        // O tipo nunca pode quebrar ao meio: a coluna recebe a largura do rótulo mais longo.
        const dupTypeWidth = textColumnWidth(pdf, dupBody.map((row) => row[dupMeter ? 3 : 2]), 3, 20, 30);
        const dupWidths = [40, 25, ...(dupMeter ? [25] : []), dupTypeWidth];
        dupWidths.push(182 - 40 - 25 - (dupMeter ? 25 : 0) - dupTypeWidth - 30, 30);
        autoTable(pdf, {
          startY: y, theme: "plain", margin: { top: 20, bottom: 20, left: 14, right: 14 },
          styles: { font: "Nunito", fontSize: 9, textColor: ink, cellPadding: 1.8, overflow: "linebreak", valign: "middle" },
          headStyles: { fontStyle: "bold", textColor: accent, lineWidth: { bottom: 0.3 }, lineColor: green },
          rowPageBreak: "avoid", showHead: "everyPage",
          columnStyles: Object.fromEntries(dupWidths.map((width, index) => [index, { cellWidth: width }])),
          head: [["Nome da loja", "LUC", ...(dupMeter ? ["Nº do medidor"] : []), "Tipo", "Localização", "Confirmação"]],
          body: dupBody,
          didDrawCell: (cell) => {
            if (cell.section !== "body" || cell.column.index !== dupWidths.length - 1) return;
            // Caixas editáveis para o cliente marcar OK ou Duplicado em cada ponto.
            const rowIndex = cell.row.index;
            const midY = cell.cell.y + cell.cell.height / 2;
            const options: [string, string, number][] = [["OK", `confirma_ok_${rowIndex}`, cell.cell.x + 2], ["Duplicado", `confirma_dup_${rowIndex}`, cell.cell.x + 14]];
            pdf.setFont("Nunito", "normal"); pdf.setFontSize(7); pdf.setTextColor(...ink);
            for (const [label, fieldName, x] of options) {
              addGreenCheckbox(pdf, fieldName, x, midY);
              pdf.text(label, x + 4.5, midY + 1.2);
            }
          },
        });
        advanceTable();
      }
      const vacant = vacantShopPoints(freshPoints.length ? freshPoints : points);
      if (vacant.length) {
        sectionHeading("Lojas e quiosques vagos cadastrados", `Confirme os ${vacant.length} espaço(s) vago(s) abaixo, cadastrados para futura implantação.`);
        // Sem nenhum número de medidor na tabela, a coluna não aparece (padrão do Cadastro).
        const vacantMeter = vacant.some((point) => Boolean(point.meterNumber?.trim()));
        const vacantWidths = [28, ...(vacantMeter ? [28] : []), vacantMeter ? 46 : 66, vacantMeter ? 50 : 58, 30];
        autoTable(pdf, {
          startY: y, theme: "plain", margin: { top: 20, bottom: 20, left: 14, right: 14 },
          styles: { font: "Nunito", fontSize: 9, textColor: ink, cellPadding: 1.8, overflow: "linebreak", valign: "middle" },
          headStyles: { fontStyle: "bold", textColor: accent, lineWidth: { bottom: 0.3 }, lineColor: green },
          rowPageBreak: "avoid", showHead: "everyPage",
          columnStyles: Object.fromEntries(vacantWidths.map((width, index) => [index, { cellWidth: width }])),
          head: [["LUC", ...(vacantMeter ? ["Nº do medidor"] : []), "Nome", "Localização", "Confirmação"]],
          body: vacant.map((point) => [point.lucNumber?.trim() || "Sem LUC", ...(vacantMeter ? [point.meterNumber || "—"] : []), point.name ?? point.label, point.location || "—", ""]),
          didDrawCell: (cell) => {
            if (cell.section !== "body" || cell.column.index !== vacantWidths.length - 1) return;
            // Caixa verde editável para o cliente confirmar cada loja vaga.
            const midY = cell.cell.y + cell.cell.height / 2;
            addGreenCheckbox(pdf, `confirma_vaga_${cell.row.index}`, cell.cell.x + 2, midY);
            pdf.setFont("Nunito", "normal"); pdf.setFontSize(7); pdf.setTextColor(...ink);
            pdf.text("OK", cell.cell.x + 6.5, midY + 1.2);
          },
        });
      }
      const pages = pdf.getNumberOfPages();
      for (let page = 1; page <= pages; page++) {
        pdf.setPage(page); pdf.setFont("Nunito", "normal"); pdf.setFontSize(8); pdf.setTextColor(...ink);
        if (page > 1) pdf.text(`myio · Pendências para o cliente · SS-${number}`, 14, 12);
        pdf.setDrawColor(...green); pdf.line(14, 280, 196, 280);
        pdf.text("myio Automação Ltda", 14, 287); pdf.text(`Página ${page} de ${pages}`, 196, 287, { align: "right" });
      }
      pdf.setProperties({ title: `Pendências para o cliente SS-${number}`, subject: encodeCustomerAnswerMap({ visit: visit.id, fields: answerFields }) });
      const blob = pdf.output("blob");
      if (matchMedia("(pointer: coarse)").matches) { setPrepared(blob); toast.success("PDF pronto para baixar.", { id: toastId }); }
      else { download(blob); toast.success("Relatório gerado.", { id: toastId }); }
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível gerar o relatório.", { id: toastId }); }
    finally { setBusy(false); }
  };
  return <Button type="button" size="sm" variant="action" disabled={busy} aria-busy={busy} onClick={() => void exportReport()} aria-label={prepared ? "Baixar PDF de pendências para o cliente" : "Pendências para o cliente"}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{busy ? "Gerando…" : prepared ? "Baixar PDF" : "Pendências para o cliente"}</Button>;
}
