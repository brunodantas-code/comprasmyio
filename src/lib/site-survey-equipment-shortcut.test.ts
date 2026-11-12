import { test } from "node:test";
import assert from "node:assert/strict";
import { toggleSurveyEquipment } from "./site-survey-equipment-shortcut";

const ladder = { catalog_item_id: "escada", quantity: "1", notes: "" };
test("Marcar Escada adiciona uma unidade sem retirar outros equipamentos", () => {
  const other = { catalog_item_id: "furadeira", quantity: "2", notes: "existente" };
  assert.deepEqual(toggleSurveyEquipment([other], "escada", true, () => ladder), [other, ladder]);
});
test("Escada existente permanece marcada sem duplicar nem perder quantidade e observação", () => {
  const existing = { ...ladder, quantity: "3", notes: "extensível" };
  assert.deepEqual(toggleSurveyEquipment([existing], "escada", true, () => ladder), [existing]);
});
test("Desmarcar Escada retira somente Escada", () => {
  const other = { catalog_item_id: "furadeira", quantity: "2", notes: "" };
  assert.deepEqual(toggleSurveyEquipment([ladder, other], "escada", false, () => ladder), [other]);
});