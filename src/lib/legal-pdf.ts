import type { LegalContent } from './legal';
import { legalDate, legalSubjectResponsibles } from './legal';
export async function legalPdf(title: string, date: string | null, content: LegalContent, minutes: boolean) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF(); let y = 22;
  const room = (height: number) => { if (y + height > 275) { doc.addPage(); y = 22; } };
  const text = (value: string, size = 11) => {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(value || '—', 174) as string[];
    for (const line of lines) { room(7); doc.text(line, 18, y); y += 6; }
    y += 3;
  };
  text('myio Legal', 15); text(title, 17);
  if (minutes) { text(`Data da reunião: ${legalDate(date)}`); text(`Local: ${content.location}`); text(`Participantes: ${content.participants.map(p => p.name).join(', ')}`); }
  for (const [index, subject] of content.subjects.entries()) {
    text(`${index + 1}. ${subject.title}`, 13); text(subject.description);
    if (minutes) {
      text('Deliberações', 11); text(subject.decisions);
      const responsibles = legalSubjectResponsibles(subject);
      if (responsibles.length) text(`Responsáveis: ${responsibles.join(', ')}`);
      if (subject.completionDate) text(`Data de conclusão: ${legalDate(subject.completionDate)}`);
    }
  }
  if (minutes) {
    room(20); text('Assinaturas dos participantes', 13);
    for (const participant of content.participants) {
      room(42); doc.addImage(participant.signature, 'PNG', 18, y, 75, 24); y += 26;
      text(participant.name); text(`Assinado em ${new Date(participant.signedAt).toLocaleString('pt-BR')}`, 9);
    }
  }
  return doc.output('blob');
}