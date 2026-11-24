import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { projectReviewKind, type ProjectReview, type ProjectReviewChoice } from './project-review';

type Request = { merchant: string; review: Omit<ProjectReview, 'choice'>; resolve: (review: ProjectReview | null) => void };

export function useSpendProjectReview(projects: readonly { id: string; name: string }[]) {
  const [request, setRequest] = useState<Request | null>(null);
  const [choice, setChoice] = useState<ProjectReviewChoice | ''>('');
  const pending = useRef<Request | null>(null);
  useEffect(() => () => { pending.current?.resolve(null); }, []);

  function close(result: ProjectReview | null) {
    pending.current?.resolve(result);
    pending.current = null;
    setRequest(null);
  }

  async function confirmProject(merchant: string, receiptId: string | null, holderProject: string | null, financeProject: string | null): Promise<ProjectReview | null> {
    const review = { receipt_id: receiptId, holder_project_id: holderProject, finance_project_id: financeProject };
    if (projectReviewKind(holderProject, financeProject) === 'finance') return { ...review, choice: 'finance' };
    pending.current?.resolve(null);
    setChoice('');
    return new Promise(resolve => {
      const next = { merchant, review, resolve };
      pending.current = next;
      setRequest(next);
    });
  }

  const kind = request ? projectReviewKind(request.review.holder_project_id, request.review.finance_project_id) : 'none';
  const projectName = (id: string | null) => projects.find(project => project.id === id)?.name ?? (id ? 'Projeto indisponível' : 'Não informado');
  const submit = () => {
    if (!request) return;
    const selected = kind === 'conflict' ? choice : kind === 'holder' ? 'holder' : 'none';
    if (!selected) return;
    close({ ...request.review, choice: selected });
  };

  const dialog = <Dialog open={!!request} onOpenChange={open => { if (!open) close(null); }}>
    <DialogContent className="sm:max-w-lg" aria-describedby="spend-project-review-description">
      <DialogHeader><DialogTitle>{kind === 'conflict' ? 'Divergência de projeto' : kind === 'holder' ? 'Confirmar projeto do portador' : 'Despesa sem projeto'}</DialogTitle></DialogHeader>
      <p className="break-words text-sm">{request?.merchant}</p>
      <p id="spend-project-review-description" className="text-sm text-muted-foreground">{kind === 'conflict' ? 'Os projetos informados são diferentes. Qual projeto deve ficar vinculado à despesa?' : kind === 'holder' ? 'O Financeiro não informou um projeto. Confirma o projeto indicado pelo portador?' : 'Portador e Financeiro não informaram projeto. Confirma que esta despesa não se refere a nenhum projeto?'}</p>
      {kind === 'conflict' ? <RadioGroup aria-label="Projeto correto da despesa" value={choice} onValueChange={value => { if (value === 'holder' || value === 'finance') setChoice(value); }}>
        {(['holder', 'finance'] as const).map(value => <label key={value} className="flex min-h-11 items-center gap-2 text-sm"><RadioGroupItem value={value}/><span className="min-w-0 break-words">{value === 'holder' ? 'Portador' : 'Financeiro'}: {projectName(value === 'holder' ? request?.review.holder_project_id ?? null : request?.review.finance_project_id ?? null)}</span></label>)}
      </RadioGroup> : kind === 'holder' ? <div className="space-y-1"><Label>Projeto informado pelo portador</Label><p className="break-words text-sm">{projectName(request?.review.holder_project_id ?? null)}</p></div> : null}
      <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => close(null)}>Voltar à classificação</Button><Button disabled={kind === 'conflict' && !choice} onClick={submit}><Check/>{kind === 'none' ? 'Confirmar sem projeto' : 'Confirmar projeto'}</Button></div>
    </DialogContent>
  </Dialog>;
  return { confirmProject, dialog };
}