import { CdeSection } from "./cde-section";
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
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { CdeDisclosureIcon, CdeNumber } from "./cde-button";
import { Search } from "lucide-react";
import { MessageStyleEditor } from "./cde-message-style";
import { PORTAL_SECTIONS, PORTAL_SECTIONS_GROUP, usePortalSections, type PortalSection } from "@/components/corporate/portal-sections";

function SectionRow({ id, index }: { id: PortalSection; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const label = PORTAL_SECTIONS.find((s) => s.key === id)?.label ?? id;
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex items-center gap-3 border-b border-border bg-card py-2">
    <Button variant="ghost" size="compactIcon" aria-label={`Arrastar ${label}`} title={`Arrastar ${label}`} className="touch-none cursor-grab text-foreground" {...attributes} {...listeners}><GripVertical /></Button>
    <CdeNumber screen="components/cde/cde-corporate-messages.tsx">{index + 1}</CdeNumber>
    <span className={`flex-1 text-sm ${id === "messages" ? "font-medium" : ""}`}>{label}</span>
  </div>;
}

/** Main-page block order (messages, apps, To Dos, pending), dragged and saved in cde_selected portal_sections. */
function PortalSectionsEditor() {
  const qc = useQueryClient();
  const { data: saved } = usePortalSections();
  const [draft, setDraft] = useState<PortalSection[] | null>(null);
  const [saving, setSaving] = useState(false);
  const order = draft ?? saved ?? PORTAL_SECTIONS.map((s) => s.key);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const move = (e: DragEndEvent) => { if (!e.over || e.active.id === e.over.id) return; setDraft(arrayMove(order, order.indexOf(e.active.id as PortalSection), order.indexOf(e.over.id as PortalSection))); };
  async function save() {
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", PORTAL_SECTIONS_GROUP).eq("is_primary", true).maybeSingle();
      if (existing.error) throw existing.error;
      const row = { variant_key: JSON.stringify(order), chosen_by: user.id };
      const r = existing.data ? await supabase.from("cde_selected").update(row).eq("group_key", PORTAL_SECTIONS_GROUP).eq("variant_key", existing.data.variant_key) : await supabase.from("cde_selected").insert({ ...row, group_key: PORTAL_SECTIONS_GROUP });
      if (r.error) throw r.error;
      await qc.invalidateQueries({ queryKey: ["cde-portal-sections"] });
      setDraft(null); toast.success("Disposição da tela principal atualizada");
    } catch { toast.error("Não foi possível salvar a disposição."); } finally { setSaving(false); }
  }
  return <CdeSection title="Local de exibição na tela principal" actions={<><Button variant="ghost" size="icon" aria-label="Salvar" title="Salvar disposição" onClick={save} disabled={saving || !draft}><Save /></Button></>}>
    
    <p className="text-xs text-muted-foreground">Arraste as mensagens e os demais blocos para definir a ordem da tela principal.</p>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={move}><SortableContext items={order} strategy={verticalListSortingStrategy}>{order.map((id, i) => <SectionRow key={id} id={id} index={i} />)}</SortableContext></DndContext>
    
  </CdeSection>;
}
import { isMessageActive, todayIso, useCorporateMessages, type CorporateMessage } from "@/components/corporate/corporate-messages";

const br = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");
type Draft = { id?: string; message: string; starts_at: string; ends_at: string };

export function CdeCorporateMessages({ number, handle }: { number: number; handle?: import("react").ReactNode }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [query, setQuery] = useState("");
  const qc = useQueryClient();
  const { data: all = [] } = useCorporateMessages();
  const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const terms = norm(query).split(/\s+/).filter(Boolean);
  const data = all.filter((m) => { const hay = norm(`${m.message} ${m.author ?? ""} ${br(m.starts_at)} ${br(m.ends_at)}`); return terms.every((t) => hay.includes(t)); });
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

  async function remove(m: CorporateMessage) {
    const { data: gone, error } = await supabase.from("corporate_messages").delete().eq("id", m.id).select("id");
    if (error || !gone?.length) toast.error("Não foi possível excluir. Somente Admin do ERP exclui mensagens.");
    else { await refresh(); toast.success("Mensagem excluída"); }
  }
  return <section className="cde-category-sections">
    <CdeCategoryHeader handle={handle} number={number} title="Mensagens corporativas" hint="Avisos, local de exibição e histórico" open={open} onToggle={() => setOpen(!open)} />
    {open && <div className="space-y-4">
      <PortalSectionsEditor />
      <MessageStyleEditor />
      <CdeSection title="Mensagens e histórico" actions={<><Button variant="ghost" size="icon" aria-label="Salvar mensagem" title="Salvar mensagem" disabled={saving || !draft || (draft.id ? all.some(m => m.id === draft.id && m.message === draft.message && m.starts_at === draft.starts_at && (m.ends_at ?? "") === draft.ends_at) : !draft.message.trim())} onClick={save}><Save /></Button><Button variant="ghost" size="icon" aria-label="Cancelar mensagem" title="Cancelar" onClick={() => setDraft(null)}><X /></Button></>}>
      {!draft && <Button variant="ghost" onClick={() => setDraft({ message: "", starts_at: todayIso(), ends_at: "" })}><Plus className="h-4 w-4" />Nova mensagem</Button>}
      {draft && <div className="max-w-3xl space-y-3">
        <div className="space-y-1"><Label>Mensagem</Label><Textarea value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} rows={2} maxLength={300} /></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1"><Label>Data de exibição</Label><Input type="date" value={draft.starts_at} onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })} /></div>
          <div className="space-y-1"><Label>Data de inatividade (último dia exibido)</Label><Input type="date" value={draft.ends_at} onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })} /></div>
        </div>

      </div>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" className="!h-auto !w-full !max-w-none !justify-between gap-2 !bg-transparent px-0 py-2 text-sm font-medium" aria-expanded={historyOpen} onClick={() => setHistoryOpen((v) => !v)}><span className="min-w-0 break-words">Histórico de mensagens ({all.length})</span><CdeDisclosureIcon open={historyOpen} screen="components/cde/cde-corporate-messages.tsx" direction="vertical" /></Button>
        {historyOpen && <div className="relative w-full max-w-xs"><Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar mensagem" aria-label="Buscar mensagem" className="!pl-7 text-[length:var(--filter-fs)]" style={{ paddingLeft: 28 }} /></div>}
      </div>
      {historyOpen && <Table>
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
            <ConfirmDeleteButton title="Excluir mensagem?" description="A mensagem sai da tela principal e do histórico. Esta ação não pode ser desfeita." onConfirm={() => remove(m)} />
          </TableCell>
        </TableRow>; })}
        {!data.length && <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground">Nenhuma mensagem encontrada</TableCell></TableRow>}</TableBody>
      </Table>}
    </CdeSection></div>}
  </section>;
}
