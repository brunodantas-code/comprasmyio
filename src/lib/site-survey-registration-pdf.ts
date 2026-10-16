import { supabase } from "@/integrations/supabase/client";
import nunitoRegularUrl from "@/assets/fonts/nunito-regular.ttf?url";
import nunitoBoldUrl from "@/assets/fonts/nunito-bold.ttf?url";
import type { FacadeThumbnailAttachment } from "@/components/site-survey-facade-thumbnail";
import { clipRoundedPhoto } from "@/lib/site-survey-photo";

export type RegistrationPdfRow = { luc: string; meter: string; type: string; name: string; location: string; facade?: FacadeThumbnailAttachment };

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

async function thumbnail(attachment: FacadeThumbnailAttachment) {
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
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 240, 240);
    return canvas.toDataURL("image/png");
  } catch { return undefined; } finally { URL.revokeObjectURL(url); }
}

export async function buildRegistrationPdf(rows: RegistrationPdfRow[]) {
  const [{ jsPDF }, { default: autoTable }, regular, bold] = await Promise.all([import("jspdf"), import("jspdf-autotable"), loadFont(nunitoRegularUrl), loadFont(nunitoBoldUrl)]);
  // Serial decoding bounds memory even when originals are large.
  const thumbs: (string | undefined)[] = [];
  for (const row of rows) thumbs.push(row.facade ? await thumbnail(row.facade) : undefined);
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.addFileToVFS("Nunito-Regular.ttf", regular); pdf.addFont("Nunito-Regular.ttf", "Nunito", "normal");
  pdf.addFileToVFS("Nunito-Bold.ttf", bold); pdf.addFont("Nunito-Bold.ttf", "Nunito", "bold");
  const ink = token("--myio-dark"), accent = token("--myio-purple"), green = token("--myio-green");
  pdf.setFont("Nunito", "bold"); pdf.setFontSize(20); pdf.setTextColor(...accent); pdf.text("myio | Site Survey", 14, 22);
  pdf.setFontSize(15); pdf.setTextColor(...ink); pdf.text("Cadastro de lojas, quiosques e ambientes", 14, 32);
  pdf.setDrawColor(...green); pdf.line(14, 37, 196, 37);
  pdf.setFont("Nunito", "normal"); pdf.setFontSize(10);
  pdf.text(`${rows.length} ponto(s) · Emissão: ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`, 14, 44);
  autoTable(pdf, {
    startY: 49, theme: "plain", margin: { top: 20, bottom: 20, left: 14, right: 14 },
    styles: { font: "Nunito", fontSize: 9, textColor: ink, cellPadding: 3, overflow: "linebreak", valign: "middle" },
    headStyles: { fontStyle: "bold", textColor: accent, lineWidth: { bottom: 0.3 }, lineColor: green },
    bodyStyles: { minCellHeight: 24 }, rowPageBreak: "avoid", showHead: "everyPage",
    columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 24 }, 2: { cellWidth: 28 }, 3: { cellWidth: 22 }, 4: { cellWidth: 46 }, 5: { cellWidth: 38 } },
    head: [["Foto", "LUC", "Nº do medidor", "Tipo", "Nome", "Localização"]],
    body: rows.map((row, i) => [thumbs[i] ? "" : "Sem foto", row.luc, row.meter, row.type, row.name, row.location]),
    didDrawCell: (cell) => {
      if (cell.section !== "body" || cell.column.index !== 0) return;
      const t = thumbs[cell.row.index];
      if (t) pdf.addImage(t, "PNG", cell.cell.x + 3, cell.cell.y + (cell.cell.height - 18) / 2, 18, 18);
    },
  });
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page); pdf.setFont("Nunito", "normal"); pdf.setFontSize(8); pdf.setTextColor(...ink);
    if (page > 1) pdf.text("myio · Cadastro de lojas, quiosques e ambientes", 14, 12);
    pdf.setDrawColor(...green); pdf.line(14, 280, 196, 280);
    pdf.text("myio Automação Ltda", 14, 287); pdf.text(`Página ${page} de ${pages}`, 196, 287, { align: "right" });
  }
  return pdf.output("blob");
}
