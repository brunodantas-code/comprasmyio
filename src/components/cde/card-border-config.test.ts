import { expect, it } from "vitest";
import { parseCardBorders, resolveCardBorder } from "./card-border-config";

const raw = JSON.stringify({ indicadores: { mode: "department", edge: "top", width: 2, colors: { department: { Comercial: "verde", Financeiro: "roxo" }, responsible: { user: "escuro" } } } });
it("preserva o padrão quando não há escolha ou correspondência", () => {
  expect(resolveCardBorder({}, { app: "indicadores", department: "Comercial" })).toBeNull();
  expect(resolveCardBorder(parseCardBorders(raw), { app: "indicadores", department: "Tecnologia" })).toBeNull();
});
it("diferencia Comercial e Financeiro com as cores escolhidas", () => {
  const config = parseCardBorders(raw);
  expect(resolveCardBorder(config, { app: "indicadores", department: "Comercial" })).toEqual({ color: "verde", edge: "top", width: 2 });
  expect(resolveCardBorder(config, { app: "indicadores", department: "Financeiro" })?.color).toBe("roxo");
});
it("rejeita cores fora da paleta permitida", () => {
  const config = parseCardBorders(JSON.stringify({ crm: { mode: "status", colors: { status: { Reunião: "#ff0000", Survey: "laranja", Proposta: "roxo" } } } }));
  expect(resolveCardBorder(config, { app: "crm", status: "Reunião" })).toBeNull();
  expect(resolveCardBorder(config, { app: "crm", status: "Survey" })).toBeNull();
  expect(resolveCardBorder(config, { app: "crm", status: "Proposta" })?.color).toBe("roxo");
});
it("aceita Vermelho nas bordas", () => {
  const config = parseCardBorders(JSON.stringify({ indicadores: { mode: "department", colors: { department: { Comercial: "vermelho" } } } }));
  expect(resolveCardBorder(config, { app: "indicadores", department: "Comercial" })?.color).toBe("vermelho");
});
it("aceita a escala P&B completa", () => {
  for (const color of ["preto", "cinza_escuro", "cinza", "cinza_claro", "cinza_muito_claro", "branco"]) {
    const config = parseCardBorders(JSON.stringify({ crm: { mode: "status", colors: { status: { Proposta: color } } } }));
    expect(resolveCardBorder(config, { app: "crm", status: "Proposta" })?.color).toBe(color);
  }
});
it("isola aplicativos e usa somente o critério selecionado", () => {
  const config = parseCardBorders(raw);
  expect(resolveCardBorder(config, { app: "crm", department: "Comercial" })).toBeNull();
  const rule = config.indicadores;
  if (!rule) throw new Error("Regra ausente");
  rule.mode = "responsible";
  expect(resolveCardBorder(config, { app: "indicadores", department: "Comercial", responsible: "user" })?.color).toBe("escuro");
});
it("trata conteúdo inválido sem quebrar os cards", () => {
  expect(parseCardBorders("invalid")).toEqual({});
  expect(parseCardBorders("null")).toEqual({});
  expect(parseCardBorders('{"indicadores":{"mode":"invalid","width":999}}').indicadores?.width).toBe(4);
});