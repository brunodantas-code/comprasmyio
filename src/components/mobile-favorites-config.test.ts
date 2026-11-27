import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { normalizeFavorites, toggleFavorite, partitionMobileApps } from "./mobile-favorites-config";
describe("favoritos pessoais", () => {
  const sql = readFileSync(new URL("../../drizzle/migrations/0326_allow_current_apps_in_mobile_favorites.sql", import.meta.url), "utf8");
  const allowedKeys = [...(sql.match(/CHECK \(app_keys <@ ARRAY\[([^\]]+)\]/)?.[1] ?? "").matchAll(/'([^']+)'/g)].map(match => match[1]);
  it("permite persistir Spend na lista autorizada do banco", () => {
    expect(allowedKeys).toContain("spend");
    expect(normalizeFavorites(["spend"], ["spend"])).toEqual(["spend"]);
  });
  it("permite persistir Indicadores na lista autorizada do banco", () => {
    expect(allowedKeys).toContain("indicadores");
    expect(normalizeFavorites(["indicadores"], ["indicadores"])).toEqual(["indicadores"]);
  });
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