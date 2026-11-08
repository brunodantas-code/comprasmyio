import { CdeButton } from "@/components/cde/cde-button";
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ParticipantSelect } from './participant-select';

export function SubjectResponsibles({ names, users, subjectIndex, onChange }: {
  names: string[]; users: { id: string; full_name: string }[]; subjectIndex: number; onChange: (names: string[]) => void;
}) {
  const rows = names.length ? names : [''];
  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-2"><Label>Responsáveis (opcional)</Label><CdeButton group="plus" screen="components/legal/subject-responsibles.tsx" title="Adicionar responsável" aria-label={`Adicionar responsável ao assunto ${subjectIndex + 1}`} onClick={() => onChange([...rows, ''])}></CdeButton></div>
    {rows.map((name, index) => <div key={index} className="flex min-w-0 gap-2"><ParticipantSelect label={`Responsável ${index + 1} pelo assunto ${subjectIndex + 1}`} name={name} index={index} users={users} onChange={value => onChange(rows.map((current, i) => i === index ? value : current))} /><Button variant="outline" size="compactIcon" title="Remover responsável" aria-label={`Remover responsável ${index + 1} do assunto ${subjectIndex + 1}`} onClick={() => onChange(rows.filter((_, i) => i !== index))}><Trash2 /></Button></div>)}
  </div>;
}