import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { registrationServices } from "./site-survey-registration-export";
import { buildRegistrationExcel } from "./site-survey-registration-excel";
import { clientObservationForPoint } from "./site-survey-client-observation";

test("Água e Energia exportadas usam as aprovações independentes do ponto", () => {
  const approvals = [{ point_kind: "luc", point_id: "1", hydraulic_approved: true, electrical_approved: false }, { point_kind: "environment", point_id: "1", hydraulic_approved: false, electrical_approved: true }];
  assert.deepEqual(registrationServices(approvals, "luc", "1"), { water: true, energy: false });
  assert.deepEqual(registrationServices(approvals, "environment", "1"), { water: false, energy: true });
  assert.deepEqual(registrationServices(approvals, "luc", "2"), { water: false, energy: false });
});
test("Excel segue o modelo: título do cliente, totais no topo, cabeçalho congelado com filtros e caixas editáveis", async () => {
  const bytes = await buildRegistrationExcel([{ luc: "001", meter: "—", type: "Loja", name: "Vivara", location: "Piso 1", water: true, energy: false }], "Shopping Taboão");
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file("xl/worksheets/sheet1.xml")?.async("string") ?? "";
  assert.match(xml, /<c r="F7" t="b" s="9"><v>1<\/v>/);
  assert.match(xml, /<c r="G7" t="b" s="9"><v>0<\/v>/);
  assert.match(xml, /ySplit="6"[^>]*state="frozen"/);
  assert.match(xml, /<autoFilter ref="B6:H7"\/>/);
  const styles = await zip.file("xl/styles.xml")?.async("string") ?? "";
  assert.match(styles, /xfComplement i="0"/);
  assert.doesNotMatch(styles, /Calibri|Arial/);
  const sheet = XLSX.read(bytes, { type: "array" }).Sheets["Lojas e ambientes"];
  assert.equal(sheet.B2.v, "Shopping Taboão");
  assert.equal(sheet.F5.f, "COUNTIF(F7:F7,TRUE)");
  assert.equal(sheet.G5.f, "COUNTIF(G7:G7,TRUE)");
  assert.equal(sheet.B7.v, "001");
});
test("Observações exportadas ficam após Energia e preservam o texto de cada ponto", async () => {
  const observation = "Confirmar acesso com o cliente.\nLoja será substituída.";
  const bytes = await buildRegistrationExcel([{ luc: "001", meter: "M123", type: "Loja", name: "Loja 1", location: "Mall", water: true, energy: false, clientObservation: observation }]);
  const sheet = XLSX.read(bytes, { type: "array" }).Sheets["Lojas e ambientes"];
  assert.ok(sheet);
  assert.equal(sheet["H7"]?.v, false);
  assert.equal(sheet["I7"]?.v, observation);
  assert.equal(sheet["H5"]?.f, "COUNTIF(H7:H7,TRUE)");
});
test("Observações de loja não se misturam às de ambiente ou outro ponto", () => {
  const rows = [{ point_kind: "luc", point_id: "1", observation: "Loja" }, { point_kind: "environment", point_id: "1", observation: "Ambiente" }];
  assert.equal(clientObservationForPoint(rows, "luc", "1"), "Loja");
  assert.equal(clientObservationForPoint(rows, "environment", "1"), "Ambiente");
  assert.equal(clientObservationForPoint(rows, "luc", "2"), "");
});
