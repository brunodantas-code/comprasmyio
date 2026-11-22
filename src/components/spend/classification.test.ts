import { expect, it } from "vitest";
import { classificationAccess } from "./classification";
it("salva classificação parcial sem comprovante", () => {
  expect(classificationAccess(false, false, false, "", "").canSave).toBe(true);
});
it("não aprova sem comprovante mesmo com alocação preenchida", () => {
  expect(classificationAccess(false, false, false, "conta", "centro").canApprove).toBe(false);
  expect(classificationAccess(false, false, true, "conta", "centro").canApprove).toBe(true);
});
it("não altera lançamentos aprovados nem salva durante outra ação", () => {
  expect(classificationAccess(false, true, true, "conta", "centro").canSave).toBe(false);
  expect(classificationAccess(true, false, false, "", "").canSave).toBe(false);
});