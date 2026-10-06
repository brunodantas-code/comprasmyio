import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, ChevronDown, Droplets, FileText, ImageIcon, MapPin, Package, Search, Store, Wrench, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type SummaryQuestion = { id: string; section_id: string; prompt: string; position: number; active: boolean };
type SummarySection = { id: string; template_id: string; title: string; position: number; active: boolean };
type SummaryAttachment = { id: string; question_id: string | null; visit_luc_id: string | null; visit_environment_id: string | null; file_name: string; storage_path: string; content_type: string | null; attachment_kind?: string };
type SummaryResponse = { id: string; question_id: string; visit_luc_id: string | null; visit_environment_id: string | null; answer: unknown; question_snapshot?: unknown };
type SummaryMaterial = { id: string; visit_luc_id: string | null; visit_environment_id: string | null; catalog_item_id: string; quantity: number; notes: string | null; screwdriver_type_id?: string | null; wrench_size_id?: string | null; custom_type_item_id?: string | null };
type SummaryPoint = { id: string; kind: "luc" | "environment"; pointType: "shop" | "kiosk" | "environment"; name: string; luc: string; location: string; templateId: string | null; completionStatus: string; skippedSectionIds: string[] };
type Named = { id: string; name: string };
type CatalogItem = Named & { category: string; type_builtin: string | null };
type CustomCatalog = Named & { site_survey_custom_catalog_items: Named[] };

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");

function answerText(answer: unknown): string {
  if (answer && typeof answer === "object" && !Array.isArray(answer) && "value" in answer) {
    const stored = answer as { value: unknown; detail?: unknown };
    return [answerText(stored.value), typeof stored.detail === "string" ? stored.detail : ""].filter(Boolean).join(" — ");
  }
  if (Array.isArray(answer)) return answer.map(String).filter(Boolean).join(", ");
  if (answer === true) return "Sim";
  if (answer === false || answer === null || answer === undefined) return "";
  return String(answer).trim();
}

function snapshotPrompt(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || !("prompt" in snapshot)) return "Pergunta não disponível";
  return typeof snapshot.prompt === "string" ? snapshot.prompt : "Pergunta não disponível";
}

function sectionNature(title: string) {
  const value = normalize(title);
  if (value.includes("agua") || value.includes("hidrom") || value.includes("hidraul")) return { label: "Hidráulica", icon: Droplets };
  if (value.includes("eletric")) return { label: "Elétrica", icon: Zap };
  if (value.includes("material") || value.includes("equipamento") || value.includes("ferramenta")) return { label: "Materiais e equipamentos", icon: Wrench };
  if (value.includes("revis") || value.includes("pendencia") || value.includes("encerramento") || value.includes("observa")) return { label: "Intervenções e observações", icon: FileText };
  return { label: title || "Outras respostas", icon: FileText };
}

function matchesPoint(point: SummaryPoint, item: { visit_luc_id?: string | null; visit_environment_id?: string | null }) {
  return point.kind === "luc" ? item.visit_luc_id === point.id : item.visit_environment_id === point.id;
}

function PhotoThumbnail({ attachment }: { attachment: SummaryAttachment }) {
  const [open, setOpen] = useState(false);
  const { data: signedUrl } = useQuery({
    queryKey: ["site-survey-screen-summary-photo", attachment.storage_path],
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("site-survey-attachments").createSignedUrl(attachment.storage_path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  const isImage = attachment.content_type?.startsWith("image/") ?? /\.(jpe?g|png|webp|gif|heic)$/i.test(attachment.file_name);
  if (!isImage) return <Button type="button" variant="ghost" size="sm" className="h-14 max-w-36 justify-start whitespace-normal !bg-muted/50 px-2 text-xs !text-foreground hover:!bg-muted" disabled={!signedUrl} onClick={() => signedUrl && window.open(signedUrl, "_blank", "noopener,noreferrer")}><FileText className="h-4 w-4" /><span className="line-clamp-2">{attachment.file_name}</span></Button>;
  return <>
    <Button type="button" variant="ghost" className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-md !bg-muted p-0 hover:!bg-muted sm:h-20 sm:w-20" disabled={!signedUrl} aria-label={`Ampliar foto ${attachment.file_name}`} onClick={() => setOpen(true)}>
      {signedUrl ? <img src={signedUrl} alt={attachment.file_name} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" /> : <Camera className="h-5 w-5 text-muted-foreground" />}
    </Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[88dvh] w-[calc(100vw-2rem)] max-w-5xl overflow-hidden p-3 sm:p-4"><DialogTitle className="sr-only">{attachment.file_name}</DialogTitle>{signedUrl ? <img src={signedUrl} alt={attachment.file_name} className="mx-auto max-h-[80dvh] w-auto max-w-full rounded-md object-contain" /> : null}</DialogContent></Dialog>
  </>;
}

export function SiteSurveyScreenSummary({ visitNumber, visitTemplateId, sections, questions, lucs, environments, responses, attachments, materials, catalog, screwdriverTypes, wrenchSizes, customCatalogs }: {
  visitNumber: number;
  visitTemplateId: string | null;
  sections: SummarySection[];
  questions: SummaryQuestion[];
  lucs: Array<{ id: string; luc_number: string; shop_name: string; location: string | null; point_type: string; completion_status: string; skipped_section_ids: unknown }>;
  environments: Array<{ id: string; name: string; template_id: string | null; completion_status: string; skipped_section_ids: unknown }>;
  responses: SummaryResponse[];
  attachments: SummaryAttachment[];
  materials: SummaryMaterial[];
  catalog: CatalogItem[];
  screwdriverTypes: Named[];
  wrenchSizes: Named[];
  customCatalogs: CustomCatalog[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState("luc");
  const points = useMemo<SummaryPoint[]>(() => [
    ...lucs.map((point) => ({ id: point.id, kind: "luc" as const, pointType: point.point_type === "kiosk" ? "kiosk" as const : "shop" as const, name: point.shop_name, luc: point.luc_number, location: point.location ?? "", templateId: visitTemplateId, completionStatus: point.completion_status, skippedSectionIds: Array.isArray(point.skipped_section_ids) ? point.skipped_section_ids.filter((id): id is string => typeof id === "string") : [] })),
    ...environments.map((point) => ({ id: point.id, kind: "environment" as const, pointType: "environment" as const, name: point.name, luc: "", location: "", templateId: point.template_id ?? visitTemplateId, completionStatus: point.completion_status, skippedSectionIds: Array.isArray(point.skipped_section_ids) ? point.skipped_section_ids.filter((id): id is string => typeof id === "string") : [] })),
  ], [lucs, environments, visitTemplateId]);
  const visiblePoints = useMemo(() => points.filter((point) => {
    const term = normalize(search);
    return (typeFilter === "all" || point.pointType === typeFilter) && (!term || normalize([point.luc, point.name, point.location].join(" ")).includes(term));
  }).sort((left, right) => {
    const leftValue = sort === "name" ? left.name : sort === "location" ? left.location : left.luc;
    const rightValue = sort === "name" ? right.name : sort === "location" ? right.location : right.luc;
    return leftValue.localeCompare(rightValue, "pt-BR", { numeric: true, sensitivity: "base" }) || left.name.localeCompare(right.name, "pt-BR");
  }), [points, search, typeFilter, sort]);
  const completedCount = points.filter((point) => point.completionStatus === "concluida").length;

  return <>
    <Button type="button" variant="action" size="sm" onClick={() => setOpen(true)}><FileText className="h-4 w-4" />Resumo da visita</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="grid h-[92dvh] w-[calc(100vw-1rem)] max-w-[96rem] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-4 py-4 pr-12 text-left sm:px-6">
          <DialogTitle>Resumo da Visita #{String(visitNumber).padStart(12, "0")}</DialogTitle>
          <DialogDescription>Todas as respostas e fotos organizadas por loja, quiosque ou ambiente.</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] overflow-hidden">
          <div className="border-b bg-muted/30 px-4 py-3 sm:px-6">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_12rem_auto] sm:items-center">
              <div className="relative min-w-0"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por LUC, nome ou localização" className="pl-9" /></div>
              <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os tipos</SelectItem><SelectItem value="shop">Somente lojas</SelectItem><SelectItem value="kiosk">Somente quiosques</SelectItem><SelectItem value="environment">Somente ambientes</SelectItem></SelectContent></Select>
              <Select value={sort} onValueChange={setSort}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="luc">Ordenar por LUC</SelectItem><SelectItem value="name">Ordenar por nome</SelectItem><SelectItem value="location">Ordenar por localização</SelectItem></SelectContent></Select>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">{completedCount}/{points.length} concluídos</span>
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            <div className="divide-y divide-border">
              {visiblePoints.map((point) => {
                const pointResponses = responses.filter((item) => matchesPoint(point, item) && answerText(item.answer));
                const pointAttachments = attachments.filter((item) => matchesPoint(point, item));
                const pointMaterials = materials.filter((item) => matchesPoint(point, item));
                const availableSections = sections.filter((section) => section.active && section.template_id === point.templateId && !point.skippedSectionIds.includes(section.id)).sort((left, right) => left.position - right.position);
                const grouped = availableSections.map((section) => ({ section, nature: sectionNature(section.title), rows: pointResponses.filter((response) => questions.find((question) => question.id === response.question_id)?.section_id === section.id).sort((left, right) => (questions.find((question) => question.id === left.question_id)?.position ?? Number.MAX_SAFE_INTEGER) - (questions.find((question) => question.id === right.question_id)?.position ?? Number.MAX_SAFE_INTEGER)) })).filter((group) => group.rows.length || pointAttachments.some((attachment) => attachment.question_id && questions.find((question) => question.id === attachment.question_id)?.section_id === group.section.id));
                const knownResponseIds = new Set(grouped.flatMap((group) => group.rows.map((row) => row.id)));
                const unmatched = pointResponses.filter((response) => !knownResponseIds.has(response.id));
                const facadePhotos = pointAttachments.filter((item) => item.attachment_kind === "facade");
                const looseAttachments = pointAttachments.filter((item) => !item.question_id && item.attachment_kind !== "facade");
                const totalExpected = questions.filter((question) => question.active && availableSections.some((section) => section.id === question.section_id)).length;
                const progress = point.completionStatus === "concluida" ? 100 : totalExpected ? Math.min(99, Math.round(pointResponses.length / totalExpected * 100)) : 0;
                const typeLabel = point.pointType === "shop" ? "Loja" : point.pointType === "kiosk" ? "Quiosque" : "Ambiente";
                return <article key={`${point.kind}-${point.id}`} className="px-4 py-3 transition-colors hover:bg-muted/20 sm:px-6">
                  <div className="min-w-0">
                    <header className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,22rem)_auto] sm:items-center sm:gap-4">
                      <div className="flex min-w-0 items-start gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><Store className="h-4 w-4" /></span><div className="min-w-0"><div className="flex min-w-0 flex-wrap items-center gap-2"><h3 className="min-w-0 truncate font-bold">{point.name}</h3><Badge variant="outline" className="shrink-0">{point.luc ? `LUC ${point.luc}` : typeLabel}</Badge></div>{point.location ? <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{point.location}</span></p> : null}</div></div>
                      <div className="min-w-0"><div className="mb-1 flex justify-between text-[10px] font-semibold text-muted-foreground"><span>PROGRESSO</span><span>{progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div></div>
                      <Badge variant="status" className="justify-self-start sm:justify-self-end">{point.completionStatus === "concluida" ? "Concluída" : point.completionStatus === "cancelada" ? "Cancelada" : "Em preenchimento"}</Badge>
                    </header>
                    <div className="mt-3 min-w-0 space-y-3">
                      {facadePhotos.length ? <div className="flex items-start gap-3 border-b border-border pb-3"><div className="flex min-w-24 items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><ImageIcon className="h-4 w-4 text-primary" />Fachada</div><div className="flex min-w-0 flex-wrap gap-2">{facadePhotos.map((photo) => <PhotoThumbnail key={photo.id} attachment={photo} />)}</div></div> : null}
                      {grouped.map(({ section, nature, rows }) => { const Icon = nature.icon; const groupPhotos = pointAttachments.filter((attachment) => attachment.question_id && questions.find((question) => question.id === attachment.question_id)?.section_id === section.id); return <section key={section.id} className="min-w-0"><h4 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><Icon className="h-4 w-4 shrink-0 text-primary" />{nature.label}</h4><dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{rows.map((response, rowIndex) => { const question = questions.find((item) => item.id === response.question_id); return <div key={response.id} className="flex min-w-0 items-start gap-1.5 border-l-2 border-primary/35 pl-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-primary/15 text-[10px] font-bold leading-none text-primary">{rowIndex + 1}</span><div className="min-w-0"><dt className="text-[11px] leading-tight text-muted-foreground">{question?.prompt ?? snapshotPrompt(response.question_snapshot)}</dt><dd className="break-words text-sm font-semibold leading-tight">{answerText(response.answer)}</dd></div></div>; })}</dl>{groupPhotos.length ? <div className="mt-2 flex flex-wrap gap-2">{groupPhotos.map((photo) => <PhotoThumbnail key={photo.id} attachment={photo} />)}</div> : null}</section>; })}
                      {unmatched.length ? <section className="min-w-0"><h4 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><FileText className="h-4 w-4 text-primary" />Outras respostas</h4><dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{unmatched.map((response, rowIndex) => { const question = questions.find((item) => item.id === response.question_id); return <div key={response.id} className="flex min-w-0 items-start gap-1.5 border-l-2 border-primary/35 pl-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-primary/15 text-[10px] font-bold leading-none text-primary">{rowIndex + 1}</span><div className="min-w-0"><dt className="text-[11px] leading-tight text-muted-foreground">{question?.prompt ?? snapshotPrompt(response.question_snapshot)}</dt><dd className="break-words text-sm font-semibold leading-tight">{answerText(response.answer)}</dd></div></div>; })}</dl></section> : null}
                      {pointMaterials.length ? <section className="min-w-0"><h4 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><Package className="h-4 w-4 text-primary" />Itens previstos</h4><div className="flex flex-wrap gap-2">{pointMaterials.map((material) => { const item = catalog.find((entry) => entry.id === material.catalog_item_id); const detail = item?.type_builtin === "screwdriver" ? screwdriverTypes.find((entry) => entry.id === material.screwdriver_type_id)?.name : item?.type_builtin === "wrench" ? wrenchSizes.find((entry) => entry.id === material.wrench_size_id)?.name : customCatalogs.flatMap((entry) => entry.site_survey_custom_catalog_items).find((entry) => entry.id === material.custom_type_item_id)?.name; return <span key={material.id} className="rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs"><strong>{material.quantity}× {item?.name ?? "Item"}</strong>{detail ? ` · ${detail}` : ""}{material.notes ? ` · ${material.notes}` : ""}</span>; })}</div></section> : null}
                      {looseAttachments.length ? <section className="min-w-0"><h4 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><Camera className="h-4 w-4 text-primary" />Outras fotos</h4><div className="flex flex-wrap gap-2">{looseAttachments.map((photo) => <PhotoThumbnail key={photo.id} attachment={photo} />)}</div></section> : null}
                      {!pointResponses.length && !pointAttachments.length && !pointMaterials.length ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Nenhuma resposta ou foto registrada neste ponto.</p> : null}
                    </div>
                  </div>
                </article>;
              })}
              {!visiblePoints.length ? <div className="px-6 py-16 text-center text-sm text-muted-foreground">Nenhuma loja, quiosque ou ambiente encontrado.</div> : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}