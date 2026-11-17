import { CrmCustos } from "./crm-custos";
import { useMemo, useRef, useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { ArrowRightLeft, ExternalLink, FileUp, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CRM_URL } from "@/lib/external-apps";
import { crmOptions, type CrmData, type Empresa, type FullLead, type FullOp, type Contato } from "./crm-data";
import { PropostasSection } from "./crm-propostas";
import { CrmRecordDialog, nn, num, type FieldSpec } from "./crm-record-dialog";
import { LEAD_ORIGENS, brl, funnelSummary, matchesSearch, needsReason, origemLabel, overdueActions, parseLeadsCsv, pipelineTotals, type Fase } from "./crm-logic";

export type CrmSection = "painel" | "leads" | "empresas" | "funil" | "oportunidades" | "propostas" | "precos";
const today = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
const br = (d: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");
const uid = async () => { const u = (await supabase.auth.getUser()).data.user; if (!u) throw new Error("Sessão expirada."); return u.id; };
const check = (r: { error: unknown; data?: unknown[] | null }) => { if (r.error) throw r.error; if (r.data && !r.data.length) throw new Error("Sem permissão para alterar este registro."); };

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <Input aria-label={placeholder} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-56 max-w-full text-[length:var(--filter-fs)] md:text-[length:var(--filter-fs)]" />;
}
function SectionTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><h1 className="text-xl font-semibold">{title}</h1><div className="flex flex-wrap items-end justify-end gap-2">{children}</div></div>;
}
const AddButton = ({ label, onClick }: { label: string; onClick: () => void }) => <Button variant="ghost" onClick={onClick}><Plus className="h-4 w-4" />{label}</Button>;

export function CrmWorkspace({ section }: { section: CrmSection }) {
  const { data } = useSuspenseQuery(crmOptions());
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["crm"] });
  const [empresa, setEmpresa] = useState<Partial<Empresa> | null>(null);
  const [contato, setContato] = useState<Partial<Contato> | null>(null);
  const [lead, setLead] = useState<Partial<FullLead> | null>(null);
  const [op, setOp] = useState<Partial<FullOp> | null>(null);
  const ctx = { data, refresh, setEmpresa, setContato, setLead, setOp };
  return <>
    {section === "painel" && <Painel {...ctx} />}
    {section === "leads" && <Leads {...ctx} />}
    {section === "empresas" && <Empresas {...ctx} />}
    {section === "funil" && <Funil {...ctx} />}
    {section === "oportunidades" && <Oportunidades {...ctx} />}
    {section === "propostas" && <PropostasSection data={data} />}
    {section === "precos" && <CrmCustos />}
    <EmpresaDialog value={empresa} onClose={() => setEmpresa(null)} refresh={refresh} />
    <ContatoDialog value={contato} data={data} onClose={() => setContato(null)} refresh={refresh} />
    <LeadDialog value={lead} data={data} onClose={() => setLead(null)} refresh={refresh} />
    <OpDialog value={op} data={data} onClose={() => setOp(null)} refresh={refresh} />
  </>;
}
type Ctx = { data: CrmData; refresh: () => Promise<void>; setEmpresa: (e: Partial<Empresa> | null) => void; setContato: (c: Partial<Contato> | null) => void; setLead: (l: Partial<FullLead> | null) => void; setOp: (o: Partial<FullOp> | null) => void };

const userName = (data: CrmData, id: string | null) => (id ? data.users.find((u) => u.id === id)?.full_name ?? "—" : "—");
const empresaName = (data: CrmData, id: string | null) => (id ? data.empresas.find((e) => e.id === id)?.nome_fantasia ?? "—" : "—");
const etapaOf = (data: CrmData, codigo: string | null) => data.etapas.find((e) => e.codigo === codigo);
const Dot = ({ color }: { color?: string | null }) => <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color ?? "var(--muted-foreground)" }} />;

/* ---------- Painel ---------- */
function Painel({ data, setOp }: Ctx) {
  const t = pipelineTotals(data.fases, data.ops);
  const summary = funnelSummary(data.fases, data.ops);
  const late = overdueActions(data.ops, data.fases, today());
  const max = Math.max(1, ...summary.map((s) => s.count));
  const newLeads = data.leads.filter((l) => (l.status ?? "novo") === "novo").length;
  const cards = [["Oportunidades abertas", String(t.openCount)], ["Setup em aberto", brl(t.openSetup)], ["MRR em aberto", brl(t.openMrr)], ["Setup ponderado", brl(t.weighted)], ["Ganhas", `${t.wonCount} · MRR ${brl(t.wonMrr)}`], ["Leads novos", String(newLeads)]];
  return <div className="space-y-8">
    <SectionTitle title="Painel comercial"><Button asChild variant="ghost"><a href={CRM_URL} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />CRM anterior</a></Button></SectionTitle>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{cards.map(([l, v]) => <div key={l} className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 text-lg font-semibold">{v}</p></div>)}</div>
    <section className="space-y-3"><h2 className="text-base font-medium">Funil por fase</h2>
      <div className="space-y-2">{summary.map((s) => <div key={s.fase.id} className="grid grid-cols-[8rem_minmax(0,1fr)_auto] items-center gap-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)_14rem]">
        <span className="flex items-center gap-2 truncate"><Dot color={s.fase.cor} />{s.fase.nome}</span>
        <div className="h-3 rounded-full bg-muted"><div className="h-3 rounded-full" style={{ width: `${(s.count / max) * 100}%`, background: s.fase.cor ?? "var(--primary)" }} /></div>
        <span className="text-right text-xs text-muted-foreground">{s.count} · {brl(s.setup)} · MRR {brl(s.mrr)}</span>
      </div>)}</div>
    </section>
    <section className="space-y-3"><h2 className="text-base font-medium">Próximas ações vencidas ou para hoje ({late.length})</h2>
      {late.length ? <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Oportunidade</TableHead><TableHead>Empresa</TableHead><TableHead>Ação</TableHead><TableHead>Responsável</TableHead></TableRow></TableHeader>
        <TableBody>{late.map((o) => { const full = data.ops.find((x) => x.id === o.id)!; return <TableRow key={o.id} className="cursor-pointer" onClick={() => setOp(full)}><TableCell>{br(o.proxima_acao_data)}</TableCell><TableCell>{o.titulo}</TableCell><TableCell>{empresaName(data, o.empresa_id)}</TableCell><TableCell>{o.proxima_acao_descricao ?? "—"}</TableCell><TableCell>{userName(data, o.dono_id)}</TableCell></TableRow>; })}</TableBody></Table>
        : <p className="text-sm text-muted-foreground">Nenhuma ação pendente.</p>}
    </section>
  </div>;
}

/* ---------- Leads ---------- */
function Leads({ data, refresh, setLead }: Ctx) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"lista" | "quadro">("lista");
  const [importOpen, setImportOpen] = useState(false);
  const rows = data.leads.filter((l) => (status === "all" || (l.status ?? "novo") === status) && matchesSearch(q, l.nome, l.empresa_texto, l.email, l.telefone, l.cnpj, l.cargo));
  const etapas = data.etapas.filter((e) => e.ativa !== false);
  return <div>
    <SectionTitle title={`Leads (${rows.length})`}>
      <Select value={view} onValueChange={(v) => setView(v as "lista" | "quadro")}><SelectTrigger aria-label="Visualização" className="h-8 w-28 text-[length:var(--filter-fs)]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="lista">Lista</SelectItem><SelectItem value="quadro">Quadro</SelectItem></SelectContent></Select>
      <Select value={status} onValueChange={setStatus}><SelectTrigger aria-label="Etapa" className="h-8 w-40 text-[length:var(--filter-fs)]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as etapas</SelectItem>{etapas.map((e) => <SelectItem key={e.codigo} value={e.codigo}>{e.nome}</SelectItem>)}</SelectContent></Select>
      <SearchBox value={q} onChange={setQ} placeholder="Buscar lead" />
      <Button variant="ghost" onClick={() => setImportOpen(true)}><FileUp className="h-4 w-4" />Importar CSV</Button>
      <AddButton label="Novo lead" onClick={() => setLead({ status: "novo", origem: "outro" })} />
    </SectionTitle>
    {view === "lista" ? <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Empresa</TableHead><TableHead>Cargo</TableHead><TableHead>Contato</TableHead><TableHead>Origem</TableHead><TableHead>Etapa</TableHead><TableHead>Responsável</TableHead></TableRow></TableHeader>
      <TableBody>{rows.map((l) => { const e = etapaOf(data, l.status); return <TableRow key={l.id} className="cursor-pointer" onClick={() => setLead(l)}><TableCell className="font-medium">{l.nome}</TableCell><TableCell>{l.empresa_id ? empresaName(data, l.empresa_id) : l.empresa_texto ?? "—"}</TableCell><TableCell>{l.cargo ?? "—"}</TableCell><TableCell className="text-xs">{[l.email, l.telefone].filter(Boolean).join(" · ") || "—"}</TableCell><TableCell>{origemLabel(l.origem)}</TableCell><TableCell><span className="inline-flex items-center gap-2"><Dot color={e?.cor} />{e?.nome ?? l.status}</span></TableCell><TableCell>{userName(data, l.dono_id)}</TableCell></TableRow>; })}
        {!rows.length && <TableRow><TableCell colSpan={7} className="text-muted-foreground">Nenhum lead.</TableCell></TableRow>}</TableBody></Table>
      : <Board columns={etapas.map((e) => ({ id: e.codigo, title: e.nome, color: e.cor }))} items={rows.map((l) => ({ id: l.id, column: l.status ?? "novo", title: l.nome, subtitle: l.empresa_texto ?? empresaName(data, l.empresa_id) }))} onOpen={(id) => setLead(data.leads.find((l) => l.id === id)!)} onMove={async (id, col) => { const r = await supabase.from("crm_leads").update({ status: col }).eq("id", id).select("id"); if (r.error || !r.data?.length) toast.error("Não foi possível mover o lead."); await refresh(); }} />}
    <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} refresh={refresh} />
  </div>;
}

function ImportDialog({ open, onClose, refresh }: { open: boolean; onClose: () => void; refresh: () => Promise<void> }) {
  const [parsed, setParsed] = useState<ReturnType<typeof parseLeadsCsv> | null>(null);
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function run() {
    if (!parsed?.rows.length) return;
    setSaving(true);
    try {
      const me = await uid();
      const r = await supabase.from("crm_leads").insert(parsed.rows.map((x) => ({ nome: x.nome, empresa_texto: x.empresa_texto ?? null, cargo: x.cargo ?? null, email: x.email ?? null, telefone: x.telefone ?? null, cnpj: x.cnpj ?? null, origem: x.origem ?? "outro", observacoes: x.observacoes ?? null, status: "novo", dono_id: me, created_by: me }))).select("id");
      if (r.error) throw r.error;
      toast.success(`${r.data.length} leads importados`); await refresh(); setParsed(null); onClose();
    } catch { toast.error("Não foi possível importar."); } finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={(o) => { if (!o) { setParsed(null); onClose(); } }}><DialogContent className="sm:max-w-lg">
    <DialogHeader><DialogTitle>Importar leads (CSV)</DialogTitle></DialogHeader>
    <p className="text-sm text-muted-foreground">Primeira linha com os títulos. Colunas aceitas: Nome (obrigatória), Empresa, Cargo, E-mail, Telefone, CNPJ, Origem e Observações; separador ; ou ,.</p>
    <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setParsed(parseLeadsCsv(await f.text())); e.target.value = ""; }} />
    <Button variant="ghost" onClick={() => input.current?.click()}><FileUp className="h-4 w-4" />Escolher arquivo</Button>
    {parsed && (parsed.error ? <p className="text-sm text-destructive">{parsed.error}</p> : <p className="text-sm">{parsed.rows.length} leads prontos para importar{parsed.skipped ? `; ${parsed.skipped} linhas sem nome serão ignoradas` : ""}.</p>)}
    <div><Button variant="ghost" size="icon" aria-label="Salvar" title="Importar leads" disabled={!parsed?.rows.length || saving} onClick={run}><Save /></Button></div>
  </DialogContent></Dialog>;
}

/* ---------- Empresas e contatos ---------- */
function Empresas({ data, setEmpresa, setContato }: Ctx) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const rows = data.empresas.filter((e) => matchesSearch(q, e.nome_fantasia, e.razao_social, e.cnpj, e.cidade, e.segmento, e.grupo_economico, ...data.contatos.filter((c) => c.empresa_id === e.id).map((c) => `${c.nome} ${c.email ?? ""}`)));
  return <div>
    <SectionTitle title={`Empresas e contatos (${rows.length})`}><SearchBox value={q} onChange={setQ} placeholder="Buscar empresa, CNPJ ou contato" /><AddButton label="Nova empresa" onClick={() => setEmpresa({})} /></SectionTitle>
    <Table><TableHeader><TableRow><TableHead>Nome fantasia</TableHead><TableHead>Razão social</TableHead><TableHead>CNPJ</TableHead><TableHead>Cidade/UF</TableHead><TableHead>Segmento</TableHead><TableHead>Contatos</TableHead><TableHead>Oportunidades</TableHead></TableRow></TableHeader>
      <TableBody>{rows.map((e) => { const cs = data.contatos.filter((c) => c.empresa_id === e.id); return [
        <TableRow key={e.id}><TableCell><button type="button" className="font-medium hover:text-primary" onClick={() => setEmpresa(e)}>{e.nome_fantasia}</button></TableCell><TableCell>{e.razao_social ?? "—"}</TableCell><TableCell>{e.cnpj ?? "—"}</TableCell><TableCell>{[e.cidade, e.uf].filter(Boolean).join("/") || "—"}</TableCell><TableCell>{e.segmento ?? "—"}</TableCell>
          <TableCell><button type="button" className="hover:text-primary" aria-expanded={open === e.id} onClick={() => setOpen(open === e.id ? null : e.id)}>{cs.length} {open === e.id ? "▲" : "▼"}</button></TableCell><TableCell>{data.ops.filter((o) => o.empresa_id === e.id).length}</TableCell></TableRow>,
        open === e.id ? <TableRow key={`${e.id}-c`}><TableCell colSpan={7} className="bg-muted/40"><div className="space-y-2">
          {cs.map((c) => <div key={c.id} className="flex flex-wrap items-center gap-3 text-sm"><button type="button" className="font-medium hover:text-primary" onClick={() => setContato(c)}>{c.nome}</button><span className="text-muted-foreground">{[c.cargo, c.email, c.telefone].filter(Boolean).join(" · ")}</span></div>)}
          <AddButton label="Novo contato" onClick={() => setContato({ empresa_id: e.id })} /></div></TableCell></TableRow> : null]; })}
        {!rows.length && <TableRow><TableCell colSpan={7} className="text-muted-foreground">Nenhuma empresa.</TableCell></TableRow>}</TableBody></Table>
  </div>;
}

/* ---------- Funil ---------- */
type BoardItem = { id: string; column: string; title: string; subtitle?: string; meta?: string };
function Card({ item, onOpen }: { item: BoardItem; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  return <div ref={setNodeRef} style={{ transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined, opacity: isDragging ? 0.6 : 1 }} className="cursor-grab touch-none rounded-lg border border-border bg-card p-3 text-sm shadow-sm" {...attributes} {...listeners} onDoubleClick={() => onOpen(item.id)}>
    <button type="button" className="text-left font-medium hover:text-primary" onPointerDown={(e) => e.stopPropagation()} onClick={() => onOpen(item.id)}>{item.title}</button>
    {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}{item.meta && <p className="mt-1 text-xs">{item.meta}</p>}
  </div>;
}
function Column({ col, items, onOpen }: { col: { id: string; title: string; color?: string | null; footer?: string }; items: BoardItem[]; onOpen: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return <div ref={setNodeRef} className={`flex w-64 shrink-0 flex-col gap-2 rounded-xl border p-2 ${isOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}>
    <div className="flex items-center gap-2 px-1 text-sm font-medium"><Dot color={col.color} /><span className="truncate">{col.title}</span><span className="ml-auto text-xs text-muted-foreground">{items.length}</span></div>
    {col.footer && <p className="px-1 text-xs text-muted-foreground">{col.footer}</p>}
    {items.map((i) => <Card key={i.id} item={i} onOpen={onOpen} />)}
  </div>;
}
function Board({ columns, items, onMove, onOpen }: { columns: { id: string; title: string; color?: string | null; footer?: string }[]; items: BoardItem[]; onMove: (id: string, column: string) => void; onOpen: (id: string) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const end = (e: DragEndEvent) => { const it = items.find((i) => i.id === e.active.id); if (it && e.over && e.over.id !== it.column) onMove(it.id, String(e.over.id)); };
  return <DndContext sensors={sensors} onDragEnd={end}><div className="flex gap-3 overflow-x-auto pb-4">{columns.map((c) => <Column key={c.id} col={c} items={items.filter((i) => i.column === c.id)} onOpen={onOpen} />)}</div></DndContext>;
}
function Funil({ data, refresh, setOp }: Ctx) {
  const [q, setQ] = useState("");
  const [reason, setReason] = useState<{ id: string; fase: Fase } | null>(null);
  const ops = data.ops.filter((o) => matchesSearch(q, o.titulo, empresaName(data, o.empresa_id), userName(data, o.dono_id)));
  const summary = funnelSummary(data.fases, ops);
  async function move(id: string, faseId: string, motivo?: string) {
    const fase = data.fases.find((f) => f.id === faseId);
    if (needsReason(fase) && !motivo) { setReason({ id, fase: fase! }); return; }
    const r = await supabase.from("crm_oportunidades").update({ fase_id: faseId, ...(motivo ? { motivo_encerramento: motivo } : {}) }).eq("id", id).select("id");
    if (r.error || !r.data?.length) toast.error(r.error?.message ?? "Não foi possível mover."); else toast.success(`Movida para ${fase?.nome}`);
    await refresh();
  }
  return <div>
    <SectionTitle title="Funil de oportunidades"><SearchBox value={q} onChange={setQ} placeholder="Buscar oportunidade" /><AddButton label="Nova oportunidade" onClick={() => setOp({ fase_id: data.fases.find((f) => f.ativa !== false)?.id })} /></SectionTitle>
    <Board columns={summary.map((s) => ({ id: s.fase.id, title: s.fase.nome, color: s.fase.cor, footer: `${brl(s.setup)} · MRR ${brl(s.mrr)}` }))} items={ops.map((o) => ({ id: o.id, column: o.fase_id, title: o.titulo, subtitle: empresaName(data, o.empresa_id), meta: `${brl(o.valor_setup)} · MRR ${brl(o.valor_mrr)}` }))} onOpen={(id) => setOp(data.ops.find((o) => o.id === id)!)} onMove={(id, col) => void move(id, col)} />
    <ReasonDialog value={reason} onClose={() => setReason(null)} onConfirm={async (m) => { if (reason) await move(reason.id, reason.fase.id, m); setReason(null); }} />
  </div>;
}
function ReasonDialog({ value, onClose, onConfirm }: { value: { fase: Fase } | null; onClose: () => void; onConfirm: (m: string) => Promise<void> }) {
  const [m, setM] = useState("");
  return <Dialog open={!!value} onOpenChange={(o) => { if (!o) { setM(""); onClose(); } }}><DialogContent className="sm:max-w-md">
    <DialogHeader><DialogTitle>Motivo para “{value?.fase.nome}”</DialogTitle></DialogHeader>
    <div className="space-y-1"><Label htmlFor="crm-motivo">Motivo *</Label><Textarea id="crm-motivo" rows={3} value={m} onChange={(e) => setM(e.target.value)} /></div>
    <div><Button variant="ghost" size="icon" aria-label="Salvar" title="Confirmar motivo" disabled={!m.trim()} onClick={async () => { await onConfirm(m.trim()); setM(""); }}><Save /></Button></div>
  </DialogContent></Dialog>;
}

/* ---------- Oportunidades ---------- */
function Oportunidades({ data, setOp }: Ctx) {
  const [q, setQ] = useState("");
  const [fase, setFase] = useState("all");
  const byId = useMemo(() => new Map(data.fases.map((f) => [f.id, f])), [data.fases]);
  const rows = data.ops.filter((o) => (fase === "all" || o.fase_id === fase) && matchesSearch(q, o.titulo, empresaName(data, o.empresa_id), userName(data, o.dono_id), o.produto_alvo));
  return <div>
    <SectionTitle title={`Oportunidades (${rows.length})`}>
      <Select value={fase} onValueChange={setFase}><SelectTrigger aria-label="Fase" className="h-8 w-40 text-[length:var(--filter-fs)]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as fases</SelectItem>{data.fases.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent></Select>
      <SearchBox value={q} onChange={setQ} placeholder="Buscar oportunidade" /><AddButton label="Nova oportunidade" onClick={() => setOp({ fase_id: data.fases.find((f) => f.ativa !== false)?.id })} />
    </SectionTitle>
    <Table><TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Empresa</TableHead><TableHead>Fase</TableHead><TableHead>Setup</TableHead><TableHead>MRR</TableHead><TableHead>Prob.</TableHead><TableHead>Fechamento previsto</TableHead><TableHead>Próxima ação</TableHead><TableHead>Responsável</TableHead></TableRow></TableHeader>
      <TableBody>{rows.map((o) => { const f = byId.get(o.fase_id); return <TableRow key={o.id} className="cursor-pointer" onClick={() => setOp(o)}><TableCell className="font-medium">{o.titulo}</TableCell><TableCell>{empresaName(data, o.empresa_id)}</TableCell><TableCell><span className="inline-flex items-center gap-2"><Dot color={f?.cor} />{f?.nome}</span></TableCell><TableCell>{brl(o.valor_setup)}</TableCell><TableCell>{brl(o.valor_mrr)}</TableCell><TableCell>{o.probabilidade ?? f?.probabilidade ?? 0}%</TableCell><TableCell>{br(o.data_prevista_fechamento)}</TableCell><TableCell className="text-xs">{o.proxima_acao_data ? `${br(o.proxima_acao_data)} · ${o.proxima_acao_descricao ?? ""}` : "—"}</TableCell><TableCell>{userName(data, o.dono_id)}</TableCell></TableRow>; })}
        {!rows.length && <TableRow><TableCell colSpan={9} className="text-muted-foreground">Nenhuma oportunidade.</TableCell></TableRow>}</TableBody></Table>
  </div>;
}

/* ---------- Editores ---------- */
const s = (x: unknown) => (x == null ? "" : String(x));
function EmpresaDialog({ value, onClose, refresh }: { value: Partial<Empresa> | null; onClose: () => void; refresh: () => Promise<void> }) {
  const fields: FieldSpec[] = [{ key: "nome_fantasia", label: "Nome fantasia", required: true }, { key: "razao_social", label: "Razão social" }, { key: "cnpj", label: "CNPJ" }, { key: "segmento", label: "Segmento" }, { key: "cidade", label: "Cidade" }, { key: "uf", label: "UF", placeholder: "RJ" }, { key: "grupo_economico", label: "Grupo econômico" }, { key: "observacoes", label: "Observações", type: "textarea" }];
  return <CrmRecordDialog open={!!value} title={value?.id ? "Editar empresa" : "Nova empresa"} fields={fields} initial={Object.fromEntries(fields.map((f) => [f.key, s(value?.[f.key as keyof Empresa])]))} onClose={onClose}
    onSave={async (v) => { const row = { nome_fantasia: v.nome_fantasia.trim(), razao_social: nn(v.razao_social), cnpj: nn(v.cnpj), segmento: nn(v.segmento), cidade: nn(v.cidade), uf: nn(v.uf)?.toUpperCase().slice(0, 2) ?? null, grupo_economico: nn(v.grupo_economico), observacoes: nn(v.observacoes) };
      check(value?.id ? await supabase.from("crm_empresas").update(row).eq("id", value.id).select("id") : await supabase.from("crm_empresas").insert({ ...row, created_by: await uid() }).select("id")); await refresh(); toast.success("Empresa salva"); }}
    onDelete={value?.id ? async () => { check(await supabase.from("crm_empresas").delete().eq("id", value.id!).select("id")); await refresh(); } : undefined} deleteTitle="Excluir empresa?" />;
}
function ContatoDialog({ value, data, onClose, refresh }: { value: Partial<Contato> | null; data: CrmData; onClose: () => void; refresh: () => Promise<void> }) {
  const fields: FieldSpec[] = [{ key: "nome", label: "Nome", required: true }, { key: "empresa_id", label: "Empresa", type: "select", required: true, options: data.empresas.map((e) => ({ value: e.id, label: e.nome_fantasia })) }, { key: "cargo", label: "Cargo" }, { key: "email", label: "E-mail", type: "email" }, { key: "telefone", label: "Telefone" }, { key: "observacoes", label: "Observações", type: "textarea" }];
  return <CrmRecordDialog open={!!value} title={value?.id ? "Editar contato" : "Novo contato"} fields={fields} initial={Object.fromEntries(fields.map((f) => [f.key, s(value?.[f.key as keyof Contato])]))} onClose={onClose}
    onSave={async (v) => { const row = { nome: v.nome.trim(), empresa_id: v.empresa_id, cargo: nn(v.cargo), email: nn(v.email), telefone: nn(v.telefone), observacoes: nn(v.observacoes) };
      check(value?.id ? await supabase.from("crm_contatos").update(row).eq("id", value.id).select("id") : await supabase.from("crm_contatos").insert({ ...row, created_by: await uid() }).select("id")); await refresh(); toast.success("Contato salvo"); }}
    onDelete={value?.id ? async () => { check(await supabase.from("crm_contatos").delete().eq("id", value.id!).select("id")); await refresh(); } : undefined} deleteTitle="Excluir contato?" />;
}
function LeadDialog({ value, data, onClose, refresh }: { value: Partial<FullLead> | null; data: CrmData; onClose: () => void; refresh: () => Promise<void> }) {
  const users = data.users.map((u) => ({ value: u.id, label: u.full_name ?? "—" }));
  const fields: FieldSpec[] = [{ key: "nome", label: "Nome", required: true }, { key: "empresa_texto", label: "Empresa (texto)" }, { key: "empresa_id", label: "Empresa cadastrada", type: "select", options: data.empresas.map((e) => ({ value: e.id, label: e.nome_fantasia })) }, { key: "cargo", label: "Cargo" }, { key: "email", label: "E-mail", type: "email" }, { key: "telefone", label: "Telefone" }, { key: "cnpj", label: "CNPJ" },
    { key: "origem", label: "Origem", type: "select", required: true, options: LEAD_ORIGENS.map((o) => ({ value: o.key, label: o.label })) }, { key: "status", label: "Etapa", type: "select", required: true, options: data.etapas.map((e) => ({ value: e.codigo, label: e.nome })) }, { key: "dono_id", label: "Responsável", type: "select", options: users }, { key: "observacoes", label: "Observações", type: "textarea" }];
  const rowOf = (v: Record<string, string>) => ({ nome: v.nome.trim(), empresa_texto: nn(v.empresa_texto), empresa_id: nn(v.empresa_id), cargo: nn(v.cargo), email: nn(v.email), telefone: nn(v.telefone), cnpj: nn(v.cnpj), origem: v.origem || "outro", status: v.status || "novo", dono_id: nn(v.dono_id), observacoes: nn(v.observacoes) });
  async function convert(v: Record<string, string>) {
    const me = await uid();
    let empresaId = nn(v.empresa_id);
    if (!empresaId) {
      const nome = nn(v.empresa_texto) ?? v.nome.trim();
      const e = await supabase.from("crm_empresas").insert({ nome_fantasia: nome, cnpj: nn(v.cnpj), created_by: me }).select("id").single();
      if (e.error) throw e.error; empresaId = e.data.id;
    }
    const fase = data.fases.filter((f) => f.ativa !== false && (f.tipo ?? "aberta") === "aberta").sort((a, b) => a.ordem - b.ordem)[0];
    if (!fase) throw new Error("Nenhuma fase aberta no funil.");
    const o = await supabase.from("crm_oportunidades").insert({ titulo: `${nn(v.empresa_texto) ?? v.nome.trim()}`, empresa_id: empresaId, fase_id: fase.id, dono_id: nn(v.dono_id) ?? me, lead_id: value?.id ?? null, created_by: me }).select("id").single();
    if (o.error) throw o.error;
    const row = { ...rowOf(v), empresa_id: empresaId, status: "convertido", oportunidade_id: o.data.id };
    check(value?.id ? await supabase.from("crm_leads").update(row).eq("id", value.id).select("id") : await supabase.from("crm_leads").insert({ ...row, created_by: me }).select("id"));
    await refresh(); toast.success("Lead convertido em oportunidade"); onClose();
  }
  return <CrmRecordDialog open={!!value} title={value?.id ? "Editar lead" : "Novo lead"} fields={fields} initial={Object.fromEntries(fields.map((f) => [f.key, s(value?.[f.key as keyof FullLead])]))} onClose={onClose}
    onSave={async (v) => { const me = await uid(); check(value?.id ? await supabase.from("crm_leads").update(rowOf(v)).eq("id", value.id).select("id") : await supabase.from("crm_leads").insert({ ...rowOf(v), dono_id: nn(v.dono_id) ?? me, created_by: me }).select("id")); await refresh(); toast.success("Lead salvo"); }}
    onDelete={value?.id ? async () => { check(await supabase.from("crm_leads").delete().eq("id", value.id!).select("id")); await refresh(); } : undefined} deleteTitle="Excluir lead?"
    footer={(v) => value?.oportunidade_id ? <span className="text-xs text-muted-foreground">Já convertido em oportunidade</span> : <Button variant="ghost" disabled={!v.nome?.trim()} onClick={() => convert(v).catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível converter."))}><ArrowRightLeft className="h-4 w-4" />Converter em oportunidade</Button>} />;
}
function OpDialog({ value, data, onClose, refresh }: { value: Partial<FullOp> | null; data: CrmData; onClose: () => void; refresh: () => Promise<void> }) {
  const empresaId = value?.empresa_id;
  const fields: FieldSpec[] = [{ key: "titulo", label: "Título", required: true, wide: true }, { key: "empresa_id", label: "Empresa", type: "select", required: true, options: data.empresas.map((e) => ({ value: e.id, label: e.nome_fantasia })) },
    { key: "contato_id", label: "Contato", type: "select", options: data.contatos.filter((c) => !empresaId || c.empresa_id === empresaId).map((c) => ({ value: c.id, label: `${c.nome} — ${empresaName(data, c.empresa_id)}` })) },
    { key: "fase_id", label: "Fase", type: "select", required: true, options: data.fases.map((f) => ({ value: f.id, label: f.nome })) }, { key: "dono_id", label: "Responsável", type: "select", options: data.users.map((u) => ({ value: u.id, label: u.full_name ?? "—" })) },
    { key: "valor_setup", label: "Valor de setup (R$)", type: "number" }, { key: "valor_mrr", label: "MRR (R$)", type: "number" }, { key: "probabilidade", label: "Probabilidade (%)", type: "number", placeholder: "Padrão da fase" }, { key: "data_prevista_fechamento", label: "Fechamento previsto", type: "date" },
    { key: "produto_alvo", label: "Produto" }, { key: "proxima_acao_data", label: "Próxima ação — data", type: "date" }, { key: "proxima_acao_descricao", label: "Próxima ação — descrição", wide: true }, { key: "motivo_encerramento", label: "Motivo de encerramento (perdido/desqualificado)", wide: true }, { key: "observacoes", label: "Observações", type: "textarea" }];
  return <CrmRecordDialog open={!!value} title={value?.id ? "Editar oportunidade" : "Nova oportunidade"} fields={fields} initial={Object.fromEntries(fields.map((f) => [f.key, s(value?.[f.key as keyof FullOp])]))} onClose={onClose}
    onSave={async (v) => {
      const fase = data.fases.find((f) => f.id === v.fase_id);
      if (needsReason(fase) && !nn(v.motivo_encerramento)) throw new Error(`Informe o motivo para “${fase?.nome}”.`);
      const prob = num(v.probabilidade); if (prob != null && (prob < 0 || prob > 100)) throw new Error("Probabilidade deve ficar entre 0 e 100.");
      const row = { titulo: v.titulo.trim(), empresa_id: v.empresa_id, contato_id: nn(v.contato_id), fase_id: v.fase_id, dono_id: nn(v.dono_id), valor_setup: num(v.valor_setup), valor_mrr: num(v.valor_mrr), probabilidade: prob, data_prevista_fechamento: nn(v.data_prevista_fechamento), produto_alvo: nn(v.produto_alvo), proxima_acao_data: nn(v.proxima_acao_data), proxima_acao_descricao: nn(v.proxima_acao_descricao), motivo_encerramento: nn(v.motivo_encerramento), observacoes: nn(v.observacoes) };
      const me = await uid();
      check(value?.id ? await supabase.from("crm_oportunidades").update(row).eq("id", value.id).select("id") : await supabase.from("crm_oportunidades").insert({ ...row, dono_id: row.dono_id ?? me, created_by: me }).select("id")); await refresh(); toast.success("Oportunidade salva"); }}
    footer={() => value?.id ? <span className="text-xs text-muted-foreground">Oportunidades não são excluídas: para encerrar, mova para Perdido ou Desqualificado.</span> : null} />;
}
