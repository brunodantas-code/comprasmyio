import { describe, expect, it } from "vitest";
import { parseMenuIcons, resolveMenuIcon, setMenuIcon } from "./menu-icons";
import { MENU_SUBMENUS } from "./menu-submenu-catalog";

describe("independent menu and submenu symbols", () => {
  it("assigns different symbols to each Armazém submenu", () => {
    const icons = setMenuIcon(setMenuIcon({}, "Supply", "Submenus:stock", "fabrica:estoque", "cpu"), "Supply", "Submenus:stock", "estoque:expedicao", "truck");
    expect(resolveMenuIcon(icons, "Supply", "Submenus:stock", "fabrica:estoque")).toBe("cpu");
    expect(resolveMenuIcon(icons, "Supply", "Submenus:stock", "estoque:expedicao")).toBe("truck");
    expect(resolveMenuIcon(icons, "Supply", "Barra inferior", "Armazém")).toBeUndefined();
  });
  it("keeps similarly named submenus independent by parent and app", () => {
    const icons = setMenuIcon({}, "Supply", "Submenus:stock", "estoque:cliente", "building-2");
    expect(resolveMenuIcon(icons, "Supply", "Submenus:stock", "estoque:cliente")).toBe("building-2");
    expect(resolveMenuIcon(icons, "Supply", "Submenus:projects", "clientes")).toBeUndefined();
    expect(resolveMenuIcon(icons, "OpDesk", "Barra inferior", "Clientes")).toBeUndefined();
  });
  it("restores only the selected original symbol", () => {
    const original = setMenuIcon(setMenuIcon({}, "Spend", "Barra inferior", "Cartões", "wallet"), "Spend", "Barra inferior", "Histórico", "clock");
    const restored = setMenuIcon(original, "Spend", "Barra inferior", "Cartões", "");
    expect(resolveMenuIcon(restored, "Spend", "Barra inferior", "Cartões")).toBeUndefined();
    expect(resolveMenuIcon(restored, "Spend", "Barra inferior", "Histórico")).toBe("clock");
    expect(resolveMenuIcon(original, "Spend", "Barra inferior", "Cartões")).toBe("wallet");
  });
  it("retains the Finance legacy identity and safely ignores malformed choices", () => {
    const icons = parseMenuIcons('{"Cash Flow|Barra inferior":{"Caixa":"landmark","Contas a pagar":false}}');
    expect(resolveMenuIcon(icons, "Finance", "Barra inferior", "Caixa")).toBe("landmark");
    expect(resolveMenuIcon(icons, "Finance", "Barra inferior", "Contas a pagar")).toBeUndefined();
    expect(parseMenuIcons("[]")).toEqual({});
  });
  it("inventories every current Armazém and Approvals command without duplicate identities", () => {
    const stock = MENU_SUBMENUS.Supply.filter(item => item.parent === "stock");
    const approvals = MENU_SUBMENUS.Supply.filter(item => item.parent === "queue");
    expect(stock.map(item => item.value)).toEqual(["fabrica:estoque", "fabrica:fila", "fabrica:liberados", "fabrica:homologacao", "estoque:dispositivos", "estoque:cliente", "estoque:tecnico", "estoque:insumos", "estoque:ordens", "estoque:expedicao", "estoque:qr-check", "almoxarifado_geral", "ferramentas", "inventario"]);
    expect(approvals.map(item => item.value)).toEqual(["mine", "flow", "mine-supply", "supply", "all", "roles"]);
    const keys = MENU_SUBMENUS.Supply.map(item => `${item.parent}|${item.value}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});