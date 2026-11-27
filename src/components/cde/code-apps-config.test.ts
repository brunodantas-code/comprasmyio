import { describe, expect, it } from "vitest";
import { codeAppName, codeApps, parseCodeAppExclusions } from "./code-apps-config";
import { PORTAL_APPS } from "./app-order-config";

describe("Apps atendidos pelo Code", () => {
  it("oferece myio ERP geral sem criar um aplicativo duplicado no portal", () => {
    expect(codeApps([], key => key)).toContainEqual({ key: "erp", name: "myio ERP" });
    expect(codeAppName("erp", key => key)).toBe("myio ERP");
    expect(PORTAL_APPS.map(app => String(app.key))).not.toContain("erp");
  });
  it("permite retirar somente o ERP geral pelo CDE", () => {
    const keys = codeApps(parseCodeAppExclusions('{"excluded":["erp"]}')).map(app => app.key);
    expect(keys).not.toContain("erp");
    expect(keys).toContain("development");
    expect(keys).toContain("supply");
  });
  it("inclui o Spend e todos os apps quando nada foi excluído", () => {
    expect(codeApps([]).map((a) => a.key)).toContain("spend");
  });
  it("retira somente os apps excluídos no CDE", () => {
    const keys = codeApps(parseCodeAppExclusions('{"excluded":["wishlist"]}')).map((a) => a.key);
    expect(keys).not.toContain("wishlist");
    expect(keys).toContain("supply");
  });
});
