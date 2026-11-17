import { describe, expect, it } from "vitest";
import { parseTagConfig, resolveTag } from "./tag-style";

describe("tags do CDE", () => {
  it("lê o formato antigo (só cores)", () => { expect(parseTagConfig('{"Pendente":{"bg":"preto"}}').looks.pendente).toEqual({ bg: "preto" }); });
  it("renomear muda só o nome exibido", () => { const c = parseTagConfig(JSON.stringify({ looks: {}, renames: { "Em aberto": "Aberto" }, removed: {}, custom: [] })); expect(resolveTag(c, "Em aberto").text).toBe("Aberto"); });
  it("tag excluída aparece como a substituta, com nome e cores dela", () => {
    const c = parseTagConfig(JSON.stringify({ looks: { Concluído: { bg: "preto" } }, renames: { Concluído: "Finalizado" }, removed: { Concluída: "Concluído" }, custom: [] }));
    expect(resolveTag(c, "Concluída")).toEqual({ text: "Finalizado", key: "concluído", look: { bg: "preto" } });
  });
});
