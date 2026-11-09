import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Pencil, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { SignaturePad } from '@/components/legal/signature-pad';
import { signatureDate, signatureImageSchema } from '@/lib/signatures';

export const SIGNATURE_FONTS = ['Nunito', 'Dancing Script', 'Great Vibes', 'Caveat'] as const;
export const SIGNATURE_SIZES = [9, 12, 16, 20, 24, 32] as const;

/** Renders typed text in the chosen font into the same PNG format as a drawn signature. */
async function renderTypedSignature(text: string, font: string, size: number) {
  const px = size * 4; // high resolution, preserves proportion between sizes
  const spec = `${px}px "${font}"`;
  try { await document.fonts.load(spec, text); } catch { /* fallback font */ }
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = spec;
  const width = Math.ceil(measure.measureText(text).width) + px;
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(Math.max(width, 40), 1600);
  canvas.height = Math.ceil(px * 1.8);
  const ctx = canvas.getContext('2d')!;
  ctx.font = spec; ctx.fillStyle = '#000'; ctx.textBaseline = 'middle';
  ctx.fillText(text, px / 2, canvas.height / 2);
  return canvas.toDataURL('image/png');
}

export function PersonalSignature({ userId, initiallyOpen = false }: { userId: string; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<'font' | 'draw'>('font');
  const [image, setImage] = useState('');
  const [text, setText] = useState('');
  const [font, setFont] = useState<string>('Nunito');
  const [size, setSize] = useState<number>(9);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const saved = useQuery({ queryKey: ['personal-signature', userId], queryFn: async () => {
    const { data, error } = await supabase.from('user_signatures').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw error; return data;
  } });
  async function save() {
    setBusy(true);
    try {
      let png = image;
      if (mode === 'font') {
        const name = text.trim().slice(0, 80);
        if (!name) { toast.error('Digite o nome da assinatura'); return; }
        if (!password) { toast.error('Informe sua senha de confirmação'); return; }
        const { data: u } = await supabase.auth.getUser();
        const email = u.user?.email;
        if (!email) { toast.error('Sessão expirada'); return; }
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) { toast.error('Senha incorreta'); return; }
        png = await renderTypedSignature(name, font, size);
      }
      const result = signatureImageSchema.safeParse(png);
      if (!result.success) { toast.error(mode === 'draw' ? 'Desenhe sua assinatura' : 'Assinatura inválida'); return; }
      const { error } = await supabase.from('user_signatures').upsert({ user_id: userId, image: result.data, updated_at: new Date().toISOString() });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['personal-signature', userId] });
      setEditing(false); setImage(''); setPassword(''); toast.success('Assinatura salva');
    } catch { toast.error('Não foi possível salvar a assinatura'); } finally { setBusy(false); }
  }
  const chip = (active: boolean) => `rounded-md px-3 py-1 text-sm ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/60'}`;
  const editor = <div className="space-y-3">
    <div className="flex gap-2" role="tablist">
      <button type="button" role="tab" aria-selected={mode === 'font'} className={chip(mode === 'font')} onClick={() => setMode('font')}>Fonte e senha</button>
      <button type="button" role="tab" aria-selected={mode === 'draw'} className={chip(mode === 'draw')} onClick={() => setMode('draw')}>Desenhar com o cursor</button>
    </div>
    {mode === 'font' ? <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div><Label htmlFor="sig-text">Nome</Label><Input id="sig-text" maxLength={80} value={text} onChange={e => setText(e.target.value)} /></div>
        <div><Label htmlFor="sig-font">Fonte</Label><select id="sig-font" className="block h-9 w-full border-b border-primary bg-transparent text-sm" value={font} onChange={e => setFont(e.target.value)}>{SIGNATURE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
        <div><Label htmlFor="sig-size">Tamanho</Label><select id="sig-size" className="block h-9 w-full border-b border-primary bg-transparent text-sm" value={size} onChange={e => setSize(Number(e.target.value))}>{SIGNATURE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
      </div>
      {text.trim() && <p aria-label="Prévia da assinatura" style={{ fontFamily: `"${font}"`, fontSize: `${size}pt` }} className="text-foreground">{text}</p>}
      <div className="max-w-xs"><Label htmlFor="sig-password">Senha de confirmação</Label><PasswordInput id="sig-password" autoComplete="current-password" maxLength={256} value={password} onChange={e => setPassword(e.target.value)} /></div>
      <div className="flex justify-end"><Button disabled={busy || !text.trim() || !password} onClick={save}><Save />Salvar</Button></div>
    </div> : <><SignaturePad onConfirm={setImage} />{image && <><img src={image} alt="Prévia da assinatura" className="h-20 max-w-full bg-background" /><div className="flex justify-end"><Button disabled={busy} onClick={save}><Save />Salvar</Button></div></>}</>}
  </div>;
  return <section className="space-y-3 border-b border-border py-3">
    <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Minha assinatura</h3><div className="flex items-center gap-2">{open && saved.data && !editing && <Button variant="outline" size="compactIcon" title="Editar assinatura" aria-label="Editar assinatura" onClick={() => { setEditing(true); setImage(''); }}><Pencil /></Button>}<Button variant="ghost" size="compactIcon" aria-label={open ? 'Recolher assinatura pessoal' : 'Exibir assinatura pessoal'} onClick={() => setOpen(!open)}>{open ? <ChevronUp /> : <ChevronDown />}</Button></div></div>
    {open && <div className="space-y-3">{saved.isPending ? <p className="text-sm text-muted-foreground">Carregando...</p> : saved.error ? <p role="alert">Não foi possível carregar sua assinatura.</p> : editing || !saved.data ? editor : <><img src={saved.data.image} alt="Minha assinatura cadastrada" className="h-20 max-w-full bg-background object-contain object-left" /><p className="text-xs text-muted-foreground">Atualizada em {signatureDate(saved.data.updated_at)}</p></>}</div>}
  </section>;
}
