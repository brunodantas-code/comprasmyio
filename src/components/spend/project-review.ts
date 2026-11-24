export type ProjectReviewKind = 'conflict' | 'holder' | 'none' | 'finance';
export type ProjectReviewChoice = 'holder' | 'finance' | 'none';
export type ProjectReview = {
  receipt_id: string | null;
  holder_project_id: string | null;
  finance_project_id: string | null;
  choice: ProjectReviewChoice;
};

export function projectReviewKind(holderProject: string | null, financeProject: string | null): ProjectReviewKind {
  if (holderProject && financeProject && holderProject !== financeProject) return 'conflict';
  if (!financeProject) return holderProject ? 'holder' : 'none';
  return 'finance';
}

export function resolveReviewedProject(review: ProjectReview): string | null {
  const kind = projectReviewKind(review.holder_project_id, review.finance_project_id);
  if (kind === 'conflict' && review.choice !== 'holder' && review.choice !== 'finance') throw new Error('Escolha o projeto correto');
  if (kind === 'holder' && review.choice !== 'holder') throw new Error('Confirme o projeto do portador');
  if (kind === 'none' && review.choice !== 'none') throw new Error('Confirme a despesa sem projeto');
  if (kind === 'finance' && review.choice !== 'finance') throw new Error('Confirme o projeto do Financeiro');
  return review.choice === 'holder' ? review.holder_project_id : review.choice === 'finance' ? review.finance_project_id : null;
}

export function canClassifySpend(role: string) {
  return role === 'finance';
}