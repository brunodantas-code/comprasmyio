import { describe, it, expect } from "vitest";
import { normalizeFavorites, toggleFavorite } from "./mobile-favorites-config";
describe("favoritos pessoais", () => {
  it("limita a seleção a quatro aplicativos", () => {
    expect(toggleFavorite(["supply", "crm", "projects", "development"], "legal")).toEqual(["supply", "crm", "projects", "development"]);
  });
  it("inclui somente aplicativos com acesso e sem duplicatas", () => {
    expect(normalizeFavorites(["crm", "crm", "legal", "supply"], ["crm", "supply"])).toEqual(["crm", "supply"]);
  });
  it("permite remover um favorito para escolher outro", () => {
    expect(toggleFavorite(["supply", "crm"], "crm")).toEqual(["supply"]);
  });
});