import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type QuestionOption = { id: string; prompt: string; options: unknown };
export type TimeAssumption = { id: string; name: string; question_id: string | null; answer_value: string | null; minutes: number; active: boolean; position: number };

export function SiteSurveyTimeAssumptions({ items, questions, userId, onChanged }: { items: TimeAssumption[]; questions: QuestionOption[]; userId: string; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [questionId, setQuestionId] = useState("none");
  const selectedQuestion = questions.find((question) => question.id === questionId);
  const options = Array.isArray(selectedQuestion?.options) ? selectedQuestion.options.filter((value): value is string => typeof value === "string") : [];

  const save = async (form: HTMLFormElement) => {
    const values = new FormData(form);
    const name = String(values.get("name") ?? "").trim();
    const minutes = Number(values.get("minutes"));
    if (!name || !Number.isInteger(minutes) || minutes <= 0) return toast.error("Informe uma descrição e uma duração válida.");
    const answerValue = String(values.get("answer_value") ?? "").trim() || null;
    const { error } = await supabase.from("site_survey_time_assumptions").insert({ name, minutes, question_id: questionId === "none" ? null : questionId, answer_value: answerValue, created_by: userId, position: items.length });
    if (error) return toast.error(error.message);
    toast.success("Premissa de tempo adicionada");
    setDialogOpen(false); setQuestionId("none"); onChanged();
  };

  return <Collapsible open={open} onOpenChange={setOpen} asChild><Card>
    <CardHeader className="py-4"><div className="flex items-center justify-between gap-3"><CardTitle className="text-base">Premissas de tempo</CardTitle><div className="flex items-center gap-2"><Button type="button" size="compactIcon" variant="ghost" aria-label="Adicionar premissa de tempo" title="Adicionar premissa" onClick={() => setDialogOpen(true)}><Plus /></Button><CollapsibleTrigger asChild><Button type="button" size="compactIcon" variant="ghost" aria-label={open ? "Recolher premissas de tempo" : "Exibir premissas de tempo"} title={open ? "Recolher" : "Exibir"}><ChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} /></Button></CollapsibleTrigger></div></div></CardHeader>
    <CollapsibleContent><CardContent className="pb-4"><p className="mb-3 text-sm text-muted-foreground">Cada regra adiciona minutos à estimativa quando a resposta correspondente for encontrada.</p><div className="divide-y rounded-md border">{items.map((item) => <div key={item.id} className="grid gap-1 p-3 text-sm sm:grid-cols-[1fr_1fr_100px_auto] sm:items-center"><span className="font-medium">{item.name}</span><span className="text-muted-foreground">{questions.find((question) => question.id === item.question_id)?.prompt ?? "Base por ponto"}{item.answer_value ? ` — ${item.answer_value}` : ""}</span><span>{item.minutes} min</span><ConfirmDeleteButton title={`Excluir ${item.name}?`} description="A premissa deixará de compor os próximos cálculos." onConfirm={async () => { const { error } = await supabase.from("site_survey_time_assumptions").update({ active: false }).eq("id", item.id); if (error) return toast.error(error.message); toast.success("Premissa excluída"); onChanged(); }} /></div>)}{items.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nenhuma premissa cadastrada.</p> : null}</div></CardContent></CollapsibleContent>
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>Nova premissa de tempo</DialogTitle><DialogDescription>Defina a duração base ou associe-a a uma resposta do checklist.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void save(event.currentTarget); }}><div className="space-y-2"><Label htmlFor="assumption-name">Descrição</Label><Input id="assumption-name" name="name" required placeholder="Ex.: Instalação de hidrômetro flangeado" /></div><div className="space-y-2"><Label>Pergunta relacionada</Label><Select value={questionId} onValueChange={setQuestionId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Aplicar uma vez por ponto</SelectItem>{questions.map((question) => <SelectItem key={question.id} value={question.id}>{question.prompt}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="assumption-answer">Resposta que aplica a regra</Label>{options.length ? <Select name="answer_value"><SelectTrigger><SelectValue placeholder="Qualquer resposta preenchida" /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select> : <Input id="assumption-answer" name="answer_value" placeholder="Em branco: qualquer resposta preenchida" />}</div><div className="space-y-2"><Label htmlFor="assumption-minutes">Duração em minutos</Label><Input id="assumption-minutes" name="minutes" type="number" min="1" step="1" required /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></DialogFooter></form></DialogContent></Dialog>
  </Card></Collapsible>;
}