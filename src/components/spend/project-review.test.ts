import { expect, it } from 'vitest';
import { canClassifySpend, projectReviewKind, resolveReviewedProject, type ProjectReview } from './project-review';

const review = (holder: string | null, finance: string | null, choice: ProjectReview['choice']): ProjectReview => ({ receipt_id: 'nota', holder_project_id: holder, finance_project_id: finance, choice });

it('projetos conflitantes exigem escolha explícita sem substituir silenciosamente o portador', () => {
  expect(projectReviewKind('projeto-portador', 'projeto-financeiro')).toBe('conflict');
  expect(resolveReviewedProject(review('projeto-portador', 'projeto-financeiro', 'holder'))).toBe('projeto-portador');
  expect(resolveReviewedProject(review('projeto-portador', 'projeto-financeiro', 'finance'))).toBe('projeto-financeiro');
  expect(() => resolveReviewedProject(review('projeto-portador', 'projeto-financeiro', 'none'))).toThrow();
});
it('Financeiro sem projeto confirma e herda o projeto do portador', () => {
  expect(projectReviewKind('projeto-portador', null)).toBe('holder');
  expect(resolveReviewedProject(review('projeto-portador', null, 'holder'))).toBe('projeto-portador');
  expect(() => resolveReviewedProject(review('projeto-portador', null, 'none'))).toThrow();
});
it('projeto ausente em ambos exige confirmação de despesa sem projeto', () => {
  expect(projectReviewKind(null, null)).toBe('none');
  expect(resolveReviewedProject(review(null, null, 'none'))).toBeNull();
  expect(() => resolveReviewedProject(review(null, null, 'finance'))).toThrow();
});
it('projetos iguais ou apenas do Financeiro não geram divergência', () => {
  expect(projectReviewKind('projeto', 'projeto')).toBe('finance');
  expect(projectReviewKind(null, 'projeto')).toBe('finance');
  expect(resolveReviewedProject(review(null, 'projeto', 'finance'))).toBe('projeto');
});
it('Centro de Custo e Plano de Contas ficam exclusivos do Financeiro', () => {
  expect(canClassifySpend('finance')).toBe(true);
  expect(canClassifySpend('holder')).toBe(false);
  expect(canClassifySpend('')).toBe(false);
});