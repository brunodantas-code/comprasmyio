import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Pencil, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { SignaturePad } from '@/components/legal/signature-pad';
import { signatureDate, signatureImageSchema } from '@/lib/signatures';

export function PersonalSignature({ userId, initiallyOpen = false }: { userId: string; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [editing, setEditing] = useState(false);
  const [image, setImage] = useState('');
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const saved = useQuery({ queryKey: ['personal-signature', userId], queryFn: async () => {
    const { data, error } = await supabase.from('user_signatures').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw error; return data;
  } });
  async function save() {
    const result = signatureImageSchema.safeParse(image);
    if (!result.success) { toast.error('Desenhe sua assinatura'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from('user_signatures').upsert({ user_id: userId, image: result.data, updated_at: new Date().toISOString() });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['personal-signature', userId] });
      setEditing(false); setImage(''); toast.success('Assinatura salva');
    } catch { toast.error('Não foi possível salvar a assinatura'); } finally { setBusy(false); }
  }
  return <section className="space-y-3 border-b border-border py-3">
    <div className="flex items-center gap-2"><Button variant="ghost" size="compactIcon" aria-label={open ? 'Recolher assinatura pessoal' : 'Exibir assinatura pessoal'} onClick={() => setOpen(!open)}>{open ? <ChevronDown /> : <ChevronRight />}</Button><h2 className="flex-1 text-sm">Minha assinatura</h2>{open && saved.data && <Button variant="outline" size="compactIcon" title="Editar assinatura" aria-label="Editar assinatura" onClick={() => { setEditing(true); setImage(''); }}><Pencil /></Button>}</div>
    {open && <div className="space-y-3 pl-8">{saved.isPending ? <p className="text-sm text-muted-foreground">Carregando...</p> : saved.error ? <p role="alert">Não foi possível carregar sua assinatura.</p> : editing || !saved.data ? <><SignaturePad onConfirm={setImage} />{image && <><img src={image} alt="Prévia da assinatura" className="h-20 max-w-full bg-background" /><div className="flex justify-end"><Button disabled={busy} onClick={save}><Save />Salvar</Button></div></>}</> : <><img src={saved.data.image} alt="Minha assinatura cadastrada" className="h-20 max-w-full bg-background" /><p className="text-xs text-muted-foreground">Atualizada em {signatureDate(saved.data.updated_at)}</p></>}</div>}
  </section>;
}