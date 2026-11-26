import { expect, it } from "vitest";
import { clampMenuWidth, draggedMenuWidth, personalMenuWidthKey } from "./menu-resize";

it("arrasta a borda interna corretamente nos dois lados", () => {
  expect(draggedMenuWidth(240, 60, "left", 1133)).toBe(300);
  expect(draggedMenuWidth(240, -60, "right", 1133)).toBe(300);
});
it("mantém os limites existentes e deixa conteúdo visível no celular", () => {
  expect(clampMenuWidth(500, 1133)).toBe(317);
  expect(clampMenuWidth(500, 1440)).toBe(400);
  expect(clampMenuWidth(50, 1133)).toBe(160);
  expect(clampMenuWidth(400, 390)).toBe(230);
});
it("limita o menu sem ocupar a área mínima de 800px das listas desktop", () => {
  expect(1024 - clampMenuWidth(400, 1024) - 16).toBe(800);
  expect(1133 - clampMenuWidth(400, 1133) - 16).toBe(800);
});
it("separa a preferência por usuário, app e dispositivo", () => {
  const key = personalMenuWidthKey("user-a", "Spend", true);
  expect(key).not.toBe(personalMenuWidthKey("user-b", "Spend", true));
  expect(key).not.toBe(personalMenuWidthKey("user-a", "CRM", true));
  expect(key).not.toBe(personalMenuWidthKey("user-a", "Spend", false));
});