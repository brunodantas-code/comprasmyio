import regularUrl from '@/assets/fonts/nunito-regular.ttf?url';
import boldUrl from '@/assets/fonts/nunito-bold.ttf?url';
export type InventoryExport = {
  name: string; date: string; area: string; counters: string[]; status: string;
  columns: string[]; rows: (string | number | null)[][];
  signatures: { signer_name: string; signed_at: string | null; image: string | null }[];
};
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
async function font(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Não foi possível carregar a fonte do relatório');
  let binary = '';
  for (const byte of new Uint8Array(await response.arrayBuffer())) binary += String.fromCharCode(byte);
  return btoa(binary);
}
export async function exportInventory(report: InventoryExport, format: 'pdf' | 'xlsx') {
  const filename = report.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const date = report.date.split('-').reverse().join('/');
  const signatureRows = report.counters.map(name => {
    const s = report.signatures.find(s => s.signer_name === name);
    return [name, s?.signed_at ? new Date(s.signed_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : s ? 'Aguardando assinatura' : report.status === 'completed' ? 'Sem assinatura ERP' : 'Em contagem'];
  });
  if (format === 'xlsx') {
    const XLSX = await import('xlsx');
    const sheet = XLSX.utils.aoa_to_sheet([['myio Supply — Inventário'], ['Nome', report.name], ['Data', date], ['Estoque', report.area], ['Inventariantes', report.counters.join(', ')], ['Situação', report.status === 'completed' ? 'Concluído' : 'Em contagem'], [], report.columns, ...report.rows]);
    sheet['!cols'] = report.columns.map((_, index) => ({ wch: index === 0 ? 55 : 23 }));
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'Inventário');
    const signatures = XLSX.utils.aoa_to_sheet([['Inventariante', 'Assinatura'], ...signatureRows]);
    signatures['!cols'] = [{ wch: 45 }, { wch: 35 }]; XLSX.utils.book_append_sheet(workbook, signatures, 'Assinaturas');
    download(new Blob([XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${filename}.xlsx`);
    return;
  }
  const [{ jsPDF }, { default: autoTable }, regular, bold] = await Promise.all([import('jspdf'), import('jspdf-autotable'), font(regularUrl), font(boldUrl)]);
  const pdf = new jsPDF({ orientation: 'landscape', format: 'a4' });
  pdf.addFileToVFS('Nunito-Regular.ttf', regular); pdf.addFont('Nunito-Regular.ttf', 'Nunito', 'normal');
  pdf.addFileToVFS('Nunito-Bold.ttf', bold); pdf.addFont('Nunito-Bold.ttf', 'Nunito', 'bold');
  pdf.setFont('Nunito', 'bold'); pdf.setFontSize(14); pdf.text('myio Supply — Inventário', 12, 14);
  pdf.setFont('Nunito', 'normal'); pdf.setFontSize(9);
  const metadata = pdf.splitTextToSize(`${report.name} · ${date} · ${report.area}\nInventariantes: ${report.counters.join(', ')}\n${report.status === 'completed' ? 'Concluído' : 'Em contagem'}`, 270);
  pdf.text(metadata, 12, 21);
  autoTable(pdf, { head: [report.columns], body: report.rows.map(row => row.map(cell => cell === null ? '—' : String(cell))), startY: 25 + metadata.length * 4, margin: 12, theme: 'plain', styles: { font: 'Nunito', fontSize: 8, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 65 } }, rowPageBreak: 'avoid' });
  pdf.addPage(); pdf.setFont('Nunito', 'bold'); pdf.setFontSize(13); pdf.text('Assinaturas dos inventariantes', 12, 16);
  let y = 28;
  for (const row of signatureRows) {
    if (y > 175) { pdf.addPage(); y = 20; }
    pdf.setFont('Nunito', 'normal'); pdf.setFontSize(9); pdf.text(pdf.splitTextToSize(`${row[0]} — ${row[1]}`, 270), 12, y);
    const signer = report.signatures.find(s => s.signer_name === row[0]);
    if (signer?.signed_at && signer.image) { pdf.addImage(signer.image, 'PNG', 12, y + 4, 60, 16); y += 30; } else y += 14;
  }
  download(pdf.output('blob'), `${filename}.pdf`);
}