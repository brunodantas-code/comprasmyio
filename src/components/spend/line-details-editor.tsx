import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Line } from './data';

export function SpendLineDetailsEditor({ line, disabled }: { line: Line; disabled: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [description, setDescription] = useState('');
  const [observation, setObservation] = useState('');
  const [revision, setRevision] = useState<string | null>(null);
  const [initial, setInitial] = useState({ description: '', observation: '' });
  const dirty = description.trim() !== initial.description || observation.trim() !== initial.observation;
  function edit() {
    const draft = { description: line.display_description ?? line.merchant, observation: line.additional_observation ?? '' };
    setInitial(draft); setDescription(draft.description); setObservation(draft.observation);
    setRevision(line.description_revision ?? null); setOpen(true);
  }
  async function save() {
    if (busy || disabled || !dirty || !description.trim()) return;
    setBusy(true);
    try {
      const result = await supabase.rpc('spend_edit_line_details', { _line_id: line.id, _description: description.trim(), _observation: observation.trim(), ...(revision ? { _expected_revision: revision } : {}) });
      if (result.error) throw result.error;
      if (!result.data || typeof result.data !== 'object' || Array.isArray(result.data) || typeof result.data['id'] !== 'string') throw new Error('Não foi possível confirmar o salvamento');
      await qc.invalidateQueries({ queryKey: ['spend'] });
      setOpen(false); toast.success('Descrição e observação salvas');
    } catch (error) { toast.error(error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : 'Não foi possível salvar a descrição'); }
    finally { setBusy(false); }
  }
  return <>
    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Editar descrição e observação do lançamento" disabled={disabled} onClick={edit}><Pencil /></Button></TooltipTrigger><TooltipContent>Editar descrição e observação</TooltipContent></Tooltip></TooltipProvider>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="sm:max-w-xl" aria-describedby={undefined} topActions={<Button variant="ghost" size="icon" title="Salvar descrição e observação" aria-label="Salvar descrição e observação" disabled={busy || disabled || !dirty || !description.trim()} onClick={() => void save()}><Save /></Button>}>
        <DialogHeader><DialogTitle>Descrição do lançamento</DialogTitle></DialogHeader>
        <div className="min-w-0 space-y-4">
          <div className="space-y-1"><Label>Descrição original da fatura</Label><p className="break-words text-sm text-muted-foreground">{line.merchant}</p></div>
          <div className="space-y-1"><Label htmlFor={`description-${line.id}`}>Descrição</Label><Textarea id={`description-${line.id}`} value={description} disabled={busy} onChange={event => setDescription(event.target.value)} rows={2} /></div>
          <div className="space-y-1"><Label htmlFor={`observation-${line.id}`}>Observação adicional (opcional)</Label><Textarea id={`observation-${line.id}`} value={observation} disabled={busy} onChange={event => setObservation(event.target.value)} rows={4} /></div>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}