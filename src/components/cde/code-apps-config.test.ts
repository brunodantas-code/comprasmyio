import { describe, expect, it } from "vitest";
import { codeApps, parseCodeAppExclusions } from "./code-apps-config";

describe("Apps atendidos pelo Code", () => {
  it("inclui o Spend e todos os apps quando nada foi excluído", () => {
    expect(codeApps([]).map((a) => a.key)).toContain("spend");
  });
  it("retira somente os apps excluídos no CDE", () => {
    const keys = codeApps(parseCodeAppExclusions('{"excluded":["wishlist"]}')).map((a) => a.key);
    expect(keys).not.toContain("wishlist");
    expect(keys).toContain("supply");
  });
});
