import { test } from "node:test";
import assert from "node:assert/strict";

import { surveyPointTotals } from "./site-survey-point-type";

test("Totaliza lojas, quiosques e ambientes pela classificação efetiva", () => {
  const totals = surveyPointTotals([
    { classification_type: "shop", point_type: "shop" },
    { classification_type: null, point_type: "shop" },
    { classification_type: null, point_type: "kiosk" },
    { classification_type: "environment", point_type: "shop" },
  ]);
  assert.deepEqual(totals, { shop: 2, kiosk: 1, environment: 1, vacant: 0 });
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
  assert.deepEqual(surveyPointTotals([]), { shop: 0, kiosk: 0, environment: 0, vacant: 0 });
});
