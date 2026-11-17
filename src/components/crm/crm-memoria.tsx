import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Custeio } from "./crm-custos";
import { itensParaMotor } from "./custeio-logic";
import { calcularMemoria } from "./motor-custeio";
import type { ItemProposta } from "./proposta-logic";

type Inp = { frete_site: number; horas_implantacao: number; custo_hora: number; mobilizacao: number; custo_mensal_servir: number; centrais_existentes: number };
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Admin-only cost memory of a proposal: CAPEX, setup margin, rental/services split and the four sanity tests. */
export function MemoriaCalculo({ propostaId, itens, contratoMeses, totalSetup, totalMensal, custeio }: { propostaId: string; itens: ItemProposta[]; contratoMeses: number; totalSetup: number; totalMensal: number; custeio: Custeio }) {
  const qc = useQueryClient();
  const saved = useQuery({ queryKey: ["crm-memoria", propostaId], queryFn: async () => (await supabase.from("crm_proposta_memoria").select("*").eq("proposta_id", propostaId).maybeSingle()).data });
  const def: Inp = { frete_site: 0, horas_implantacao: 0, custo_hora: custeio.par.custo_hora_padrao, mobilizacao: 0, custo_mensal_servir: custeio.par.custo_mensal_servir_padrao, centrais_existentes: 0 };
  const [inp, setInp] = useState<Inp>(def);
  useEffect(() => { const s = saved.data; if (s) setInp({ frete_site: Number(s.frete_site), horas_implantacao: Number(s.horas_implantacao), custo_hora: Number(s.custo_hora), mobilizacao: Number(s.mobilizacao), custo_mensal_servir: Number(s.custo_mensal_servir), centrais_existentes: s.centrais_existentes }); }, [saved.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const r = useMemo(() => calcularMemoria(itensParaMotor(itens, custeio.custos, custeio.kits, custeio.bases, custeio.lote), { contrato_meses: contratoMeses, mensalidade: totalMensal, preco_setup: totalSetup, ...inp }, custeio.par), [itens, custeio, contratoMeses, totalMensal, totalSetup, inp]);
  async function save() {
    const x = await supabase.from("crm_proposta_memoria").upsert({ proposta_id: propostaId, ...inp, resultado: r as never, lote_codigo: custeio.lote?.codigo ?? null, calculado_em: new Date().toISOString() });
    if (x.error) return toast.error("Não foi possível salvar a memória de cálculo.");
    await qc.invalidateQueries({ queryKey: ["crm-memoria", propostaId] }); toast.success("Memória de cálculo salva");
  }
  const F: [keyof Inp, string][] = [["frete_site", "Frete do site (R$)"], ["horas_implantacao", "Horas de implantação"], ["custo_hora", "Custo da hora (R$)"], ["mobilizacao", "Mobilização (R$)"], ["custo_mensal_servir", "Custo mensal de suporte (R$)"], ["centrais_existentes", "Centrais já instaladas"]];
  const KPI: [string, string][] = [["CAPEX dos kits", brl(r.capex_kits)], ["CAPEX do site", brl(r.capex_site)], ["Custo do setup", r.custo_setup_estimado === null ? "—" : brl(r.custo_setup_estimado)], ["Margem do setup", r.margem_setup === null ? "—" : `${r.margem_setup.toFixed(2)}x`], ["Recuperação no setup", brl(r.recuperacao_antecipada)], ["Investimento líquido", brl(r.investimento_liquido)], ["Amortização mensal", brl(r.amortizacao_mensal)], ["Parcela de locação", `${brl(r.parcela_locacao)} (${r.rateio_locacao_pct}%)`], ["Parcela de serviços", `${brl(r.parcela_servicos)} (${r.rateio_servicos_pct}%)`], ["ISS estimado/mês", brl(r.iss_estimado_mensal)], ["Economia de ISS/mês", brl(r.economia_iss_mensal)], ["Circuitos / centrais", `${r.circuitos_borda} / ${r.centrais_informadas} (mín. ${r.centrais_necessarias})`]];
  return <section className="space-y-3 rounded-md border border-border p-4">
    <div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-medium">Memória de cálculo</h2><span className="text-xs text-muted-foreground">Somente Admin do ERP · lote {custeio.lote ? `${custeio.lote.codigo}${custeio.lote.status === "exemplo" ? " (exemplo)" : ""}` : "nenhum"}{saved.data ? ` · salva em ${new Date(saved.data.calculado_em).toLocaleString("pt-BR")}` : ""}</span>
      <Button className="ml-auto" variant="ghost" size="icon" aria-label="Salvar" title="Salvar memória de cálculo" onClick={save}><Save /></Button></div>
    {r.itens_sem_kit > 0 && <p className="text-xs text-destructive">{r.itens_sem_kit} item(ns) sem custo: vincule-os a um item da tabela de preços com kit ou custo manual.</p>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">{F.map(([k, l]) => <div key={k} className="space-y-1"><Label htmlFor={`mem-${k}`}>{l}</Label><Input id={`mem-${k}`} type="number" min={0} step="0.01" value={inp[k]} onChange={(e) => { const v = Number(e.target.value.replace(",", ".")); setInp({ ...inp, [k]: Number.isFinite(v) && v >= 0 ? v : 0 }); }} /></div>)}</div>
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">{KPI.map(([l, v]) => <div key={l}><dt className="text-xs text-muted-foreground">{l}</dt><dd>{v}</dd></div>)}</dl>
    <ul className="space-y-1">{r.testes.map((t) => <li key={t.id} className="flex flex-wrap items-center gap-2 text-sm"><Badge variant={t.status === "ok" ? "default" : t.status === "alerta" ? "destructive" : "outline"}>{t.status === "ok" ? "OK" : t.status === "alerta" ? "Alerta" : "Atenção"}</Badge><span className="font-medium">{t.id}. {t.nome}</span><span className="text-muted-foreground">{t.mensagem}</span></li>)}</ul>
  </section>;
}
