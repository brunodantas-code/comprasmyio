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
test("duplicateNamePoints agrupa mesmo nome com LUCs diferentes", async () => {
  const { duplicateNamePoints } = await import("@/lib/site-survey-client-pending");
  const points = [
    { value: "a", label: "Vivara", pointType: "shop", lucNumber: "101", name: "Vivara" },
    { value: "b", label: "Vivara", pointType: "shop", lucNumber: "202", name: "Vivara" },
    { value: "c", label: "Vivara", pointType: "shop", lucNumber: "101", name: "Vivara" },
    { value: "d", label: "Cacau Show", pointType: "kiosk", lucNumber: "300", name: "Cacau Show" },
    { value: "e", label: "Ambiente", pointType: "environment", name: "Vivara" },
  ];
  const groups = duplicateNamePoints(points);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].map((point) => point.value), ["a", "b"]);
});
