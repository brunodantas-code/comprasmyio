import { describe, expect, it } from "vitest";
import { custoEfetivo, custoKit, loteVigente, precoSugerido, type CustoBase, type Kit, type Lote } from "./custeio-logic";
import { calcularMemoria } from "./motor-custeio";

const lotes: Lote[] = [
  { id: "a", codigo: "EX", descricao: null, status: "exemplo", vigencia_inicio: "2026-01-01", vigencia_fim: null },
  { id: "b", codigo: "V1", descricao: null, status: "validado", vigencia_inicio: "2025-06-01", vigencia_fim: null },
  { id: "c", codigo: "OLD", descricao: null, status: "encerrado", vigencia_inicio: "2026-05-01", vigencia_fim: null },
];
const bases: CustoBase[] = [{ lote_id: "b", produto: "3F", componentes_myio: 100, mod_assembling: 20, cif: 10, pre_setup_fabrica: 5 }];
const kit: Kit = { id: "k", nome: "Kit 3F", grupo: "Telemetria de Energia", produto: "3F", custo_3os_imp: 30, custo_3os_nac: 15, ativo: true };

describe("custeio do CRM", () => {
  it("lote validado vence o de exemplo; encerrado nunca vale", () => { expect(loteVigente(lotes, "2026-11-17")?.codigo).toBe("V1"); });
  it("custo do kit = custo-base do produto + terceiros", () => { expect(custoKit(kit, bases, lotes[1])).toBe(180); });
  it("kit vence custo manual", () => { expect(custoEfetivo({ item_id: "i", kit_id: "k", custo_manual: 50, markup_percentual: 65 }, [kit], bases, lotes[1])).toEqual({ valor: 180, fonte: "kit" }); });
  it("preço sugerido aplica o markup", () => { expect(precoSugerido(100, 65)).toBe(165); });
  it("centrais: 400 circuitos por central", () => {
    const r = calcularMemoria([{ nome: "3F", quantidade: 401, custo_capitalizavel_unit: 100, produto: "3F" }], { contrato_meses: 36, mensalidade: 5000, preco_setup: 0, frete_site: 0, horas_implantacao: 0, custo_hora: 0, mobilizacao: 0, custo_mensal_servir: 0 });
    expect(r.centrais_necessarias).toBe(2); expect(r.capex_kits).toBe(40100);
  });
});
