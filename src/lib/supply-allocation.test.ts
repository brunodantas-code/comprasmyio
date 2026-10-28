import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSupplyAllocation } from "./supply-allocation";

const projects = [{ id: "implantacao", client_id: "cliente", client_unit_id: "unidade" }];
test("Projeto herda Cliente e unidade, sem usar cliente direto selecionado", () => {
  assert.deepEqual(resolveSupplyAllocation("projeto", "implantacao", "outro-cliente", "outra-unidade", projects), { project_id: "implantacao", client_id: "cliente", client_unit_id: "unidade" });
});
test("Sustentação é direta no Cliente e nunca mantém Projeto", () => {
  assert.deepEqual(resolveSupplyAllocation("cliente", "implantacao", "cliente", "", projects), { project_id: null, client_id: "cliente", client_unit_id: null });
});
test("Projeto sem Cliente bloqueia a compra", () => {
  assert.throws(() => resolveSupplyAllocation("projeto", "sem-cliente", "cliente", "", [{ id: "sem-cliente", client_id: null }]), /Vincule um Cliente/);
});
test("Sustentação exige Cliente", () => {
  assert.throws(() => resolveSupplyAllocation("cliente", "implantacao", "", "", projects), /Selecione um cliente/);
});
test("Estoque e Interna não mantêm destino de Cliente ou Projeto", () => {
  for (const type of ["estoque", "interna"] as const) assert.deepEqual(resolveSupplyAllocation(type, "implantacao", "cliente", "unidade", projects), { project_id: null, client_id: null, client_unit_id: null });
});