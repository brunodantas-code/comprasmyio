import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KPI_FREQUENCIES, kpiStatus, periodLabel, periodStart, type KpiFrequency, type KpiStatus } from "@/lib/mytosis-kpis";
import type { MytosisData } from "./use-mytosis";

type Kpi = { id: string; name: string; description: string | null; cost_center_id: string; responsible_id: string; unit: string; target: number; frequency: KpiFrequency; active: boolean };
type KpiResult = { id: string; kpi_id: string; period_start: string; value: number; notes: string | null };
type Segment = { id: string; name: string; code: string | null };
type Draft = { id?: string; name: string; description: string; cost_center_id: string; responsible_id: string; unit: string; target: string; frequency: KpiFrequency };

const STATUS: Record<KpiStatus, { label: string; dot: string }> = {
  ok: { label: "Meta atingida", dot: "bg-primary" },
  atencao: { label: "Atenção", dot: "bg-warning" },
  critico: { label: "Abaixo da meta", dot: "bg-destructive" },
  sem_dado: { label: "Sem lançamento", dot: "bg-muted-foreground/40" },
};
const fmt = (n: number, unit: string) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;
const emptyDraft = (): Draft => ({ name: "", description: "", cost_center_id: "", responsible_id: "", unit: "", target: "", frequency: "mensal" });

export function KpisTab({ data, canEdit }: { data: MytosisData; canEdit: boolean }) {
  const qc = useQueryClient();
  const isAdmin = data.role === "admin";
  const { data: kpiData } = useQuery({
    queryKey: ["mytosis-kpis"],
    queryFn: async () => {
      const [k, r, s, u] = await Promise.all([
        supabase.from("mytosis_kpis").select("*").order("name"),
        supabase.from("mytosis_kpi_results").select("*").order("period_start"),
        supabase.rpc("mytosis_segments"),
        supabase.auth.getUser(),
      ]);
      if (k.error) throw k.error;
      if (r.error) throw r.error;
      return { kpis: (k.data ?? []) as Kpi[], results: (r.data ?? []) as KpiResult[], segments: (s.data ?? []) as Segment[], userId: u.data.user?.id ?? "" };
    },
  });
  const [segmentFilter, setSegmentFilter] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [posting, setPosting] = useState<{ kpi: Kpi; period: string; value: string; notes: string } | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["mytosis-kpis"] });
  const saveKpi = useMutation({
    mutationFn: async (d: Draft) => {
      const target = Number(d.target.replace(",", "."));
      if (!d.name.trim() || !d.cost_center_id || !d.responsible_id || !Number.isFinite(target) || d.target.trim() === "") throw new Error("Preencha nome, segmento, responsável e meta.");
      const row = { name: d.name.trim(), description: d.description.trim() || null, cost_center_id: d.cost_center_id, responsible_id: d.responsible_id, unit: d.unit.trim(), target, frequency: d.frequency };
      const res = d.id ? await supabase.from("mytosis_kpis").update(row).eq("id", d.id) : await supabase.from("mytosis_kpis").insert(row);
      if (res.error) throw res.error;
    },
    onSuccess: () => { toast.success("KPI salvo"); setDraft(null); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteKpi = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("mytosis_kpis").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("KPI excluído"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const saveResult = useMutation({
    mutationFn: async (p: NonNullable<typeof posting>) => {
      const value = Number(p.value.replace(",", "."));
      if (p.value.trim() === "" || !Number.isFinite(value)) throw new Error("Informe o valor.");
      const { error } = await supabase.from("mytosis_kpi_results").upsert({ kpi_id: p.kpi.id, period_start: periodStart(new Date(`${p.period}T12:00:00`), p.kpi.frequency), value, notes: p.notes.trim() || null }, { onConflict: "kpi_id,period_start" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Resultado lançado"); setPosting(null); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteResult = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("mytosis_kpi_results").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const segments = kpiData?.segments ?? [];
  const segName = (id: string) => { const s = segments.find((x) => x.id === id); return s ? (s.code ? `${s.code} ${s.name}` : s.name) : "Segmento"; };
  const userName = (id: string) => data.users.find((u) => u.id === id)?.full_name ?? "—";
  const grouped = useMemo(() => {
    const kpis = (kpiData?.kpis ?? []).filter((k) => !segmentFilter || k.cost_center_id === segmentFilter);
    const map = new Map<string, Kpi[]>();
    kpis.forEach((k) => map.set(k.cost_center_id, [...(map.get(k.cost_center_id) ?? []), k]));
    return [...map.entries()];
  }, [kpiData?.kpis, segmentFilter]);

  if (!kpiData) return <div className="py-10 text-center text-muted-foreground">Carregando...</div>;
  const canPost = (k: Kpi) => isAdmin || k.responsible_id === kpiData.userId;

  return <div className="space-y-4">
    <div className="flex items-end gap-2">
      <div className="grid min-w-0 flex-1 gap-1.5 sm:max-w-sm"><Label>Segmento</Label><SearchableSelect aria-label="Filtrar segmento" value={segmentFilter} onChange={setSegmentFilter} options={segments.map((s) => ({ value: s.id, label: s.code ? `${s.code} ${s.name}` : s.name }))} placeholder="Todos os segmentos" /></div>
      {canEdit ? <Button variant="outline" size="icon" className="h-8 w-8" title="Novo KPI" aria-label="Novo KPI" onClick={() => setDraft(emptyDraft())}><Plus className="size-3.5" /></Button> : null}
    </div>

    {grouped.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Nenhum KPI cadastrado.</p> : null}
    {grouped.map(([segId, kpis]) => <section key={segId} className="space-y-2">
      <h2 className="text-sm text-muted-foreground">{segName(segId)}</h2>
      <div className="divide-y divide-border rounded-lg border border-border bg-card">
        {kpis.map((k) => {
          const results = kpiData.results.filter((r) => r.kpi_id === k.id);
          const last = results[results.length - 1];
          const status = kpiStatus(last?.value, k.target);
          const expanded = !!open[k.id];
          return <div key={k.id} className="p-3">
            <div className="flex items-start gap-3">
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-primary" aria-label={expanded ? "Recolher" : "Exibir"} onClick={() => setOpen({ ...open, [k.id]: !expanded })}>{expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</Button>
              <span className={`mt-2 h-3 w-3 shrink-0 rounded-full ${STATUS[status].dot}`} title={STATUS[status].label} />
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">{k.name}</p>
                <p className="text-xs text-muted-foreground">Responsável: {userName(k.responsible_id)} · {KPI_FREQUENCIES.find((f) => f.value === k.frequency)?.label}</p>
              </div>
              <div className="shrink-0 text-right text-sm">
                <p>{last ? fmt(last.value, k.unit) : "—"}</p>
                <p className="text-xs text-muted-foreground">Meta {fmt(k.target, k.unit)}</p>
              </div>
            </div>
            {expanded ? <div className="mt-3 space-y-3 pl-10">
              {k.description ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{k.description}</p> : null}
              {results.length > 0 ? <div className="h-48 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={results.map((r) => ({ periodo: periodLabel(r.period_start, k.frequency), valor: Number(r.value) }))} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="periodo" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={48} />
                <Tooltip />
                <ReferenceLine y={Number(k.target)} stroke="var(--destructive)" strokeDasharray="4 4" label={{ value: "Meta", fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Line type="monotone" dataKey="valor" stroke="var(--primary)" strokeWidth={2} dot />
              </LineChart></ResponsiveContainer></div> : null}
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs font-normal text-muted-foreground"><th className="py-1 font-normal">Período</th><th className="py-1 font-normal">Valor</th><th className="py-1 font-normal">Observação</th><th /></tr></thead>
                <tbody>{[...results].reverse().map((r) => <tr key={r.id} className="border-t border-border">
                  <td className="py-1.5"><span className={`mr-2 inline-block h-2 w-2 rounded-full ${STATUS[kpiStatus(r.value, k.target)].dot}`} />{periodLabel(r.period_start, k.frequency)}</td>
                  <td className="py-1.5">{fmt(r.value, k.unit)}</td>
                  <td className="py-1.5 text-muted-foreground">{r.notes ?? ""}</td>
                  <td className="py-1.5 text-right">{canPost(k) ? <span className="inline-flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" aria-label="Editar lançamento" onClick={() => setPosting({ kpi: k, period: r.period_start, value: String(r.value), notes: r.notes ?? "" })}><Pencil className="size-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" aria-label="Excluir lançamento" onClick={() => { if (window.confirm("Excluir este lançamento?")) deleteResult.mutate(r.id); }}><Trash2 className="size-3.5" /></Button>
                  </span> : null}</td>
                </tr>)}</tbody>
              </table>
              <div className="flex flex-wrap gap-2">
                {canPost(k) ? <Button variant="outline" size="sm" onClick={() => setPosting({ kpi: k, period: periodStart(new Date(), k.frequency), value: "", notes: "" })}><Plus className="size-3.5" />Lançar resultado</Button> : null}
                {canEdit ? <Button variant="outline" size="sm" onClick={() => setDraft({ id: k.id, name: k.name, description: k.description ?? "", cost_center_id: k.cost_center_id, responsible_id: k.responsible_id, unit: k.unit, target: String(k.target), frequency: k.frequency })}><Pencil className="size-3.5" />Editar KPI</Button> : null}
                {canEdit ? <Button variant="outline" size="sm" onClick={() => { if (window.confirm(`Excluir o KPI "${k.name}" e todos os lançamentos?`)) deleteKpi.mutate(k.id); }}><Trash2 className="size-3.5" />Excluir</Button> : null}
              </div>
            </div> : null}
          </div>;
        })}
      </div>
    </section>)}

    <Dialog open={!!draft} onOpenChange={(o) => { if (!o) setDraft(null); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{draft?.id ? "Editar KPI" : "Novo KPI"}</DialogTitle></DialogHeader>
        {draft ? <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>Nome</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={120} /></div>
          <div className="grid gap-1.5"><Label>Segmento</Label><SearchableSelect aria-label="Segmento" value={draft.cost_center_id} onChange={(v) => setDraft({ ...draft, cost_center_id: v })} options={segments.map((s) => ({ value: s.id, label: s.code ? `${s.code} ${s.name}` : s.name }))} placeholder="Selecione o centro de custo" /></div>
          <div className="grid gap-1.5"><Label>Responsável</Label><SearchableSelect aria-label="Responsável" value={draft.responsible_id} onChange={(v) => setDraft({ ...draft, responsible_id: v })} options={data.users.map((u) => ({ value: u.id, label: u.full_name }))} placeholder="Selecione o usuário" /></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="grid gap-1.5"><Label>Meta</Label><Input inputMode="decimal" value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Unidade</Label><Input placeholder="%, R$, dias" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} maxLength={12} /></div>
            <div className="grid gap-1.5"><Label>Periodicidade</Label><select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value as KpiFrequency })}>{KPI_FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select></div>
          </div>
          <div className="grid gap-1.5"><Label>Fórmula / descrição</Label><Textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={1000} /></div>
        </div> : null}
        <DialogFooter><Button variant="outline" onClick={() => setDraft(null)}>Cancelar</Button><Button variant="outline" disabled={saveKpi.isPending} onClick={() => draft && saveKpi.mutate(draft)}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={!!posting} onOpenChange={(o) => { if (!o) setPosting(null); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Lançar resultado</DialogTitle></DialogHeader>
        {posting ? <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">{posting.kpi.name} · Meta {fmt(posting.kpi.target, posting.kpi.unit)}</p>
          <div className="grid gap-1.5"><Label>Data de referência ({periodLabel(periodStart(new Date(`${posting.period}T12:00:00`), posting.kpi.frequency), posting.kpi.frequency)})</Label><Input type="date" value={posting.period} onChange={(e) => e.target.value && setPosting({ ...posting, period: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label>Valor {posting.kpi.unit ? `(${posting.kpi.unit})` : ""}</Label><Input inputMode="decimal" value={posting.value} onChange={(e) => setPosting({ ...posting, value: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label>Observação</Label><Textarea rows={2} value={posting.notes} onChange={(e) => setPosting({ ...posting, notes: e.target.value })} maxLength={500} /></div>
        </div> : null}
        <DialogFooter><Button variant="outline" onClick={() => setPosting(null)}>Cancelar</Button><Button variant="outline" disabled={saveResult.isPending} onClick={() => posting && saveResult.mutate(posting)}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
