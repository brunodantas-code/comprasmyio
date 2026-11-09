import { CdeNumber } from "@/components/cde/cde-button";
import { ChevronDown, ChevronRight, FileText, Pencil, Trash2, FileSignature, ChevronUp } from 'lucide-react';
import { canSignParticipant, signatureDate } from '@/lib/signatures';
import { Button } from '@/components/ui/button';
import { legalDate, legalPendingCount, legalSubjectResponsibles, parseLegalContent } from '@/lib/legal';
import type { Database } from '@/integrations/supabase/types';
import { useSuspenseQuery } from '@tanstack/react-query';
import { legalTrackingOptions, pendingLegalActions } from '@/lib/legal-actions';
import { SubjectActions } from './subject-actions';
import { useState } from 'react';

type RecordRow = Database['public']['Tables']['legal_records']['Row'];
function PendingDot({ label }: { label: string }) {
  return <span role="img" aria-label={label} title={label} className="h-3 w-3 shrink-0 rounded-full bg-destructive" />;
}

export function MinutesList({ rows, expanded, toggle, edit, remove, openPdf, user, sign }: {
  rows: RecordRow[]; expanded: Set<string>; toggle: (id: string) => void;
  edit: (row: RecordRow) => void; remove: (row: RecordRow) => void; openPdf: (path: string) => void;
  user: { id: string; full_name: string } | null | undefined; sign: (row: RecordRow, participantId: string, name: string) => void;
}) {
  const [openedSubjects,setOpenedSubjects]=useState<Set<string>>(new Set());
  const { data: tracking } = useSuspenseQuery(legalTrackingOptions);
  return <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
    {rows.map(row => {
      const content = parseLegalContent(row.content);
      const pending = legalPendingCount(content);
      pending.actions += pendingLegalActions(tracking.actions.filter(a=>a.record_id===row.id && content.subjects.some(s=>s.id===a.subject_id)));
      pending.total = pending.signatures + pending.actions;
      const open = expanded.has(row.id);
      return <article key={row.id}>
        <div className="flex items-center gap-1 px-2 py-3 sm:gap-2 sm:px-4">
          <Button variant="ghost" className="h-auto min-w-0 flex-1 justify-start gap-3 whitespace-normal p-0 text-left hover:bg-transparent" aria-expanded={open} aria-label={`${open ? 'Recolher' : 'Exibir'} ${row.title}`} onClick={() => toggle(row.id)}>
            {open ? <ChevronDown className="h-5 w-5 shrink-0 text-primary" /> : <ChevronRight className="h-5 w-5 shrink-0 text-primary" />}
            <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold text-foreground">{row.title}</span><span className="block text-xs font-normal text-muted-foreground">{legalDate(row.meeting_date)}</span></span>
          </Button>
          {pending.total > 0 ? <PendingDot label={`${pending.signatures} assinatura(s) e ${pending.actions} ação(ões) pendentes`} /> : null}
          <Button variant="outline" size="compactIcon" title="Editar" aria-label={`Editar ${row.title}`} onClick={() => edit(row)}><Pencil /></Button>
          <Button variant="outline" size="compactIcon" title="Excluir" aria-label={`Excluir ${row.title}`} onClick={() => remove(row)}><Trash2 /></Button>
          {row.pdf_path ? <Button variant="outline" size="compactIcon" title="PDF" aria-label={`Abrir PDF de ${row.title}`} onClick={() => { if (row.pdf_path) openPdf(row.pdf_path); }}><FileText /></Button> : null}
        </div>
        {open ? <div className="border-t border-border bg-background">
          <div className="space-y-2 px-4 py-4 text-sm sm:px-6"><p><span className="text-muted-foreground">Local: </span>{content.location}</p><p className="break-words"><span className="text-muted-foreground">Participantes: </span>{content.participants.map(p => p.name).join(', ')}</p></div>
          {content.subjects.map((subject,index)=><section key={subject.id} className="border-t border-border text-sm" aria-label={`Assunto ${index + 1}: ${subject.title}`}>
            <div className="space-y-2 bg-primary/10 px-4 py-2 sm:px-6">
              <div className="flex items-center gap-3">
                <CdeNumber screen="components/legal/minutes-list.tsx">{index + 1}</CdeNumber>
                <h2 className="min-w-0 flex-1 break-words text-sm font-semibold">{subject.title}</h2>
                {legalSubjectResponsibles(subject).length > 0 && !subject.completionDate ? <PendingDot label={`Ação pendente de ${legalSubjectResponsibles(subject).join(', ')}`} /> : null}
                <Button variant="ghost" size="compactIcon" aria-expanded={openedSubjects.has(subject.id)} aria-label={`${openedSubjects.has(subject.id)?'Recolher':'Exibir'} assunto ${index+1}`} onClick={()=>setOpenedSubjects(prev=>{const n=new Set(prev);if(n.has(subject.id))n.delete(subject.id);else n.add(subject.id);return n;})}>{openedSubjects.has(subject.id)?<ChevronUp/>:<ChevronDown/>}</Button>
              </div>
              {openedSubjects.has(subject.id) && <div className="pl-10"><p className="whitespace-pre-wrap break-words">{subject.description || '—'}</p><p className="mt-1 text-xs text-muted-foreground">Descrição</p></div>}
            </div>
            {openedSubjects.has(subject.id) && <div className="space-y-3 border-t border-border px-4 py-4 sm:px-6">
              <h4 className="text-base font-semibold">Deliberações</h4>
              {subject.decisions?.trim() ? <ol className="space-y-2">{subject.decisions.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((decision, decisionIndex) => <li key={decisionIndex} className="flex items-start gap-2"><CdeNumber screen="components/legal/minutes-list.tsx">{decisionIndex + 1}</CdeNumber><span className="min-w-0 whitespace-pre-wrap break-words">{decision.replace(/^\d+[.)]\s+/, '')}</span></li>)}</ol> : <p>—</p>}
              {legalSubjectResponsibles(subject).length > 0 || subject.completionDate ? <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
                {legalSubjectResponsibles(subject).length > 0 ? <p className="break-words"><span className="text-muted-foreground">Responsáveis: </span>{legalSubjectResponsibles(subject).join(', ')}</p> : null}
                {subject.completionDate ? <p><span className="text-muted-foreground">Data de conclusão: </span>{legalDate(subject.completionDate)}</p> : null}
              </div> : null}
              <SubjectActions recordId={row.id} subjectId={subject.id} userId={user?.id} />
            </div>}
          </section>)}
          <div className="space-y-2 border-t border-border px-4 py-4 text-sm sm:px-6"><h2 className="text-base font-semibold">Assinaturas dos participantes</h2>{content.participants.map(p => <div key={p.id} className="flex items-center gap-2"><span className="min-w-0 break-words">{p.name} — {p.signature && p.signedAt ? `Assinado em ${signatureDate(p.signedAt)}` : 'Aguardando assinatura'}</span>{!p.signature || !p.signedAt ? <><PendingDot label={`Assinatura pendente de ${p.name}`} /><Button variant="outline" size="compactIcon" title={canSignParticipant(p,user) ? 'Assinar' : 'Somente este participante pode assinar'} disabled={!canSignParticipant(p,user)} aria-label={`Assinar como ${p.name}`} onClick={() => sign(row,p.id,p.name)}><FileSignature /></Button></> : null}</div>)}</div>
        </div> : null}
      </article>;
    })}
  </div>;
}