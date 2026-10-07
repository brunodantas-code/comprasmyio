import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Camera, Check, ChevronDown, ChevronsUpDown, Download, FileSpreadsheet, Images, Pencil, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type LucRow = { id: string; luc_number: string; shop_name: string; location: string | null; point_type: string; meter_number?: string | null };
type LucHistoryRow = { id: string; visit_luc_id: string; luc_number: string; shop_name: string; valid_from: string; valid_until: string | null };
type PreviewRow = { lucNumber: string; shopName: string; location: string; issue?: string };
type TemplateOption = { id: string; name: string; active: boolean };
export type ShopCatalogOption = { id: string; name: string; point_type: string; active: boolean };

const normalizeHeader = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");

export function SiteSurveyLucManager({ visitId, userId, canImport, canEdit, templates, shopCatalog, environments, onChanged }: { visitId: string; userId: string; canImport: boolean; canEdit: boolean; templates: TemplateOption[]; shopCatalog: ShopCatalogOption[]; environments?: ReactNode; onChanged?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const facadeCameraRef = useRef<HTMLInputElement>(null);
  const facadeGalleryRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<LucRow[]>([]);
  const [history, setHistory] = useState<LucHistoryRow[]>([]);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState<LucRow | null>(null);
  const [draftLuc, setDraftLuc] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [pointType, setPointType] = useState<"shop" | "kiosk" | "environment" | null>(null);
  const [environmentName, setEnvironmentName] = useState("");
  const [environmentTemplateId, setEnvironmentTemplateId] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [draftMeter, setDraftMeter] = useState("");
  const [saving, setSaving] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [editMode, setEditMode] = useState<"correction" | "name_change">("correction");
  const [sortBy, setSortBy] = useState<"luc_number" | "shop_name" | "location">("luc_number");
  const [sortAscending, setSortAscending] = useState(true);
  const [lucFilter, setLucFilter] = useState("");
  const [shopNameFilter, setShopNameFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [duplicateConfirmation, setDuplicateConfirmation] = useState<"edit" | "import" | null>(null);
  const [namePickerOpen, setNamePickerOpen] = useState(false);

  const load = async () => {
    const [{ data, error }, { data: historyRows, error: historyError }] = await Promise.all([
      supabase.from("site_survey_visit_lucs").select("id,luc_number,shop_name,location,point_type,meter_number").eq("visit_id", visitId).eq("active", true).order("luc_number"),
      supabase.from("site_survey_visit_luc_history").select("id,visit_luc_id,luc_number,shop_name,valid_from,valid_until").eq("visit_id", visitId).order("valid_from", { ascending: false }),
    ]);
    if (error || historyError) return toast.error(error?.message ?? historyError?.message ?? "Não foi possível carregar os ambientes.");
    setRows((data ?? []) as LucRow[]);
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
      const payload = validPreview.map((item) => ({ visit_id: visitId, luc_number: item.lucNumber, shop_name: item.shopName, location: item.location || null, meter_number: item.meterNumber || null, point_type: "shop", created_by: userId, updated_by: userId }));
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

  const startEdit = (row?: LucRow) => { setEditing(row ?? { id: "", luc_number: "", shop_name: "", location: null, point_type: "shop" }); setEditMode("correction"); setPointType(row ? row.point_type === "kiosk" ? "kiosk" : "shop" : null); setDraftLuc(row?.luc_number ?? ""); setDraftName(row?.shop_name ?? ""); setDraftLocation(row?.location ?? ""); setDraftMeter(row?.meter_number ?? ""); setEnvironmentName(""); setEnvironmentTemplateId(""); setNamePickerOpen(false); };
  const saveEdit = async (confirmed = false) => {
    if (saving) return;
    setSaving(true);
    try { await saveEditInner(confirmed); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar. Verifique a conexão e tente novamente."); } finally { setSaving(false); }
  };
  const saveEditInner = async (confirmed = false) => {
    if (!pointType) return toast.error("Selecione Loja, Quiosque ou Ambiente.");
    if (pointType === "environment" && !editing?.id) {
      const name = environmentName.trim();
      if (!name) return toast.error("Informe o nome do ambiente.");
      if (!environmentTemplateId) return toast.error("Selecione o checklist do ambiente.");
      const { error } = await supabase.from("site_survey_visit_environments").insert({ visit_id: visitId, name, template_id: environmentTemplateId, meter_number: draftMeter.trim() || null, created_by: userId, updated_by: userId, active: true });
      if (error) return toast.error(error.code === "23505" ? "Este ambiente já está cadastrado nesta OS." : error.message);
      toast.success("Ambiente adicionado."); setEditing(null); onChanged?.();
      return;
    }
    const lucNumber = draftLuc.trim(); const shopName = draftName.trim();
    if (!shopName) return toast.error("Informe o nome da loja.");
    const duplicateRows = lucNumber ? rows.filter((row) => row.id !== editing?.id && normalizeHeader(row.luc_number) === normalizeHeader(lucNumber)) : [];
    if (duplicateRows.length && !confirmed) { setDuplicateConfirmation("edit"); return; }
    const payload = { visit_id: visitId, luc_number: lucNumber, shop_name: shopName, location: draftLocation.trim() || null, meter_number: draftMeter.trim() || null, point_type: pointType, updated_by: userId, active: true };
    const result = editing?.id
      ? editMode === "correction"
        ? await supabase.rpc("correct_site_survey_visit_luc", { _id: editing.id, _luc_number: lucNumber, _shop_name: shopName, _location: draftLocation.trim() }).then(async (correction) => correction.error ? correction : supabase.from("site_survey_visit_lucs").update({ point_type: pointType, meter_number: draftMeter.trim() || null, updated_by: userId }).eq("id", editing.id))
        : await supabase.from("site_survey_visit_lucs").update(payload).eq("id", editing.id)
      : await supabase.from("site_survey_visit_lucs").insert({ ...payload, created_by: userId });
    if (result.error) return toast.error(result.error.code === "23505" ? "Este LUC já está cadastrado nesta OS." : result.error.message);
    toast.success(editing?.id ? "Ambiente atualizado." : "Ambiente adicionado."); setEditing(null); await load(); onChanged?.();
  };
  const analyzeFacade = async (file?: File) => {
    if (!file) return;
    setAnalyzing(true);
    try {
      const original = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Não foi possível ler a foto.")); reader.readAsDataURL(file); });
      const imageDataUrl = await shrinkPhoto(original);
      const mimeType = (imageDataUrl === original ? file.type || "image/jpeg" : "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif";
      const result = await suggestShopNameFromFacade({ data: { imageDataUrl, mimeType } });
      setDraftName(result.name); toast.success("Nome sugerido. Confira antes de salvar.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível analisar a fachada."); }
    finally { setAnalyzing(false); }
  };
  const currentByLuc = useMemo(() => new Set(rows.map((row) => normalizeHeader(row.luc_number)).filter(Boolean)), [rows]);
  const duplicateNames = draftLuc.trim() ? rows.filter((row) => row.id !== editing?.id && normalizeHeader(row.luc_number) === normalizeHeader(draftLuc)).map((row) => row.shop_name) : [];
  const matchingCatalog = useMemo(() => shopCatalog
    .filter((item) => item.active && item.point_type === pointType)
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" })), [pointType, shopCatalog]);
  const sortedRows = useMemo(() => rows.filter((row) => {
    const matchesLuc = normalizeHeader(row.luc_number).includes(normalizeHeader(lucFilter));
    const matchesName = normalizeHeader(row.shop_name).includes(normalizeHeader(shopNameFilter));
    const matchesLocation = normalizeHeader(row.location).includes(normalizeHeader(locationFilter));
    return matchesLuc && matchesName && matchesLocation;
  }).sort((a, b) => {
    const comparison = (a[sortBy] ?? "").localeCompare(b[sortBy] ?? "", "pt-BR", { numeric: true, sensitivity: "base" });
    return sortAscending ? comparison : -comparison;
  }), [rows, sortBy, sortAscending, lucFilter, shopNameFilter, locationFilter]);
  const sortColumn = (column: typeof sortBy) => { if (sortBy === column) setSortAscending((current) => !current); else { setSortBy(column); setSortAscending(true); } };
  const exportExcel = async () => {
    setExporting(true);
    try {
      const fetchShops = async () => {
        const result: { luc_number: string; shop_name: string; location: string | null }[] = [];
        for (let offset = 0; ; offset += 1000) {
          const { data, error } = await supabase.from("site_survey_visit_lucs").select("luc_number,shop_name,location").eq("visit_id", visitId).eq("active", true).order("id").range(offset, offset + 999);
          if (error) throw error;
          result.push(...(data ?? []));
          if ((data?.length ?? 0) < 1000) break;
        }
        return result;
      };
      const fetchEnvironments = async () => {
        const result: { name: string }[] = [];
        for (let offset = 0; ; offset += 1000) {
          const { data, error } = await supabase.from("site_survey_visit_environments").select("name").eq("visit_id", visitId).eq("active", true).order("id").range(offset, offset + 999);
          if (error) throw error;
          result.push(...(data ?? []));
          if ((data?.length ?? 0) < 1000) break;
        }
        return result;
      };
      const [shops, environments] = await Promise.all([fetchShops(), fetchEnvironments()]);
      if (!shops.length && !environments.length) return toast.error("Não há lojas ou ambientes para exportar.");
      const workbook = XLSX.utils.book_new();
      const orderedShops = [...shops].sort((a, b) => {
        const comparison = String(a[sortBy] ?? "").localeCompare(String(b[sortBy] ?? ""), "pt-BR", { numeric: true, sensitivity: "base" });
        return sortAscending ? comparison : -comparison;
      });
      const exportRows = [
        ...orderedShops.map((row) => ({ LUC: String(row.luc_number ?? ""), Nome: String(row.shop_name ?? ""), "Localização": String(row.location ?? "") })),
        ...environments.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true })).map((row) => ({ LUC: "", Nome: row.name, "Localização": "" })),
      ];
      const sheet = XLSX.utils.json_to_sheet(exportRows, { header: ["LUC", "Nome", "Localização"] });
      sheet["!cols"] = [{ wch: 18 }, { wch: 42 }, { wch: 32 }];
      XLSX.utils.book_append_sheet(workbook, sheet, "Lojas e ambientes");
      XLSX.writeFile(workbook, `lojas-ambientes-os-${visitId}.xlsx`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível exportar a lista."); }
    finally { setExporting(false); }
  };
   const sortHeader = (column: typeof sortBy, label: string) => <Button type="button" variant="ghost" size="sm" className="h-auto justify-start px-0 text-xs font-semibold !bg-transparent !text-foreground hover:!bg-transparent hover:!text-foreground" aria-label={`Ordenar por ${label}${sortBy === column ? sortAscending ? ", crescente" : ", decrescente" : ""}`} onClick={() => sortColumn(column)}>{label}{sortBy === column ? sortAscending ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}</Button>;

  return <Collapsible open={listOpen} onOpenChange={setListOpen} asChild><section className="space-y-3 border-t pt-5">
     <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">Lojas e LUCs da OS</h3><p className="text-sm text-muted-foreground">Cadastre individualmente ou importe a lista completa antes dos checklists.</p></div><div className="flex flex-wrap items-center gap-3">{canEdit ? <Button type="button" size="sm" variant="outline" className="border-primary !bg-transparent !text-primary shadow-sm hover:!bg-primary hover:!text-primary-foreground active:!bg-primary active:!text-primary-foreground focus-visible:!bg-primary focus-visible:!text-primary-foreground" onClick={() => startEdit()}><Plus className="h-4 w-4" />Adicionar ambiente</Button> : null}{canEdit ? <span className="hidden h-6 w-px bg-border sm:block" aria-hidden="true" /> : null}<div className="flex overflow-hidden rounded-md border border-primary shadow-sm">{canImport ? <><input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void parseFile(file).catch((error: Error) => toast.error(error.message)); }} /><Button type="button" size="sm" variant="outline" className="rounded-none border-0 border-r border-primary !bg-transparent !text-primary shadow-none hover:!bg-primary hover:!text-primary-foreground active:!bg-primary active:!text-primary-foreground focus-visible:!bg-primary focus-visible:!text-primary-foreground" onClick={() => inputRef.current?.click()}><FileSpreadsheet className="h-4 w-4" />Importar Excel</Button></> : null}<Button type="button" size="sm" variant="outline" className="rounded-none border-0 !bg-transparent !text-primary shadow-none hover:!bg-primary hover:!text-primary-foreground active:!bg-primary active:!text-primary-foreground focus-visible:!bg-primary focus-visible:!text-primary-foreground" disabled={exporting} onClick={() => void exportExcel()}><Download className="h-4 w-4" />{exporting ? "Exportando..." : "Exportar Excel"}</Button></div><CollapsibleTrigger asChild><Button type="button" size="compactIcon" variant="ghost" aria-label={listOpen ? "Recolher lista de lojas e LUCs" : "Exibir lista de lojas e LUCs"} title={listOpen ? "Recolher lista" : "Exibir lista"}><ChevronDown className={`h-4 w-4 transition-transform ${listOpen ? "rotate-180" : ""}`} /></Button></CollapsibleTrigger></div></div>
       <CollapsibleContent><div className="space-y-3"><div className="overflow-x-auto rounded-md border"><div className="grid min-w-[620px] grid-cols-[100px_1fr_1fr_72px] gap-3 px-3 py-2 text-xs font-semibold"><div className="space-y-1.5">{sortHeader("luc_number", "LUC")}<Input value={lucFilter} onChange={(event) => setLucFilter(event.target.value)} placeholder="Filtrar LUC" aria-label="Filtrar por LUC" className="h-8 text-xs font-normal" /></div><div className="space-y-1.5">{sortHeader("shop_name", "Nome da loja")}<Input value={shopNameFilter} onChange={(event) => setShopNameFilter(event.target.value)} placeholder="Filtrar nome" aria-label="Filtrar por nome da loja" className="h-8 text-xs font-normal" /></div><div className="space-y-1.5">{sortHeader("location", "Localização")}<Input value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} placeholder="Filtrar localização" aria-label="Filtrar por localização" className="h-8 text-xs font-normal" /></div><span className="self-start pt-2">Ações</span></div>{sortedRows.map((row) => <div key={row.id} className="grid min-w-[620px] grid-cols-[100px_1fr_1fr_72px] items-center gap-3 border-t px-3 py-2 text-sm"><span className="font-medium">{row.luc_number || "Sem LUC"}</span><span className="min-w-0 truncate">{row.shop_name}</span><span className="min-w-0 truncate text-muted-foreground">{row.location || "—"}</span><div className="flex gap-1">{canEdit ? <Button type="button" size="compactIcon" variant="ghost" title="Editar ambiente" onClick={() => startEdit(row)}><Pencil className="h-3.5 w-3.5" /></Button> : null}{canEdit ? <ConfirmDeleteButton title={`Excluir ${row.luc_number ? `LUC ${row.luc_number}` : row.shop_name}?`} description="O ambiente será removido desta OS, mantendo o histórico registrado." onConfirm={async () => { const { error } = await supabase.from("site_survey_visit_lucs").update({ active: false, updated_by: userId }).eq("id", row.id); if (error) return toast.error(error.message); try { await restoreScheduledVisitWhenEmpty(); } catch (resetError) { return toast.error(resetError instanceof Error ? resetError.message : "Não foi possível atualizar a situação da visita."); } toast.success("Ambiente removido da OS."); await load(); onChanged?.(); }} /> : null}</div></div>)}{!rows.length ? <p className="border-t p-4 text-sm text-muted-foreground">Nenhuma loja ou LUC cadastrado nesta OS.</p> : !sortedRows.length ? <p className="border-t p-4 text-sm text-muted-foreground">Nenhum resultado encontrado para os filtros informados.</p> : null}</div>{environments}</div></CollapsibleContent>
    {history.some((item) => item.valid_until) ? <details className="rounded-md border px-3 py-2"><summary className="cursor-pointer text-sm font-medium">Histórico de nomes</summary><div className="mt-2 divide-y">{history.filter((item) => item.valid_until).map((item) => <div key={item.id} className="grid gap-1 py-2 text-sm sm:grid-cols-[110px_1fr_170px]"><span>{item.luc_number ? `LUC ${item.luc_number}` : "Sem LUC"}</span><span>{item.shop_name}</span><span className="text-muted-foreground">até {new Date(item.valid_until ?? item.valid_from).toLocaleString("pt-BR")}</span></div>)}</div></details> : null}
     <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
       <DialogContent className="top-3 translate-y-0 sm:top-[50%] sm:translate-y-[-50%]"><form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); (document.activeElement as HTMLElement | null)?.blur(); void saveEdit(); }}>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar ambiente" : "Adicionar ambiente"}</DialogTitle><DialogDescription>{pointType === "shop" ? "Informe o nome atual da loja e, se houver, seu LUC e sua localização." : pointType === "kiosk" ? "Informe o nome atual do quiosque e, se houver, seu LUC e sua localização." : pointType === "environment" ? "Informe o nome do ambiente e selecione seu checklist." : "Selecione se deseja cadastrar uma loja, um quiosque ou um ambiente."}</DialogDescription></DialogHeader>
         {!editing?.id ? <div className="flex flex-wrap gap-5" role="group" aria-label="Tipo de adição">
           <div className="flex items-center gap-2"><Checkbox id="add-shop" checked={pointType === "shop"} onCheckedChange={() => setPointType(pointType === "shop" ? null : "shop")} /><Label htmlFor="add-shop" className="cursor-pointer">Loja</Label></div>
            <div className="flex items-center gap-2"><Checkbox id="add-kiosk" checked={pointType === "kiosk"} onCheckedChange={() => setPointType(pointType === "kiosk" ? null : "kiosk")} /><Label htmlFor="add-kiosk" className="cursor-pointer">Quiosque</Label></div>
           <div className="flex items-center gap-2"><Checkbox id="add-environment" checked={pointType === "environment"} onCheckedChange={() => setPointType(pointType === "environment" ? null : "environment")} /><Label htmlFor="add-environment" className="cursor-pointer">Ambiente</Label></div>
         </div> : null}
          {pointType === "shop" || pointType === "kiosk" ? <>
             <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="luc-draft">LUC (opcional)</Label><Input id="luc-draft" value={draftLuc} onChange={(event) => setDraftLuc(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="shop-draft">{pointType === "kiosk" ? "Nome do quiosque" : "Nome da loja"}</Label><Popover open={namePickerOpen} onOpenChange={setNamePickerOpen}><PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={namePickerOpen} aria-label={pointType === "kiosk" ? "Buscar ou informar nome do quiosque" : "Buscar ou informar nome da loja"} className="w-full justify-between !bg-myio-green/10 font-normal hover:!bg-myio-green/15"><span className={draftName ? "truncate" : "truncate text-muted-foreground"}>{draftName || "Digite ou selecione"}</span><ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0"><Command shouldFilter><CommandInput id="shop-draft" value={draftName} onValueChange={setDraftName} placeholder={pointType === "kiosk" ? "Buscar ou digitar quiosque..." : "Buscar ou digitar loja..."} /><CommandList><CommandEmpty><span className="block px-3 py-2 text-left">Nome novo: <strong>{draftName.trim() || "digite para cadastrar"}</strong></span></CommandEmpty><CommandGroup>{matchingCatalog.map((item) => <CommandItem key={item.id} value={item.name} onSelect={() => { setDraftName(item.name); setNamePickerOpen(false); }}><Check className={normalizeHeader(draftName) === normalizeHeader(item.name) ? "opacity-100" : "opacity-0"} /><span className="truncate">{item.name}</span></CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover><p className="text-xs text-muted-foreground">Pesquise um nome cadastrado ou digite um novo.</p></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="location-draft">Localização (opcional)</Label><Input id="location-draft" value={draftLocation} onChange={(event) => setDraftLocation(event.target.value)} placeholder="Ex.: G1 – Deck" /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="meter-draft">Número do medidor (opcional)</Label><Input id="meter-draft" value={draftMeter} onChange={(event) => setDraftMeter(event.target.value)} placeholder="Energia e/ou água" /></div></div>
            {editing?.id ? <div className="space-y-2"><Label>Tipo de edição</Label><RadioGroup value={editMode} onValueChange={(value) => setEditMode(value as typeof editMode)} className="gap-2"><label className="flex cursor-pointer items-center gap-2 text-sm"><RadioGroupItem value="correction" />Corrigir cadastro — não registrar nome anterior no histórico</label><label className="flex cursor-pointer items-center gap-2 text-sm"><RadioGroupItem value="name_change" />Alteração de loja — manter nome anterior no histórico</label></RadioGroup></div> : null}
            <div className="space-y-2"><input ref={facadeCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void analyzeFacade(file); }} /><input ref={facadeGalleryRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void analyzeFacade(file); }} /><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="action" disabled={analyzing}>{analyzing ? <Sparkles className="h-4 w-4" /> : <Camera className="h-4 w-4" />}{analyzing ? "Analisando fachada..." : "Identificar pela fachada"}</Button></DropdownMenuTrigger><DropdownMenuContent align="start" className="min-w-56"><DropdownMenuItem onSelect={() => facadeCameraRef.current?.click()}><Camera className="h-4 w-4" />Tirar foto</DropdownMenuItem><DropdownMenuItem onSelect={() => facadeGalleryRef.current?.click()}><Images className="h-4 w-4" />Escolher da galeria</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
         </> : null}
         {pointType === "environment" ? <div className="space-y-4"><div className="space-y-2"><Label htmlFor="combined-environment-name">Nome do ambiente</Label><Input id="combined-environment-name" value={environmentName} onChange={(event) => setEnvironmentName(event.target.value)} placeholder="Ex.: Caixa d'água" /></div><div className="space-y-2"><Label htmlFor="environment-meter-draft">Número do medidor (opcional)</Label><Input id="environment-meter-draft" value={draftMeter} onChange={(event) => setDraftMeter(event.target.value)} placeholder="Energia e/ou água" /></div><div className="space-y-2"><Label htmlFor="combined-environment-template">Checklist</Label><Select value={environmentTemplateId || undefined} onValueChange={setEnvironmentTemplateId}><SelectTrigger id="combined-environment-template"><SelectValue placeholder="Selecione um checklist" /></SelectTrigger><SelectContent>{templates.filter((template) => template.active).map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent></Select></div></div> : null}
         <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0"><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" disabled={!pointType || saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
       </form></DialogContent>
     </Dialog>
     <Dialog open={previewOpen} onOpenChange={setPreviewOpen}><DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Conferir importação</DialogTitle><DialogDescription>{validPreview.length} linha(s) válida(s) e {invalidCount} com pendência. LUCs únicos já cadastrados terão nome e localização atualizados; repetições serão confirmadas antes da inclusão.</DialogDescription></DialogHeader><div className="overflow-x-auto rounded-md border"><div className="grid min-w-[720px] grid-cols-[100px_1fr_1fr_130px_150px] gap-3 bg-primary/20 px-3 py-2 text-xs font-semibold"><span>LUC</span><span>Nome da loja</span><span>Localização</span><span>Medidor</span><span>Resultado</span></div>{preview.map((item, index) => <div key={`${item.lucNumber}-${index}`} className="grid min-w-[720px] grid-cols-[100px_1fr_1fr_130px_150px] gap-3 border-t px-3 py-2 text-sm"><span>{item.lucNumber || "Sem LUC"}</span><span>{item.shopName || "—"}</span><span>{item.location || "—"}</span><span>{item.meterNumber || "—"}</span><span className={item.issue ? "text-destructive" : "text-muted-foreground"}>{item.issue ?? (item.lucNumber && currentByLuc.has(normalizeHeader(item.lucNumber)) ? "Atualizar ou confirmar" : "Adicionar")}</span></div>)}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>Cancelar</Button><Button type="button" disabled={loading || !validPreview.length} onClick={() => void importRows()}>{loading ? "Importando..." : `Importar ${validPreview.length} ambiente(s)`}</Button></DialogFooter></DialogContent></Dialog>
     <AlertDialog open={duplicateConfirmation === "edit"} onOpenChange={(open) => { if (!open) setDuplicateConfirmation(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Este LUC já está em uso</AlertDialogTitle><AlertDialogDescription>O LUC {draftLuc.trim()} já está cadastrado para {duplicateNames.join(", ")}. Deseja cadastrar esta nova loja no mesmo LUC?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Voltar à edição</AlertDialogCancel><AlertDialogAction onClick={() => { setDuplicateConfirmation(null); void saveEdit(true); }}>Cadastrar mesmo assim</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
     <AlertDialog open={duplicateConfirmation === "import"} onOpenChange={(open) => { if (!open) setDuplicateConfirmation(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>A planilha contém LUC repetido</AlertDialogTitle><AlertDialogDescription>Existem lojas com o mesmo LUC na planilha ou na OS. Deseja importar esses registros como novas lojas no mesmo LUC?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Voltar à conferência</AlertDialogCancel><AlertDialogAction onClick={() => { setDuplicateConfirmation(null); void importRows(true); }}>Importar mesmo assim</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section></Collapsible>;
}