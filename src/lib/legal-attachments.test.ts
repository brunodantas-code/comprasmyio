import { describe, expect, it } from 'vitest';
import { parseLegalContent, splitConfidentialSubjects, type LegalAttachment } from './legal';

const document: LegalAttachment = { id: 'doc', name: 'Contrato.pdf', path: 'owner/ata/doc.pdf', contentType: 'application/pdf' };
const photo: LegalAttachment = { id: 'photo', name: 'Foto.png', path: 'owner/ata/photo.png', contentType: 'image/png' };

describe('Anexos das atas', () => {
  it('preserva documentos ao final da ata', () => {
    expect(parseLegalContent({ attachments: [document] }).attachments).toEqual([document]);
  });
  it('mantém a foto somente no assunto em que foi anexada', () => {
    const content = parseLegalContent({ subjects: [{ id: 'one', title: 'Um', attachments: [photo] }, { id: 'two', title: 'Dois' }] });
    expect(content.subjects.find(s => s.id === 'one')?.attachments).toEqual([photo]);
    expect(content.subjects.find(s => s.id === 'two')?.attachments).toBeUndefined();
  });
  it('retira anexos confidenciais do conteúdo compartilhado', () => {
    const split = splitConfidentialSubjects(parseLegalContent({ attachments: [document], subjects: [{ id: 'private', confidential: true, attachments: [photo] }] }));
    expect(split.content.subjects).toEqual([]);
    expect(split.content.attachments).toEqual([document]);
    expect(split.confidential[0]?.subject.attachments).toEqual([photo]);
  });
});