import { expect, it } from "vitest";
import { finishNumberInputDraft, numberInputDraftValue } from "./number-input-draft";

it("permite apagar e digitar 220 sem substituir os dígitos parciais pelo mínimo", () => {
  expect(numberInputDraftValue("", 160, 400)).toBeNull();
  expect(numberInputDraftValue("2", 160, 400)).toBeNull();
  expect(numberInputDraftValue("22", 160, 400)).toBeNull();
  expect(numberInputDraftValue("220", 160, 400)).toBe(220);
});

it("permite digitar 48 para altura sem converter o primeiro 4 em 36", () => {
  expect(numberInputDraftValue("4", 36, 80)).toBeNull();
  expect(numberInputDraftValue("48", 36, 80)).toBe(48);
});

it("mantém os limites existentes ao sair do campo e restaura o valor se estiver vazio", () => {
  expect(finishNumberInputDraft("2", "240", 160, 400)).toBe("160");
  expect(finishNumberInputDraft("900", "240", 160, 400)).toBe("400");
  expect(finishNumberInputDraft("", "240", 160, 400)).toBe("240");
  expect(finishNumberInputDraft("48", "44", 36, 80)).toBe("48");
});