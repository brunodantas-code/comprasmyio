import { describe, expect, it } from "vitest";
import { CRM_URL } from "./external-apps";

describe("CRM externo", () => {
  it("abre o endereço indicado sem credenciais ou parâmetros do ERP", () => {
    const url = new URL(CRM_URL);
    expect(url.origin).toBe("https://crm-myio.vercel.app");
    expect(url.protocol).toBe("https:");
    expect(url.username).toBe("");
    expect(url.password).toBe("");
    expect(url.search).toBe("");
    expect(url.hash).toBe("");
  });
});