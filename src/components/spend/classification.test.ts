import { expect, it } from "vitest";
import { classificationAccess, showReceiptCnpj, classificationTargets, toggleFilteredSelection, bulkClassificationPatch, bulkClassificationTargets } from "./classification";
it("CNPJ aparece somente com comprovante anexado", () => {
  expect(showReceiptCnpj(null)).toBe(false);
  expect(showReceiptCnpj("comprovante")).toBe(true);
});
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
it("permite conciliar IOF sem comprovante com dispensa explícita e classificação completa", () => {
  expect(classificationAccess(false, false, false, "IOF", "Administração", true).canApprove).toBe(true);
  expect(classificationAccess(false, false, false, "IOF", "", true).canApprove).toBe(false);
});
it("seleciona somente os filtrados editáveis e preserva seleções fora do filtro", () => {
  const lines = [{ id: "iof1", status: "pending" }, { id: "iof2", status: "approved" }];
  expect([...toggleFilteredSelection(lines, new Set(["outro"]), true)]).toEqual(["outro", "iof1"]);
  expect([...toggleFilteredSelection(lines, new Set(["outro", "iof1"]), false)]).toEqual(["outro"]);
});
it("aplica a classificação aos selecionados e ao lançamento editado sem duplicá-lo", () => {
  const lines = [{ id: "iof1", status: "pending" }, { id: "iof2", status: "pending" }, { id: "aprovado", status: "approved" }];
  expect(classificationTargets(lines, new Set(["iof1", "iof2", "aprovado"]), "iof1")).toEqual(["iof1", "iof2"]);
  expect(classificationTargets(lines, new Set(), "iof1")).toEqual(["iof1"]);
});
it('aplica somente Centro de Custo sem substituir conta ou projeto', () => {
  expect(bulkClassificationPatch('', 'Operação', '')).toEqual({ cost_center_id: 'Operação' });
});
it('aplica somente Plano de Contas', () => {
  expect(bulkClassificationPatch('Alimentação', '', '')).toEqual({ account_id: 'Alimentação' });
});
it('aplica somente Projeto', () => {
  expect(bulkClassificationPatch('', '', 'Mogi')).toEqual({ project_id: 'Mogi' });
});
it('aplica os três campos cumulativamente', () => {
  expect(bulkClassificationPatch('Alimentação', 'Operação', 'Mogi')).toEqual({ account_id: 'Alimentação', cost_center_id: 'Operação', project_id: 'Mogi' });
});
it('classifica somente selecionados não aprovados da mesma fatura', () => {
  const lines = [{ id: '1', status: 'pending', statement_id: 'fatura' }, { id: '2', status: 'approved', statement_id: 'fatura' }, { id: '3', status: 'pending', statement_id: 'outra' }];
  expect(bulkClassificationTargets(lines, new Set(['1', '2']))).toEqual([lines[0]]);
  expect(() => bulkClassificationTargets(lines, new Set(['1', '3']))).toThrow('mesma fatura');
  expect(() => bulkClassificationTargets(lines, new Set(['2']))).toThrow('Selecione');
});