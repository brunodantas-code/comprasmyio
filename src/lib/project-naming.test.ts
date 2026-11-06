import { describe, expect, it } from "vitest";
import { composeProjectName, splitProjectName } from "./project-naming";

describe("composeProjectName", () => {
  it("concatena tipo e nome (exemplo Drone Scan)", () => {
    expect(composeProjectName("Desenvolvimento de Solução", "Drone Scan")).toBe("Desenvolvimento de Solução | Drone Scan");
  });
  it("concatena tipo e nome (exemplo Mogi)", () => {
    expect(composeProjectName("Implantação", "  Shopping   Boulevard Mogi ")).toBe("Implantação | Shopping Boulevard Mogi");
  });
  it("remove barras digitadas no nome livre", () => {
    expect(composeProjectName("PoC", "A | B")).toBe("PoC | A B");
  });
});

describe("splitProjectName", () => {
  it("separa nomes padronizados", () => {
    expect(splitProjectName("PoC | Teste", ["PoC"])).toEqual({ projectType: "PoC", shortName: "Teste" });
  });
  it("mantém nomes antigos sem tipo", () => {
    expect(splitProjectName("Shopping X", ["PoC"])).toEqual({ projectType: "", shortName: "Shopping X" });
  });
});
