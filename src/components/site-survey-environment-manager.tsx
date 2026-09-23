import { useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type EnvironmentRow = { id: string; name: string };

export function SiteSurveyEnvironmentManager({ visitId, userId, canEdit }: { visitId: string; userId: string; canEdit: boolean }) {
  const [rows, setRows] = useState<EnvironmentRow[]>([]);
  const [editing, setEditing] = useState<EnvironmentRow | null>(null);
  const [draftName, setDraftName] = useState("");

  const load = async () => {
    const { data, error } = await supabase.from("site_survey_visit_environments").select("id,name").eq("visit_id", visitId).eq("active", true).order("name");
    if (error) return toast.error(error.message);
    setRows((data ?? []) as EnvironmentRow[]);
  };

  useEffect(() => { void load(); }, [visitId]);

  const startEdit = (row?: EnvironmentRow) => {
    setEditing(row ?? { id: "", name: "" });
    setDraftName(row?.name ?? "");
  };

  const saveEdit = async () => {
    const name = draftName.trim();
    if (!name) return toast.error("Informe o nome do ambiente.");
    const payload = { visit_id: visitId, name, updated_by: userId, active: true };
    const result = editing?.id
      ? await supabase.from("site_survey_visit_environments").update(payload).eq("id", editing.id)
      : await supabase.from("site_survey_visit_environments").insert({ ...payload, created_by: userId });
    if (result.error) return toast.error(result.error.code === "23505" ? "Este ambiente já está cadastrado nesta OS." : result.error.message);
    toast.success(editing?.id ? "Ambiente atualizado." : "Ambiente adicionado.");
    setEditing(null);
    await load();
  };

  return <section className="space-y-3 border-t pt-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">Ambientes da OS</h3><p className="text-sm text-muted-foreground">Cadastre todos os ambientes antes de preencher os checklists.</p></div>{canEdit ? <Button type="button" size="sm" variant="outline" onClick={() => startEdit()}><Plus className="h-4 w-4" />Adicionar ambiente</Button> : null}</div>
    <div className="overflow-hidden rounded-md border"><div className="grid grid-cols-[1fr_72px] gap-3 bg-primary/20 px-3 py-2 text-xs font-semibold"><span>Ambiente</span><span>Ações</span></div>{rows.map((row) => <div key={row.id} className="grid grid-cols-[1fr_72px] items-center gap-3 border-t px-3 py-2 text-sm"><span className="min-w-0 truncate">{row.name}</span><div className="flex gap-1">{canEdit ? <Button type="button" size="compactIcon" variant="ghost" title="Editar ambiente" onClick={() => startEdit(row)}><Pencil className="h-3.5 w-3.5" /></Button> : null}{canEdit ? <ConfirmDeleteButton title={`Excluir ${row.name}?`} description="O ambiente será removido desta OS, mantendo os registros históricos." onConfirm={async () => { const { error } = await supabase.from("site_survey_visit_environments").update({ active: false, updated_by: userId }).eq("id", row.id); if (error) return toast.error(error.message); toast.success("Ambiente removido da OS."); await load(); }} /> : null}</div></div>)}{!rows.length ? <p className="border-t p-4 text-sm text-muted-foreground">Nenhum ambiente cadastrado nesta OS.</p> : null}</div>
    <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}><DialogContent><DialogHeader><DialogTitle>{editing?.id ? "Editar ambiente" : "Adicionar ambiente"}</DialogTitle><DialogDescription>Informe o nome do ambiente desta OS.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="environment-name">Nome do ambiente</Label><Input id="environment-name" value={draftName} onChange={(event) => setDraftName(event.target.value)} /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button><Button type="button" onClick={() => void saveEdit()}>Salvar</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}