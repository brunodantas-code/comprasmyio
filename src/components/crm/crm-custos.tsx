import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIAS_ITEM } from "./proposta-logic";
import { GRUPOS_KIT, PRODUTOS, custoEfetivo, custoKit, loteVigente, precoSugerido, type CustoBase, type CustoItem, type ItemTabela, type Kit, type Lote } from "./custeio-logic";
import { PARAMETROS_PADRAO } from "./motor-custeio";

export type Parametros = typeof PARAMETROS_PADRAO & { custo_hora_padrao: number; custo_mensal_servir_padrao: number };
export type Custeio = { admin: boolean; tabela: ItemTabela[]; custos: CustoItem[]; kits: Kit[]; lotes: Lote[]; bases: CustoBase[]; par: Parametros; lote: Lote | null };
const num = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "string" && v !== "" && !Number.isNaN(Number(v)) && /^(preco|custo|markup|componentes|mod_|cif|pre_|multiplicador|teto|aliquota|faixa|circuitos)/.test(k) ? Number(v) : v]));

/** Price list for every CRM user; costs, kits, batches and engine parameters only reach ERP admins (RLS returns nothing otherwise). */
export function useCusteio() {
  return useQuery({ queryKey: ["crm-custeio"], queryFn: async (): Promise<Custeio> => {
    const uid = (await supabase.auth.getUser()).data.user?.id ?? "";
    const [adm, t, c, k, l, b, p] = await Promise.all([
      supabase.from("erp_admins").select("user_id").eq("user_id", uid).maybeSingle(),
      supabase.from("crm_tabela_precos").select("*").order("ordem").order("nome"),
      supabase.from("crm_tabela_precos_custo").select("*"), supabase.from("crm_kits").select("*").order("grupo").order("nome"),
      supabase.from("crm_lotes_custo").select("*").order("vigencia_inicio", { ascending: false }), supabase.from("crm_custo_base_produto").select("*"),
      supabase.from("crm_parametros_motor").select("*").maybeSingle(),
    ]);
    if (t.error) throw t.error;
    const lotes = (l.data ?? []) as Lote[];
    return { admin: !!adm.data, tabela: (t.data ?? []).map(num) as unknown as ItemTabela[], custos: (c.data ?? []).map(num) as unknown as CustoItem[], kits: (k.data ?? []).map(num) as unknown as Kit[], lotes, bases: (b.data ?? []).map(num) as unknown as CustoBase[], par: { ...PARAMETROS_PADRAO, custo_hora_padrao: 120, custo_mensal_servir_padrao: 1500, ...(p.data ? num(p.data) : {}) } as Parametros, lote: loteVigente(lotes) };
  } });
}
const brl = (v: number | null) => (v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const n = (v: string) => { const x = Number(v.replace(",", ".")); return Number.isFinite(x) && x >= 0 ? x : 0; };

export function CrmCustos() {
  const q = useCusteio(); const qc = useQueryClient();
  const reload = () => qc.invalidateQueries({ queryKey: ["crm-custeio"] });
  if (!q.data) return <p className="text-muted-foreground">{q.isError ? "Não foi possível carregar a tabela de preços." : "Carregando..."}</p>;
  const d = q.data;
  return <div className="space-y-6">
    <TabelaPrecos d={d} reload={reload} />
    {d.admin && <><Kits d={d} reload={reload} /><Lotes d={d} reload={reload} /><ParametrosCard d={d} reload={reload} /></>}
    {!d.admin && <p className="text-xs text-muted-foreground">Custos, kits e parâmetros do cálculo são visíveis somente para Admin do ERP.</p>}
  </div>;
}
async function run(p: PromiseLike<{ error: unknown }>, ok: string, reload: () => unknown) { const r = await p; if (r.error) { toast.error("Não foi possível salvar."); return false; } toast.success(ok); await reload(); return true; }

function TabelaPrecos({ d, reload }: { d: Custeio; reload: () => unknown }) {
  const [rows, setRows] = useState(d.tabela); const [custos, setCustos] = useState(d.custos);
  useEffect(() => { setRows(d.tabela); setCustos(d.custos); }, [d.tabela, d.custos]);
  const [busca, setBusca] = useState("");
  const set = (id: string, p: Partial<ItemTabela>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const setC = (id: string, p: Partial<CustoItem>) => setCustos(custos.some((c) => c.item_id === id) ? custos.map((c) => (c.item_id === id ? { ...c, ...p } : c)) : [...custos, { item_id: id, kit_id: null, custo_manual: null, markup_percentual: 65, ...p }]);
  const dirty = (r: ItemTabela) => JSON.stringify(r) !== JSON.stringify(d.tabela.find((x) => x.id === r.id)) || JSON.stringify(custos.find((c) => c.item_id === r.id)) !== JSON.stringify(d.custos.find((c) => c.item_id === r.id));
  async function save(r: ItemTabela) {
    if (!r.nome.trim()) return toast.error("Informe o nome do item.");
    const a = await supabase.from("crm_tabela_precos").update({ categoria: r.categoria, nome: r.nome.trim(), modelo: r.modelo?.trim() || null, unidade: r.unidade.trim() || "un", preco_setup: r.preco_setup, preco_mensal: r.preco_mensal, ativo: r.ativo }).eq("id", r.id);
    if (a.error) return toast.error("Não foi possível salvar.");
    const c = custos.find((x) => x.item_id === r.id);
    await run(c ? supabase.from("crm_tabela_precos_custo").upsert({ item_id: r.id, kit_id: c.kit_id, custo_manual: c.custo_manual, markup_percentual: c.markup_percentual }) : Promise.resolve({ error: null }), "Item salvo", reload);
  }
  const add = () => run(supabase.from("crm_tabela_precos").insert({ nome: "Novo item", ordem: rows.length }), "Item criado", reload);
  const shown = rows.filter((r) => !busca.trim() || `${r.nome} ${r.modelo ?? ""}`.toLowerCase().includes(busca.toLowerCase()));
  return <Card><CardHeader className="flex-row flex-wrap items-start justify-between gap-2"><div><CardTitle>Tabela de preços</CardTitle><CardDescription>Preços de setup e mensalidade usados nas propostas{d.admin ? `. Lote de custo vigente: ${d.lote ? `${d.lote.codigo}${d.lote.status === "exemplo" ? " (exemplo)" : ""}` : "nenhum"}` : ""}.</CardDescription></div>
    <div className="flex items-end gap-2"><Input aria-label="Buscar item" placeholder="Buscar item" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-48" />{d.admin && <Button variant="ghost" onClick={add}><Plus className="h-4 w-4" />Novo item</Button>}</div></CardHeader>
    <CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Categoria</TableHead><TableHead>Item</TableHead><TableHead>Modelo</TableHead><TableHead>Un.</TableHead><TableHead>Setup</TableHead><TableHead>Mensal</TableHead>
      {d.admin && <><TableHead>Kit</TableHead><TableHead>Custo manual</TableHead><TableHead>Custo efetivo</TableHead><TableHead>Markup %</TableHead><TableHead>Setup sugerido</TableHead><TableHead>Ativo</TableHead><TableHead>Ações</TableHead></>}</TableRow></TableHeader>
      <TableBody>{shown.map((r) => { const c = custos.find((x) => x.item_id === r.id); const ef = custoEfetivo(c, d.kits, d.bases, d.lote); const ro = !d.admin; return <TableRow key={r.id} className={r.ativo ? undefined : "opacity-60"}>
        <TableCell>{ro ? CATEGORIAS_ITEM.find((x) => x.value === r.categoria)?.label : <Select value={r.categoria} onValueChange={(v) => set(r.id, { categoria: v })}><SelectTrigger aria-label="Categoria" className="h-8 min-w-32"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIAS_ITEM.map((x) => <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}</SelectContent></Select>}</TableCell>
        <TableCell>{ro ? r.nome : <Input aria-label="Item" className="h-8 min-w-40" value={r.nome} onChange={(e) => set(r.id, { nome: e.target.value })} />}</TableCell>
        <TableCell>{ro ? r.modelo : <Input aria-label="Modelo" className="h-8 min-w-24" value={r.modelo ?? ""} onChange={(e) => set(r.id, { modelo: e.target.value })} />}</TableCell>
        <TableCell>{ro ? r.unidade : <Input aria-label="Unidade" className="h-8 w-14" value={r.unidade} onChange={(e) => set(r.id, { unidade: e.target.value })} />}</TableCell>
        <TableCell>{ro ? brl(r.preco_setup) : <Input aria-label="Preço de setup" type="number" min={0} step="0.01" className="h-8 w-24" value={r.preco_setup} onChange={(e) => set(r.id, { preco_setup: n(e.target.value) })} />}</TableCell>
        <TableCell>{ro ? brl(r.preco_mensal) : <Input aria-label="Preço mensal" type="number" min={0} step="0.01" className="h-8 w-24" value={r.preco_mensal} onChange={(e) => set(r.id, { preco_mensal: n(e.target.value) })} />}</TableCell>
        {d.admin && <>
          <TableCell><Select value={c?.kit_id ?? "__none"} onValueChange={(v) => setC(r.id, { kit_id: v === "__none" ? null : v })}><SelectTrigger aria-label="Kit" className="h-8 min-w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none">Sem kit</SelectItem>{d.kits.map((k) => <SelectItem key={k.id} value={k.id}>{k.nome}</SelectItem>)}</SelectContent></Select></TableCell>
          <TableCell><Input aria-label="Custo manual" type="number" min={0} step="0.01" className="h-8 w-24" value={c?.custo_manual ?? ""} onChange={(e) => setC(r.id, { custo_manual: e.target.value === "" ? null : n(e.target.value) })} /></TableCell>
          <TableCell className="whitespace-nowrap">{brl(ef.valor)}{ef.fonte && <span className="ml-1 text-xs text-muted-foreground">({ef.fonte})</span>}</TableCell>
          <TableCell><Input aria-label="Markup" type="number" min={0} step="1" className="h-8 w-16" value={c?.markup_percentual ?? 65} onChange={(e) => setC(r.id, { markup_percentual: n(e.target.value) })} /></TableCell>
          <TableCell className="whitespace-nowrap">{brl(precoSugerido(ef.valor, c?.markup_percentual ?? 65))}</TableCell>
          <TableCell><input type="checkbox" aria-label="Ativo" checked={r.ativo} onChange={(e) => set(r.id, { ativo: e.target.checked })} /></TableCell>
          <TableCell className="whitespace-nowrap"><Button variant="ghost" size="icon" aria-label="Salvar" title="Salvar item" disabled={!dirty(r)} onClick={() => save(r)}><Save /></Button>
            <ConfirmDeleteButton title="Excluir item da tabela?" description={`${r.nome}. Propostas que já usam o item não mudam.`} onConfirm={() => void run(supabase.from("crm_tabela_precos").delete().eq("id", r.id), "Item excluído", reload)} /></TableCell></>}
      </TableRow>; })}{!shown.length && <TableRow><TableCell colSpan={13} className="text-muted-foreground">Nenhum item na tabela.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>;
}

function Kits({ d, reload }: { d: Custeio; reload: () => unknown }) {
  const [rows, setRows] = useState(d.kits); useEffect(() => setRows(d.kits), [d.kits]);
  const set = (id: string, p: Partial<Kit>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const save = (k: Kit) => k.nome.trim() ? run(supabase.from("crm_kits").update({ nome: k.nome.trim(), grupo: k.grupo, produto: k.produto, custo_3os_imp: k.custo_3os_imp, custo_3os_nac: k.custo_3os_nac, ativo: k.ativo }).eq("id", k.id), "Kit salvo", reload) : toast.error("Informe o nome do kit.");
  const add = () => run(supabase.from("crm_kits").insert({ nome: `Novo kit ${rows.length + 1}`, grupo: GRUPOS_KIT[0], produto: "3F" }), "Kit criado", reload);
  return <Card><CardHeader className="flex-row flex-wrap items-start justify-between gap-2"><div><CardTitle>Kits</CardTitle><CardDescription>Custo capitalizável = custo-base do produto no lote vigente + peças de terceiros (importadas e nacionais).</CardDescription></div><Button variant="ghost" onClick={add}><Plus className="h-4 w-4" />Novo kit</Button></CardHeader>
    <CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Kit</TableHead><TableHead>Grupo</TableHead><TableHead>Produto</TableHead><TableHead>Terceiros importados</TableHead><TableHead>Terceiros nacionais</TableHead><TableHead>Custo capitalizável</TableHead><TableHead>Ativo</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
      <TableBody>{rows.map((k) => { const cc = custoKit(k, d.bases, d.lote); return <TableRow key={k.id}>
        <TableCell><Input aria-label="Nome do kit" className="h-8 min-w-40" value={k.nome} onChange={(e) => set(k.id, { nome: e.target.value })} /></TableCell>
        <TableCell><Select value={k.grupo} onValueChange={(v) => set(k.id, { grupo: v })}><SelectTrigger aria-label="Grupo" className="h-8 min-w-44"><SelectValue /></SelectTrigger><SelectContent>{GRUPOS_KIT.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></TableCell>
        <TableCell><Select value={k.produto} onValueChange={(v) => set(k.id, { produto: v as Kit["produto"] })}><SelectTrigger aria-label="Produto" className="h-8 w-28"><SelectValue /></SelectTrigger><SelectContent>{PRODUTOS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></TableCell>
        <TableCell><Input aria-label="Terceiros importados" type="number" min={0} step="0.01" className="h-8 w-24" value={k.custo_3os_imp} onChange={(e) => set(k.id, { custo_3os_imp: n(e.target.value) })} /></TableCell>
        <TableCell><Input aria-label="Terceiros nacionais" type="number" min={0} step="0.01" className="h-8 w-24" value={k.custo_3os_nac} onChange={(e) => set(k.id, { custo_3os_nac: n(e.target.value) })} /></TableCell>
        <TableCell className="whitespace-nowrap">{cc === null ? <span className="text-xs text-muted-foreground">Sem custo-base no lote</span> : brl(cc)}</TableCell>
        <TableCell><input type="checkbox" aria-label="Ativo" checked={k.ativo} onChange={(e) => set(k.id, { ativo: e.target.checked })} /></TableCell>
        <TableCell className="whitespace-nowrap"><Button variant="ghost" size="icon" aria-label="Salvar" title="Salvar kit" disabled={JSON.stringify(k) === JSON.stringify(d.kits.find((x) => x.id === k.id))} onClick={() => save(k)}><Save /></Button>
          <ConfirmDeleteButton title="Excluir kit?" description={`${k.nome}. Itens da tabela vinculados ficam sem kit.`} onConfirm={() => void run(supabase.from("crm_kits").delete().eq("id", k.id), "Kit excluído", reload)} /></TableCell>
      </TableRow>; })}{!rows.length && <TableRow><TableCell colSpan={8} className="text-muted-foreground">Nenhum kit.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>;
}

const STATUS_LOTE = [{ v: "exemplo", l: "Exemplo" }, { v: "validado", l: "Validado" }, { v: "encerrado", l: "Encerrado" }] as const;
function Lotes({ d, reload }: { d: Custeio; reload: () => unknown }) {
  const [sel, setSel] = useState<string>(d.lote?.id ?? d.lotes[0]?.id ?? "");
  const lote = d.lotes.find((l) => l.id === sel);
  const [lf, setLf] = useState<Lote | null>(lote ?? null); useEffect(() => setLf(lote ?? null), [lote]);
  const baseOf = (p: string) => d.bases.find((b) => b.lote_id === sel && b.produto === p) ?? { lote_id: sel, produto: p, componentes_myio: 0, mod_assembling: 0, cif: 0, pre_setup_fabrica: 0 } as CustoBase;
  const [bases, setBases] = useState<CustoBase[]>([]); useEffect(() => setBases(PRODUTOS.map(baseOf)), [sel, d.bases]); // eslint-disable-line react-hooks/exhaustive-deps
  const setB = (p: string, k: keyof CustoBase, v: number) => setBases(bases.map((b) => (b.produto === p ? { ...b, [k]: v } : b)));
  async function add() { const r = await supabase.from("crm_lotes_custo").insert({ codigo: `LOTE-${new Date().toISOString().slice(0, 10)}-${d.lotes.length + 1}` }).select("id").single(); if (r.error) return toast.error("Não foi possível criar o lote."); setSel(r.data.id); toast.success("Lote criado"); await reload(); }
  async function save() {
    if (!lf) return;
    const a = await supabase.from("crm_lotes_custo").update({ codigo: lf.codigo.trim(), descricao: lf.descricao, status: lf.status, vigencia_inicio: lf.vigencia_inicio, vigencia_fim: lf.vigencia_fim || null }).eq("id", lf.id);
    if (a.error) return toast.error("Não foi possível salvar o lote (código repetido?).");
    await run(supabase.from("crm_custo_base_produto").upsert(bases.map(({ id: _id, ...b }) => b), { onConflict: "lote_id,produto" }), "Lote salvo", reload);
  }
  const F: [keyof CustoBase, string][] = [["componentes_myio", "Componentes myio"], ["mod_assembling", "MOD montagem"], ["cif", "CIF"], ["pre_setup_fabrica", "Pré-setup fábrica"]];
  return <Card><CardHeader className="flex-row flex-wrap items-start justify-between gap-2"><div><CardTitle>Lotes de custo e custo-base</CardTitle><CardDescription>Vale o lote dentro da vigência e não encerrado; um lote validado tem prioridade sobre um de exemplo.</CardDescription></div>
    <div className="flex items-end gap-2">{d.lotes.length > 0 && <Select value={sel} onValueChange={setSel}><SelectTrigger aria-label="Lote" className="w-56"><SelectValue placeholder="Lote" /></SelectTrigger><SelectContent>{d.lotes.map((l) => <SelectItem key={l.id} value={l.id}>{l.codigo}{l.id === d.lote?.id ? " · vigente" : ""}</SelectItem>)}</SelectContent></Select>}<Button variant="ghost" onClick={add}><Plus className="h-4 w-4" />Novo lote</Button></div></CardHeader>
    <CardContent className="space-y-4">{!lf ? <p className="text-sm text-muted-foreground">Nenhum lote cadastrado.</p> : <>
      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-5">
        <div className="space-y-1"><Label htmlFor="lt-cod">Código</Label><Input id="lt-cod" value={lf.codigo} onChange={(e) => setLf({ ...lf, codigo: e.target.value })} /></div>
        <div className="space-y-1"><Label>Situação</Label><Select value={lf.status} onValueChange={(v) => setLf({ ...lf, status: v as Lote["status"] })}><SelectTrigger aria-label="Situação do lote"><SelectValue /></SelectTrigger><SelectContent>{STATUS_LOTE.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label htmlFor="lt-ini">Vigência início</Label><Input id="lt-ini" type="date" value={lf.vigencia_inicio} onChange={(e) => setLf({ ...lf, vigencia_inicio: e.target.value })} /></div>
        <div className="space-y-1"><Label htmlFor="lt-fim">Vigência fim</Label><Input id="lt-fim" type="date" value={lf.vigencia_fim ?? ""} onChange={(e) => setLf({ ...lf, vigencia_fim: e.target.value || null })} /></div>
        <div className="flex items-center gap-1">{lf.id === d.lote?.id && <Badge>Vigente</Badge>}<Button variant="ghost" size="icon" aria-label="Salvar" title="Salvar lote e custo-base" onClick={save}><Save /></Button>
          <ConfirmDeleteButton title="Excluir lote?" description={`${lf.codigo} e seus custos-base.`} onConfirm={() => void run(supabase.from("crm_lotes_custo").delete().eq("id", lf.id), "Lote excluído", reload).then(() => setSel(""))} /></div>
      </div>
      <Table><TableHeader><TableRow><TableHead>Produto</TableHead>{F.map(([, l]) => <TableHead key={l}>{l}</TableHead>)}<TableHead>Custo-base</TableHead></TableRow></TableHeader>
        <TableBody>{bases.map((b) => <TableRow key={b.produto}><TableCell>{b.produto}</TableCell>{F.map(([k, l]) => <TableCell key={k}><Input aria-label={`${l} ${b.produto}`} type="number" min={0} step="0.01" className="h-8 w-28" value={Number(b[k])} onChange={(e) => setB(b.produto, k, n(e.target.value))} /></TableCell>)}
          <TableCell>{brl(b.componentes_myio + b.mod_assembling + b.cif + b.pre_setup_fabrica)}</TableCell></TableRow>)}</TableBody></Table></>}
    </CardContent></Card>;
}

function ParametrosCard({ d, reload }: { d: Custeio; reload: () => unknown }) {
  const [p, setP] = useState(d.par); useEffect(() => setP(d.par), [d.par]);
  const F: [keyof Parametros, string][] = [["multiplicador_margem_locacao", "Multiplicador da locação (×)"], ["teto_margem_servicos", "Teto da margem do setup (×)"], ["aliquota_iss_estimada", "ISS estimado (%)"], ["faixa_locacao_min", "Faixa da locação mín. (×)"], ["faixa_locacao_max", "Faixa da locação máx. (×)"], ["circuitos_por_central", "Circuitos por central"], ["custo_hora_padrao", "Custo da hora padrão (R$)"], ["custo_mensal_servir_padrao", "Custo mensal de suporte padrão (R$)"]];
  return <Card><CardHeader className="flex-row flex-wrap items-start justify-between gap-2"><div><CardTitle>Parâmetros do cálculo</CardTitle><CardDescription>Usados na memória de cálculo das propostas (rateio locação/serviços e testes).</CardDescription></div>
    <Button variant="ghost" size="icon" aria-label="Salvar" title="Salvar parâmetros" disabled={JSON.stringify(p) === JSON.stringify(d.par)} onClick={() => run(supabase.from("crm_parametros_motor").update(Object.fromEntries(F.map(([k]) => [k, p[k]])) as never).eq("id", 1), "Parâmetros salvos", reload)}><Save /></Button></CardHeader>
    <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-4">{F.map(([k, l]) => <div key={k} className="space-y-1"><Label htmlFor={`par-${k}`}>{l}</Label><Input id={`par-${k}`} type="number" min={0} step="0.01" value={p[k]} onChange={(e) => setP({ ...p, [k]: n(e.target.value) })} /></div>)}</CardContent></Card>;
}
