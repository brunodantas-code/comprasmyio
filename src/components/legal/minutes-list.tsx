import { ChevronDown, ChevronRight, FileText, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { legalDate, legalPendingCount, parseLegalContent } from '@/lib/legal';
import type { Database } from '@/integrations/supabase/types';

type RecordRow = Database['public']['Tables']['legal_records']['Row'];
function PendingDot({ label }: { label: string }) {
  return <span role="img" aria-label={label} title={label} className="h-3 w-3 shrink-0 rounded-full bg-destructive" />;
}

export function MinutesList({ rows, expanded, toggle, edit, remove, openPdf }: {
  rows: RecordRow[]; expanded: Set<string>; toggle: (id: string) => void;
  edit: (row: RecordRow) => void; remove: (row: RecordRow) => void; openPdf: (path: string) => void;
}) {
  return <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
    {rows.map(row => {
      const content = parseLegalContent(row.content);
      const pending = legalPendingCount(content);
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
        {open ? <div className="divide-y divide-border border-t border-border bg-muted/30 pl-4 sm:pl-6">
          <div className="space-y-1 px-4 py-3 text-sm"><p><span className="text-muted-foreground">Local: </span>{content.location}</p><p className="break-words"><span className="text-muted-foreground">Participantes: </span>{content.participants.map(p => p.name).join(', ')}</p></div>
          {content.subjects.map((subject, index) => <section key={subject.id} className="space-y-2 px-4 py-3 text-sm">
            <h2 className="flex items-center gap-3 font-medium"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-xs text-primary">{index + 1}</span><span className="min-w-0 flex-1 break-words">{subject.title}</span>{subject.responsible?.trim() && !subject.completionDate ? <PendingDot label={`Ação pendente de ${subject.responsible}`} /> : null}</h2>
            <p className="whitespace-pre-wrap break-words text-muted-foreground">{subject.description}</p>
            <p className="whitespace-pre-wrap break-words"><span className="text-muted-foreground">Deliberações: </span>{subject.decisions || '—'}</p>
            {subject.responsible ? <p><span className="text-muted-foreground">Responsável: </span>{subject.responsible}</p> : null}
            {subject.completionDate ? <p><span className="text-muted-foreground">Data de conclusão: </span>{legalDate(subject.completionDate)}</p> : null}
          </section>)}
          <div className="space-y-2 px-4 py-3 text-sm">{content.participants.map(p => <p key={p.id} className="flex items-center gap-2"><span className="break-words">{p.name} — {p.signature && p.signedAt ? 'Assinatura registrada' : 'Aguardando assinatura'}</span>{!p.signature || !p.signedAt ? <PendingDot label={`Assinatura pendente de ${p.name}`} /> : null}</p>)}</div>
        </div> : null}
      </article>;
    })}
  </div>;
}