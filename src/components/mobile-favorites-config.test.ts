import { describe, it, expect } from "vitest";
import { normalizeFavorites, toggleFavorite, partitionMobileApps } from "./mobile-favorites-config";
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
  it("destaca favoritos na ordem pessoal e mantém os demais na ordem CDE sem repetir", () => {
    const apps = ["crm", "site_survey", "supply", "legal", "projects"].map(key => ({ key }));
    const result = partitionMobileApps(apps, ["projects", "supply", "sem_acesso"]);
    expect(result.favorites.map(app => app.key)).toEqual(["projects", "supply"]);
    expect(result.remaining.map(app => app.key)).toEqual(["crm", "site_survey", "legal"]);
  });
});