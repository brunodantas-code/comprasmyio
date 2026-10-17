import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { registrationServices } from "./site-survey-registration-export";
import { buildRegistrationExcel } from "./site-survey-registration-excel";

test("Água e Energia exportadas usam as aprovações independentes do ponto", () => {
  const approvals = [{ point_kind: "luc", point_id: "1", hydraulic_approved: true, electrical_approved: false }, { point_kind: "environment", point_id: "1", hydraulic_approved: false, electrical_approved: true }];
  assert.deepEqual(registrationServices(approvals, "luc", "1"), { water: true, energy: false });
  assert.deepEqual(registrationServices(approvals, "environment", "1"), { water: false, energy: true });
  assert.deepEqual(registrationServices(approvals, "luc", "2"), { water: false, energy: false });
});
test("Excel contém duas caixas nativas editáveis por ponto e totais dinâmicos", async () => {
  const bytes = await buildRegistrationExcel([{ luc: "001", meter: "123", type: "Loja", name: "Vivara", location: "Piso 1", water: true, energy: false }]);
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file("xl/worksheets/sheet1.xml")?.async("string");
  assert.match(xml ?? "", /<c r="F2" t="b" s="\d+"><v>1<\/v>/);
  assert.match(xml ?? "", /<c r="G2" t="b" s="\d+"><v>0<\/v>/);
  assert.match(await zip.file("xl/styles.xml")?.async("string") ?? "", /xfComplement i="0"/);
  assert.match(await zip.file("xl/featurePropertyBag/featurePropertyBag.xml")?.async("string") ?? "", /bag type="Checkbox"/);
  const workbook = XLSX.read(bytes, { type: "array" });
  const sheet = workbook.Sheets["Lojas e ambientes"];
  assert.equal(sheet.F4.f, "COUNTIF(F2:F2,TRUE)");
  assert.equal(sheet.G4.f, "COUNTIF(G2:G2,TRUE)");
  assert.equal(sheet.F4.v, 1);
  assert.equal(sheet.G4.v, 0);
  assert.equal(sheet.A2.v, "001");
});