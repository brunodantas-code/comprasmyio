import { test } from "node:test";
import assert from "node:assert/strict";
import { environmentLocation } from "./site-survey-environment-location";

test("preserva a localização informada separadamente do checklist", () => {
  assert.equal(environmentLocation("  2º andar  "), "2º andar");
});

test("ambiente sem localização não recebe a classificação do checklist", () => {
  assert.equal(environmentLocation(null), null);
  assert.equal(environmentLocation("   "), null);
});