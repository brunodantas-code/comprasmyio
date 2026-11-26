import { describe, expect, it } from "vitest";
import { applyMenuNames, parseMenuNames, resolveMenuName } from "./menu-names";
import { sortByMenuOrder } from "./menu-order";

describe("menu identities after renaming", () => {
  it("preserves Spend destinations, permissions and original saved ordering", () => {
    const open = () => "allocations";
    const items = [{ value: "cards", label: "Cartões", allowed: false }, { value: "allocations", label: "Alocação Automática (De-Para)", allowed: true, open }];
    const names = { "Spend|Barra inferior": { "Alocação Automática (De-Para)": "Alocação automática" } };
    const result = applyMenuNames(sortByMenuOrder(items, ["Alocação Automática (De-Para)", "Cartões"]), names, "Spend", "Barra inferior");
    expect(result.map(item => item.value)).toEqual(["allocations", "cards"]);
    expect(result.map(item => item.allowed)).toEqual([true, false]);
    expect(result[0]?.open).toBe(open);
    expect(result[0]?.open?.()).toBe("allocations");
    expect(items[1]?.label).toBe("Alocação Automática (De-Para)");
  });

  it("keeps identically named menus independent by app and group", () => {
    const names = { "Spend|Barra inferior": { Histórico: "Despesas anteriores" } };
    expect(resolveMenuName(names, "Supply", "Submenus", "Histórico")).toBe("Histórico");
    expect(resolveMenuName(names, "Spend", "Submenus", "Histórico")).toBe("Histórico");
  });

  it("keeps shared header action IDs and Finance legacy keys stable", () => {
    const names = parseMenuNames('{"ERP|Menu superior":{"password":"Senha"},"Cash Flow|Barra inferior":{"Caixa":"Bancos"}}');
    expect(resolveMenuName(names, "ERP", "Menu superior", "password", "Alterar senha")).toBe("Senha");
    expect(resolveMenuName(names, "Finance", "Barra inferior", "Caixa")).toBe("Bancos");
    expect(resolveMenuName(names, "ERP", "Menu superior", "logout", "Sair")).toBe("Sair");
  });

  it("ignores malformed and blank names instead of blanking navigation", () => {
    expect(parseMenuNames('{"Spend|Barra inferior":{"Cartões":"  ","Histórico":3}}')).toEqual({ "Spend|Barra inferior": {} });
    expect(parseMenuNames("[]")).toEqual({});
    expect(parseMenuNames("bad")).toEqual({});
  });
});