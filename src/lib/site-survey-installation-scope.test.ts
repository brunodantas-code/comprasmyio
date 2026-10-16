import { test } from "node:test";
import assert from "node:assert/strict";
import { installationApproved, purchasePointFlowLabel } from "./site-survey-installation-scope";
test("aprovações hidráulica e elétrica são independentes e sem aprovação não há compra", () => {
  const rows = [{ point_kind: "luc", point_id: "1", hydraulic_approved: true, electrical_approved: false }];
  assert.equal(installationApproved(rows, "luc", "1", "hydraulic"), true);
  assert.equal(installationApproved(rows, "luc", "1", "electrical"), false);
  assert.equal(installationApproved(rows, "environment", "1", "hydraulic"), false);
  assert.equal(installationApproved([], "luc", "1", "hydraulic"), false);
});
test("vazão individual entre parênteses sem prefixo Outros", () => {
  assert.equal(purchasePointFlowLabel("LUC 56 — Cine Taboão", "Outros — 30 m³/h"), "LUC 56 — Cine Taboão (30 m³/h)");
  assert.equal(purchasePointFlowLabel("Ótica CEMA", null), "Ótica CEMA (Vazão não informada)");
});