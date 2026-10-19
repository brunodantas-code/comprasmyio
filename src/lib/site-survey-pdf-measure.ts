import type { jsPDF } from "jspdf";

/**
 * Minimum column width (in the document's unit) that keeps every label on a single
 * line: the widest label plus the horizontal cell padding. jsPDF measures with the
 * font currently selected, so the helper pins the report font and restores the
 * previous selection right after measuring.
 */
export function textColumnWidth(pdf: jsPDF, labels: string[], padding: number, min = 16, max = 40): number {
  const previous = (pdf as unknown as { getFont: () => { fontName: string; fontStyle: string } }).getFont();
  pdf.setFont("Nunito", "normal");
  pdf.setFontSize(9);
  const widest = labels.reduce((width, label) => Math.max(width, pdf.getTextWidth(label)), 0);
  pdf.setFont(previous.fontName, previous.fontStyle);
  return Math.min(max, Math.max(min, Math.ceil(widest + padding * 2 + 1)));
}
