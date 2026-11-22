import { importedField } from '@/lib/indicadores-import';
import { CdeDisclosureIcon } from '@/components/cde/cde-button';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import type { IndicadoresData } from './data';

export function ImportedSummary({ records }: { records: IndicadoresData['imported'] }) {
  const [open, setOpen] = useState(false);
  if (!records.length) return null;
  const rows = (table: string) => records.filter(r => r.source_table === table);
  const field = importedField;
  const members = rows('team_members');
  return <>
    <Button variant="ghost" onClick={() => setOpen(true)} className="!w-auto !h-auto gap-2 text-sm" aria-label="Áreas, equipe e reuniões importadas">Áreas, equipe e reuniões <CdeDisclosureIcon open={false} screen="components/indicadores/dashboard.tsx" /></Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Áreas, equipe e reuniões</DialogTitle></DialogHeader>
      <h2 className="text-sm font-semibold">Áreas</h2>
      <div className="divide-y divide-border">{rows('dimensions').sort((a,b)=>Number(field(a.data,'sort_order'))-Number(field(b.data,'sort_order'))).map(r=><p key={r.source_id} className="py-2 text-sm">{field(r.data,'name')} · {field(r.data,'manager_name')}</p>)}</div>
      <h2 className="text-sm font-semibold">Equipe</h2>
      <div className="divide-y divide-border">{members.map(r=><div key={r.source_id} className="py-2 text-sm"><p>{field(r.data,'full_name')} · {field(r.data,'role')}</p><p className="text-xs text-muted-foreground">{rows('team_member_dimensions').filter(link=>field(link.data,'team_member_id')===field(r.data,'id')).map(link=>field(rows('dimensions').find(d=>field(d.data,'id')===field(link.data,'dimension_id'))?.data,'name')).join(' · ')}</p></div>)}</div>
      <h2 className="text-sm font-semibold">Reuniões</h2>
      <div className="divide-y divide-border">{rows('meetings').map(r=><div key={r.source_id} className="space-y-1 py-3 text-sm"><p>{field(r.data,'title')} · {field(r.data,'meeting_type')}</p><p>{new Date(field(r.data,'scheduled_at')).toLocaleString('pt-BR')} · {field(r.data,'duration_minutes')} min</p><p className="whitespace-pre-wrap">{field(r.data,'description')}</p>{field(r.data,'location')&&<p>{field(r.data,'location')}</p>}<p className="text-xs text-muted-foreground">Organizador: {field(rows('profiles').find(p=>field(p.data,'user_id')===field(r.data,'organizer_id'))?.data,'full_name')||'Registrado na origem'}</p>{rows('meeting_participants').filter(p=>field(p.data,'meeting_id')===field(r.data,'id')).map(p=><p key={p.source_id} className="text-xs text-muted-foreground">{field(members.find(m=>field(m.data,'id')===field(p.data,'user_id'))?.data,'full_name')} · {field(p.data,'status')==='pending'?'Pendente':field(p.data,'status')}</p>)}</div>)}</div>
    </DialogContent></Dialog>
  </>;
}