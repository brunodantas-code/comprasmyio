import { test } from "node:test";
import assert from "node:assert/strict";

import { surveyPointTotals, surveyPointTypeLabel, requiresSurveyLuc, requiresSurveyFacade, hasSurveyLucPending } from "./site-survey-point-type";

test("Loja Vaga exige LUC, mas não exige fachada; loja comum mantém LUC opcional", () => {
  assert.equal(requiresSurveyLuc("vacant"), true);
  assert.equal(requiresSurveyFacade("vacant"), false);
  assert.equal(requiresSurveyLuc("shop"), false);
  assert.equal(requiresSurveyLuc("environment"), false);
});

test("Quiosque vago exige LUC, dispensa fachada e tem rótulo próprio", () => {
  assert.equal(requiresSurveyLuc("vacant_kiosk"), true);
  assert.equal(requiresSurveyFacade("vacant_kiosk"), false);
  assert.equal(surveyPointTypeLabel("vacant_kiosk"), "Quiosque vago");
  assert.equal(surveyPointTypeLabel("kiosk"), "Quiosque");
});

test("LUC vazio gera pendência para lojas e quiosques sem torná-lo obrigatório para concluir", () => {
  assert.equal(hasSurveyLucPending("shop", ""), true);
  assert.equal(hasSurveyLucPending("kiosk", "  "), true);
  assert.equal(requiresSurveyLuc("shop"), false);
  assert.equal(requiresSurveyLuc("kiosk"), false);
});

test("Ambientes não geram pendência de LUC", () => {
  assert.equal(hasSurveyLucPending("environment", null), false);
});

test("LUC informado, inclusive Não identificado, não gera pendência", () => {
  assert.equal(hasSurveyLucPending("shop", "Não identificado"), false);
  assert.equal(hasSurveyLucPending("kiosk", "102"), false);
});

test("Totaliza lojas, quiosques e ambientes pela classificação efetiva", () => {
  const totals = surveyPointTotals([
    { classification_type: "shop", point_type: "shop" },
    { classification_type: null, point_type: "shop" },
    { classification_type: null, point_type: "kiosk" },
    { classification_type: "environment", point_type: "shop" },
  ]);
  assert.deepEqual(totals, { shop: 2, kiosk: 1, environment: 1, vacant: 0, vacant_kiosk: 0 });
});

test("Loja vaga é contada à parte e não aumenta a quantidade de lojas", () => {
  const totals = surveyPointTotals([
    { classification_type: "shop", point_type: "shop" },
    { classification_type: "vacant", point_type: "shop" },
  ]);
  assert.equal(totals.shop, 1);
  assert.equal(totals.vacant, 1);
});

test("Cadastro vazio totaliza zero em todos os tipos", () => {
  assert.deepEqual(surveyPointTotals([]), { shop: 0, kiosk: 0, environment: 0, vacant: 0, vacant_kiosk: 0 });
});

test("Quiosque vago é contado à parte, separado de quiosques e lojas vagas", () => {
  const totals = surveyPointTotals([
    { classification_type: "kiosk", point_type: "kiosk" },
    { classification_type: "vacant_kiosk", point_type: "kiosk" },
    { classification_type: "vacant", point_type: "shop" },
  ]);
  assert.deepEqual(totals, { shop: 0, kiosk: 1, environment: 0, vacant: 1, vacant_kiosk: 1 });
});
