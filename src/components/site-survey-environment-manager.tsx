import { Fragment, useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { useInstallationScope, InstallationApprovalCell, ContractedScopeFields } from "@/components/site-survey-installation-approvals";
import type { FacadeThumbnailAttachment } from "@/components/site-survey-facade-thumbnail";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { surveyPointType, surveyPointTypeLabel, type SurveyPointType } from "@/lib/site-survey-point-type";
import { supabase } from "@/integrations/supabase/client";

type EnvironmentRow = { id: string; name: string; template_id: string | null; point_type?: string; environment_type_id?: string | null };
type EnvironmentTypeOption = { id: string; name: string; discipline: string };
type TemplateOption = { id: string; name: string; active: boolean };

export function SiteSurveyEnvironmentManager({ visitId, userId, canEdit, canApprove = false, templates, compact = false, refreshKey = 0, attachments = [], missingFacadeOnly = false, onMissingFacadeOnlyChange, typeFilter = "all", onTypeFilterChange, pendingCount, renderPending, renderHistory, isPointVisible, onPointNameClick, onChanged, addOnly = false }: { addOnly?: boolean; visitId: string; userId: string; canEdit: boolean; canApprove?: boolean; templates: TemplateOption[]; compact?: boolean; refreshKey?: number; attachments?: FacadeThumbnailAttachment[]; missingFacadeOnly?: boolean; onMissingFacadeOnlyChange?: (value: boolean) => void; typeFilter?: string; onTypeFilterChange?: (value: string) => void; pendingCount?: (pointValue: string) => number; renderPending?: (pointValue: string) => ReactNode; renderHistory?: (pointValue: string) => ReactNode; isPointVisible?: (pointValue: string) => boolean; onPointNameClick?: (pointValue: string) => void; onChanged?: () => void }) {
  const scope = useInstallationScope(visitId);
  const [rows, setRows] = useState<EnvironmentRow[]>([]);
  const [environmentTypes, setEnvironmentTypes] = useState<EnvironmentTypeOption[]>([]);
  const [draftTypeId, setDraftTypeId] = useState("");
  const [editing, setEditing] = useState<EnvironmentRow | null>(null);
  const [draftType, setDraftType] = useState<SurveyPointType>("environment");
  const [draftName, setDraftName] = useState("");
  const [draftTemplateId, setDraftTemplateId] = useState("");
  const [pendingFilter, setPendingFilter] = useState("all");
  const [expandedPending, setExpandedPending] = useState<Set<string>>(() => new Set());

  const load = async () => {
    const [{ data, error }, { data: typesData, error: typesError }] = await Promise.all([
      supabase.from("site_survey_visit_environments").select("id,name,template_id,point_type,environment_type_id").eq("visit_id", visitId).eq("active", true).order("name"),
      supabase.from("site_survey_environment_types").select("id,name,discipline").eq("active", true).order("name"),
    ]);
    if (error || typesError) return toast.error(error?.message ?? typesError?.message);
    setRows((data ?? []) as EnvironmentRow[]);
    setEnvironmentTypes((typesData ?? []) as EnvironmentTypeOption[]);
  };

  useEffect(() => { void load(); }, [visitId, refreshKey]);

  const restoreScheduledVisitWhenEmpty = async () => {
    const [{ count: lucCount, error: lucError }, { count: environmentCount, error: environmentError }] = await Promise.all([
      supabase.from("site_survey_visit_lucs").select("id", { count: "exact", head: true }).eq("visit_id", visitId).eq("active", true),
      supabase.from("site_survey_visit_environments").select("id", { count: "exact", head: true }).eq("visit_id", visitId).eq("active", true),
    ]);
    if (lucError || environmentError) throw lucError ?? environmentError;
    if ((lucCount ?? 0) === 0 && (environmentCount ?? 0) === 0) {
      const { error } = await supabase.from("site_survey_visits").update({ status: "agendada", started_at: null, submitted_at: null }).eq("id", visitId).eq("status", "em_andamento").gt("scheduled_start", new Date().toISOString());
      if (error) throw error;
    }
  };

  const startEdit = (row?: EnvironmentRow) => {
    if (!canEdit || (addOnly && row)) return;
    setEditing(row ?? { id: "", name: "", template_id: null });
    setDraftName(row?.name ?? "");
    setDraftType(row ? surveyPointType(row, "environment") : "environment");
    setDraftTemplateId(row?.template_id ?? "");
    setDraftTypeId(row?.environment_type_id ?? "");
  };

  const saveEdit = async () => {
    if (!canEdit || (addOnly && editing?.id)) return;
    const name = draftName.trim();
    if (!name) return toast.error("Informe o nome do ambiente.");
    if (!draftTemplateId) return toast.error("Selecione o checklist do ambiente.");
    const payload = { visit_id: visitId, name, point_type: draftType, template_id: draftTemplateId, environment_type_id: draftType === "environment" ? draftTypeId || null : null, updated_by: userId, active: true };
    const { data: existing, error: lookupError } = editing?.id
      ? { data: null, error: null }
      : await supabase.from("site_survey_visit_environments").select("id,active").eq("visit_id", visitId).eq("name", name).maybeSingle();
    if (lookupError) return toast.error(lookupError.message);
    if (existing?.active) return toast.error("Este ambiente já está cadastrado nesta OS.");
    const result = editing?.id
      ? await supabase.from("site_survey_visit_environments").update(payload).eq("id", editing.id)
      : existing
        ? await supabase.from("site_survey_visit_environments").update(payload).eq("id", existing.id)
        : await supabase.from("site_survey_visit_environments").insert({ ...payload, created_by: userId });
    if (result.error) return toast.error(result.error.code === "23505" ? "Este ambiente já está cadastrado nesta OS." : result.error.message);
    toast.success(editing?.id ? "Ambiente atualizado." : existing ? "Ambiente reativado com o checklist selecionado." : "Ambiente adicionado.");
    setEditing(null);
    await load();
    onChanged?.();
  };

  const visibleRows = rows.filter((row) => (pendingFilter === "all" || (pendingFilter === "with" ? (pendingCount?.(`environment:${row.id}`) ?? 0) > 0 : (pendingCount?.(`environment:${row.id}`) ?? 0) === 0)) && (typeFilter === "all" || surveyPointType(row, "environment") === typeFilter) && (!missingFacadeOnly || !attachments.some((item) => item.attachment_kind === "facade" && item.visit_environment_id === row.id)) && (isPointVisible?.(`environment:${row.id}`) ?? true));

  return <section className={`space-y-3 ${compact ? "" : "pt-5"}`}>
    {!compact ? <div className="flex flex-wrap items-start justify-between gap-3">{!addOnly ? <div><h3 className="font-bold">Cadastro completo de lojas, quiosques e ambientes</h3></div> : null}{canEdit ? <Button type="button" size="sm" variant="outline" onClick={() => startEdit()}><Plus className="h-4 w-4" />Adicionar ambiente</Button> : null}</div> : null}
    {!addOnly && !compact ? <div className="flex flex-wrap items-center gap-3"><Select value={typeFilter} onValueChange={onTypeFilterChange}><SelectTrigger aria-label="Filtrar por tipo" className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os tipos</SelectItem><SelectItem value="shop">Somente lojas</SelectItem><SelectItem value="kiosk">Somente quiosques</SelectItem><SelectItem value="environment">Somente ambientes</SelectItem></SelectContent></Select><label className="flex w-fit cursor-pointer items-center gap-2 text-sm"><Checkbox aria-label="Somente sem foto de fachada" checked={missingFacadeOnly} onCheckedChange={(checked) => onMissingFacadeOnlyChange?.(checked === true)} />Somente sem foto de fachada</label></div> : null}
    {!addOnly ? <><ContractedScopeFields scope={scope} canEdit={canApprove} onChanged={onChanged} />{visibleRows.length ? <div className="overflow-hidden rounded-md border"><div className="grid grid-cols-[minmax(180px,1fr)_96px_minmax(120px,1fr)_132px_128px_88px] gap-3 bg-primary/20 px-3 py-2 text-xs font-semibold"><span>Nome</span><span>Tipo</span><span>Checklist</span><span>Instalação aprovada</span><div className="space-y-1.5"><span>Pendências</span><Select value={pendingFilter} onValueChange={setPendingFilter}><SelectTrigger aria-label="Filtrar por pendências" className="h-8 text-xs font-normal"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="with">Com pendências</SelectItem><SelectItem value="without">Sem pendências</SelectItem></SelectContent></Select></div><span>Ações</span></div>{visibleRows.map((row) => { const pointValue = `environment:${row.id}`; const count = pendingCount?.(pointValue) ?? 0; const expanded = expandedPending.has(pointValue); return <Fragment key={row.id}><div className="grid grid-cols-[minmax(180px,1fr)_96px_minmax(120px,1fr)_132px_128px_88px] items-center gap-3 border-t px-3 py-2 text-sm">{onPointNameClick ? <button type="button" className="min-w-0 truncate text-left text-foreground transition-colors hover:text-primary hover:underline" onClick={() => onPointNameClick(pointValue)}>{row.name}</button> : <span className="min-w-0 truncate">{row.name}</span>}<span>{surveyPointTypeLabel(surveyPointType(row, "environment"))}</span><span className="min-w-0 truncate text-muted-foreground">{templates.find((template) => template.id === row.template_id)?.name ?? "Checklist da OS"}</span><InstallationApprovalCell point={{id:row.id, source:"environment", shop_name:row.name, luc_number:""}} scope={scope} canEdit={canApprove} onChanged={onChanged} /><span className="text-xs tabular-nums text-muted-foreground">{count}</span><div className="flex items-center gap-1"><Button type="button" size="compactIcon" variant="ghost" aria-label={expanded ? `Recolher histórico de ${row.name}` : `Exibir histórico de ${row.name}`} title={expanded ? "Recolher histórico e pendências" : "Exibir histórico e pendências"} onClick={() => setExpandedPending((current) => { const next = new Set(current); if (next.has(pointValue)) next.delete(pointValue); else next.add(pointValue); return next; })}><ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} /></Button>{canEdit ? <Button type="button" size="compactIcon" variant="ghost" title="Editar ambiente" onClick={() => startEdit(row)}><Pencil className="h-3.5 w-3.5" /></Button> : null}{canEdit ? <ConfirmDeleteButton title={`Excluir ${row.name}?`} description="O ambiente será removido desta OS, mantendo os registros históricos." onConfirm={async () => { const { error } = await supabase.from("site_survey_visit_environments").update({ active: false, updated_by: userId }).eq("id", row.id); if (error) return toast.error(error.message); try { await restoreScheduledVisitWhenEmpty(); } catch (resetError) { return toast.error(resetError instanceof Error ? resetError.message : "Não foi possível atualizar a situação da visita."); } toast.success("Ambiente removido da OS."); await load(); onChanged?.(); }} /> : null}</div></div>{expanded ? <div className="border-t bg-muted/20 p-3">{renderHistory ? <div className="space-y-4">{renderHistory(pointValue)}</div> : count ? <div className="space-y-4">{renderPending?.(pointValue)}</div> : null}</div> : null}</Fragment>; })}</div> : !compact ? <p className="rounded-md border p-4 text-sm text-muted-foreground">{typeFilter !== "all" ? "Nenhum ponto do tipo selecionado nesta OS." : missingFacadeOnly ? "Nenhum ambiente sem foto de fachada." : "Nenhum ambiente cadastrado nesta OS."}</p> : null}</> : null}
    <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}><DialogContent><DialogHeader><DialogTitle>{editing?.id ? "Editar ambiente" : "Adicionar ambiente"}</DialogTitle><DialogDescription>Informe o ambiente imprevisto e selecione o checklist adequado.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="environment-type">Tipo</Label><Select value={draftType} onValueChange={(value) => setDraftType(value as SurveyPointType)}><SelectTrigger id="environment-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="shop">Loja</SelectItem><SelectItem value="kiosk">Quiosque</SelectItem><SelectItem value="environment">Ambiente</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="environment-name">Nome do ambiente</Label><Input id="environment-name" value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="Ex.: Caixa d'água" /></div><div className="space-y-2"><Label>Checklist</Label><Select value={draftTemplateId || undefined} onValueChange={setDraftTemplateId}><SelectTrigger><SelectValue placeholder="Selecione um checklist" /></SelectTrigger><SelectContent>{templates.filter((template) => template.active).map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent></Select></div>{draftType === "environment" ? <div className="space-y-2"><Label>Tipo de ambiente (opcional)</Label><Select value={draftTypeId || "none"} onValueChange={(value) => setDraftTypeId(value === "none" ? "" : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem tipo</SelectItem>{environmentTypes.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}</SelectContent></Select></div> : null}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button><Button type="button" onClick={() => void saveEdit()}>Salvar</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}