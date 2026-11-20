import { decodeCustomerAnswerMap, matchLegacyReportPoint, type ClientReportField, type ClientReportItem } from "./site-survey-customer-answer-import";

type Point = { value: string; label: string; name?: string; lucNumber?: string | null; location?: string | null };
export async function readClientReport(file: File, visitId: string, points: Point[]) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { PDFDocument, PDFTextField, PDFCheckBox } = await import("pdf-lib");
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const map = decodeCustomerAnswerMap(doc.getSubject());
  if (!map || map.visit !== visitId) throw new Error("Este PDF não pertence a esta visita ou não foi gerado pelo sistema.");
  const values = new Map<string, string>();
  for (const field of doc.getForm().getFields()) {
    if (field instanceof PDFTextField && field.getText()?.trim()) values.set(field.getName(), field.getText()?.trim() ?? "");
    if (field instanceof PDFCheckBox && field.isChecked()) values.set(field.getName(), "checked");
  }
  const mapped: ClientReportField[] = [...map.fields];
  const unmapped = [...values.keys()].filter((name) => !mapped.some((field) => field.field === name) && /^(obs_|confirma_)/.test(name));
  const unresolved: string[] = [];
  if (unmapped.length) {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const task = pdfjs.getDocument({ data: bytes.slice() });
    try {
      const pdf = await task.promise;
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        const text = await page.getTextContent();
        for (const annotation of await page.getAnnotations()) {
          const name: string = annotation.fieldName ?? "";
          if (!unmapped.includes(name)) continue;
          const rect: number[] = annotation.rect ?? [];
          const bottom = rect[1], top = rect[3];
          if (bottom === undefined || top === undefined) continue;
          const row = text.items.flatMap((item) => {
            if (!("str" in item)) return [];
            const y = item.transform[5];
            return y !== undefined && y >= bottom - 8 && y <= top + 8 ? [item.str] : [];
          });
          const point = matchLegacyReportPoint(row, points);
          if (!point) { unresolved.push(name); continue; }
          const observation = name.startsWith("obs_");
          const category = name.startsWith("confirma_vaga_") ? "vacant" : "duplicate";
          mapped.push({ field: name, point: point.value, label: point.label, question: observation ? "Observações finais e fotos adicionais" : "Confirmação do cliente", kind: observation ? "observation" : "confirmation", ...(observation ? {} : { category, choice: name.startsWith("confirma_dup_") ? "Duplicado" : "OK" }) });
        }
        page.cleanup();
      }
    } finally { await task.destroy(); }
  }
  const items: ClientReportItem[] = mapped.flatMap((field) => {
    const value = values.get(field.field);
    return value ? [{ ...field, answer: field.kind === "confirmation" ? field.choice ?? "OK" : value }] : [];
  });
  for (const item of items) {
    if (item.kind === "confirmation" && items.some((other) => other.point === item.point && other.category === item.category && other.kind === "confirmation" && other.answer !== item.answer)) throw new Error(`OK e Duplicado marcados simultaneamente em ${item.label}. Corrija o PDF.`);
  }
  return { items, unresolved: [...new Set([...unresolved, ...unmapped.filter((name) => !mapped.some((field) => field.field === name))])] };
}