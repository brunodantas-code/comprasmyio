import { test } from "node:test";
import assert from "node:assert/strict";
import { proposalGroupQuantities, proposalOtherEnergyBreakdown, proposalOtherEnergyText, proposalScopeSchema, proposalShopKioskComparison, validateProposalPdf } from "./site-survey-proposal";
test("proposta exige PDF real não vazio", async () => {
  await assert.rejects(validateProposalPdf(new Blob([])), /não vazio/);
  await assert.rejects(validateProposalPdf(new Blob(["not a PDF"])), /PDF válido/);
  await validateProposalPdf(new Blob(["%PDF-1.7\n"]));
});
test("Taboão: 50 pontos de água nas lojas/quiosques e 1 entrada, com saldo nos demais ambientes", () => {
  const groups = proposalGroupQuantities({ hydraulic_shops: 50, hydraulic_general: 7, electrical: 227, scope_breakdown: { hydraulic_entry: 1, electrical_shops: 185, electrical_entry: 0 } });
  assert.deepEqual(groups.map((group) => group.water), [50, 1, 6]);
});
test("Taboão: 185 pontos de energia nas lojas/quiosques, saldo nos demais ambientes", () => {
  const groups = proposalGroupQuantities({ hydraulic_shops: 50, hydraulic_general: 7, electrical: 227, scope_breakdown: { hydraulic_entry: 1, electrical_shops: 185, electrical_entry: 0 } });
  assert.deepEqual(groups.map((group) => group.energy), [185, 0, 42]);
});
test("sem detalhamento de proposta não inventa distribuição de ambientes", () => {
  const groups = proposalGroupQuantities({ hydraulic_shops: 50, hydraulic_general: 7, electrical: 227 });
  assert.equal(groups[1]?.water, null);
  assert.equal(groups[2]?.water, null);
  assert.equal(groups[2]?.energy, null);
});
test("quantidades da proposta não identificadas continuam nulas, valores negativos e fracionários são rejeitados", () => {
  assert.deepEqual(proposalScopeSchema.parse({ hydraulic_shops: 50, hydraulic_general: 1, electrical: 185, evidence: "Proposta aprovada" }), { hydraulic_shops: 50, hydraulic_general: 1, electrical: 185, evidence: "Proposta aprovada" });
  assert.equal(proposalScopeSchema.parse({ hydraulic_shops: null, hydraulic_general: null, electrical: null, evidence: "Não identificado" }).electrical, null);
  assert.equal(proposalScopeSchema.safeParse({ hydraulic_shops: -1, hydraulic_general: 0, electrical: 185, evidence: "" }).success, false);
  assert.equal(proposalScopeSchema.safeParse({ hydraulic_shops: 1.5, hydraulic_general: 0, electrical: 185, evidence: "" }).success, false);
});
test("compara lojas/quiosques da proposta com aprovados no cadastro", () => {
  const scope = { hydraulic_shops: 50, hydraulic_general: 7, electrical: 227, scope_breakdown: { hydraulic_entry: 1, electrical_shops: 185, electrical_entry: 0 } };
  const ok = proposalShopKioskComparison(scope, 50, 185);
  assert.deepEqual(ok.map((c) => c.matches), [true, true]);
  const divergent = proposalShopKioskComparison(scope, 49, 190);
  assert.deepEqual(divergent.map((c) => ({ p: c.proposal, a: c.approved, m: c.matches })), [{ p: 50, a: 49, m: false }, { p: 185, a: 190, m: false }]);
  assert.deepEqual(proposalShopKioskComparison({ hydraulic_shops: null, hydraulic_general: null, electrical: null }, 0, 0), []);
});
test("detalhamento elétrico dos demais ambientes da proposta do Taboão", () => {
  const scope = proposalScopeSchema.parse({ hydraulic_shops: 50, hydraulic_general: 7, electrical: 227, evidence: "Proposta", scope_breakdown: { hydraulic_entry: 1, electrical_shops: 185, electrical_entry: 0, electrical_others: { transformadores: 7, casas_de_maquinas: 15, geradores: 3, bombas_hidraulicas: 7, bombas_de_incendio: 6, elevadores: 4 } } });
  const breakdown = proposalOtherEnergyBreakdown(scope);
  assert.deepEqual(breakdown.map((item) => item.label), ["Transformadores", "Casas de Máquinas", "Geradores", "Bombas Hidráulicas", "Bombas de Incêndio", "Elevadores"]);
  assert.equal(breakdown.reduce((sum, item) => sum + item.count, 0), 42);
  assert.equal(proposalOtherEnergyText(scope), "7 Transformadores · 15 Casas de Máquinas · 3 Geradores · 7 Bombas Hidráulicas · 6 Bombas de Incêndio · 4 Elevadores");
  assert.deepEqual(proposalOtherEnergyBreakdown({ scope_breakdown: { hydraulic_entry: 1, electrical_shops: 185, electrical_entry: 0 } }), []);
  assert.equal(proposalOtherEnergyText({ scope_breakdown: { hydraulic_entry: 1, electrical_shops: 185, electrical_entry: 0, electrical_others: { transformadores: null, casas_de_maquinas: 2, geradores: null, bombas_hidraulicas: null, bombas_de_incendio: null, elevadores: null } } }), "2 Casas de Máquinas");
});