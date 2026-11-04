export type ProcessParagraph = { id: string; text: string };
export type ProcessSection = { id: string; title: string; paragraphs: ProcessParagraph[] };
export type StageBinding = { node_id: string; department: string; responsible_id: string | null };
export type TextProcess = { id: string; name: string; sections: ProcessSection[]; flow_ids: string[]; stage_bindings: StageBinding[]; revision: number };

export function reorderProcessSections(sections: ProcessSection[], source: string, target: string): ProcessSection[] {
  const from = sections.findIndex((section) => section.id === source);
  const to = sections.findIndex((section) => section.id === target);
  if (from < 0 || to < 0 || from === to) return sections;
  const ordered = [...sections];
  const [section] = ordered.splice(from, 1);
  ordered.splice(to, 0, section);
  return ordered;
}

export function numberedProcessSections(sections: ProcessSection[]) {
  let paragraphNumber = 0;
  return sections.map((section, index) => ({ ...section, number: index + 1, paragraphs: section.paragraphs.map((paragraph) => ({ ...paragraph, number: ++paragraphNumber })) }));
}

export function processContentError(process: Pick<TextProcess, "name" | "sections">): string | null {
  if (!process.name.trim()) return "Informe o nome do Processo.";
  for (const section of process.sections) {
    if (!section.title.trim()) return "Informe o título da seção.";
    if (section.paragraphs.some((paragraph) => !paragraph.text.trim())) return "Preencha o parágrafo ou remova-o.";
  }
  return null;
}