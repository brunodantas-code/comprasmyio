import regularUrl from "@/assets/fonts/nunito-regular.ttf?url";
import boldUrl from "@/assets/fonts/nunito-bold.ttf?url";
import type { TableReport } from "./table-report";

async function font(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Não foi possível carregar a fonte do relatório.");
  let binary = "";
  for (const byte of new Uint8Array(await response.arrayBuffer())) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = name;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function exportTableReport(title: string, report: TableReport, format: "pdf" | "xlsx") {
  const name = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  if (format === "xlsx") {
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.aoa_to_sheet([report.columns, ...report.rows]);
    sheet["!cols"] = report.columns.map((label, index) => ({ wch: Math.min(60, Math.max(16, label.length + 2, ...report.rows.map(row => String(row[index] ?? "").length + 2))) }));
    report.columns.forEach((label, index) => {
      if (!label.includes("Valor")) return;
      report.rows.forEach((_, row) => { const cell = sheet[XLSX.utils.encode_cell({ r: row + 1, c: index })]; if (cell?.t === "n") cell.z = '"R$" #,##0.00'; });
    });
    sheet["!autofilter"] = { ref: sheet["!ref"] ?? "A1" };
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, "Solicitações");
    save(new Blob([XLSX.write(workbook, { type: "array", bookType: "xlsx" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${name}.xlsx`);
    return;
  }
  const [{ jsPDF }, { default: autoTable }, regular, bold] = await Promise.all([import("jspdf"), import("jspdf-autotable"), font(regularUrl), font(boldUrl)]);
  const pdf = new jsPDF({ orientation: "landscape", format: report.columns.length > 9 ? "a3" : "a4" });
  pdf.addFileToVFS("Nunito-Regular.ttf", regular); pdf.addFont("Nunito-Regular.ttf", "Nunito", "normal");
  pdf.addFileToVFS("Nunito-Bold.ttf", bold); pdf.addFont("Nunito-Bold.ttf", "Nunito", "bold");
  pdf.setFont("Nunito", "bold"); pdf.setFontSize(15); pdf.text(`myio Supply | ${title}`, 12, 14);
  pdf.setFont("Nunito", "normal"); pdf.setFontSize(9); pdf.text(`${report.rows.length} registro(s) · ${new Date().toLocaleString("pt-BR")}`, 12, 21);
  autoTable(pdf, { head: [report.columns], body: report.rows.map(row => row.map((value, index) => value == null ? "—" : typeof value === "number" && report.columns[index]?.includes("Valor") ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : String(value))), startY: 27, margin: 12, theme: "plain", styles: { font: "Nunito", fontSize: 8, cellPadding: 2, overflow: "linebreak" }, headStyles: { fontStyle: "bold" }, columnStyles: Object.fromEntries(report.columns.map((label, index) => [index, { cellWidth: label.includes("Itens") ? 65 : "auto" }])), rowPageBreak: "avoid", didDrawPage: () => { pdf.setFontSize(8); pdf.text(`Página ${pdf.getNumberOfPages()}`, 12, pdf.internal.pageSize.getHeight() - 5); } });
  save(pdf.output("blob"), `${name}.pdf`);
}