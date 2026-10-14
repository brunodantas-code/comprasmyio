import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ConfirmDeleteButton } from '@/components/confirm-delete-button';
import type { SurveyReportText } from '@/lib/site-survey-client-pending';

type Props = {
 questions: { id: string; prompt: string; section_id: string }[];
 sections: { id: string; template_id: string }[];
 templates: { id: string; name: string }[];
 questionActions: { question_id: string; action_id: string; active: boolean }[];
 actionCatalog: { id: string; name: string; active: boolean }[];
 userId: string; title: string; onEditTitle: () => void;
};
const blank = { name: '', question_id: '', answer_value: '', report_answer: '' };
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
export function SiteSurveyReportTexts({ questions, sections, templates, questionActions, actionCatalog, userId, title, onEditTitle }: Props) {
 const qc = useQueryClient();
 const [open, setOpen] = useState(false);
 const [draft, setDraft] = useState<(typeof blank & { id?: string }) | null>(null);
 const [templateId, setTemplateId] = useState('');
 const [busy, setBusy] = useState(false);
 const { data = [], error, isPending } = useQuery({ queryKey: ['site-survey-report-texts'], queryFn: async () => {
  const rows: SurveyReportText[] = [];
  for (let from = 0; ; from += 1000) {
   const result = await supabase.from('site_survey_report_texts').select('id,name,question_id,answer_value,report_answer').order('name').order('id').range(from, from + 999);
   if (result.error) throw result.error;
   rows.push(...(result.data ?? []));
   if ((result.data?.length ?? 0) < 1000) return rows;
  }
 } });
 const templateName = (id: string) => {
  const question = questions.find(item => item.id === id);
  const section = sections.find(item => item.id === question?.section_id);
  return templates.find(item => item.id === section?.template_id)?.name ?? '';
 };
 const interventionActionIds = useMemo(() => new Set(actionCatalog.filter(item => item.active && normalized(item.name).includes('intervencao do cliente')).map(item => item.id)), [actionCatalog]);
 const interventionQuestionIds = useMemo(() => new Set(questionActions.filter(item => item.active && interventionActionIds.has(item.action_id)).map(item => item.question_id)), [interventionActionIds, questionActions]);
 const availableQuestions = useMemo(() => {
  if (!templateId) return [];
  const sectionIds = new Set(sections.filter(item => item.template_id === templateId).map(item => item.id));
  return questions.filter(item => sectionIds.has(item.section_id) && interventionQuestionIds.has(item.id));
 }, [interventionQuestionIds, questions, sections, templateId]);
 const openDraft = (item: typeof blank & { id?: string }) => {
  const question = questions.find(questionItem => questionItem.id === item.question_id);
  const section = sections.find(sectionItem => sectionItem.id === question?.section_id);
  setTemplateId(section?.template_id ?? '');
  setDraft(item);
 };
 const save = async () => {
  if (!draft || busy) return;
  if (!draft.name.trim() || !draft.question_id || !draft.report_answer.trim()) return toast.error('Informe nome, pergunta e resposta para o relatório.');
  setBusy(true);
  try {
   const payload = { name: draft.name.trim(), question_id: draft.question_id, answer_value: draft.answer_value.trim(), report_answer: draft.report_answer.trim() };
   const result = draft.id ? await supabase.from('site_survey_report_texts').update(payload).eq('id', draft.id).select('id') : await supabase.from('site_survey_report_texts').insert({ ...payload, created_by: userId }).select('id');
   if (result.error) throw result.error;
   if (!result.data?.length) throw new Error('Não foi possível salvar. Verifique sua permissão.');
   await qc.invalidateQueries({ queryKey: ['site-survey-report-texts'] });
   setDraft(null); toast.success('Texto salvo');
  } catch (err) { toast.error(err && typeof err === 'object' && 'code' in err && err.code === '23505' ? 'Já existe um texto para esta pergunta e resposta.' : err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Não foi possível salvar.'); }
  finally { setBusy(false); }
 };
 return <Card><CardHeader className="py-4"><div className="flex items-center justify-between gap-3"><CardTitle className="min-w-0 text-base">{title}</CardTitle><div className="flex shrink-0 gap-2"><Button variant="ghost" size="compactIcon" title="Editar cadastro" aria-label={`Editar cadastro ${title}`} onClick={onEditTitle}><Pencil /></Button><Button variant="ghost" size="compactIcon" title="Adicionar texto" aria-label="Adicionar texto de relatório" onClick={() => openDraft({ ...blank })}><Plus /></Button><Button variant="ghost" size="compactIcon" title={open ? 'Recolher' : 'Exibir'} aria-label={`${open ? 'Recolher' : 'Exibir'} ${title}`} onClick={() => setOpen(!open)}><ChevronDown className={open ? 'rotate-180' : ''} /></Button></div></div></CardHeader>{open ? <CardContent><div className="divide-y divide-border">{isPending ? <p>Carregando…</p> : error ? <p className="text-destructive">Não foi possível carregar os textos.</p> : !data.length ? <p className="text-sm text-muted-foreground">Nenhum texto cadastrado.</p> : data.map(item => <div key={item.id} className="flex items-start justify-between gap-3 py-3"><div className="min-w-0 text-sm"><p className="font-semibold">{item.name}</p><p className="text-xs text-muted-foreground">{templateName(item.question_id)} · {questions.find(question => question.id === item.question_id)?.prompt}</p><p className="break-words">{item.answer_value || 'Todas as respostas'} → {item.report_answer}</p></div><div className="flex shrink-0 gap-2"><Button variant="ghost" size="compactIcon" title="Editar" aria-label={`Editar texto ${item.name}`} onClick={() => openDraft(item)}><Pencil /></Button><ConfirmDeleteButton ariaLabel={`Excluir texto ${item.name}`} title={`Excluir ${item.name}?`} description="As respostas do checklist serão preservadas; o PDF voltará a usar o texto original." onConfirm={async () => { const result = await supabase.from('site_survey_report_texts').delete().eq('id', item.id).select('id'); if (result.error || !result.data?.length) { toast.error(result.error?.message ?? 'Não foi possível excluir.'); return; } await qc.invalidateQueries({ queryKey: ['site-survey-report-texts'] }); toast.success('Texto excluído'); }} /></div></div>)}</div></CardContent> : null}<Dialog open={Boolean(draft)} onOpenChange={next => { if (!next && !busy) { setDraft(null); setTemplateId(''); } }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{draft?.id ? 'Editar texto de relatório' : 'Novo texto de relatório'}</DialogTitle></DialogHeader>{draft ? <form className="space-y-4" onSubmit={event => { event.preventDefault(); void save(); }}><div className="space-y-2"><Label htmlFor="report-text-name">Nome</Label><Input id="report-text-name" required maxLength={120} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></div><div className="space-y-2"><Label>Checklist</Label><Select value={templateId} onValueChange={value => { setTemplateId(value); setDraft({ ...draft, question_id: '' }); }}><SelectTrigger><SelectValue placeholder="Selecionar checklist" /></SelectTrigger><SelectContent>{templates.filter(item => item.id === templateId || item.name.trim()).map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Pergunta do checklist</Label><Select value={draft.question_id} disabled={!templateId || !availableQuestions.length} onValueChange={value => setDraft({ ...draft, question_id: value })}><SelectTrigger className="h-auto min-h-9 whitespace-normal text-left"><SelectValue placeholder={!templateId ? 'Selecione o checklist primeiro' : availableQuestions.length ? 'Selecionar pergunta' : 'Nenhuma pergunta gera intervenção do cliente'} /></SelectTrigger><SelectContent>{availableQuestions.map(question => <SelectItem key={question.id} value={question.id}>{question.prompt}</SelectItem>)}</SelectContent></Select></div>{([['answer_value', 'Resposta original (vazio para todas)'], ['report_answer', 'Resposta no PDF']] as const).map(([key, label]) => <div className="space-y-2" key={key}><Label htmlFor={`report-text-${key}`}>{label}</Label>{key === 'answer_value' ? <Input id={`report-text-${key}`} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /> : <Textarea id={`report-text-${key}`} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} />}</div>)}<DialogFooter><Button variant="action" type="button" disabled={busy} onClick={() => { setDraft(null); setTemplateId(''); }}>Cancelar</Button><Button variant="action" type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</Button></DialogFooter></form> : null}</DialogContent></Dialog></Card>;
}
