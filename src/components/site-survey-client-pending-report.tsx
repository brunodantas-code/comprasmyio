import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { buildClientPendingGroups, duplicateNamePoints, unidentifiedLucPoints, vacantShopPoints, type ClientPendingPoint, type ClientPendingResponse } from "@/lib/site-survey-client-pending";
import nunitoRegularUrl from "@/assets/fonts/nunito-regular.ttf?url";
import nunitoBoldUrl from "@/assets/fonts/nunito-bold.ttf?url";
import { surveyPointType } from "@/lib/site-survey-point-type";
import { clipRoundedPhoto } from "@/lib/site-survey-photo";

type Props = {
  visit: { id: string; survey_number: number; completed_at: string | null; scheduled_start: string };
  client: string; unit: string; project: string; points: ClientPendingPoint[];
  questions: { id: string; prompt: string; question_key?: string | null; conditioned_on_question_id?: string | null; conditioned_operator?: string | null; conditioned_value?: string | null }[];
};
const statusLabel = (status: string) => ({ aberto: "Em aberto", em_andamento: "Em andamento", atendido: "Atendido", concluido: "Concluído", cancelado: "Cancelado" } as Record<string, string>)[status] ?? status.replaceAll("_", " ");

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
      const questionCount = groups.reduce((count, group) => count + group.questions.length, 0), callCount = groups.reduce((count, group) => count + group.calls.length, 0);
      const date = (value: string) => new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      pdf.setFont("Nunito", "bold"); pdf.setFontSize(20); pdf.setTextColor(...accent); pdf.text("myio | Site Survey", 14, 22);
      pdf.setFontSize(15); pdf.setTextColor(...ink); pdf.text("Pendências para o cliente", 14, 32);
      pdf.setDrawColor(...green); pdf.line(14, 37, 196, 37);
      const table = (startY: number, head: string[], body: string[][], padding = 3) => {
        autoTable(pdf, { startY, theme: "plain", pageBreak: "avoid", margin: { top: 20, bottom: 20, left: 14, right: 14 }, styles: { font: "Nunito", fontSize: 9, textColor: ink, cellPadding: padding, overflow: "linebreak" }, headStyles: { fontStyle: "bold", textColor: accent, lineWidth: { bottom: 0.3 }, lineColor: green }, head: [head], body, rowPageBreak: "avoid" });
        return (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
      };
      let y = table(42, ["Visita", "Cliente / unidade", "Projeto"], [[`SS-${number}\nData da visita: ${date(visit.completed_at ?? visit.scheduled_start)}\nEmissão: ${date(new Date().toISOString())}`, [client, unit].filter(Boolean).join("\n") || "—", project || "—"]]);
      pdf.setFont("Nunito", "normal"); pdf.setFontSize(10); pdf.text(`${questionCount} pergunta(s) aguardando resposta · ${callCount} chamado(s) / intervenção(ões)`, 14, y); y += 10;
      if (!groups.length) pdf.text("Nenhuma pergunta pendente ou chamado gerado nesta visita.", 14, y);
      for (const group of groups) {
        const kind = ({ shop: "Loja", kiosk: "Quiosque", environment: "Ambiente", vacant: "Loja vaga", general: "Geral" } as Record<string, string>)[group.pointType] ?? "Ponto";
        y = table(y, [`${kind} — ${group.label}`], [
          ...group.questions.map((text, index) => [`${index + 1}. ${text}`]),
          ...group.calls.map((call) => [call.call_number
            ? `Chamado #${call.call_number} — ${call.title}\nSituação: ${statusLabel(call.status)}${call.description?.trim() ? `\n${call.description.trim()}` : ""}`
            : call.description?.trim() || "—"]),
        ], 1.5);
      }
      const missingLucs = unidentifiedLucPoints(freshPoints);
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
        pdf.addPage(); pdf.setFont("Nunito", "bold"); pdf.setFontSize(15); pdf.setTextColor(...accent);
        pdf.text("Lojas e quiosques com LUC não identificado", 14, 25);
        pdf.setFont("Nunito", "normal"); pdf.setFontSize(10); pdf.setTextColor(...ink);
        pdf.text(`${missingLucs.length} ponto(s) para identificação do LUC`, 14, 33);
        autoTable(pdf, {
          startY: 39, theme: "plain", margin: { top: 20, bottom: 20, left: 14, right: 14 },
          styles: { font: "Nunito", fontSize: 9, textColor: ink, cellPadding: 3, overflow: "linebreak", valign: "middle" },
          headStyles: { fontStyle: "bold", textColor: accent, lineWidth: { bottom: 0.3 }, lineColor: green },
          bodyStyles: { minCellHeight: 24 }, rowPageBreak: "avoid", showHead: "everyPage",
          columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 28 }, 2: { cellWidth: 28 }, 3: { cellWidth: 20 }, 4: { cellWidth: 46 }, 5: { cellWidth: 36 } },
          head: [["Foto", "LUC", "Nº do medidor", "Tipo", "Nome da loja", "Localização"]],
          body: missingLucs.map((point) => [thumbnails.has(point.value) ? "" : "Sem foto", point.lucNumber?.trim() || "Sem LUC", point.meterNumber || "—", point.pointType === "kiosk" ? "Quiosque" : "Loja", point.name ?? point.label, point.location || "—"]),
          didDrawCell: (cell) => {
            if (cell.section !== "body" || cell.column.index !== 0) return;
            const point = missingLucs[cell.row.index];
            const thumbnail = point ? thumbnails.get(point.value) : undefined;
            if (thumbnail) pdf.addImage(thumbnail, "PNG", cell.cell.x + 3, cell.cell.y + (cell.cell.height - 18) / 2, 18, 18);
          },
        });
      }
      const duplicated = duplicateNamePoints(freshPoints.length ? freshPoints : points);
      if (duplicated.length) {
        pdf.addPage(); pdf.setFont("Nunito", "bold"); pdf.setFontSize(15); pdf.setTextColor(...accent);
        pdf.text("Lojas e quiosques com nomes repetidos", 14, 25);
        pdf.setFont("Nunito", "normal"); pdf.setFontSize(10); pdf.setTextColor(...ink);
        pdf.text("Confirme que os pontos abaixo, de mesmo nome e LUCs diferentes, existem de fato no shopping e não são erro de cadastro.", 14, 33, { maxWidth: 182 });
        autoTable(pdf, {
          startY: 41, theme: "plain", margin: { top: 20, bottom: 20, left: 14, right: 14 },
          styles: { font: "Nunito", fontSize: 9, textColor: ink, cellPadding: 3, overflow: "linebreak", valign: "middle" },
          headStyles: { fontStyle: "bold", textColor: accent, lineWidth: { bottom: 0.3 }, lineColor: green },
          rowPageBreak: "avoid", showHead: "everyPage",
          columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 25 }, 2: { cellWidth: 25 }, 3: { cellWidth: 18 }, 4: { cellWidth: 44 }, 5: { cellWidth: 30 } },
          head: [["Nome da loja", "LUC", "Nº do medidor", "Tipo", "Localização", "Confirmação"]],
          body: duplicated.flatMap((group) => group.map((point) => [point.name ?? point.label, point.lucNumber?.trim() || "Sem LUC", point.meterNumber || "—", point.pointType === "kiosk" ? "Quiosque" : point.pointType === "vacant" ? "Loja vaga" : "Loja", point.location || "—", ""])),
          didDrawCell: (cell) => {
            if (cell.section !== "body" || cell.column.index !== 5) return;
            // Caixas editáveis para o cliente marcar OK ou Duplicado em cada ponto.
            const rowIndex = cell.row.index;
            const midY = cell.cell.y + cell.cell.height / 2;
            const options: [string, string, number][] = [["OK", `confirma_ok_${rowIndex}`, cell.cell.x + 2], ["Duplicado", `confirma_dup_${rowIndex}`, cell.cell.x + 14]];
            pdf.setFont("Nunito", "normal"); pdf.setFontSize(7); pdf.setTextColor(...ink);
            for (const [label, fieldName, x] of options) {
              const CheckBoxClass = (pdf.AcroForm as unknown as { CheckBox: new () => { fieldName: string; value: string; readOnly: boolean; x: number; y: number; width: number; height: number } }).CheckBox;
              const box = new CheckBoxClass();
              box.fieldName = fieldName; box.value = "Off"; box.readOnly = false;
              box.x = x; box.y = midY - 1.75; box.width = 3.5; box.height = 3.5;
              pdf.addField(box);
              pdf.text(label, x + 4.5, midY + 1.2);
            }
          },
        });
      }
      const vacant = vacantShopPoints(freshPoints.length ? freshPoints : points);
      if (vacant.length) {
        pdf.addPage(); pdf.setFont("Nunito", "bold"); pdf.setFontSize(15); pdf.setTextColor(...accent);
        pdf.text("Lojas vagas cadastradas", 14, 25);
        pdf.setFont("Nunito", "normal"); pdf.setFontSize(10); pdf.setTextColor(...ink);
        pdf.text(`Confirme as ${vacant.length} loja(s) vaga(s) abaixo, cadastradas para futura implantação.`, 14, 33, { maxWidth: 182 });
        autoTable(pdf, {
          startY: 41, theme: "plain", margin: { top: 20, bottom: 20, left: 14, right: 14 },
          styles: { font: "Nunito", fontSize: 9, textColor: ink, cellPadding: 3, overflow: "linebreak", valign: "middle" },
          headStyles: { fontStyle: "bold", textColor: accent, lineWidth: { bottom: 0.3 }, lineColor: green },
          rowPageBreak: "avoid", showHead: "everyPage",
          columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 28 }, 2: { cellWidth: 46 }, 3: { cellWidth: 80 } },
          head: [["LUC", "Nº do medidor", "Nome da loja", "Localização"]],
          body: vacant.map((point) => [point.lucNumber?.trim() || "Sem LUC", point.meterNumber || "—", point.name ?? point.label, point.location || "—"]),
        });
      }
      const pages = pdf.getNumberOfPages();
      for (let page = 1; page <= pages; page++) {
        pdf.setPage(page); pdf.setFont("Nunito", "normal"); pdf.setFontSize(8); pdf.setTextColor(...ink);
        if (page > 1) pdf.text(`myio · Pendências para o cliente · SS-${number}`, 14, 12);
        pdf.setDrawColor(...green); pdf.line(14, 280, 196, 280);
        pdf.text("myio Automação Ltda", 14, 287); pdf.text(`Página ${page} de ${pages}`, 196, 287, { align: "right" });
      }
      const blob = pdf.output("blob");
      if (matchMedia("(pointer: coarse)").matches) { setPrepared(blob); toast.success("PDF pronto para baixar.", { id: toastId }); }
      else { download(blob); toast.success("Relatório gerado.", { id: toastId }); }
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível gerar o relatório.", { id: toastId }); }
    finally { setBusy(false); }
  };
  return <Button type="button" size="sm" variant="action" disabled={busy} aria-busy={busy} onClick={() => void exportReport()} aria-label={prepared ? "Baixar PDF de pendências para o cliente" : "Pendências para o cliente"}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{busy ? "Gerando…" : prepared ? "Baixar PDF" : "Pendências para o cliente"}</Button>;
}