/**
 * Motor de custeio e rateio locação/serviços — funções puras, sem I/O.
 * Reproduz a aba "Projeto" da planilha "MYIO - Calculadora de Rateio e Memória de Cálculo".
 * Verificação: scripts/teste-motor.ts (bate centavo a centavo com o exemplo Boulevard Mogi-Guaçu).
 */

export type ParametrosMotor = {
  multiplicador_margem_locacao: number; // 1,8
  teto_margem_servicos: number;         // 3,0
  aliquota_iss_estimada: number;        // 5 (%)
  faixa_locacao_min: number;            // 1,5
  faixa_locacao_max: number;            // 2,5
  circuitos_por_central: number;        // 400
};

export const PARAMETROS_PADRAO: ParametrosMotor = {
  multiplicador_margem_locacao: 1.8,
  teto_margem_servicos: 3,
  aliquota_iss_estimada: 5,
  faixa_locacao_min: 1.5,
  faixa_locacao_max: 2.5,
  circuitos_por_central: 400,
};

export type ItemInstalacao = {
  nome: string;
  quantidade: number;
  /** custo capitalizável unitário do kit; null = item sem kit/custo (entra com zero e é sinalizado) */
  custo_capitalizavel_unit: number | null;
  /** produto do kit, para contar circuitos de borda (CENTRAL não é borda) */
  produto: "3F" | "SWITCH" | "REMOTE" | "CENTRAL" | null;
  /** realocação de dispositivo já instalado: sem capex, sem circuito novo, mensalidade 0 deliberada */
  modo?: "fornecimento" | "realocacao";
};

export type InputsMemoria = {
  contrato_meses: number;
  mensalidade: number;      // total_mensal da proposta
  preco_setup: number;      // total_setup da proposta
  frete_site: number;
  horas_implantacao: number;
  custo_hora: number;
  mobilizacao: number;
  custo_mensal_servir: number;
  /** centrais já instaladas no site (upsell): contam para o teste 4 */
  centrais_existentes?: number;
  multiplicador_locacao?: number;   // override dos parâmetros
  teto_margem_servicos?: number;
  aliquota_iss?: number;
};

export type Teste = { id: 1 | 2 | 3 | 4; nome: string; status: "ok" | "atencao" | "alerta"; valor: number | null; mensagem: string };

export type ResultadoMemoria = {
  /** true quando todos os itens são realocação: sem capex, sem rateio, testes 1 e 4 suprimidos */
  realocacao: boolean;
  capex_kits: number;
  capex_site: number;
  circuitos_borda: number;
  centrais_necessarias: number;
  centrais_informadas: number;
  itens_sem_kit: number;
  custo_setup_informado: boolean;
  custo_setup_estimado: number | null;
  margem_setup: number | null;
  recuperacao_antecipada: number;
  investimento_liquido: number;
  amortizacao_mensal: number;
  parcela_locacao: number;
  parcela_servicos: number;
  rateio_locacao_pct: number;
  rateio_servicos_pct: number;
  iss_estimado_mensal: number;
  economia_iss_mensal: number;
  testes: Teste[];
};

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calcularMemoria(itens: ItemInstalacao[], inp: InputsMemoria, par: ParametrosMotor = PARAMETROS_PADRAO): ResultadoMemoria {
  const mult = inp.multiplicador_locacao ?? par.multiplicador_margem_locacao;
  const teto = inp.teto_margem_servicos ?? par.teto_margem_servicos;
  const iss = (inp.aliquota_iss ?? par.aliquota_iss_estimada) / 100;

  // B. lista de instalação — itens em realocação não entram no capex nem nos circuitos (dispositivos já instalados)
  const realocacao = itens.length > 0 && itens.every((i) => i.modo === "realocacao");
  const fornecidos = itens.filter((i) => i.modo !== "realocacao");
  const capex_kits = r2(fornecidos.reduce((s, i) => s + i.quantidade * (i.custo_capitalizavel_unit ?? 0), 0));
  const capex_site = r2(capex_kits + (inp.frete_site || 0));
  const circuitos_borda = fornecidos.filter((i) => i.produto !== "CENTRAL").reduce((s, i) => s + i.quantidade, 0);
  const centrais_novas = fornecidos.filter((i) => i.produto === "CENTRAL").reduce((s, i) => s + i.quantidade, 0);
  const centrais_informadas = centrais_novas + (inp.centrais_existentes ?? 0);
  const centrais_necessarias = circuitos_borda === 0 ? 0 : Math.ceil(circuitos_borda / par.circuitos_por_central);
  const itens_sem_kit = fornecidos.filter((i) => i.custo_capitalizavel_unit === null).length;

  // C. setup — custo "não informado" quando horas e mobilização são zero
  const custo_setup_bruto = r2((inp.horas_implantacao || 0) * (inp.custo_hora || 0) + (inp.mobilizacao || 0));
  const custo_setup_informado = custo_setup_bruto > 0;
  const custo_setup_estimado = custo_setup_informado ? custo_setup_bruto : null;
  const margem_setup = custo_setup_informado ? r2(inp.preco_setup / custo_setup_bruto * 10000) / 10000 : null;
  const recuperacao_antecipada = custo_setup_informado ? r2(Math.max(0, inp.preco_setup - custo_setup_bruto * teto)) : 0;
  const investimento_liquido = r2(Math.max(0, capex_site - recuperacao_antecipada));

  // D. rateio
  const prazo = inp.contrato_meses > 0 ? inp.contrato_meses : 0;
  const amortizacao_exata = prazo > 0 ? investimento_liquido / prazo : 0;   // sem arredondar, como a planilha
  const amortizacao_mensal = r2(amortizacao_exata);
  const parcela_locacao = r2(Math.min(inp.mensalidade, amortizacao_exata * mult));
  const parcela_servicos = r2(inp.mensalidade - parcela_locacao);
  const rateio_locacao_pct = inp.mensalidade > 0 ? r2(parcela_locacao / inp.mensalidade * 10000) / 100 : 0;
  const rateio_servicos_pct = inp.mensalidade > 0 ? r2(100 - rateio_locacao_pct) : 0;
  const iss_estimado_mensal = r2(parcela_servicos * iss);
  const economia_iss_mensal = r2(parcela_locacao * iss);

  // E. testes (não bloqueantes). Em realocação total: só o teste 3 (margem do setup sobre o custo de serviço) faz sentido;
  // o teste 2 fica como "não se aplica" (MRR sem alteração) e os testes 1 e 4 são suprimidos.
  const testes: Teste[] = [];
  if (realocacao) {
    testes.push({ id: 2, nome: "Serviços × custo de suporte", status: "atencao", valor: null, mensagem: "Realocação — sem alteração de MRR; não se aplica." });
    testes.push(
      margem_setup === null
        ? { id: 3, nome: "Margem do setup", status: "atencao", valor: null, mensagem: "Custo de setup não informado (horas e mobilização zerados)." }
        : margem_setup < 1
          ? { id: 3, nome: "Margem do setup", status: "alerta", valor: margem_setup, mensagem: `${margem_setup.toFixed(2)}x — setup abaixo do custo de serviço` }
          : { id: 3, nome: "Margem do setup", status: "ok", valor: margem_setup, mensagem: `${margem_setup.toFixed(2)}x sobre o custo de serviço (desinstalação, realocação e reativação)` },
    );
    return {
      realocacao, capex_kits: 0, capex_site: 0, circuitos_borda: 0, centrais_necessarias: 0, centrais_informadas, itens_sem_kit: 0,
      custo_setup_informado, custo_setup_estimado, margem_setup, recuperacao_antecipada: 0, investimento_liquido: 0, amortizacao_mensal: 0,
      parcela_locacao: 0, parcela_servicos: r2(inp.mensalidade), rateio_locacao_pct: 0, rateio_servicos_pct: inp.mensalidade > 0 ? 100 : 0, iss_estimado_mensal: r2(inp.mensalidade * iss), economia_iss_mensal: 0, testes,
    };
  }
  const mult_efetivo = amortizacao_exata > 0 ? r2(parcela_locacao / amortizacao_exata * 100) / 100 : null;
  testes.push(
    mult_efetivo === null
      ? { id: 1, nome: "Múltiplo da locação sobre a amortização", status: "atencao", valor: null, mensagem: "Sem investimento a amortizar (CAPEX zero ou totalmente recuperado no setup)." }
      : mult_efetivo >= par.faixa_locacao_min && mult_efetivo <= par.faixa_locacao_max
        ? { id: 1, nome: "Múltiplo da locação sobre a amortização", status: "ok", valor: mult_efetivo, mensagem: `${mult_efetivo.toFixed(2)}x — dentro da faixa defensável (${par.faixa_locacao_min}–${par.faixa_locacao_max})` }
        : { id: 1, nome: "Múltiplo da locação sobre a amortização", status: "alerta", valor: mult_efetivo, mensagem: `${mult_efetivo.toFixed(2)}x — fora da faixa ${par.faixa_locacao_min}–${par.faixa_locacao_max}${mult_efetivo < mult ? " (mensalidade limita a locação)" : ""}` },
  );
  const cob = inp.custo_mensal_servir > 0 ? r2(parcela_servicos / inp.custo_mensal_servir * 100) / 100 : null;
  testes.push(
    cob === null
      ? { id: 2, nome: "Serviços × custo de suporte", status: "atencao", valor: null, mensagem: "Custo mensal de suporte não informado." }
      : cob >= 1
        ? { id: 2, nome: "Serviços × custo de suporte", status: "ok", valor: cob, mensagem: `${cob.toFixed(2)}x — serviços cobrem o custo de suporte com margem` }
        : { id: 2, nome: "Serviços × custo de suporte", status: "alerta", valor: cob, mensagem: `${cob.toFixed(2)}x — parcela de serviços abaixo do custo mensal de suporte` },
  );
  testes.push(
    margem_setup === null
      ? { id: 3, nome: "Margem do setup", status: "atencao", valor: null, mensagem: "Custo de setup não informado (horas e mobilização zerados)." }
      : margem_setup < 1
        ? { id: 3, nome: "Margem do setup", status: "alerta", valor: margem_setup, mensagem: `${margem_setup.toFixed(2)}x — setup abaixo do custo` }
        : margem_setup > teto
          ? { id: 3, nome: "Margem do setup", status: "atencao", valor: margem_setup, mensagem: `${margem_setup.toFixed(2)}x — acima do teto ${teto}x; excedente recupera CAPEX (R$ ${recuperacao_antecipada.toFixed(2)})` }
          : { id: 3, nome: "Margem do setup", status: "ok", valor: margem_setup, mensagem: `${margem_setup.toFixed(2)}x — margem de serviço plausível` },
  );
  testes.push(
    centrais_necessarias === 0
      ? { id: 4, nome: "Centrais × circuitos", status: "atencao", valor: centrais_informadas, mensagem: "Nenhum circuito de borda na lista." }
      : centrais_informadas >= centrais_necessarias
        ? { id: 4, nome: "Centrais × circuitos", status: "ok", valor: centrais_informadas, mensagem: `${centrais_informadas} central(is)${inp.centrais_existentes ? ` (${inp.centrais_existentes} já existente(s))` : ""} para ${circuitos_borda} circuitos (mín. ${centrais_necessarias})` }
        : { id: 4, nome: "Centrais × circuitos", status: "alerta", valor: centrais_informadas, mensagem: `${centrais_informadas} central(is) informada(s); ${circuitos_borda} circuitos exigem ${centrais_necessarias}` },
  );

  return {
    realocacao, capex_kits, capex_site, circuitos_borda, centrais_necessarias, centrais_informadas, itens_sem_kit,
    custo_setup_informado, custo_setup_estimado, margem_setup, recuperacao_antecipada, investimento_liquido, amortizacao_mensal,
    parcela_locacao, parcela_servicos, rateio_locacao_pct, rateio_servicos_pct, iss_estimado_mensal, economia_iss_mensal, testes,
  };
}

/**
 * Custo capitalizável de um kit (Fase 5c): custo-base do produto MYIO + Σ(insumo.preco × quantidade).
 * Aceita a composição (`{ insumos: [{preco, quantidade}] }`), a soma pronta (`{ custo_insumos }`) ou o formato legado (`{ custo_3os_imp, custo_3os_nac }`, equivalente a dois insumos × 1).
 */
export function custoCapitalizavel(
  base: { custo_base: number } | { componentes_myio: number; mod_assembling: number; cif: number; pre_setup_fabrica: number },
  kit: { custo_3os_imp: number; custo_3os_nac: number } | { custo_insumos: number } | { insumos: { preco: number; quantidade: number }[] },
) {
  const cb = "custo_base" in base ? base.custo_base : base.componentes_myio + base.mod_assembling + base.cif + base.pre_setup_fabrica;
  const insumos = "insumos" in kit ? kit.insumos.reduce((s, i) => s + i.preco * i.quantidade, 0) : "custo_insumos" in kit ? kit.custo_insumos : kit.custo_3os_imp + kit.custo_3os_nac;
  return r2(cb + insumos);
}
