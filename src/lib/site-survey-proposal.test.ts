import { test } from "node:test";
import assert from "node:assert/strict";
import { proposalScopeSchema, validateProposalPdf } from "./site-survey-proposal";
test("proposta exige PDF real não vazio", async () => {
  await assert.rejects(validateProposalPdf(new Blob([])), /não vazio/);
  await assert.rejects(validateProposalPdf(new Blob(["not a PDF"])), /PDF válido/);
  await validateProposalPdf(new Blob(["%PDF-1.7\n"]));
});
test("quantidades da proposta não identificadas continuam nulas, valores negativos e fracionários são rejeitados", () => {
  assert.deepEqual(proposalScopeSchema.parse({ hydraulic_shops: 50, hydraulic_general: 1, electrical: 185, evidence: "Proposta aprovada" }), { hydraulic_shops: 50, hydraulic_general: 1, electrical: 185, evidence: "Proposta aprovada" });
  assert.equal(proposalScopeSchema.parse({ hydraulic_shops: null, hydraulic_general: null, electrical: null, evidence: "Não identificado" }).electrical, null);
  assert.equal(proposalScopeSchema.safeParse({ hydraulic_shops: -1, hydraulic_general: 0, electrical: 185, evidence: "" }).success, false);
  assert.equal(proposalScopeSchema.safeParse({ hydraulic_shops: 1.5, hydraulic_general: 0, electrical: 185, evidence: "" }).success, false);
});