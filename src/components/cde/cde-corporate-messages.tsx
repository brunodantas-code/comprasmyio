import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Ban, Pencil, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { confirmAction } from "@/components/confirm-dialog";
import { CdeCategoryHeader } from "./cde-category-header";
import { isMessageActive, todayIso, useCorporateMessages, type CorporateMessage } from "@/components/corporate/corporate-messages";

const br = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");
type Draft = { id?: string; message: string; starts_at: string; ends_at: string };

export function CdeCorporateMessages({ number, handle }: { number: number; handle?: import("react").ReactNode }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const { data = [] } = useCorporateMessages();
  const refresh = () => qc.invalidateQueries({ queryKey: ["corporate-messages"] });

  async function save() {
    if (!draft?.message.trim()) { toast.error("Escreva a mensagem."); return; }
    if (draft.ends_at && draft.ends_at < draft.starts_at) { toast.error("A inatividade não pode ser antes da exibição."); return; }
    setSaving(true);
    try {
      const row = { message: draft.message.trim(), starts_at: draft.starts_at, ends_at: draft.ends_at || null };
      const r = draft.id ? await supabase.from("corporate_messages").update(row).eq("id", draft.id).select("id") : await supabase.from("corporate_messages").insert(row).select("id");
      if (r.error || !r.data?.length) throw r.error ?? new Error("sem permissão");
      await refresh(); setDraft(null); toast.success("Mensagem salva");
    } catch { toast.error("Não foi possível salvar. Somente Admin do ERP publica mensagens."); } finally { setSaving(false); }
  }
  async function deactivate(m: CorporateMessage) {
    if (!(await confirmAction("Ela sai da tela principal hoje e permanece no histórico.", { title: "Inativar mensagem?" }))) return;
    const yesterday = todayIso(new Date(Date.now() - 86400000));
    const { error } = await supabase.from("corporate_messages").update({ ends_at: yesterday < m.starts_at ? m.starts_at : yesterday }).eq("id", m.id);
    if (error) toast.error("Não foi possível inativar."); else { await refresh(); toast.success("Mensagem inativada"); }
  }

  return <section className="space-y-4">
    <CdeCategoryHeader handle={handle} number={number} title="Mensagens corporativas" hint="Avisos na tela principal para todos os usuários" open={open} onToggle={() => setOpen(!open)} />
    {open && <div className="w-full min-w-0 space-y-4 py-4">
      {!draft && <Button variant="ghost" onClick={() => setDraft({ message: "", starts_at: todayIso(), ends_at: "" })}><Plus className="h-4 w-4" />Nova mensagem</Button>}
      {draft && <div className="max-w-3xl space-y-3">
        <div className="space-y-1"><Label>Mensagem</Label><Textarea value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} rows={2} maxLength={300} /></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1"><Label>Data de exibição</Label><Input type="date" value={draft.starts_at} onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })} /></div>
          <div className="space-y-1"><Label>Data de inatividade (último dia exibido)</Label><Input type="date" value={draft.ends_at} onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })} /></div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Salvar" title="Salvar mensagem" onClick={save} disabled={saving}><Save /></Button>
          <Button variant="ghost" size="icon" aria-label="Cancelar" title="Cancelar" onClick={() => setDraft(null)}><X /></Button>
        </div>
      </div>}
      <p className="text-sm font-medium">Histórico de mensagens</p>
      <Table>
        <TableHeader><TableRow><TableHead>Mensagem</TableHead><TableHead>Exibição</TableHead><TableHead>Inatividade</TableHead><TableHead>Criada por</TableHead><TableHead>Situação</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>{data.map((m) => { const active = isMessageActive(m); const future = m.starts_at > todayIso(); return <TableRow key={m.id}>
          <TableCell className="max-w-md text-xs">{m.message}</TableCell>
          <TableCell className="whitespace-nowrap text-xs">{br(m.starts_at)}</TableCell>
          <TableCell className="whitespace-nowrap text-xs">{br(m.ends_at)}</TableCell>
          <TableCell className="whitespace-nowrap text-xs">{m.author}</TableCell>
          <TableCell className="whitespace-nowrap text-xs">{active ? "Exibindo" : future ? "Agendada" : "Inativa"}</TableCell>
          <TableCell className="whitespace-nowrap text-right">
            <Button variant="ghost" size="compactIcon" aria-label="Editar" title="Editar mensagem" onClick={() => setDraft({ id: m.id, message: m.message, starts_at: m.starts_at, ends_at: m.ends_at ?? "" })}><Pencil /></Button>
            {(active || future) && <Button variant="ghost" size="compactIcon" aria-label="Inativar" title="Inativar mensagem" onClick={() => deactivate(m)}><Ban /></Button>}
          </TableCell>
        </TableRow>; })}</TableBody>
      </Table>
    </div>}
  </section>;
}
