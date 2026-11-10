import { CdeNumber } from "@/components/cde/cde-button";
import { ChevronDown, ChevronRight, FileText, Pencil, Trash2, FileSignature, ChevronUp } from 'lucide-react';
import { canSignParticipant, signatureDate } from '@/lib/signatures';
import { Button } from '@/components/ui/button';
import { legalDate, legalPendingCount, legalSubjectResponsibles, parseLegalContent } from '@/lib/legal';
import type { Database } from '@/integrations/supabase/types';
import { useSuspenseQuery } from '@tanstack/react-query';
import { legalActionDelayDays, legalActionDueSoonDays, legalTrackingOptions, pendingLegalActions } from '@/lib/legal-actions';
import { useMinutesAlerts } from '@/components/cde/cde-deadline-alerts';
import { SubjectActions } from './subject-actions';
import { useState } from 'react';
import { toast } from 'sonner';
import { legalPdf } from '@/lib/legal-pdf';
import { legalSignaturePendingItems, openDeliberations } from '@/lib/legal-pending';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { LegalContent } from '@/lib/legal';

async function exportMinutesPdf(title: string, date: string | null, content: LegalContent) {
  try {
    const blob = await legalPdf(title, date, content, true);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${title.replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120) || 'ata'}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch { toast.error('Não foi possível exportar o PDF'); }
}

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
  const queryClient = useQueryClient();
  const minutesAlerts = useMinutesAlerts();
  const [pendingUserId, setPendingUserId] = useState('all');
  const pendingUser = tracking.users.find(u => u.id === pendingUserId);
  const badgeUser = pendingUser ?? user;
  const shownRows = pendingUser ? rows.filter(r => legalSignaturePendingItems([r], pendingUser, tracking.actions, tracking.completions).length > 0) : rows;
  const toggleDeliberation = async (recordId: string, subjectId: string, done: boolean) => {
    const { error } = done ? await supabase.from('legal_subject_completions').insert({ record_id: recordId, subject_id: subjectId }) : await supabase.from('legal_subject_completions').delete().eq('record_id', recordId).eq('subject_id', subjectId);
    if (error) { toast.error(error.message); return; }
    await queryClient.invalidateQueries({ queryKey: ['legal-tracking'] }); void queryClient.invalidateQueries({ queryKey: ['pending-actions'] });
  };
  return <div className="space-y-3">
    <div className="flex items-center justify-end gap-2 text-sm"><Label htmlFor="legal-pending-user" className="text-muted-foreground">Pendências de</Label><Select value={pendingUserId} onValueChange={setPendingUserId}><SelectTrigger id="legal-pending-user" className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os usuários</SelectItem>{tracking.users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent></Select></div>
    {pendingUser && shownRows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma pendência de {pendingUser.full_name}.</p> : null}
    <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
    {shownRows.map(row => {
      const content = parseLegalContent(row.content);
      const pending = legalPendingCount(content);
      pending.actions += pendingLegalActions(tracking.actions.filter(a=>a.record_id===row.id && content.subjects.some(s=>s.id===a.subject_id)));
      pending.total = pending.signatures + pending.actions;
      const mine = badgeUser ? legalSignaturePendingItems([row], badgeUser, tracking.actions, tracking.completions)[0] : undefined;
      const open = expanded.has(row.id);
      return <article key={row.id}>
        <div className="flex items-center gap-1 px-2 py-3 sm:gap-2 sm:px-4">
          <button type="button" className="flex h-auto min-w-0 flex-1 items-center justify-start gap-3 rounded-md bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={open} aria-label={`${open ? 'Recolher' : 'Exibir'} ${row.title}`} onClick={() => toggle(row.id)}>
            {open ? <ChevronDown className="h-5 w-5 shrink-0 text-primary" /> : <ChevronRight className="h-5 w-5 shrink-0 text-primary" />}
            <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold text-foreground">{row.title}</span><span className="block text-xs font-normal text-muted-foreground">{legalDate(row.meeting_date)}</span></span>
          </button>
          {mine ? <span role="status" title={`${mine.signature ? (mine.revision ? 'Nova assinatura pendente (edição da ata anterior)' : 'Assinatura pendente') : ''}${mine.signature && mine.actions ? ' e ' : ''}${mine.actions ? `${mine.actions} ação(ões) pendente(s)` : ''}`} aria-label={`${mine.count} pendência(s) nesta ata${pendingUser ? ` de ${pendingUser.full_name}` : ''}`} className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">{mine.count > 99 ? '99+' : mine.count}</span> : null}
          <Button variant="outline" size="compactIcon" title="Editar" aria-label={`Editar ${row.title}`} onClick={() => edit(row)}><Pencil /></Button>
          <Button variant="outline" size="compactIcon" title="Excluir" aria-label={`Excluir ${row.title}`} onClick={() => remove(row)}><Trash2 /></Button>
          <Button variant="outline" size="compactIcon" title={row.pdf_path ? 'PDF assinado' : 'Exportar PDF'} aria-label={`${row.pdf_path ? 'Abrir PDF assinado' : 'Exportar PDF'} de ${row.title}`} onClick={() => { if (row.pdf_path) openPdf(row.pdf_path); else void exportMinutesPdf(row.title, row.meeting_date, content); }}><FileText /></Button>
        </div>
        {open ? <div className="border-t border-border bg-background">
          <div className="space-y-2 px-4 py-4 text-sm sm:px-6"><p><span className="text-muted-foreground">Local: </span>{content.location}</p><p className="break-words"><span className="text-muted-foreground">Participantes: </span>{content.participants.map(p => p.name).join(', ')}</p></div>
          {content.subjects.map((subject,index)=><section key={subject.id} className="border-t border-border text-sm" aria-label={`Assunto ${index + 1}: ${subject.title}`}>
            <div className="space-y-2 bg-primary/10 px-4 py-2 sm:px-6">
              <div className="flex items-center gap-3">
                <CdeNumber screen="components/legal/minutes-list.tsx">{index + 1}</CdeNumber>
                <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3"><h2 className="min-w-0 break-words text-sm font-semibold">{subject.title}</h2>{(()=>{const open=tracking.actions.filter(a=>a.record_id===row.id&&a.subject_id===subject.id&&!a.archived&&!a.completed_at);if(!open.length)return null;const mine=user?open.filter(a=>a.responsible_id===user.id).length:0;const late=open.filter(a=>legalActionDelayDays(a)>0).length;const soon=open.filter(a=>legalActionDueSoonDays(a,minutesAlerts.warningDays)!==null).length;return <><span className="text-xs font-normal text-muted-foreground">{open.length} {open.length===1?'ação em aberto':'ações em aberto'} · {mine} {mine===1?'sua':'suas'}</span>{late||soon?<span className="text-xs font-medium text-destructive">{[late?`${late} ${late===1?'atrasada':'atrasadas'}`:null,soon?`${soon} em prazo crítico`:null].filter(Boolean).join(' · ')}</span>:null}</>;})()}</div>
                {openDeliberations(row.id, [subject], tracking.actions, tracking.completions).length ? <PendingDot label={`Deliberação pendente de ${legalSubjectResponsibles(subject).join(', ')}`} /> : null}
                <Button variant="ghost" size="compactIcon" aria-expanded={openedSubjects.has(subject.id)} aria-label={`${openedSubjects.has(subject.id)?'Recolher':'Exibir'} assunto ${index+1}`} onClick={()=>setOpenedSubjects(prev=>{const n=new Set(prev);if(n.has(subject.id))n.delete(subject.id);else n.add(subject.id);return n;})}>{openedSubjects.has(subject.id)?<ChevronUp/>:<ChevronDown/>}</Button>
              </div>
              {openedSubjects.has(subject.id) && <div className="pl-10"><p className="whitespace-pre-wrap break-words">{subject.description || '—'}</p><p className="mt-1 text-xs text-muted-foreground">Descrição</p></div>}
            </div>
            {openedSubjects.has(subject.id) && <div className="space-y-3 border-t border-border px-4 py-4 sm:px-6">
              <h4 className="text-sm font-semibold">Deliberações</h4>
              {subject.decisions?.trim() ? <ol className="space-y-2">{subject.decisions.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((decision, decisionIndex) => <li key={decisionIndex} className="flex items-start gap-2"><CdeNumber screen="components/legal/minutes-list.tsx">{decisionIndex + 1}</CdeNumber><span className="min-w-0 whitespace-pre-wrap break-words">{decision.replace(/^\d+[.)]\s+/, '')}</span></li>)}</ol> : <p>—</p>}
              {legalSubjectResponsibles(subject).length > 0 || subject.completionDate ? <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
                {legalSubjectResponsibles(subject).length > 0 ? <p className="flex items-start gap-2 break-words">{!tracking.actions.some(a=>a.record_id===row.id&&a.subject_id===subject.id&&!a.archived) ? <Checkbox className="mt-0.5" checked={tracking.completions.some(c=>c.record_id===row.id&&c.subject_id===subject.id)} aria-label="Concluir deliberação" title="Concluir deliberação (sem ações cadastradas)" onCheckedChange={v=>toggleDeliberation(row.id,subject.id,Boolean(v))} /> : null}<span><span className="text-muted-foreground">Responsáveis: </span>{legalSubjectResponsibles(subject).join(', ')}</span></p> : null}
                {subject.completionDate ? <p><span className="text-muted-foreground">Data de conclusão: </span>{legalDate(subject.completionDate)}</p> : null}
              </div> : null}
              <SubjectActions recordId={row.id} subjectId={subject.id} userId={user?.id} />
            </div>}
          </section>)}
          <div className="space-y-2 border-t border-border px-4 py-4 text-sm sm:px-6"><h2 className="text-base font-semibold">Assinaturas dos participantes</h2>{content.revision && content.participants.some(p => !p.signature || !p.signedAt) ? <p className="text-xs text-destructive">Assinatura pendente referente à edição {content.revision} da ata anteriormente assinada. Confira as alterações no Histórico.</p> : null}{content.participants.map(p => <div key={p.id} className="flex items-center gap-2"><span className="min-w-0 break-words">{p.name} — {p.signature && p.signedAt ? `Assinado em ${signatureDate(p.signedAt)}` : 'Aguardando assinatura'}</span>{!p.signature || !p.signedAt ? <><PendingDot label={`Assinatura pendente de ${p.name}`} /><Button variant="outline" size="compactIcon" title={canSignParticipant(p,user) ? 'Assinar' : 'Somente este participante pode assinar'} disabled={!canSignParticipant(p,user)} aria-label={`Assinar como ${p.name}`} onClick={() => sign(row,p.id,p.name)}><FileSignature /></Button></> : null}</div>)}</div>
        </div> : null}
      </article>;
    })}
    </div>
  </div>;
}
