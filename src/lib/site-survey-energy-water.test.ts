import { test } from "node:test";
import assert from "node:assert/strict";

import { classifyPointEnergyWater, energyWaterTotals } from "./site-survey-energy-water";

const questions = [
  { id: "q-water", prompt: "Existe hidrômetro na loja?" },
  { id: "q-energy", prompt: "Existe ponto de elétrica próximo ao hidrômetro?" },
  { id: "q-energy-plain", prompt: "Existe ponto de elétrica próximo?" },
  { id: "q-other", prompt: "Condição do registro?" },
];

test("Ponto com hidrômetro e elétrica é classificado como Água + Energia", () => {
  assert.equal(classifyPointEnergyWater(new Map<string, unknown>([["q-water", "Sim"], ["q-energy", { value: "Sim" }]]), questions), "both");
});

test("Hidrômetro sem elétrica é Só Água; elétrica sem hidrômetro é Só Energia", () => {
  assert.equal(classifyPointEnergyWater(new Map([["q-water", "sim"], ["q-energy", "Não"]]), questions), "water");
  assert.equal(classifyPointEnergyWater(new Map([["q-water", "Não"], ["q-energy-plain", "Sim"]]), questions), "energy");
});

test("Respostas ausentes, 'não informado' e perguntas sem relação não classificam o ponto", () => {
  assert.equal(classifyPointEnergyWater(new Map(), questions), null);
  assert.equal(classifyPointEnergyWater(new Map([["q-water", "Não informado"], ["q-energy", "não"]]), questions), null);
  assert.equal(classifyPointEnergyWater(new Map([["q-other", "Sim"]]), questions), null);
});

test("Lojas vagas e pontos cancelados ficam fora dos totalizadores", () => {
  const responses = [
    { visit_luc_id: "l1", question_id: "q-water", answer: "Sim" },
    { visit_luc_id: "l1", question_id: "q-energy", answer: "Sim" },
    { visit_luc_id: "l2", question_id: "q-water", answer: "Sim" },
    { visit_environment_id: "e1", question_id: "q-energy-plain", answer: "Sim" },
  ];
  const points = [
    { kind: "luc", id: "l1", pointType: "shop", completionStatus: "concluida" },
    { kind: "luc", id: "l2", pointType: "shop", completionStatus: "cancelada" },
    { kind: "luc", id: "l3", pointType: "vacant", completionStatus: "concluida" },
    { kind: "environment", id: "e1", pointType: "environment", completionStatus: "pendente" },
  ];
  assert.deepEqual(energyWaterTotals(points, responses, questions), { water: 0, energy: 1, both: 1, waterAll: 1, energyAll: 2 });
});

test("Totais de aprovação: Energia 65 e Água 47 com 21 só energia, 3 só água e 44 dois aprovados", async () => {
  const { approvalEnergyWaterTotals } = await import("./site-survey-energy-water");
  const r = approvalEnergyWaterTotals([
    { point_kind: "luc", point_id: "1", hydraulic_approved: true, electrical_approved: true },
    { point_kind: "luc", point_id: "2", hydraulic_approved: true, electrical_approved: false },
    { point_kind: "luc", point_id: "3", hydraulic_approved: false, electrical_approved: true },
    { point_kind: "luc", point_id: "4", hydraulic_approved: false, electrical_approved: false },
    { point_kind: "luc", point_id: "9", hydraulic_approved: true, electrical_approved: true },
  ], new Set(["luc:1", "luc:2", "luc:3", "luc:4"]));
  assert.deepEqual(r, { water: 1, energy: 1, both: 1, waterAll: 2, energyAll: 2 });
});

test("approval totals match user example: Energia 65, Água 47 with 21 só energia, 3 só água, 44 both", async () => {
  const { approvalEnergyWaterTotals } = await import("./site-survey-energy-water");
  const approvals = [
    ...Array.from({ length: 21 }, (_, i) => ({ point_kind: "luc", point_id: `e${i}`, hydraulic_approved: false, electrical_approved: true })),
    ...Array.from({ length: 3 }, (_, i) => ({ point_kind: "luc", point_id: `a${i}`, hydraulic_approved: true, electrical_approved: false })),
    ...Array.from({ length: 44 }, (_, i) => ({ point_kind: "luc", point_id: `b${i}`, hydraulic_approved: true, electrical_approved: true })),
  ];
  const r = approvalEnergyWaterTotals(approvals, new Set(approvals.map((a) => `${a.point_kind}:${a.point_id}`)));
  assert.equal(r.energy, 21);
  assert.equal(r.water, 3);
  assert.equal(r.both, 44);
  assert.equal(r.energyAll, 65);
  assert.equal(r.waterAll, 47);
});
