import { describe, expect, it } from "vitest";
import { spendDescription } from "./text-case";

describe("descrições do Spend", () => {
  it.each([
    ["GRUPO MADERO ROSSEIRA", "Grupo madero rosseira"],
    ["TRANCASA CHAVEIRO LTDA RIO DE JANEIR", "Trancasa chaveiro ltda rio de janeir"],
    ["PORTAL HOTEL MOGI MRI MOGI MIRIM", "Portal hotel mogi mri mogi mirim"],
    ["  123 ÁGUA E INSTALAÇÃO", "  123 Água e instalação"],
    ["Uber TRIP", "Uber trip"],
    ["", ""],
  ])("mantém só a primeira letra maiúscula em %s", (source, expected) => {
    expect(spendDescription(source, true)).toBe(expected);
  });
  it("preserva o original quando a conversão está desligada", () => {
    expect(spendDescription("GRUPO MADERO ROSSEIRA", false)).toBe("GRUPO MADERO ROSSEIRA");
  });
});