import { test } from "node:test";
import assert from "node:assert/strict";
import { unidentifiedLucPoints } from "./site-survey-client-pending";

test("Loja vaga sem LUC entra na conferência; com LUC não, ambiente permanece dispensado", () => {
  const points = [
    { value: "a", label: "Vaga A", pointType: "vacant", lucNumber: "" },
    { value: "b", label: "Vaga B", pointType: "vacant", lucNumber: "123" },
    { value: "c", label: "Ambiente", pointType: "environment", lucNumber: "" },
  ];
  assert.deepEqual(unidentifiedLucPoints(points).map((point) => point.value), ["a"]);
});