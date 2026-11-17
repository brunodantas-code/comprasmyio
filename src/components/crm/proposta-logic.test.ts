import { describe, expect, it } from "vitest";
import { bloqueioEnvio, parcelasTexto, parseCondicoes, proximaVersao, renderTemplate, totaisDe } from "./proposta-logic";

const item = (q: number, s: number, m: number, nome = "Medidor") => ({ categoria: "produto_myio", nome, modelo: null, unidade: "un", quantidade: q, preco_setup_unit: s, preco_mensal_unit: m, ambiente: null, observacao: null });

describe("propostas do CRM", () => {
  it("soma setup e mensalidade por quantidade", () => {
    expect(totaisDe([item(10, 450, 39.9), item(2, 1200, 0)])).toEqual({ setup: 6900, mensal: 399 });
  });
  it("bloqueia envio com pendência aberta ou sem itens", () => {
    expect(bloqueioEnvio([item(1, 1, 1)], [{ id: "1", texto: "Confirmar quantidade", status: "aberta", resolucao: null }])).toMatch(/pendência/);
    expect(bloqueioEnvio([], [])).toMatch(/ao menos um item/);
    expect(bloqueioEnvio([item(1, 1, 1)], [{ id: "1", texto: "x", status: "nao_se_aplica", resolucao: null }])).toBeNull();
  });
  it("texto das parcelas do setup", () => {
    expect(parcelasTexto(9000, 3, (n) => `R$ ${n}`)).toBe("3 parcelas de R$ 3000");
    expect(parcelasTexto(9000, 1, String)).toBe("parcela única");
  });
  it("condições inválidas voltam ao padrão 36 meses / 3 parcelas / 30 dias", () => {
    expect(parseCondicoes({ contrato_meses: 0, parcelas_setup: "x" })).toMatchObject({ contrato_meses: 36, parcelas_setup: 3, validade_dias: 30 });
  });
  it("substitui variáveis do modelo e numera a próxima versão", () => {
    expect(renderTemplate("A MYIO apresenta a {{empresa}} {{x}} sua proposta", { empresa: "Shopping Leblon" })).toBe("A MYIO apresenta a Shopping Leblon sua proposta");
    expect(proximaVersao([1, 3, 2])).toBe(4);
  });
});
