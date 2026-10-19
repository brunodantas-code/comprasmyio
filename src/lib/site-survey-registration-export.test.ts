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
test("Excel segue o modelo: título do cliente, totais no topo, cabeçalho congelado com filtros e caixas editáveis", async () => {
  const bytes = await buildRegistrationExcel([{ luc: "001", meter: "—", type: "Loja", name: "Vivara", location: "Piso 1", water: true, energy: false }], "Shopping Taboão");
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file("xl/worksheets/sheet1.xml")?.async("string") ?? "";
  assert.match(xml, /<c r="F7" t="b" s="9"><v>1<\/v>/);
  assert.match(xml, /<c r="G7" t="b" s="9"><v>0<\/v>/);
  assert.match(xml, /ySplit="6"[^>]*state="frozen"/);
  assert.match(xml, /<autoFilter ref="B6:G7"\/>/);
  const styles = await zip.file("xl/styles.xml")?.async("string") ?? "";
  assert.match(styles, /xfComplement i="0"/);
  assert.doesNotMatch(styles, /Calibri|Arial/);
  const sheet = XLSX.read(bytes, { type: "array" }).Sheets["Lojas e ambientes"];
  assert.equal(sheet.B2.v, "Shopping Taboão");
  assert.equal(sheet.F5.f, "COUNTIF(F7:F7,TRUE)");
  assert.equal(sheet.G5.f, "COUNTIF(G7:G7,TRUE)");
  assert.equal(sheet.B7.v, "001");
});
