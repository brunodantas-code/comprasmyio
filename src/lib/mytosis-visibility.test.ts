import { describe, expect, it } from "vitest";
import { previousBoxIds } from "./mytosis-visibility";

describe("seta esquerda dos boxes", () => {
  it("recolhe todos os anteriores, preservando o box atual, dependentes e ramos independentes", () => {
    const links = [
      { predecessor_id: "1.2", successor_id: "1.2.3" },
      { predecessor_id: "1.2.3", successor_id: "1.2.3.4" },
      { predecessor_id: "paralelo", successor_id: "1.2.3.4" },
      { predecessor_id: "1.2.3.4", successor_id: "1.2.3.4.5" },
      { predecessor_id: "independente", successor_id: "outro" },
    ];
    expect([...previousBoxIds("1.2.3.4", links)].sort()).toEqual(["1.2", "1.2.3", "paralelo"]);
  });
  it("não recolhe o próprio box em uma ligação cíclica histórica", () => {
    expect([...previousBoxIds("atual", [{ predecessor_id: "antes", successor_id: "atual" }, { predecessor_id: "atual", successor_id: "antes" }])]).toEqual(["antes"]);
  });
});