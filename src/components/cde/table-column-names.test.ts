// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { applyColumnName, parseTableColumnNames } from "./table-column-names";

const cellWith = (html: string) => { document.body.innerHTML = `<table><thead><tr>${html}</tr></thead></table>`; return document.querySelector("th")!; };

describe("nomes de coluna editados no CDE", () => {
  it("mantém apenas nomes válidos por slot", () => {
    expect(parseTableColumnNames('{"a|0":{"0":"Nome","1":" Cód. ","2":"","x":"y","3":4}}')).toEqual({ "a|0": { "0": "Nome", "1": "Cód." } });
  });
  it("ignora texto quebrado sem falhar", () => {
    expect(parseTableColumnNames("null")).toEqual({});
    expect(parseTableColumnNames("[1,2]")).toEqual({});
    expect(parseTableColumnNames(undefined)).toEqual({});
  });
  it("troca o texto da célula sem tocar no controle existente", () => {
    const cell = cellWith('<th>Nome<span role="button">filtro</span></th>');
    expect(applyColumnName(cell, "Nome do cliente")).toBe(true);
    expect(cell.textContent).toBe("Nome do clientefiltro");
    expect(cell.querySelector("span")).not.toBeNull();
    expect(applyColumnName(cell, "Nome do cliente")).toBe(false);
    expect(applyColumnName(cell, undefined)).toBe(false);
  });
  it("não cria texto em célula que só tem controle", () => {
    const cell = cellWith('<th><input type="checkbox"></th>');
    expect(applyColumnName(cell, "Ações")).toBe(false);
    expect(cell.textContent).toBe("");
  });
});
