import { supabase } from "@/integrations/supabase/client";
import nunitoRegularUrl from "@/assets/fonts/nunito-regular.ttf?url";
import nunitoBoldUrl from "@/assets/fonts/nunito-bold.ttf?url";
import type { FacadeThumbnailAttachment } from "@/components/site-survey-facade-thumbnail";
import { clipRoundedPhoto } from "@/lib/site-survey-photo";
import type { RegistrationExportRow } from "./site-survey-registration-export";

export type RegistrationPdfRow = RegistrationExportRow & { facade?: FacadeThumbnailAttachment };

const loadFont = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Não foi possível carregar a fonte do relatório.");
  let binary = "";
  for (const byte of new Uint8Array(await response.arrayBuffer())) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const token = (name: string): [number, number, number] => {
  const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível preparar as cores do relatório.");
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); ctx.fillRect(0, 0, 1, 1);
  const c = ctx.getImageData(0, 0, 1, 1).data;
  return [c[0], c[1], c[2]];
};

// Light tint of a theme colour, used for the totals band so it reads as the same family as the on-screen chips.
const tint = (color: [number, number, number], amount: number): [number, number, number] =>
  [0, 1, 2].map((i) => Math.round(color[i] + (255 - color[i]) * amount)) as [number, number, number];

async function thumbnail(attachment: FacadeThumbnailAttachment, grayscale: boolean) {
  const { data: original, error } = await supabase.storage.from("site-survey-attachments").download(attachment.storage_path);
  if (error || !original) return undefined;
  let blob: Blob = original;
  if (/\.(heic|heif)$/i.test(attachment.file_name) || /image\/hei[cf]/i.test(attachment.content_type ?? "")) {
    const { heicTo } = await import("heic-to/csp");
    blob = await heicTo({ blob, type: "image/jpeg", quality: 0.85 });
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 240;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    clipRoundedPhoto(context, 240, 240);
    if (grayscale) context.filter = "grayscale(1)";
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 240, 240);
    return canvas.toDataURL("image/png");
  } catch { return undefined; } finally { URL.revokeObjectURL(url); }
}

export async function buildRegistrationPdf(rows: RegistrationPdfRow[], clientName?: string, projectName?: string, grayscale = false) {
  const [{ jsPDF }, { default: autoTable }, { PDFDocument }, regular, bold] = await Promise.all([import("jspdf"), import("jspdf-autotable"), import("pdf-lib"), loadFont(nunitoRegularUrl), loadFont(nunitoBoldUrl)]);
  const fields: { page: number; x: number; y: number; checked: boolean; name: string }[] = [];
  // Serial decoding bounds memory even when originals are large.
  const thumbs: (string | undefined)[] = [];
  for (const row of rows) thumbs.push(row.facade ? await thumbnail(row.facade, grayscale) : undefined);
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.addFileToVFS("Nunito-Regular.ttf", regular); pdf.addFont("Nunito-Regular.ttf", "Nunito", "normal");
  pdf.addFileToVFS("Nunito-Bold.ttf", bold); pdf.addFont("Nunito-Bold.ttf", "Nunito", "bold");
  const ink: [number, number, number] = grayscale ? [30, 30, 30] : token("--myio-dark");
  const accent: [number, number, number] = grayscale ? [60, 60, 60] : token("--myio-purple");
  const green: [number, number, number] = grayscale ? [140, 140, 140] : token("--myio-green");
  const titleTop = 22, hasClient = Boolean(clientName), hasProject = Boolean(projectName);
  pdf.setFont("Nunito", "bold"); pdf.setFontSize(20); pdf.setTextColor(...accent); pdf.text("myio | Site Survey", 14, titleTop);
  let lineY = titleTop + 10;
  pdf.setTextColor(...ink);
  if (hasClient) { pdf.setFontSize(15); pdf.text(String(clientName), 14, lineY); lineY += 7; }
  if (hasProject) { pdf.setFontSize(13); pdf.text(`Implantação ${String(projectName)}`, 14, lineY); lineY += 6; }
  pdf.setFontSize(11); pdf.text("Cadastro de lojas, quiosques e ambientes", 14, lineY);
  const ruleY = lineY + 5;
  const infoY = lineY + 12;
  pdf.setDrawColor(...green); pdf.line(14, ruleY, 196, ruleY);
  pdf.setFont("Nunito", "normal"); pdf.setFontSize(10);
  pdf.text(`${rows.length} ponto(s) · Emissão: ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`, 14, infoY);

  // Same layout as the approved workbook: totals above the header, meter column only when filled.
  const withMeter = rows.some((row) => row.meter.trim());
  const widths = withMeter
    ? [16, 20, 22, 20, 38, 33, 16, 17]
    : [16, 20, 22, 50, 40, 16, 18];
  const headers = ["Foto", "LUC", ...(withMeter ? ["Nº do medidor"] : []), "Tipo", "Nome", "Localização", "Água", "Energia"];
  const waterIndex = headers.length - 2, energyIndex = headers.length - 1;
  const columnX: number[] = [];
  for (const width of widths) { columnX.push(14 + widths.slice(0, columnX.length).reduce((a, b) => a + b, 0)); }

  const bandY = infoY + 3, bandH = 7;
  pdf.setFillColor(...tint(green, 0.9)); pdf.rect(14, bandY, 182, bandH, "F");
  pdf.setFont("Nunito", "bold"); pdf.setFontSize(10); pdf.setTextColor(...ink);
  pdf.text("Total selecionado", 17, bandY + 4.9);
  pdf.text(String(rows.filter((row) => row.water).length), columnX[waterIndex] + widths[waterIndex] / 2, bandY + 4.9, { align: "center" });
  pdf.text(String(rows.filter((row) => row.energy).length), columnX[energyIndex] + widths[energyIndex] / 2, bandY + 4.9, { align: "center" });

  autoTable(pdf, {
    startY: bandY + bandH + 3, theme: "plain", margin: { top: 20, bottom: 20, left: 14, right: 14 },
    styles: { font: "Nunito", fontSize: 9, textColor: ink, cellPadding: 1.5, overflow: "linebreak", valign: "middle" },
    headStyles: { fontStyle: "bold", textColor: accent, lineWidth: { bottom: 0.3 }, lineColor: green },
    bodyStyles: { minCellHeight: 14 }, rowPageBreak: "avoid", showHead: "everyPage",
    columnStyles: Object.fromEntries(widths.map((width, index) => [index, { cellWidth: width, ...(index >= waterIndex ? { halign: "center" as const } : {}) }])),
    head: [headers],
    body: rows.map((row, i) => [thumbs[i] ? "" : "Sem foto", row.luc, ...(withMeter ? [row.meter] : []), row.type, row.name, row.location, "", ""]),
    didDrawCell: (cell) => {
      if (cell.section !== "body") return;
      if (cell.column.index === 0) {
        const t = thumbs[cell.row.index];
        if (t) pdf.addImage(t, "PNG", cell.cell.x + 1.5, cell.cell.y + (cell.cell.height - 11) / 2, 11, 11);
      }
      if (cell.column.index === waterIndex || cell.column.index === energyIndex) {
        const row = rows[cell.row.index];
        if (!row) return;
        const service = cell.column.index === waterIndex ? "water" : "energy";
        fields.push({ page: pdf.getCurrentPageInfo().pageNumber, x: cell.cell.x + (cell.cell.width - 5) / 2, y: cell.cell.y + (cell.cell.height - 5) / 2, checked: row[service], name: `${service}_${cell.row.index + 1}` });
      }
    },
  });
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page); pdf.setFont("Nunito", "normal"); pdf.setFontSize(8); pdf.setTextColor(...ink);
    if (page > 1) pdf.text("myio · Cadastro de lojas, quiosques e ambientes", 14, 12);
    pdf.setDrawColor(...green); pdf.line(14, 280, 196, 280);
    pdf.text("myio Automação Ltda", 14, 287);
    if (hasClient) pdf.text(String(clientName), 105, 287, { align: "center" });
    pdf.text(`Página ${page} de ${pages}`, 196, 287, { align: "right" });
  }
  const document = await PDFDocument.load(pdf.output("arraybuffer"));
  const form = document.getForm();
  const mm = 72 / 25.4;
  for (const field of fields) {
    const page = document.getPages()[field.page - 1];
    if (!page) continue;
    const checkbox = form.createCheckBox(field.name);
    checkbox.addToPage(page, { x: field.x * mm, y: page.getHeight() - (field.y + 5) * mm, width: 5 * mm, height: 5 * mm, borderWidth: 0.7 });
    if (field.checked) checkbox.check();
  }
  return new Blob([new Uint8Array(await document.save())], { type: "application/pdf" });
}
