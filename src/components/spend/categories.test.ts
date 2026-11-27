import { describe, expect, it } from "vitest";
import { configuredCategories, removeCategory, categoryKey, type CategorySetting } from "./rules";
const key = "custom_00000000-0000-4000-8000-000000000001";
const setting: CategorySetting = { name: "Hospedagem", icon: "Ellipsis", active: true, account_id: "", cost_center_id: "" };
describe("Categorias simplificadas do Spend", () => {
  it("inclui Combustível no Plano de Contas reduzido", () => {
    expect(configuredCategories({}).some(c => c.key === "combustivel" && c.name === "Combustível")).toBe(true);
    expect(categoryKey.safeParse("combustivel").success).toBe(true);
  });
  it("inclui novas despesas com identidade estável", () => {
    expect(configuredCategories({ [key]: setting }).find(c => c.key === key)?.name).toBe("Hospedagem");
    expect(categoryKey.safeParse(key).success).toBe(true);
    expect(categoryKey.safeParse("categoria_inventada").success).toBe(false);
  });
  it("exclui categoria personalizada das escolhas sem apagar a identificação histórica", () => {
    const result = removeCategory({ [key]: setting }, key);
    expect(configuredCategories(result).some(c => c.key === key)).toBe(false);
    expect(result[key]?.name).toBe("Hospedagem");
    expect(result[key]?.deleted).toBe(true);
  });
  it("exclui categoria original sem que o padrão a recrie", () => {
    const result = removeCategory({}, "alimentacao");
    expect(configuredCategories(result, true).some(c => c.key === "alimentacao")).toBe(false);
    expect(result['alimentacao']?.name).toBe("Alimentação");
  });
  it("ordena por posição sem trocar a identidade nem os vínculos das categorias", () => {
    const result = configuredCategories({
      alimentacao: { name: "Alimentação", icon: "Utensils", active: true, account_id: "account-food", cost_center_id: "center-1", position: 1 },
      transporte: { name: "Táxi/Uber", icon: "Car", active: true, account_id: "account-car", cost_center_id: "center-2", position: 0 },
    });
    expect(result.slice(0, 2).map(c => c.key)).toEqual(["transporte", "alimentacao"]);
    expect(result[0]?.account_id).toBe("account-car");
    expect(result[1]?.account_id).toBe("account-food");
  });
});