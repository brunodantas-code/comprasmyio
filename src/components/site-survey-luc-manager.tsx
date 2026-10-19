import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Camera, Check, ChevronDown, ChevronsUpDown, Download, FileSpreadsheet, FileText, Images, Pencil, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { SiteSurveyFacadeThumbnail, type FacadeThumbnailAttachment } from "@/components/site-survey-facade-thumbnail";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useInstallationScope, InstallationApprovalCell, ContractedScopeFields } from "@/components/site-survey-installation-approvals";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { surveyPointType, surveyPointTypeLabel, surveyPointTotals, requiresSurveyLuc, type SurveyPointType } from "@/lib/site-survey-point-type";
import { approvalEnergyWaterTotals, type EnergyWaterTotals } from "@/lib/site-survey-energy-water";
import { environmentLocation } from "@/lib/site-survey-environment-location";
import { environmentDisciplineTotals } from "@/lib/site-survey-environment-totals";
import { registrationServices } from "@/lib/site-survey-registration-export";
import { supabase } from "@/integrations/supabase/client";
import { suggestShopNameFromFacade } from "@/lib/site-survey-ai.functions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Fotos de câmeras de celular (principalmente Android) são grandes; reduzimos antes de enviar para leitura da fachada.
const shrinkPhoto = (dataUrl: string) => new Promise<string>((resolve) => {
  const image = new Image();
  image.onload = () => {
    try {
      const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");
      if (!context) return resolve(dataUrl);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    } catch { resolve(dataUrl); }
  };
  image.onerror = () => resolve(dataUrl);
  image.src = dataUrl;
});

type LucRow = { id: string; luc_number: string; shop_name: string; contract_name?: string | null; location: string | null; point_type: string; classification_type?: string | null; meter_number?: string | null };
type EnvironmentRow = { id: string; name: string; location?: string | null; template_id: string | null; point_type: string; meter_number?: string | null; environment_type_id?: string | null };
type EnvironmentTypeOption = { id: string; name: string; discipline: string };
type DisplayRow = { environment_type_id?: string | null; id: string; source: "luc" | "environment"; luc_number: string; shop_name: string; contract_name?: string | null; location: string | null; point_type: string; classification_type?: string | null; meter_number?: string | null; template_id: string | null };
type LucHistoryRow = { id: string; visit_luc_id: string; luc_number: string; shop_name: string; valid_from: string; valid_until: string | null };
type PreviewRow = { lucNumber: string; shopName: string; location: string; meterNumber: string; issue?: string };
type TemplateOption = { id: string; name: string; active: boolean };
export type ShopCatalogOption = { id: string; name: string; point_type: string; active: boolean };

// Totalizadores do cadastro: mesmo padrão visual das situações de visita (barra + rótulo + quantidade).
const POINT_TOTALS: { key: SurveyPointType; label: string }[] = [
  { key: "shop", label: "Lojas" },
  { key: "kiosk", label: "Quiosques" },
  { key: "environment", label: "Ambientes" },
  { key: "vacant", label: "Lojas vagas" },
];

const SERVICE_TOTALS_PRIMARY: { key: keyof EnergyWaterTotals; label: string }[] = [
  { key: "energyAll", label: "Energia" },
  { key: "waterAll", label: "Água" },
];

const SERVICE_TOTALS_SECONDARY: { key: keyof EnergyWaterTotals; label: string }[] = [
  { key: "energy", label: "Só Energia" },
  { key: "water", label: "Só Água" },
  { key: "both", label: "Água + Energia" },
];

function TotalChip({ label, count, compact = false }: { label: string; count: number; compact?: boolean }) {
  const isActive = count > 0;
  return <div className={`flex min-w-0 items-center gap-2 rounded-sm px-2.5 py-1.5 ${compact ? "" : "sm:w-44"} ${isActive ? "bg-myio-green/5" : ""}`}>
    <span className={`h-5 w-1.5 shrink-0 rounded-full ${isActive ? "bg-myio-green" : "bg-muted-foreground/25"}`} aria-hidden="true" />
    <span className={`text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
    <strong className={`text-base leading-none tabular-nums ${isActive ? "text-foreground" : "text-muted-foreground/70"}`}>{count}</strong>
  </div>;
}

function PointTypeTotals({ totals, groupTotals, environmentTotals }: { totals: Record<SurveyPointType, number>; groupTotals?: { shops: EnergyWaterTotals; concessionaria: EnergyWaterTotals; others: EnergyWaterTotals; hasConcessionaria: boolean; hasOthers: boolean }; environmentTotals?: { hydraulic: number; electrical: number } }) {
  const grandTotal = totals.shop + totals.kiosk + totals.environment + totals.vacant;
  const serviceLine = (label: string, values: EnergyWaterTotals) => <div className="flex flex-wrap items-center gap-2" aria-label={`Totalizadores de ${label}`}><span className="text-xs font-semibold text-foreground">{label}</span>{[...SERVICE_TOTALS_PRIMARY, ...SERVICE_TOTALS_SECONDARY].map((item) => <TotalChip key={item.key} label={item.label} count={values[item.key]} />)}</div>;
  // Na desktop, a 1ª linha traz as quantidades de pontos (até Lojas vagas); as demais, água/energia por grupo.
  return <div className="w-full min-w-0 space-y-1" aria-label="Quantidade de lojas, quiosques e ambientes">
    <div className="grid min-w-0 items-center gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="min-w-0"><h3 className="font-bold">Cadastro completo de lojas, quiosques e ambientes</h3><p className="text-sm text-muted-foreground">Expanda uma linha para consultar ou completar suas pendências.</p></div>
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-5">
      <TotalChip compact label="Total geral" count={grandTotal} />
      {POINT_TOTALS.filter((item) => item.key !== "vacant" || totals.vacant > 0).map((item) => <TotalChip compact key={item.key} label={item.label} count={totals[item.key]} />)}
      </div>
    </div>
    {groupTotals ? serviceLine("Lojas e Quiosques", groupTotals.shops) : null}
    {groupTotals?.hasConcessionaria ? serviceLine("Entrada da Concessionária", groupTotals.concessionaria) : null}
    {groupTotals?.hasOthers ? serviceLine("Demais ambientes", groupTotals.others) : null}
    {environmentTotals && (environmentTotals.hydraulic > 0 || environmentTotals.electrical > 0) ? <div className="flex flex-wrap items-center gap-2" aria-label="Ambientes por disciplina"><TotalChip label="Hidrômetros" count={environmentTotals.hydraulic} /><TotalChip label="Medições elétricas" count={environmentTotals.electrical} /></div> : null}
  </div>;
}

const normalizeHeader = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");

export function SiteSurveyLucManager({ visitId, userId, canImport, canEdit, canApprove = false, compactSearch = false, serviceTotals, templates, shopCatalog, attachments = [], missingFacadeOnly = false, onMissingFacadeOnlyChange, typeFilter = "all", onTypeFilterChange, pendingToolbar, clientToolbar, pendingCount, interventionCount, renderPending, renderHistory, isPointVisible, onPointNameClick, onChanged, addOnly = false }: { addOnly?: boolean; compactSearch?: boolean; visitId: string; userId: string; canImport: boolean; canEdit: boolean; canApprove?: boolean; serviceTotals?: EnergyWaterTotals; templates: TemplateOption[]; shopCatalog: ShopCatalogOption[]; attachments?: FacadeThumbnailAttachment[]; missingFacadeOnly?: boolean; onMissingFacadeOnlyChange?: (value: boolean) => void; typeFilter?: string; onTypeFilterChange?: (value: string) => void; pendingToolbar?: ReactNode; clientToolbar?: ReactNode; pendingCount?: (pointValue: string) => number; interventionCount?: (pointValue: string) => number; renderPending?: (pointValue: string) => ReactNode; renderHistory?: (pointValue: string) => ReactNode; isPointVisible?: (pointValue: string) => boolean; onPointNameClick?: (pointValue: string) => void; onChanged?: () => void }) {
  const scope = useInstallationScope(visitId);
  const inputRef = useRef<HTMLInputElement>(null);
  const facadeCameraRef = useRef<HTMLInputElement>(null);
  const facadeGalleryRef = useRef<HTMLInputElement>(null);
  const facadeRequest = useRef(0);
  const nameRevision = useRef(0);
  const [rows, setRows] = useState<LucRow[]>([]);
  const [environmentRows, setEnvironmentRows] = useState<EnvironmentRow[]>([]);
  const [environmentTypes, setEnvironmentTypes] = useState<EnvironmentTypeOption[]>([]);
  const [history, setHistory] = useState<LucHistoryRow[]>([]);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState<LucRow | null>(null);
  const [editingEnvironmentId, setEditingEnvironmentId] = useState<string | null>(null);
  const [draftLuc, setDraftLuc] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftContractName, setDraftContractName] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [pointType, setPointType] = useState<"shop" | "kiosk" | "environment" | "vacant" | null>(null);
  const [environmentName, setEnvironmentName] = useState("");
  const [environmentTemplateId, setEnvironmentTemplateId] = useState("");
  const [environmentTypeId, setEnvironmentTypeId] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [draftMeter, setDraftMeter] = useState("");
  const [saving, setSaving] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const [editMode, setEditMode] = useState<"correction" | "name_change">("correction");
  const [sortBy, setSortBy] = useState<"luc_number" | "shop_name" | "location">("luc_number");
  const [sortAscending, setSortAscending] = useState(true);
  const [lucFilter, setLucFilter] = useState("");
  const [shopNameFilter, setShopNameFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [duplicateConfirmation, setDuplicateConfirmation] = useState<"edit" | "import" | null>(null);
  const [namePickerOpen, setNamePickerOpen] = useState(false);
  const [pendingFilter, setPendingFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState<"all" | "water" | "energy" | "both" | "none">("all");
  const [expandedPending, setExpandedPending] = useState<Set<string>>(() => new Set());

  const load = async () => {
    const [{ data, error }, { data: environmentsData, error: environmentsError }, { data: historyRows, error: historyError }, { data: environmentTypesData, error: environmentTypesError }] = await Promise.all([
      supabase.from("site_survey_visit_lucs").select("id,luc_number,shop_name,contract_name,location,point_type,classification_type,meter_number").eq("visit_id", visitId).eq("active", true).order("luc_number"),
      supabase.from("site_survey_visit_environments").select("id,name,location,template_id,point_type,meter_number,environment_type_id").eq("visit_id", visitId).eq("active", true).order("name"),
      supabase.from("site_survey_visit_luc_history").select("id,visit_luc_id,luc_number,shop_name,valid_from,valid_until").eq("visit_id", visitId).order("valid_from", { ascending: false }),
      supabase.from("site_survey_environment_types").select("id,name,discipline").eq("active", true).order("name"),
    ]);
    if (error || environmentsError || historyError || environmentTypesError) return toast.error(error?.message ?? environmentsError?.message ?? historyError?.message ?? environmentTypesError?.message ?? "Não foi possível carregar os ambientes.");
    setRows((data ?? []) as LucRow[]);
    setEnvironmentRows((environmentsData ?? []) as EnvironmentRow[]);
    setEnvironmentTypes((environmentTypesData ?? []) as EnvironmentTypeOption[]);
    setHistory((historyRows ?? []) as LucHistoryRow[]);
  };
  useEffect(() => { void load(); }, [visitId]);

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

  const validPreview = preview.filter((item) => !item.issue);
  const invalidCount = preview.length - validPreview.length;
  const parseFile = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) throw new Error("A planilha deve ter no máximo 20 MB.");
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
    if (!sheet) throw new Error("A planilha está vazia.");
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
    const headerIndex = matrix.findIndex((line) => line.some((cell) => ["luc", "n do luc", "nº do luc", "numero do luc"].includes(normalizeHeader(cell))));
    if (headerIndex < 0) throw new Error("Não encontrei a coluna LUC.");
    const headers = matrix[headerIndex]?.map(normalizeHeader) ?? [];
    const lucIndex = headers.findIndex((header) => ["luc", "n do luc", "nº do luc", "numero do luc"].includes(header));
    const nameIndex = headers.findIndex((header) => ["nome da loja", "loja", "nome loja"].includes(header));
    const locationIndex = headers.findIndex((header) => ["localizacao", "piso", "andar", "local"].includes(header));
    const meterIndex = headers.findIndex((header) => ["medidor", "n do medidor", "nº do medidor", "numero do medidor", "numero medidor"].includes(header));
    if (nameIndex < 0) throw new Error("Não encontrei a coluna Nome da loja.");
    const parsed = matrix.slice(headerIndex + 1).filter((line) => line.some((cell) => String(cell ?? "").trim())).map((line) => {
      const lucNumber = String(line[lucIndex] ?? "").trim();
      const shopName = String(line[nameIndex] ?? "").trim();
      const location = locationIndex >= 0 ? String(line[locationIndex] ?? "").trim() : "";
      const meterNumber = meterIndex >= 0 ? String(line[meterIndex] ?? "").trim() : "";
      const issue = !shopName ? "Preencha o Nome da loja" : undefined;
      return { lucNumber, shopName, location, meterNumber, issue };
    });
    if (!parsed.length) throw new Error("Nenhuma linha foi encontrada.");
    setPreview(parsed);
    setPreviewOpen(true);
  };

  const importRows = async (confirmed = false) => {
    const lucCounts = new Map<string, number>();
    validPreview.forEach((item) => { const key = normalizeHeader(item.lucNumber); if (key) lucCounts.set(key, (lucCounts.get(key) ?? 0) + 1); });
    const hasAmbiguousLuc = validPreview.some((item) => {
      const key = normalizeHeader(item.lucNumber);
      return Boolean(key && ((lucCounts.get(key) ?? 0) > 1 || rows.filter((row) => normalizeHeader(row.luc_number) === key).length > 1));
    });
    if (hasAmbiguousLuc && !confirmed) { setDuplicateConfirmation("import"); return; }
    setLoading(true);
    try {
      if (!validPreview.length) throw new Error("Não há linhas válidas para importar.");
      const payload = validPreview.map((item) => ({ visit_id: visitId, luc_number: item.lucNumber, shop_name: item.shopName, contract_name: item.shopName, location: item.location || null, meter_number: item.meterNumber || null, point_type: "shop", created_by: userId, updated_by: userId }));
      for (const item of payload) {
        const key = normalizeHeader(item.luc_number);
        const matches = key ? rows.filter((row) => normalizeHeader(row.luc_number) === key) : [];
        if (key && (lucCounts.get(key) ?? 0) === 1 && matches.length === 1) {
          const { error } = await supabase.from("site_survey_visit_lucs").update({ shop_name: item.shop_name, location: item.location, meter_number: item.meter_number, updated_by: userId, active: true }).eq("id", matches[0].id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("site_survey_visit_lucs").insert({ ...item, active: true });
          if (error) throw error;
        }
      }
      toast.success(`${validPreview.length} ambiente(s) importado(s).`);
      setPreviewOpen(false);
      setPreview([]);
      await load();
      onChanged?.();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível importar a planilha."); }
    finally { setLoading(false); }
  };

  const changeShopName = (name: string) => { nameRevision.current += 1; setDraftName(name); };
  const closeEdit = () => { facadeRequest.current += 1; setAnalyzing(false); setEditing(null); setEditingEnvironmentId(null); };
  useEffect(() => () => { facadeRequest.current += 1; }, []);
  const startEdit = (row?: LucRow) => { facadeRequest.current += 1; setAnalyzing(false); setEditingEnvironmentId(null); setEditing(row ?? { id: "", luc_number: "", shop_name: "", location: null, point_type: "shop" }); setEditMode("correction"); setPointType(row ? surveyPointType(row) : null); setDraftLuc(row?.luc_number ?? ""); changeShopName(row?.shop_name ?? ""); setDraftContractName(row?.contract_name ?? row?.shop_name ?? ""); setDraftLocation(row?.location ?? ""); setDraftMeter(row?.meter_number ?? ""); setEnvironmentName(""); setEnvironmentTemplateId(""); setEnvironmentTypeId(""); setNamePickerOpen(false); };
  const startEnvironmentEdit = (row: EnvironmentRow) => { facadeRequest.current += 1; setAnalyzing(false); setEditingEnvironmentId(row.id); setEditing({ id: row.id, luc_number: "", shop_name: row.name, location: environmentLocation(row.location), point_type: "environment", classification_type: "environment", meter_number: row.meter_number }); setPointType("environment"); setDraftLuc(""); changeShopName(row.name); setDraftContractName(""); setDraftLocation(row.location ?? ""); setDraftMeter(row.meter_number ?? ""); setEnvironmentName(row.name); setEnvironmentTemplateId(row.template_id ?? ""); setEnvironmentTypeId(row.environment_type_id ?? ""); setNamePickerOpen(false); };
  const saveEdit = async (confirmed = false) => {
    if (!canEdit || (addOnly && editing?.id)) return;
    if (saving) return;
    setSaving(true);
    try { await saveEditInner(confirmed); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar. Verifique a conexão e tente novamente."); } finally { setSaving(false); }
  };
  const saveEditInner = async (confirmed = false) => {
    if (!pointType) return toast.error("Selecione Loja, Quiosque, Ambiente ou Loja vaga.");
    if (pointType === "environment" && editingEnvironmentId) {
      const name = environmentName.trim();
      if (!name) return toast.error("Informe o nome do ambiente.");
      if (!environmentTemplateId) return toast.error("Selecione o checklist do ambiente.");
      const { error } = await supabase.from("site_survey_visit_environments").update({ name, template_id: environmentTemplateId, location: environmentLocation(draftLocation), meter_number: draftMeter.trim() || null, environment_type_id: environmentTypeId || null, updated_by: userId }).eq("id", editingEnvironmentId);
      if (error) return toast.error(error.code === "23505" ? "Este ambiente já está cadastrado nesta OS." : error.message);
      toast.success("Ambiente atualizado."); closeEdit(); await load(); onChanged?.();
      return;
    }
    if (pointType === "environment" && !editing?.id) {
      const name = environmentName.trim();
      if (!name) return toast.error("Informe o nome do ambiente.");
      if (!environmentTemplateId) return toast.error("Selecione o checklist do ambiente.");
      const { data: existing, error: lookupError } = await supabase.from("site_survey_visit_environments").select("id,active").eq("visit_id", visitId).eq("name", name).maybeSingle();
      if (lookupError) return toast.error(lookupError.message);
      if (existing?.active) return toast.error("Este ambiente já está cadastrado nesta OS.");
      const result = existing
        ? await supabase.from("site_survey_visit_environments").update({ template_id: environmentTemplateId, location: environmentLocation(draftLocation), meter_number: draftMeter.trim() || null, environment_type_id: environmentTypeId || null, updated_by: userId, active: true }).eq("id", existing.id)
        : await supabase.from("site_survey_visit_environments").insert({ visit_id: visitId, name, template_id: environmentTemplateId, location: environmentLocation(draftLocation), meter_number: draftMeter.trim() || null, environment_type_id: environmentTypeId || null, created_by: userId, updated_by: userId, active: true });
      if (result.error) return toast.error(result.error.code === "23505" ? "Este ambiente já está cadastrado nesta OS." : result.error.message);
      toast.success(existing ? "Ambiente reativado com o checklist selecionado." : "Ambiente adicionado."); closeEdit(); await load(); onChanged?.();
      return;
    }
    const lucNumber = pointType === "environment" ? "" : draftLuc.trim(); const shopName = draftName.trim();
    if (pointType && requiresSurveyLuc(pointType) && !lucNumber) return toast.error("Informe o LUC da loja vaga.");
    if (!shopName) return toast.error("Informe o nome do ponto.");
    const duplicateRows = lucNumber ? rows.filter((row) => row.id !== editing?.id && normalizeHeader(row.luc_number) === normalizeHeader(lucNumber)) : [];
    if (duplicateRows.length && !confirmed) { setDuplicateConfirmation("edit"); return; }
    const payload = { visit_id: visitId, luc_number: lucNumber, shop_name: shopName, contract_name: draftContractName.trim() || null, location: draftLocation.trim() || null, meter_number: draftMeter.trim() || null, point_type: pointType === "kiosk" ? "kiosk" : pointType === "vacant" ? "vacant" : "shop", classification_type: pointType, updated_by: userId, active: true };
    const result = editing?.id
      ? editMode === "correction"
        ? await supabase.rpc("correct_site_survey_visit_luc", { _id: editing.id, _luc_number: lucNumber, _shop_name: shopName, _location: draftLocation.trim() }).then(async (correction) => correction.error ? correction : supabase.from("site_survey_visit_lucs").update({ classification_type: pointType, contract_name: draftContractName.trim() || null, meter_number: draftMeter.trim() || null, updated_by: userId }).eq("id", editing.id))
        : await supabase.from("site_survey_visit_lucs").update(payload).eq("id", editing.id)
      : await supabase.from("site_survey_visit_lucs").insert({ ...payload, created_by: userId });
    if (result.error) return toast.error(result.error.code === "23505" ? "Este LUC já está cadastrado nesta OS." : result.error.message);
    toast.success(editing?.id ? "Ambiente atualizado." : "Ambiente adicionado."); closeEdit(); await load(); onChanged?.();
  };
  const analyzeFacade = async (file?: File) => {
    if (!file) return;
    const request = ++facadeRequest.current;
    const revision = nameRevision.current;
    const canSuggestName = !draftName.trim();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    setAnalyzing(true);
    try {
      const result = await Promise.race([
        (async () => {
          const original = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Não foi possível ler a foto.")); reader.readAsDataURL(file); });
          const imageDataUrl = await shrinkPhoto(original);
          const mimeType = (imageDataUrl === original ? file.type || "image/jpeg" : "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif";
          return suggestShopNameFromFacade({ data: { imageDataUrl, mimeType } });
        })(),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("Leitura indisponível")), 15000); }),
      ]);
      if (request !== facadeRequest.current) return;
      if (canSuggestName && revision === nameRevision.current && result.name?.trim()) {
        setDraftName(result.name.trim()); toast.success("Nome sugerido. Confira antes de salvar.");
      } else if (!result.name?.trim()) {
        toast.info("Nenhum nome identificado. Você pode informar o nome e salvar sem a foto.");
      }
    } catch {
      if (request === facadeRequest.current) toast.info("Não foi possível ler o nome pela foto. Você pode informar o nome e salvar normalmente.");
    }
    finally { if (timeout) clearTimeout(timeout); if (request === facadeRequest.current) setAnalyzing(false); }
  };
  const currentByLuc = useMemo(() => new Set(rows.map((row) => normalizeHeader(row.luc_number)).filter(Boolean)), [rows]);
  const duplicateNames = draftLuc.trim() ? rows.filter((row) => row.id !== editing?.id && normalizeHeader(row.luc_number) === normalizeHeader(draftLuc)).map((row) => row.shop_name) : [];
  const matchingCatalog = useMemo(() => shopCatalog
    .filter((item) => item.active && item.point_type === pointType)
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" })), [pointType, shopCatalog]);
  const displayRows = useMemo<DisplayRow[]>(() => [
    ...rows.map((row) => ({ ...row, source: "luc" as const, template_id: null })),
    ...environmentRows.map((row) => ({ id: row.id, source: "environment" as const, luc_number: "", shop_name: row.name, location: environmentLocation(row.location), point_type: row.point_type, classification_type: "environment", meter_number: row.meter_number, environment_type_id: row.environment_type_id, template_id: row.template_id })),
  ], [rows, environmentRows]);
  const typeTotals = useMemo(() => surveyPointTotals(displayRows), [displayRows]);
  const environmentTotals = useMemo(() => environmentDisciplineTotals(environmentRows, environmentTypes), [environmentRows, environmentTypes]);
  // Totalizadores de aprovação separados: Lojas/Quiosques, Entrada da Concessionária e demais ambientes (consolidados).
  const approvalGroupTotals = useMemo(() => {
    const shopKeys = new Set(rows.filter((row) => surveyPointType(row) !== "vacant").map((row) => `luc:${row.id}`));
    const concessionariaKeys = new Set<string>();
    const otherKeys = new Set<string>();
    for (const env of environmentRows) {
      const type = environmentTypes.find((item) => item.id === env.environment_type_id);
      (type && normalizeHeader(type.name) === "hidrometro da entrada da concessionaria" ? concessionariaKeys : otherKeys).add(`environment:${env.id}`);
    }
    return {
      shops: approvalEnergyWaterTotals(scope.approvals, shopKeys),
      concessionaria: approvalEnergyWaterTotals(scope.approvals, concessionariaKeys),
      others: approvalEnergyWaterTotals(scope.approvals, otherKeys),
      hasConcessionaria: concessionariaKeys.size > 0,
      hasOthers: otherKeys.size > 0,
    };
  }, [scope.approvals, rows, environmentRows, environmentTypes]);
  const sortedRows = useMemo(() => displayRows.filter((row) => {
    const matchesLuc = normalizeHeader(row.luc_number).includes(normalizeHeader(lucFilter));
    const matchesName = normalizeHeader(row.shop_name).includes(normalizeHeader(shopNameFilter));
    const matchesLocation = normalizeHeader(row.location).includes(normalizeHeader(locationFilter));
    const matchesType = typeFilter === "all" || surveyPointType(row) === typeFilter;
    const pointValue = `${row.source}:${row.id}`;
    const hasFacade = attachments.some((item) => item.attachment_kind === "facade" && (row.source === "luc" ? item.visit_luc_id === row.id : item.visit_environment_id === row.id));
    const count = pendingCount?.(pointValue) ?? 0;
    const matchesPending = pendingFilter === "all" || (pendingFilter === "with" ? count > 0 : count === 0);
    const approval = scope.approvals.find((item) => item.point_kind === row.source && item.point_id === row.id);
    const matchesApproval = approvalFilter === "all" || (approvalFilter === "water" ? !!approval?.hydraulic_approved : approvalFilter === "energy" ? !!approval?.electrical_approved : approvalFilter === "both" ? !!approval?.hydraulic_approved && !!approval?.electrical_approved : !approval?.hydraulic_approved && !approval?.electrical_approved);
    return matchesApproval && matchesPending && matchesLuc && matchesName && matchesLocation && matchesType && (!missingFacadeOnly || !hasFacade || surveyPointType(row) === "vacant") && (isPointVisible?.(pointValue) ?? true);
  }).sort((a, b) => {
    const comparison = (a[sortBy] ?? "").localeCompare(b[sortBy] ?? "", "pt-BR", { numeric: true, sensitivity: "base" });
    return sortAscending ? comparison : -comparison;
  }), [displayRows, sortBy, sortAscending, lucFilter, shopNameFilter, locationFilter, typeFilter, missingFacadeOnly, attachments, isPointVisible, pendingCount, pendingFilter, approvalFilter, scope.approvals]);
  const sortColumn = (column: typeof sortBy) => { if (sortBy === column) setSortAscending((current) => !current); else { setSortBy(column); setSortAscending(true); } };
  const registrationRows = async () => {
    const { data: approvals, error } = await supabase.from("site_survey_installation_approvals").select("point_kind,point_id,hydraulic_approved,electrical_approved").eq("visit_id", visitId);
    if (error) throw error;
    return sortedRows.map((row) => {
      const type = surveyPointType(row);
      return {
        luc: type === "environment" ? "–" : row.luc_number || "Sem LUC",
        meter: row.meter_number || "—",
        type: surveyPointTypeLabel(type),
        name: row.shop_name,
        location: environmentLocation(row.location) || "—",
        ...registrationServices(approvals ?? [], row.source, row.id),
        facade: attachments.find((item) => item.attachment_kind === "facade" && (row.source === "luc" ? item.visit_luc_id === row.id : item.visit_environment_id === row.id)),
      };
    });
  };
  const exportExcel = async () => {
    setExporting(true);
    try {
      const rows = await registrationRows();
      if (!rows.length) return toast.error("Não há lojas ou ambientes para exportar.");
      const { buildRegistrationExcel } = await import("@/lib/site-survey-registration-excel");
      const bytes = await buildRegistrationExcel(rows);
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const a = document.createElement("a"); a.href = url; a.download = `lojas-ambientes-os-${visitId}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível exportar a lista."); }
    finally { setExporting(false); }
  };
  const [exportingPdf, setExportingPdf] = useState(false);
  const exportPdf = async () => {
    setExportingPdf(true);
    const toastId = toast.loading("Gerando PDF do cadastro…");
    try {
      const { buildRegistrationPdf } = await import("@/lib/site-survey-registration-pdf");
      const { data: visitRow, error } = await supabase.from("site_survey_visits").select("client_id, clients(name)").eq("id", visitId).single();
      if (error) throw error;
      const clientName = ((visitRow as { clients?: { name?: string } | null } | null)?.clients?.name) || undefined;
      const blob = await buildRegistrationPdf(await registrationRows(), clientName);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `cadastro-os-${visitId}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast.success("PDF do cadastro gerado.", { id: toastId });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível gerar o PDF.", { id: toastId }); }
    finally { setExportingPdf(false); }
  };
   const sortHeader = (column: typeof sortBy, label: string) => <Button type="button" variant="ghost" size="sm" className="h-8 w-full items-center justify-start px-0 text-xs font-semibold !bg-transparent !text-foreground hover:!bg-transparent hover:!text-foreground" aria-label={`Ordenar por ${label}${sortBy === column ? sortAscending ? ", crescente" : ", decrescente" : ""}`} onClick={() => sortColumn(column)}>{label}{sortBy === column ? sortAscending ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}</Button>;

  return <Collapsible open={listOpen} onOpenChange={setListOpen} asChild><section className="space-y-3 pt-5">
     {compactSearch ? null : <div id="registration-pending" className="flex flex-wrap items-start justify-between gap-3">{!addOnly ? <div className="w-full min-w-0"><PointTypeTotals totals={typeTotals} groupTotals={approvalGroupTotals} environmentTotals={environmentTotals} /></div> : null}<div className="flex flex-wrap items-center gap-3">{pendingToolbar}{canEdit ? <Button type="button" size="sm" variant="outline" className="border-primary !bg-transparent !text-primary shadow-sm hover:!bg-primary hover:!text-primary-foreground active:!bg-primary active:!text-primary-foreground focus-visible:!bg-primary focus-visible:!text-primary-foreground" onClick={() => startEdit()}><Plus className="h-4 w-4" />Adicionar ambiente</Button> : null}{!addOnly && canEdit ? <span className="hidden h-6 w-px bg-border sm:block" aria-hidden="true" /> : null}{!addOnly ? <>{canImport ? <><input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void parseFile(file).catch((error: Error) => toast.error(error.message)); }} /><Button type="button" size="sm" variant="outline" className="border-primary !bg-transparent !text-primary shadow-sm hover:!bg-primary hover:!text-primary-foreground active:!bg-primary active:!text-primary-foreground focus-visible:!bg-primary focus-visible:!text-primary-foreground" onClick={() => inputRef.current?.click()}><FileSpreadsheet className="h-4 w-4" />Importar Cadastro</Button></> : null}<Button type="button" size="sm" variant="outline" className="border-primary !bg-transparent !text-primary shadow-sm hover:!bg-primary hover:!text-primary-foreground active:!bg-primary active:!text-primary-foreground focus-visible:!bg-primary focus-visible:!text-primary-foreground" disabled={exportingPdf} onClick={() => void exportPdf()}><FileText className="h-4 w-4" />{exportingPdf ? "Gerando..." : "Cadastro em PDF"}</Button><Button type="button" size="sm" variant="outline" className="border-primary !bg-transparent !text-primary shadow-sm hover:!bg-primary hover:!text-primary-foreground active:!bg-primary active:!text-primary-foreground focus-visible:!bg-primary focus-visible:!text-primary-foreground" disabled={exporting} onClick={() => void exportExcel()}><Download className="h-4 w-4" />{exporting ? "Exportando..." : "Cadastro em Excel"}</Button>{clientToolbar}{<CollapsibleTrigger asChild><Button type="button" size="compactIcon" variant="ghost" aria-label={listOpen ? "Recolher lista de lojas e LUCs" : "Exibir lista de lojas e LUCs"} title={listOpen ? "Recolher lista" : "Exibir lista"}><ChevronDown className={`h-4 w-4 transition-transform ${listOpen ? "rotate-180" : ""}`} /></Button></CollapsibleTrigger>}</> : null}</div></div>}
       {!addOnly ? <CollapsibleContent forceMount={compactSearch || undefined}><div className="space-y-3">{compactSearch ? null : <ContractedScopeFields scope={scope} canEdit={canApprove} onChanged={onChanged} />}<div className="overflow-x-auto rounded-md border"><div className="grid min-w-[1050px] grid-cols-[48px_100px_120px_132px_minmax(180px,1fr)_minmax(120px,0.55fr)_128px_190px] gap-3 px-3 py-2 text-xs font-semibold"><div className="space-y-1.5"><span className="flex h-8 items-center leading-none">Foto</span><label className="flex cursor-pointer items-center gap-1 whitespace-nowrap font-normal"><Checkbox aria-label="Somente sem foto de fachada" checked={missingFacadeOnly} onCheckedChange={(checked) => onMissingFacadeOnlyChange?.(checked === true)} />Sem</label></div><div className="space-y-1.5">{sortHeader("luc_number", "LUC")}<Input value={lucFilter} onChange={(event) => setLucFilter(event.target.value)} placeholder="Filtrar LUC" aria-label="Filtrar por LUC" className="h-8 text-xs font-normal" /></div><span className="flex h-8 items-center leading-none">Nº do medidor</span><div className="space-y-1.5"><span className="flex h-8 items-center leading-none">Tipo</span><Select value={typeFilter} onValueChange={onTypeFilterChange}><SelectTrigger aria-label="Filtrar por tipo" className="h-8 text-xs font-normal"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os tipos</SelectItem><SelectItem value="shop">Somente lojas</SelectItem><SelectItem value="kiosk">Somente quiosques</SelectItem><SelectItem value="environment">Somente ambientes</SelectItem><SelectItem value="vacant">Somente lojas vagas</SelectItem></SelectContent></Select></div><div className="space-y-1.5">{sortHeader("shop_name", "Nome da loja")}<Input value={shopNameFilter} onChange={(event) => setShopNameFilter(event.target.value)} placeholder="Filtrar nome" aria-label="Filtrar por nome da loja" className="h-8 text-xs font-normal" /></div><div className="space-y-1.5">{sortHeader("location", "Localização")}<Input value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} placeholder="Filtrar localização" aria-label="Filtrar por localização" className="h-8 text-xs font-normal" /></div><div className="space-y-1.5"><span className="flex h-8 items-center leading-none">Pendências</span><Select value={pendingFilter} onValueChange={setPendingFilter}><SelectTrigger aria-label="Filtrar por pendências" className="h-8 text-xs font-normal"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="with">Com pendências</SelectItem><SelectItem value="without">Sem pendências</SelectItem></SelectContent></Select></div><div className="space-y-1.5"><span className="flex h-8 items-center justify-between leading-none"><span>Ações</span>{sortedRows.length !== displayRows.length ? <span aria-label="Quantidade selecionada" className="text-base font-normal tabular-nums">{sortedRows.length}</span> : null}</span><Select value={approvalFilter} onValueChange={(value) => setApprovalFilter(value as typeof approvalFilter)}><SelectTrigger aria-label="Filtrar por instalação aprovada" className="h-8 text-xs font-normal"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Instalação: todas</SelectItem><SelectItem value="water">Aprovada: Água</SelectItem><SelectItem value="energy">Aprovada: Energia</SelectItem><SelectItem value="both">Aprovada: Água + Energia</SelectItem><SelectItem value="none">Sem aprovação</SelectItem></SelectContent></Select></div></div>{sortedRows.map((row) => { const pointValue = `${row.source}:${row.id}`; const count = pendingCount?.(pointValue) ?? 0; const expanded = expandedPending.has(pointValue); const facade = attachments.find((item) => item.attachment_kind === "facade" && (row.source === "luc" ? item.visit_luc_id === row.id : item.visit_environment_id === row.id)); return <Fragment key={pointValue}><div className="grid min-w-[1050px] grid-cols-[48px_100px_120px_132px_minmax(180px,1fr)_minmax(120px,0.55fr)_128px_190px] items-center gap-3 border-t px-3 py-3 text-sm"><SiteSurveyFacadeThumbnail name={row.shop_name} attachment={facade} interventionCount={interventionCount?.(pointValue) ?? 0} /><span className="font-medium">{surveyPointType(row) === "environment" ? <span className="font-normal text-muted-foreground" title="LUC não se aplica">&ndash;</span> : row.luc_number || "Sem LUC"}</span><span className="min-w-0 break-words" title={row.meter_number || undefined}>{row.meter_number || "—"}</span><span>{surveyPointTypeLabel(surveyPointType(row))}</span><span className="min-w-0">{onPointNameClick ? <button type="button" className="block w-full truncate text-left text-foreground transition-colors hover:text-primary hover:underline" onClick={() => onPointNameClick(pointValue)}>{row.shop_name}</button> : <span className="block truncate">{row.shop_name}</span>}{row.contract_name && row.contract_name !== row.shop_name ? <span className="block truncate text-xs text-muted-foreground" title={`Contrato: ${row.contract_name}`}>Contrato: {row.contract_name}</span> : null}</span><span className="min-w-0 truncate text-muted-foreground" title={row.location || undefined}>{environmentLocation(row.location) || "—"}</span><span className="text-xs tabular-nums text-muted-foreground">{count}</span><div className="flex items-center justify-end gap-2"><InstallationApprovalCell point={row} scope={scope} canEdit={canApprove} onChanged={onChanged} /><Button type="button" size="compactIcon" variant="ghost" aria-label={expanded ? `Recolher histórico de ${row.shop_name}` : `Exibir histórico de ${row.shop_name}`} title={expanded ? "Recolher histórico e pendências" : "Exibir histórico e pendências"} onClick={() => setExpandedPending((current) => { const next = new Set(current); if (next.has(pointValue)) next.delete(pointValue); else next.add(pointValue); return next; })}><ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} /></Button>{canEdit ? <Button type="button" size="compactIcon" variant="ghost" title="Editar ambiente" onClick={() => row.source === "environment" ? startEnvironmentEdit({ id: row.id, name: row.shop_name, template_id: row.template_id, location: row.location, environment_type_id: row.environment_type_id, point_type: "environment", meter_number: row.meter_number }) : startEdit(row)}><Pencil className="h-3.5 w-3.5" /></Button> : null}{canEdit ? <ConfirmDeleteButton title={`Excluir ${row.luc_number ? `LUC ${row.luc_number}` : row.shop_name}?`} description="O ambiente será removido desta OS, mantendo o histórico registrado." onConfirm={async () => { const table = row.source === "environment" ? "site_survey_visit_environments" : "site_survey_visit_lucs"; const { error } = await supabase.from(table).update({ active: false, updated_by: userId }).eq("id", row.id); if (error) return toast.error(error.message); try { await restoreScheduledVisitWhenEmpty(); } catch (resetError) { return toast.error(resetError instanceof Error ? resetError.message : "Não foi possível atualizar a situação da visita."); } toast.success("Ambiente removido da OS."); await load(); onChanged?.(); }} /> : null}</div></div>{expanded || compactSearch ? <div className="min-w-[1050px] border-t bg-muted/20 p-3">{renderHistory ? <div className="space-y-4">{renderHistory(pointValue)}</div> : count ? <div className="space-y-4">{renderPending?.(pointValue)}</div> : null}</div> : null}</Fragment>; })}{!displayRows.length ? <p className="border-t p-4 text-sm text-muted-foreground">Nenhuma loja, quiosque ou ambiente cadastrado nesta OS.</p> : !sortedRows.length ? <p className="border-t p-4 text-sm text-muted-foreground">Nenhum resultado encontrado para os filtros informados.</p> : null}</div></div></CollapsibleContent> : null}
    {!addOnly && history.some((item) => item.valid_until) ? <details className="rounded-md border px-3 py-2"><summary className="cursor-pointer text-sm font-medium">Histórico de nomes</summary><div className="mt-2 divide-y">{history.filter((item) => item.valid_until).map((item) => <div key={item.id} className="grid gap-1 py-2 text-sm sm:grid-cols-[110px_1fr_170px]"><span>{item.luc_number ? `LUC ${item.luc_number}` : "Sem LUC"}</span><span>{item.shop_name}</span><span className="text-muted-foreground">até {new Date(item.valid_until ?? item.valid_from).toLocaleString("pt-BR")}</span></div>)}</div></details> : null}
     <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && closeEdit()}>
       <DialogContent className="top-3 max-h-[calc(100dvh-1.5rem)] translate-y-0 overflow-y-auto sm:top-[50%] sm:translate-y-[-50%]"><form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); (document.activeElement as HTMLElement | null)?.blur(); void saveEdit(); }}>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar ambiente" : "Adicionar ambiente"}</DialogTitle><DialogDescription>{pointType === "shop" ? "Informe o nome atual da loja e, se houver, seu LUC e sua localização." : pointType === "kiosk" ? "Informe o nome atual do quiosque e, se houver, seu LUC e sua localização." : pointType === "environment" ? editing?.id ? "Informe o nome do ambiente. O checklist e as respostas serão preservados." : "Informe o nome do ambiente e selecione seu checklist." : pointType === "vacant" ? "Informe o LUC da loja vaga. A foto de fachada não é exigida e as respostas de inspeção ficam preservadas para a próxima loja." : "Selecione se deseja cadastrar uma loja, um quiosque ou um ambiente."}</DialogDescription></DialogHeader>
         {<div className="flex flex-wrap gap-5" role="group" aria-label="Tipo do ponto">
           <div className="flex items-center gap-2"><Checkbox id="add-shop" checked={pointType === "shop"} onCheckedChange={() => setPointType(pointType === "shop" ? null : "shop")} /><Label htmlFor="add-shop" className="cursor-pointer">Loja</Label></div>
            <div className="flex items-center gap-2"><Checkbox id="add-kiosk" checked={pointType === "kiosk"} onCheckedChange={() => setPointType(pointType === "kiosk" ? null : "kiosk")} /><Label htmlFor="add-kiosk" className="cursor-pointer">Quiosque</Label></div>
           <div className="flex items-center gap-2"><Checkbox id="add-environment" checked={pointType === "environment"} onCheckedChange={() => setPointType(pointType === "environment" ? null : "environment")} /><Label htmlFor="add-environment" className="cursor-pointer">Ambiente</Label></div>
           <div className="flex items-center gap-2"><Checkbox id="add-vacant" checked={pointType === "vacant"} onCheckedChange={() => setPointType(pointType === "vacant" ? null : "vacant")} /><Label htmlFor="add-vacant" className="cursor-pointer">Loja vaga</Label></div>
          </div>}
           {pointType === "shop" || pointType === "kiosk" || pointType === "vacant" || Boolean(editing?.id) && pointType === "environment" && !editingEnvironmentId ? <>
             <div className="grid gap-4 sm:grid-cols-2">{pointType !== "environment" ? <div className="space-y-2"><Label htmlFor="luc-draft">{pointType === "vacant" ? "LUC" : "LUC (opcional)"}</Label><Input id="luc-draft" required={pointType === "vacant"} value={draftLuc} onChange={(event) => setDraftLuc(event.target.value)} /></div> : null}<div className="space-y-2"><Label htmlFor="shop-draft">{pointType === "environment" ? "Nome do ambiente" : pointType === "kiosk" ? "Nome do quiosque" : "Nome da loja"}</Label>{pointType === "environment" ? <Input id="shop-draft" value={draftName} onChange={(event) => changeShopName(event.target.value)} /> : <><Popover open={namePickerOpen} onOpenChange={setNamePickerOpen}><PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={namePickerOpen} aria-label={pointType === "kiosk" ? "Buscar ou informar nome do quiosque" : "Buscar ou informar nome da loja"} className="w-full justify-between !bg-myio-green/10 font-normal hover:!bg-myio-green/15"><span className={draftName ? "truncate" : "truncate text-muted-foreground"}>{draftName || "Digite ou selecione"}</span><ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0"><Command shouldFilter><CommandInput id="shop-draft" value={draftName} onValueChange={changeShopName} placeholder={pointType === "kiosk" ? "Buscar ou digitar quiosque..." : "Buscar ou digitar loja..."} /><CommandList><CommandEmpty><span className="block px-3 py-2 text-left">Nome novo: <strong>{draftName.trim() || "digite para cadastrar"}</strong></span></CommandEmpty><CommandGroup>{matchingCatalog.map((item) => <CommandItem key={item.id} value={item.name} onSelect={() => { changeShopName(item.name); setNamePickerOpen(false); }}><Check className={normalizeHeader(draftName) === normalizeHeader(item.name) ? "opacity-100" : "opacity-0"} /><span className="truncate">{item.name}</span></CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover><p className="text-xs text-muted-foreground">Pesquise um nome cadastrado ou digite um novo.</p></>}</div>{pointType !== "environment" ? <div className="space-y-2 sm:col-span-2"><Label htmlFor="contract-draft">Nome do contrato</Label><Input id="contract-draft" value={draftContractName} onChange={(event) => setDraftContractName(event.target.value)} placeholder="Nome usado pelo shopping para o contrato" /><p className="text-xs text-muted-foreground">O nome da loja acima é o da fachada; aqui fica o nome do contrato junto ao shopping.</p></div> : null}<div className="space-y-2 sm:col-span-2"><Label htmlFor="location-draft">Localização (opcional)</Label><Input id="location-draft" value={draftLocation} onChange={(event) => setDraftLocation(event.target.value)} placeholder="Ex.: G1 – Deck" /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="meter-draft">Número do medidor (opcional)</Label><Input id="meter-draft" value={draftMeter} onChange={(event) => setDraftMeter(event.target.value)} placeholder="Energia e/ou água" /></div></div>
            {editing?.id ? <div className="space-y-2"><Label>Tipo de edição</Label><RadioGroup value={editMode} onValueChange={(value) => setEditMode(value as typeof editMode)} className="gap-2"><label className="flex cursor-pointer items-center gap-2 text-sm"><RadioGroupItem value="correction" />Corrigir cadastro — não registrar nome anterior no histórico</label><label className="flex cursor-pointer items-center gap-2 text-sm"><RadioGroupItem value="name_change" />Alteração de loja — manter nome anterior no histórico</label></RadioGroup></div> : null}
            {pointType !== "environment" && pointType !== "vacant" ? <div className="space-y-2"><input ref={facadeCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void analyzeFacade(file); }} /><input ref={facadeGalleryRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void analyzeFacade(file); }} /><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="action" disabled={analyzing}>{analyzing ? <Sparkles className="h-4 w-4" /> : <Camera className="h-4 w-4" />}{analyzing ? "Analisando fachada..." : "Identificar pela fachada"}</Button></DropdownMenuTrigger><DropdownMenuContent align="start" className="min-w-56"><DropdownMenuItem onSelect={() => facadeCameraRef.current?.click()}><Camera className="h-4 w-4" />Tirar foto</DropdownMenuItem><DropdownMenuItem onSelect={() => facadeGalleryRef.current?.click()}><Images className="h-4 w-4" />Escolher da galeria</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div> : null}
         </> : null}
          {pointType === "environment" && (!editing?.id || editingEnvironmentId) ? <div className="space-y-4"><div className="space-y-2"><Label htmlFor="combined-environment-name">Nome do ambiente</Label><Input id="combined-environment-name" value={environmentName} onChange={(event) => setEnvironmentName(event.target.value)} placeholder="Ex.: Caixa d'água" /></div><div className="space-y-2"><Label htmlFor="environment-location-draft">Localização (opcional)</Label><Input id="environment-location-draft" value={draftLocation} onChange={(event) => setDraftLocation(event.target.value)} placeholder="Ex.: 2º andar" /></div><div className="space-y-2"><Label htmlFor="environment-meter-draft">Número do medidor (opcional)</Label><Input id="environment-meter-draft" value={draftMeter} onChange={(event) => setDraftMeter(event.target.value)} placeholder="Energia e/ou água" /></div><div className="space-y-2"><Label htmlFor="combined-environment-template">Checklist</Label><Select value={environmentTemplateId || undefined} onValueChange={setEnvironmentTemplateId}><SelectTrigger id="combined-environment-template"><SelectValue placeholder="Selecione um checklist" /></SelectTrigger><SelectContent>{templates.filter((template) => template.active).map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="combined-environment-type">Tipo de ambiente (opcional)</Label><Select value={environmentTypeId || "none"} onValueChange={(value) => setEnvironmentTypeId(value === "none" ? "" : value)}><SelectTrigger id="combined-environment-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem tipo</SelectItem>{environmentTypes.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}</SelectContent></Select></div></div> : null}
         <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0"><Button type="button" variant="outline" onClick={closeEdit}>Cancelar</Button><Button type="submit" disabled={!pointType || saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
       </form></DialogContent>
     </Dialog>
     <Dialog open={previewOpen} onOpenChange={setPreviewOpen}><DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Conferir importação</DialogTitle><DialogDescription>{validPreview.length} linha(s) válida(s) e {invalidCount} com pendência. LUCs únicos já cadastrados terão nome e localização atualizados; repetições serão confirmadas antes da inclusão.</DialogDescription></DialogHeader><div className="overflow-x-auto rounded-md border"><div className="grid min-w-[720px] grid-cols-[100px_1fr_1fr_130px_150px] gap-3 bg-primary/20 px-3 py-2 text-xs font-semibold"><span>LUC</span><span>Nome da loja</span><span>Localização</span><span>Medidor</span><span>Resultado</span></div>{preview.map((item, index) => <div key={`${item.lucNumber}-${index}`} className="grid min-w-[720px] grid-cols-[100px_1fr_1fr_130px_150px] gap-3 border-t px-3 py-2 text-sm"><span>{item.lucNumber || "Sem LUC"}</span><span>{item.shopName || "—"}</span><span>{item.location || "—"}</span><span>{item.meterNumber || "—"}</span><span className={item.issue ? "text-destructive" : "text-muted-foreground"}>{item.issue ?? (item.lucNumber && currentByLuc.has(normalizeHeader(item.lucNumber)) ? "Atualizar ou confirmar" : "Adicionar")}</span></div>)}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>Cancelar</Button><Button type="button" disabled={loading || !validPreview.length} onClick={() => void importRows()}>{loading ? "Importando..." : `Importar ${validPreview.length} ambiente(s)`}</Button></DialogFooter></DialogContent></Dialog>
     <AlertDialog open={duplicateConfirmation === "edit"} onOpenChange={(open) => { if (!open) setDuplicateConfirmation(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Este LUC já está em uso</AlertDialogTitle><AlertDialogDescription>O LUC {draftLuc.trim()} já está cadastrado para {duplicateNames.join(", ")}. Deseja cadastrar esta nova loja no mesmo LUC?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Voltar à edição</AlertDialogCancel><AlertDialogAction onClick={() => { setDuplicateConfirmation(null); void saveEdit(true); }}>Cadastrar mesmo assim</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
     <AlertDialog open={duplicateConfirmation === "import"} onOpenChange={(open) => { if (!open) setDuplicateConfirmation(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>A planilha contém LUC repetido</AlertDialogTitle><AlertDialogDescription>Existem lojas com o mesmo LUC na planilha ou na OS. Deseja importar esses registros como novas lojas no mesmo LUC?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Voltar à conferência</AlertDialogCancel><AlertDialogAction onClick={() => { setDuplicateConfirmation(null); void importRows(true); }}>Importar mesmo assim</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section></Collapsible>;
}