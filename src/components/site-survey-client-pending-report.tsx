import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { buildClientPendingGroups, type ClientPendingPoint, type ClientPendingResponse } from "@/lib/site-survey-client-pending";
import nunitoRegularUrl from "@/assets/fonts/nunito-regular.ttf?url";
import nunitoBoldUrl from "@/assets/fonts/nunito-bold.ttf?url";

type Props = {
  visit: { id: string; survey_number: number; completed_at: string | null; scheduled_start: string };
  client: string; unit: string; project: string; points: ClientPendingPoint[];
  questions: { id: string; prompt: string; question_key?: string | null }[];
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
          const result = await supabase.from("site_survey_generated_calls").select("internal_call_id,visit_luc_id,visit_environment_id,internal_calls(call_number,title,description,status)").eq("visit_id", visit.id).order("created_at").order("id").range(from, from + 999);
          if (result.error) throw new Error(result.error.message);
          rows.push(...(result.data ?? []));
          if ((result.data?.length ?? 0) < 1000) return rows;
        }
      };
      const [responses, calls, { jsPDF }, { default: autoTable }] = await Promise.all([loadResponses(), loadCalls(), import("jspdf"), import("jspdf-autotable")]);
      if (calls.some((call) => call.internal_call_id && !call.internal_calls)) throw new Error("Não foi possível consultar todos os chamados vinculados. Verifique seu acesso aos chamados antes de gerar o relatório.");
      const groups = buildClientPendingGroups(points, responses, questions, calls);
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
      const table = (startY: number, head: string[], body: string[][]) => {
        autoTable(pdf, { startY, theme: "plain", margin: { top: 20, bottom: 20, left: 14, right: 14 }, styles: { font: "Nunito", fontSize: 9, textColor: ink, cellPadding: 3, overflow: "linebreak" }, headStyles: { fontStyle: "bold", textColor: accent, lineWidth: { bottom: 0.3 }, lineColor: green }, head: [head], body, rowPageBreak: "avoid" });
        return (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      };
      let y = table(42, ["Visita", "Cliente / unidade", "Projeto"], [[`SS-${number}\nData da visita: ${date(visit.completed_at ?? visit.scheduled_start)}\nEmissão: ${date(new Date().toISOString())}`, [client, unit].filter(Boolean).join("\n") || "—", project || "—"]]);
      pdf.setFont("Nunito", "normal"); pdf.setFontSize(10); pdf.text(`${questionCount} pergunta(s) aguardando resposta · ${callCount} chamado(s) gerado(s)`, 14, y); y += 10;
      if (!groups.length) pdf.text("Nenhuma pergunta pendente ou chamado gerado nesta visita.", 14, y);
      for (const group of groups) {
        const kind = ({ shop: "Loja", kiosk: "Quiosque", environment: "Ambiente", general: "Geral" } as Record<string, string>)[group.pointType] ?? "Ponto";
        y = table(y, [`${kind} — ${group.label}`], [
          ...(group.questions.length ? [["Perguntas para o cliente"], ...group.questions.map((text, index) => [`${index + 1}. ${text}`])] : []),
          ...(group.calls.length ? [["Chamados gerados durante o checklist"], ...group.calls.map((call) => [`Chamado #${call.call_number ?? "—"} — ${call.title}\nSituação: ${statusLabel(call.status)}${call.description?.trim() ? `\n${call.description.trim()}` : ""}`])] : []),
        ]);
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
  return <Button type="button" size="sm" variant="action" disabled={busy} aria-busy={busy} onClick={() => void exportReport()} aria-label={prepared ? "Baixar PDF de pendências para o cliente" : "PDF de pendências para o cliente"}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{busy ? "Gerando…" : prepared ? "Baixar PDF" : "PDF para o cliente"}</Button>;
}