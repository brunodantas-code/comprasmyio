import { useCusteio } from "./crm-custos";
import { CrmHistoricalRecords } from "./crm-historical-records";
import { useTableFilters } from "@/components/use-table-filters";
import { MemoriaCalculo } from "./crm-memoria";
import { useEffect, useMemo, useState } from "react";
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Check, CopyPlus, FileDown, Plus, RotateCcw, Save, Trash2, Ban } from "lucide-react";
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
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { confirmAction } from "@/components/confirm-dialog";
import type { CrmData } from "./crm-data";
import { brl, matchesSearch } from "./crm-logic";
import { CATEGORIAS_ITEM, STATUS_PROPOSTA, bloqueioEnvio, parseCondicoes, proximaVersao, statusLabel, totaisDe, type Condicoes, type ItemProposta, type Pendencia, type PropostaStatus } from "./proposta-logic";

export type Template = { id: string; codigo: string; nome: string; introducao: string | null; escopo: string | null; condicoes_padrao: unknown; ativo: boolean };
export type Proposta = { id: string; numero: string; versao: number; oportunidade_id: string; template_id: string | null; status: PropostaStatus; data_proposta: string; condicoes: unknown; total_setup: number; total_mensal: number; incompleta: boolean; observacoes: string | null; created_by: string | null; created_at: string; arquivo_path?: string | null; arquivo_origem_path?: string | null };

export const propostasOptions = () => queryOptions({
  queryKey: ["crm-propostas"],
  queryFn: async () => {
    const [p, t] = await Promise.all([
      supabase.from("crm_propostas").select("*").order("created_at", { ascending: false }),
      supabase.from("crm_templates_proposta").select("*").order("nome"),
    ]);
    if (p.error) throw p.error; if (t.error) throw t.error;
    return { propostas: (p.data ?? []) as unknown as Proposta[], templates: (t.data ?? []) as unknown as Template[] };
  },
});

const br = (d: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");
const errMsg = (e: unknown) => (e instanceof Error && e.message ? e.message : (e as { message?: string })?.message ?? "Não foi possível salvar.");
const statusVariant = (s: string) => (s === "aceita" ? "default" : s === "recusada" ? "destructive" : s === "enviada" ? "secondary" : "outline") as "default" | "destructive" | "secondary" | "outline";

export function PropostasSection({ data }: { data: CrmData }) {
  const { data: pd } = useSuspenseQuery(propostasOptions());
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [nova, setNova] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const opOf = (id: string) => data.ops.find((o) => o.id === id);
  const empresaOf = (id: string) => data.empresas.find((e) => e.id === opOf(id)?.empresa_id)?.nome_fantasia ?? "—";
  const filters = useTableFilters(pd.propostas, [
    { key: "number", label: "Número", value: p => p.numero },
    { key: "opportunity", label: "Oportunidade", value: p => opOf(p.oportunidade_id)?.titulo },
    { key: "company", label: "Empresa", value: p => empresaOf(p.oportunidade_id) },
    { key: "status", label: "Situação", value: p => statusLabel(p.status) },
    { key: "date", label: "Data", kind: "date", value: p => p.data_proposta },
    { key: "setup", label: "Setup", kind: "number", value: p => p.total_setup },
    { key: "monthly", label: "Mensal", kind: "number", value: p => p.total_mensal },
  ]);
  const rows = filters.filtered.filter((p) => (status === "all" || p.status === status) && matchesSearch(q, p.numero, opOf(p.oportunidade_id)?.titulo, empresaOf(p.oportunidade_id)));
  return <div>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 erp-list-tools-header"><h1 className="text-xl font-semibold">Propostas ({rows.length})</h1>
      <div className="flex flex-wrap items-end justify-end gap-2 erp-list-toolbar">
        <Select value={status} onValueChange={setStatus}><SelectTrigger aria-label="Situação" className="h-8 w-40 text-[length:var(--filter-fs)]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as situações</SelectItem>{STATUS_PROPOSTA.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
        <Input aria-label="Buscar proposta" placeholder="Buscar proposta" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 w-56 max-w-full text-[length:var(--filter-fs)] md:text-[length:var(--filter-fs)]" />
        <Button variant="ghost" onClick={() => setNova(true)}><Plus className="h-4 w-4" />Nova proposta</Button>
        {filters.menu}
      </div></div>
    {filters.summary}
    <Table><TableHeader><TableRow><TableHead>Número</TableHead><TableHead>Oportunidade</TableHead><TableHead>Empresa</TableHead><TableHead>Modelo</TableHead><TableHead>Data</TableHead><TableHead>Situação</TableHead><TableHead>Setup</TableHead><TableHead>Mensal</TableHead></TableRow></TableHeader>
      <TableBody>{rows.map((p) => <TableRow key={p.id} className="cursor-pointer" onClick={() => setOpen(p.id)}>
        <TableCell className="font-medium">{p.numero}{p.versao > 1 ? ` v${p.versao}` : ""}</TableCell><TableCell>{opOf(p.oportunidade_id)?.titulo ?? "—"}</TableCell><TableCell>{empresaOf(p.oportunidade_id)}</TableCell>
        <TableCell>{pd.templates.find((t) => t.id === p.template_id)?.nome ?? "—"}</TableCell><TableCell>{br(p.data_proposta)}</TableCell>
        <TableCell><span className="inline-flex flex-wrap items-center gap-1"><Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge>{p.incompleta && <Badge variant="destructive">Incompleta</Badge>}</span></TableCell>
        <TableCell>{brl(p.total_setup)}</TableCell><TableCell>{brl(p.total_mensal)}/mês</TableCell></TableRow>)}
        {!rows.length && <TableRow><TableCell colSpan={8} className="text-muted-foreground">Nenhuma proposta.</TableCell></TableRow>}</TableBody></Table>
    <NovaPropostaDialog open={nova} data={data} templates={pd.templates.filter((t) => t.ativo)} onClose={() => setNova(false)} onCreated={(id) => { setNova(false); setOpen(id); }} />
    <PropostaEditor id={open} data={data} templates={pd.templates} onClose={() => setOpen(null)} onOpen={setOpen} />
  </div>;
}

function NovaPropostaDialog({ open, data, templates, onClose, onCreated }: { open: boolean; data: CrmData; templates: Template[]; onClose: () => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const [op, setOp] = useState(""); const [tpl, setTpl] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setOp(""); setTpl(""); } }, [open]);
  const abertas = data.ops.filter((o) => { const f = data.fases.find((x) => x.id === o.fase_id); return !f || f.tipo === "aberta" || f.tipo == null; });
  async function create() {
    if (!op) return toast.error("Escolha a oportunidade.");
    setBusy(true);
    try {
      const t = templates.find((x) => x.id === tpl);
      const r = await supabase.from("crm_propostas").insert({ oportunidade_id: op, template_id: t?.id ?? null, condicoes: parseCondicoes(t?.condicoes_padrao) as never }).select("id").single();
      if (r.error) throw r.error;
      await qc.invalidateQueries({ queryKey: ["crm-propostas"] }); toast.success("Proposta criada"); onCreated(r.data.id);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}><DialogContent className="sm:max-w-lg">
    <DialogHeader><DialogTitle>Nova proposta</DialogTitle></DialogHeader>
    <div className="grid gap-4">
      <div className="space-y-1"><Label>Oportunidade *</Label><Select value={op} onValueChange={setOp}><SelectTrigger aria-label="Oportunidade"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{abertas.map((o) => <SelectItem key={o.id} value={o.id}>{o.titulo} — {data.empresas.find((e) => e.id === o.empresa_id)?.nome_fantasia ?? ""}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label>Modelo</Label><Select value={tpl} onValueChange={setTpl}><SelectTrigger aria-label="Modelo"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent></Select></div>
    </div>
    <div className="flex gap-2 pt-2"><Button variant="ghost" size="icon" aria-label="Salvar" title="Criar proposta" onClick={create} disabled={busy}><Save /></Button></div>
  </DialogContent></Dialog>;
}

type Detail = { proposta: Proposta; itens: ItemProposta[]; pendencias: Pendencia[] };
const emptyItem = (): ItemProposta => ({ categoria: "produto_myio", nome: "", modelo: null, unidade: "un", quantidade: 1, preco_setup_unit: 0, preco_mensal_unit: 0, ambiente: null, observacao: null });

function PropostaEditor({ id, data, templates, onClose, onOpen }: { id: string | null; data: CrmData; templates: Template[]; onClose: () => void; onOpen: (id: string) => void }) {
  const qc = useQueryClient();
  const detail = useQuery({
    queryKey: ["crm-proposta", id], enabled: !!id,
    queryFn: async (): Promise<Detail> => {
      if (!id) throw new Error("Proposta não encontrada.");
      const [p, i, pe] = await Promise.all([
        supabase.from("crm_propostas").select("*").eq("id", id).single(),
        supabase.from("crm_proposta_itens").select("*").eq("proposta_id", id).order("ordem"),
        supabase.from("crm_proposta_pendencias").select("id, texto, status, resolucao").eq("proposta_id", id).order("created_at"),
      ]);
      if (p.error) throw p.error; if (i.error) throw i.error; if (pe.error) throw pe.error;
      return { proposta: p.data as unknown as Proposta, itens: (i.data ?? []).map((x) => ({ ...x, quantidade: Number(x.quantidade), preco_setup_unit: Number(x.preco_setup_unit), preco_mensal_unit: Number(x.preco_mensal_unit) })) as ItemProposta[], pendencias: (pe.data ?? []) as Pendencia[] };
    },
  });
  const d = detail.data;
  const custeio = useCusteio().data;
  const daTabela = (custeio?.tabela ?? []).filter((t) => t.ativo);
  const [itens, setItens] = useState<ItemProposta[]>([]);
  const [cond, setCond] = useState<Condicoes>(parseCondicoes({}));
  const [tpl, setTpl] = useState(""); const [dataProp, setDataProp] = useState(""); const [obs, setObs] = useState("");
  const [novaPend, setNovaPend] = useState(""); const [busy, setBusy] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  // Local draft resets only on open/switch and after saving, so pendency/status refreshes keep unsaved edits.
  useEffect(() => { if (d) { setItens(d.itens); setCond(parseCondicoes(d.proposta.condicoes)); setTpl(d.proposta.template_id ?? ""); setDataProp(d.proposta.data_proposta); setObs(d.proposta.observacoes ?? ""); } }, [d?.proposta.id, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const rascunho = d?.proposta.status === "rascunho";
  const tot = totaisDe(itens);
  const op = d ? data.ops.find((o) => o.id === d.proposta.oportunidade_id) : undefined;
  const empresa = op ? data.empresas.find((e) => e.id === op.empresa_id) : undefined;
  const bloqueio = d ? bloqueioEnvio(itens, d.pendencias) : null;
  const dirty = useMemo(() => !!d && (JSON.stringify(itens) !== JSON.stringify(d.itens) || JSON.stringify(cond) !== JSON.stringify(parseCondicoes(d.proposta.condicoes)) || tpl !== (d.proposta.template_id ?? "") || dataProp !== d.proposta.data_proposta || obs !== (d.proposta.observacoes ?? "")), [d, itens, cond, tpl, dataProp, obs]);
  const reload = async () => { await Promise.all([qc.invalidateQueries({ queryKey: ["crm-proposta", id] }), qc.invalidateQueries({ queryKey: ["crm-propostas"] })]); };
  const setItem = (i: number, patch: Partial<ItemProposta>) => setItens(itens.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const n = (v: string) => { const x = Number(v.replace(",", ".")); return Number.isFinite(x) && x >= 0 ? x : 0; };

  async function save() {
    if (!d) return;
    if (itens.some((i) => !i.nome.trim())) return toast.error("Todos os itens precisam de nome.");
    setBusy(true);
    try {
      const up = await supabase.from("crm_propostas").update({ condicoes: cond as never, template_id: tpl || null, data_proposta: dataProp, observacoes: obs.trim() || null }).eq("id", d.proposta.id).select("id");
      if (up.error) throw up.error; if (!up.data?.length) throw new Error("Sem permissão para alterar esta proposta.");
      if (rascunho) {
        const keep = new Set(itens.map((i) => i.id).filter(Boolean));
        const removed = d.itens.filter((i) => i.id && !keep.has(i.id)).map((i) => i.id!);
        if (removed.length) { const r = await supabase.from("crm_proposta_itens").delete().in("id", removed); if (r.error) throw r.error; }
        const row = (i: ItemProposta, ordem: number) => ({ proposta_id: d.proposta.id, categoria: i.categoria, nome: i.nome.trim(), modelo: i.modelo?.trim() || null, unidade: i.unidade.trim() || "un", quantidade: i.quantidade, preco_setup_unit: i.preco_setup_unit, preco_mensal_unit: i.preco_mensal_unit, ambiente: i.ambiente?.trim() || null, observacao: i.observacao?.trim() || null, tabela_item_id: i.tabela_item_id ?? null, ordem });
        for (const [k, i] of itens.entries()) {
          const r = i.id ? await supabase.from("crm_proposta_itens").update(row(i, k)).eq("id", i.id) : await supabase.from("crm_proposta_itens").insert(row(i, k));
          if (r.error) throw r.error;
        }
      }
      await reload(); setResetKey((k) => k + 1); toast.success("Proposta salva");
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }
  async function setStatus(s: PropostaStatus) {
    if (!d) return;
    if (dirty) return toast.error("Salve as alterações antes de mudar a situação.");
    if (s !== "rascunho" && bloqueio) return toast.error(bloqueio);
    if (!(await confirmAction(`Mudar a situação da proposta para “${statusLabel(s)}”?`))) return;
    const r = await supabase.from("crm_propostas").update({ status: s }).eq("id", d.proposta.id).select("id");
    if (r.error) return toast.error(errMsg(r.error));
    await reload(); toast.success(`Proposta ${statusLabel(s).toLowerCase()}`);
  }
  async function novaVersao() {
    if (!d) return;
    if (dirty) return toast.error("Salve as alterações antes de criar uma nova versão.");
    setBusy(true);
    try {
      const vs = await supabase.from("crm_propostas").select("versao").eq("numero", d.proposta.numero);
      if (vs.error) throw vs.error;
      const ins = await supabase.from("crm_propostas").insert({ numero: d.proposta.numero, versao: proximaVersao((vs.data ?? []).map((x) => x.versao)), oportunidade_id: d.proposta.oportunidade_id, template_id: d.proposta.template_id, condicoes: d.proposta.condicoes as never, observacoes: d.proposta.observacoes }).select("id").single();
      if (ins.error) throw ins.error;
      if (d.itens.length) { const r = await supabase.from("crm_proposta_itens").insert(d.itens.map((i, k) => ({ proposta_id: ins.data.id, categoria: i.categoria, nome: i.nome, modelo: i.modelo, unidade: i.unidade, quantidade: i.quantidade, preco_setup_unit: i.preco_setup_unit, preco_mensal_unit: i.preco_mensal_unit, ambiente: i.ambiente, observacao: i.observacao, tabela_item_id: i.tabela_item_id ?? null, ordem: k }))); if (r.error) throw r.error; }
      const abertas = d.pendencias.filter((p) => p.status === "aberta");
      if (abertas.length) { const r = await supabase.from("crm_proposta_pendencias").insert(abertas.map((p) => ({ proposta_id: ins.data.id, texto: p.texto }))); if (r.error) throw r.error; }
      await qc.invalidateQueries({ queryKey: ["crm-propostas"] }); toast.success("Nova versão criada"); onOpen(ins.data.id);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }
  async function docx() {
    if (!d || !empresa) return;
    if (dirty) return toast.error("Salve as alterações antes de gerar o documento.");
    if (bloqueio) return toast.error(bloqueio);
    try {
      const { gerarDocxProposta, nomeArquivoDocx } = await import("./proposta-docx");
      const t = templates.find((x) => x.id === d.proposta.template_id);
      const contato = op?.contato_id ? data.contatos.find((c) => c.id === op.contato_id) : undefined;
      const dados = { numero: d.proposta.numero, versao: d.proposta.versao, data_proposta: d.proposta.data_proposta, template_codigo: t?.codigo ?? null, template: t ? { nome: t.nome, introducao: t.introducao, escopo: t.escopo } : null,
        empresa: { nome_fantasia: empresa.nome_fantasia, razao_social: empresa.razao_social, cnpj: empresa.cnpj, cidade: empresa.cidade, uf: empresa.uf },
        contato: contato ? { nome: contato.nome, cargo: contato.cargo, email: contato.email } : null,
        vendedor: op?.dono_id ? { nome: data.users.find((u) => u.id === op.dono_id)?.full_name ?? "" } : null, produto: op?.produto_alvo ?? null,
        condicoes: cond, itens, total_setup: tot.setup, total_mensal: tot.mensal };
      const blob = await gerarDocxProposta(dados);
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nomeArquivoDocx(dados); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
    } catch (e) { toast.error(errMsg(e)); }
  }
  async function pend(action: "add" | "resolver" | "nao_se_aplica" | "reabrir" | "excluir", p?: Pendencia) {
    if (!d) return;
    let r;
    if (action === "add") { if (!novaPend.trim()) return; r = await supabase.from("crm_proposta_pendencias").insert({ proposta_id: d.proposta.id, texto: novaPend.trim() }); if (!r.error) setNovaPend(""); }
    else if (action === "excluir") r = await supabase.from("crm_proposta_pendencias").delete().eq("id", p!.id);
    else r = await supabase.from("crm_proposta_pendencias").update({ status: action === "reabrir" ? "aberta" : action === "resolver" ? "resolvida" : "nao_se_aplica" }).eq("id", p!.id);
    if (r.error) return toast.error(errMsg(r.error));
    await reload();
  }
  async function excluir() {
    if (!d) return;
    const r = await supabase.from("crm_propostas").delete().eq("id", d.proposta.id).select("id");
    if (r.error || !r.data?.length) return toast.error("Só propostas em rascunho podem ser excluídas.");
    await qc.invalidateQueries({ queryKey: ["crm-propostas"] }); toast.success("Proposta excluída"); onClose();
  }

  return <Dialog open={!!id} onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl">
      <DialogHeader><DialogTitle>{d ? `Proposta ${d.proposta.numero}${d.proposta.versao > 1 ? ` v${d.proposta.versao}` : ""}` : "Proposta"}</DialogTitle></DialogHeader>
      {!d ? <p className="text-sm text-muted-foreground">{detail.isError ? "Não foi possível carregar a proposta." : "Carregando..."}</p> : <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{op?.titulo ?? "—"}</span><span className="text-muted-foreground">· {empresa?.nome_fantasia ?? "—"}</span>
          <Badge variant={statusVariant(d.proposta.status)}>{statusLabel(d.proposta.status)}</Badge>{d.proposta.incompleta && <Badge variant="destructive">Incompleta · {d.pendencias.filter((p) => p.status === "aberta").length}</Badge>}
          <span className="ml-auto inline-flex flex-wrap items-center gap-2">
            {STATUS_PROPOSTA.filter((s) => s.value !== d.proposta.status).map((s) => <Button key={s.value} size="sm" variant="ghost" onClick={() => setStatus(s.value)}>{s.value === "rascunho" ? "Voltar a rascunho" : `Marcar como ${s.label.toLowerCase()}`}</Button>)}
          </span>
        </div>

        <section className="grid grid-cols-1 items-end gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-1 sm:col-span-2"><Label>Modelo</Label><Select value={tpl || "__none"} onValueChange={(v) => setTpl(v === "__none" ? "" : v)}><SelectTrigger aria-label="Modelo"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none">Sem modelo</SelectItem>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label htmlFor="pr-data">Data</Label><Input id="pr-data" type="date" value={dataProp} onChange={(e) => setDataProp(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="pr-meses">Contrato (meses)</Label><Input bufferedNumber id="pr-meses" type="number" min={1} value={cond.contrato_meses} onChange={(e) => setCond({ ...cond, contrato_meses: Math.max(1, Math.round(n(e.target.value))) })} /></div>
          <div className="space-y-1"><Label htmlFor="pr-parc">Parcelas do setup</Label><Input bufferedNumber id="pr-parc" type="number" min={1} value={cond.parcelas_setup} onChange={(e) => setCond({ ...cond, parcelas_setup: Math.max(1, Math.round(n(e.target.value))) })} /></div>
          <div className="space-y-1"><Label htmlFor="pr-val">Validade (dias)</Label><Input bufferedNumber id="pr-val" type="number" min={1} value={cond.validade_dias} onChange={(e) => setCond({ ...cond, validade_dias: Math.max(1, Math.round(n(e.target.value))) })} /></div>
          {["EXPANSAO", "REALOCACAO"].includes(templates.find((t) => t.id === tpl)?.codigo ?? "") && <div className="space-y-1 sm:col-span-3"><Label htmlFor="pr-ref">Contrato de referência</Label><Input id="pr-ref" placeholder="contrato de 10/01/2025" value={cond.contrato_referencia ?? ""} onChange={(e) => setCond({ ...cond, contrato_referencia: e.target.value || null })} /></div>}
          <div className="space-y-1 sm:col-span-3 lg:col-span-6"><Label htmlFor="pr-cobs">Observação nas condições (sai no documento)</Label><Input id="pr-cobs" value={cond.observacoes ?? ""} onChange={(e) => setCond({ ...cond, observacoes: e.target.value || null })} /></div>
        </section>

        <section className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2"><h2 className="text-base font-medium">Itens</h2>
            <span className="text-sm">Setup <b>{brl(tot.setup)}</b> · Mensal <b>{brl(tot.mensal)}/mês</b></span></div>
          {!rascunho && <p className="text-xs text-muted-foreground">Itens só podem ser alterados em rascunho. Para mudar uma proposta enviada, crie uma nova versão.</p>}
          <Table><TableHeader><TableRow><TableHead>Ambiente</TableHead><TableHead>Categoria</TableHead><TableHead>Item</TableHead><TableHead>Modelo</TableHead><TableHead>Qtd</TableHead><TableHead>Un.</TableHead><TableHead>Setup unit.</TableHead><TableHead>Mensal unit.</TableHead><TableHead>Total setup</TableHead><TableHead>Total mensal</TableHead><TableHead>Ressalva</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
            <TableBody>{itens.map((i, k) => <TableRow key={i.id ?? `n${k}`}>
              <TableCell><Input aria-label="Ambiente" className="h-8 min-w-24" disabled={!rascunho} value={i.ambiente ?? ""} onChange={(e) => setItem(k, { ambiente: e.target.value })} /></TableCell>
              <TableCell><Select value={i.categoria} onValueChange={(v) => setItem(k, { categoria: v })} disabled={!rascunho}><SelectTrigger aria-label="Categoria" className="h-8 min-w-32"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIAS_ITEM.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></TableCell>
              <TableCell><Input aria-label="Item" className="h-8 min-w-40" disabled={!rascunho} value={i.nome} onChange={(e) => setItem(k, { nome: e.target.value })} /></TableCell>
              <TableCell><Input aria-label="Modelo do item" className="h-8 min-w-24" disabled={!rascunho} value={i.modelo ?? ""} onChange={(e) => setItem(k, { modelo: e.target.value })} /></TableCell>
              <TableCell><Input aria-label="Quantidade" className="h-8 w-20" type="number" min={0} disabled={!rascunho} value={i.quantidade} onChange={(e) => setItem(k, { quantidade: n(e.target.value) })} /></TableCell>
              <TableCell><Input aria-label="Unidade" className="h-8 w-14" disabled={!rascunho} value={i.unidade} onChange={(e) => setItem(k, { unidade: e.target.value })} /></TableCell>
              <TableCell><Input aria-label="Setup unitário" className="h-8 w-24" type="number" min={0} step="0.01" disabled={!rascunho} value={i.preco_setup_unit} onChange={(e) => setItem(k, { preco_setup_unit: n(e.target.value) })} /></TableCell>
              <TableCell><Input aria-label="Mensal unitário" className="h-8 w-24" type="number" min={0} step="0.01" disabled={!rascunho} value={i.preco_mensal_unit} onChange={(e) => setItem(k, { preco_mensal_unit: n(e.target.value) })} /></TableCell>
              <TableCell className="whitespace-nowrap">{brl(i.quantidade * i.preco_setup_unit)}</TableCell><TableCell className="whitespace-nowrap">{brl(i.quantidade * i.preco_mensal_unit)}</TableCell>
              <TableCell><Input aria-label="Ressalva técnica" className="h-8 min-w-32" disabled={!rascunho} value={i.observacao ?? ""} onChange={(e) => setItem(k, { observacao: e.target.value })} /></TableCell>
              <TableCell>{rascunho && <Button variant="ghost" size="icon" aria-label="Remover item" title="Remover item" onClick={() => setItens(itens.filter((_, x) => x !== k))}><Trash2 /></Button>}</TableCell>
            </TableRow>)}
              {!itens.length && <TableRow><TableCell colSpan={12} className="text-muted-foreground">Nenhum item.</TableCell></TableRow>}</TableBody></Table>
          {rascunho && <div className="flex flex-wrap items-end gap-2"><Button variant="ghost" onClick={() => setItens([...itens, emptyItem()])}><Plus className="h-4 w-4" />Adicionar item</Button>
            {daTabela.length > 0 && <Select value="" onValueChange={(v) => { const t = daTabela.find((x) => x.id === v); if (t) setItens([...itens, { ...emptyItem(), categoria: t.categoria, nome: t.nome, modelo: t.modelo, unidade: t.unidade, quantidade: 1, preco_setup_unit: t.preco_setup, preco_mensal_unit: t.preco_mensal, tabela_item_id: t.id }]); }}><SelectTrigger aria-label="Adicionar da tabela de preços" className="w-64"><SelectValue placeholder="Adicionar da tabela de preços" /></SelectTrigger><SelectContent>{daTabela.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}{t.modelo ? ` · ${t.modelo}` : ""}</SelectItem>)}</SelectContent></Select>}</div>}
        </section>

        {custeio?.admin && <MemoriaCalculo propostaId={d.proposta.id} itens={itens} contratoMeses={cond.contrato_meses} totalSetup={tot.setup} totalMensal={tot.mensal} custeio={custeio} />}

        <section className="space-y-2">
          <h2 className="text-base font-medium">Pendências</h2>
          <p className="text-xs text-muted-foreground">Com pendência aberta a proposta fica incompleta: não pode ser enviada nem gerar o documento.</p>
          <ul className="space-y-1">{d.pendencias.map((p) => <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
            <span className={p.status === "aberta" ? "font-medium" : "text-muted-foreground line-through"}>{p.texto}</span>
            {p.status !== "aberta" && <Badge variant="outline">{p.status === "resolvida" ? "Resolvida" : "Não se aplica"}</Badge>}
            <span className="ml-auto inline-flex items-center gap-1">
              {p.status === "aberta" ? <><Button size="sm" variant="ghost" onClick={() => pend("resolver", p)}><Check className="h-4 w-4" />Resolvida</Button><Button size="sm" variant="ghost" onClick={() => pend("nao_se_aplica", p)}><Ban className="h-4 w-4" />Não se aplica</Button></>
                : <Button size="sm" variant="ghost" onClick={() => pend("reabrir", p)}><RotateCcw className="h-4 w-4" />Reabrir</Button>}
              <ConfirmDeleteButton title="Excluir pendência?" description={p.texto} onConfirm={() => void pend("excluir", p)} />
            </span></li>)}</ul>
          <div className="flex items-end gap-2"><Input aria-label="Nova pendência" placeholder="Nova pendência (ex.: confirmar quantidade de quiosques)" value={novaPend} onChange={(e) => setNovaPend(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void pend("add"); }} /><Button variant="ghost" onClick={() => pend("add")}><Plus className="h-4 w-4" />Adicionar</Button></div>
        </section>

        <CrmHistoricalRecords propostaId={d.proposta.id} numero={d.proposta.numero} paths={[d.proposta.arquivo_path, d.proposta.arquivo_origem_path]} />
        <div className="space-y-1"><Label htmlFor="pr-obs">Observações internas (não saem no documento)</Label><Textarea id="pr-obs" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Button variant="ghost" size="icon" aria-label="Salvar" title="Salvar" onClick={save} disabled={busy || !dirty}><Save /></Button>
          <Button variant="ghost" onClick={docx} disabled={busy} title={bloqueio ?? "Baixar o documento Word da proposta"}><FileDown className="h-4 w-4" />Gerar DOCX</Button>
          <Button variant="ghost" onClick={novaVersao} disabled={busy}><CopyPlus className="h-4 w-4" />Nova versão</Button>
          {rascunho && <ConfirmDeleteButton title="Excluir proposta?" description="Só rascunhos podem ser excluídos. Esta ação não pode ser desfeita." onConfirm={() => void excluir()} />}
          {bloqueio && <span className="ml-auto text-xs text-muted-foreground">{bloqueio}</span>}
        </div>
      </div>}
    </DialogContent>
  </Dialog>;
}
