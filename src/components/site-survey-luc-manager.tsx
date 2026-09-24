import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronDown, FileSpreadsheet, Images, Pencil, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { suggestShopNameFromFacade } from "@/lib/site-survey-ai.functions";

type LucRow = { id: string; luc_number: string; shop_name: string; location: string | null };
type LucHistoryRow = { id: string; visit_luc_id: string; luc_number: string; shop_name: string; valid_from: string; valid_until: string | null };
type PreviewRow = { lucNumber: string; shopName: string; location: string; issue?: string };

const normalizeHeader = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");

export function SiteSurveyLucManager({ visitId, userId, canImport, canEdit, onChanged }: { visitId: string; userId: string; canImport: boolean; canEdit: boolean; onChanged?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const facadeCameraRef = useRef<HTMLInputElement>(null);
  const facadeGalleryRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<LucRow[]>([]);
  const [history, setHistory] = useState<LucHistoryRow[]>([]);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<LucRow | null>(null);
  const [draftLuc, setDraftLuc] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const load = async () => {
    const [{ data, error }, { data: historyRows, error: historyError }] = await Promise.all([
      supabase.from("site_survey_visit_lucs").select("id,luc_number,shop_name,location").eq("visit_id", visitId).eq("active", true).order("luc_number"),
      supabase.from("site_survey_visit_luc_history").select("id,visit_luc_id,luc_number,shop_name,valid_from,valid_until").eq("visit_id", visitId).order("valid_from", { ascending: false }),
    ]);
    if (error || historyError) return toast.error(error?.message ?? historyError?.message ?? "Não foi possível carregar os ambientes.");
    setRows((data ?? []) as LucRow[]);
    setHistory((historyRows ?? []) as LucHistoryRow[]);
  };
  useEffect(() => { void load(); }, [visitId]);

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
    if (nameIndex < 0) throw new Error("Não encontrei a coluna Nome da loja.");
    const seen = new Set<string>();
    const parsed = matrix.slice(headerIndex + 1).filter((line) => line.some((cell) => String(cell ?? "").trim())).map((line) => {
      const lucNumber = String(line[lucIndex] ?? "").trim();
      const shopName = String(line[nameIndex] ?? "").trim();
      const location = locationIndex >= 0 ? String(line[locationIndex] ?? "").trim() : "";
      const key = lucNumber.toLocaleLowerCase("pt-BR");
      const issue = !lucNumber || !shopName ? "Preencha LUC e Nome da loja" : seen.has(key) ? "LUC duplicado na planilha" : undefined;
      if (lucNumber) seen.add(key);
      return { lucNumber, shopName, location, issue };
    });
    if (!parsed.length) throw new Error("Nenhuma linha foi encontrada.");
    setPreview(parsed);
    setPreviewOpen(true);
  };

  const importRows = async () => {
    setLoading(true);
    try {
      if (!validPreview.length) throw new Error("Não há linhas válidas para importar.");
      const payload = validPreview.map((item) => ({ visit_id: visitId, luc_number: item.lucNumber, shop_name: item.shopName, location: item.location || null, created_by: userId, updated_by: userId }));
      const { error } = await supabase.from("site_survey_visit_lucs").upsert(payload.map((item) => ({ ...item, active: true })), { onConflict: "visit_id,luc_number" });
      if (error) throw error;
      toast.success(`${validPreview.length} ambiente(s) importado(s).`);
      setPreviewOpen(false);
      setPreview([]);
      await load();
      onChanged?.();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível importar a planilha."); }
    finally { setLoading(false); }
  };

  const startEdit = (row?: LucRow) => { setEditing(row ?? { id: "", luc_number: "", shop_name: "", location: null }); setDraftLuc(row?.luc_number ?? ""); setDraftName(row?.shop_name ?? ""); setDraftLocation(row?.location ?? ""); };
  const saveEdit = async () => {
    const lucNumber = draftLuc.trim(); const shopName = draftName.trim();
    if (!lucNumber || !shopName) return toast.error("Informe o LUC e o nome da loja.");
    const payload = { visit_id: visitId, luc_number: lucNumber, shop_name: shopName, location: draftLocation.trim() || null, updated_by: userId, active: true };
    const result = editing?.id
      ? await supabase.from("site_survey_visit_lucs").update(payload).eq("id", editing.id)
      : await supabase.from("site_survey_visit_lucs").insert({ ...payload, created_by: userId });
    if (result.error) return toast.error(result.error.code === "23505" ? "Este LUC já está cadastrado nesta OS." : result.error.message);
    toast.success(editing?.id ? "Ambiente atualizado." : "Ambiente adicionado."); setEditing(null); await load(); onChanged?.();
  };
  const analyzeFacade = async (file?: File) => {
    if (!file) return;
    setAnalyzing(true);
    try {
      const imageDataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Não foi possível ler a foto.")); reader.readAsDataURL(file); });
      const result = await suggestShopNameFromFacade({ data: { imageDataUrl, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif" } });
      setDraftName(result.name); toast.success("Nome sugerido. Confira antes de salvar.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível analisar a fachada."); }
    finally { setAnalyzing(false); }
  };
  const currentByLuc = useMemo(() => new Set(rows.map((row) => row.luc_number.toLocaleLowerCase("pt-BR"))), [rows]);

  return <Collapsible open={listOpen} onOpenChange={setListOpen} asChild><section className="space-y-3 border-t pt-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">Lojas e LUCs da OS</h3><p className="text-sm text-muted-foreground">Cadastre individualmente ou importe a lista completa antes dos checklists.</p></div><div className="flex flex-wrap items-center gap-2">{canEdit ? <Button type="button" size="sm" variant="outline" onClick={() => startEdit()}><Plus className="h-4 w-4" />Adicionar loja</Button> : null}{canImport ? <><input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void parseFile(file).catch((error: Error) => toast.error(error.message)); }} /><Button type="button" size="sm" onClick={() => inputRef.current?.click()}><FileSpreadsheet className="h-4 w-4" />Importar Excel</Button></> : null}<CollapsibleTrigger asChild><Button type="button" size="compactIcon" variant="ghost" aria-label={listOpen ? "Recolher lista de lojas e LUCs" : "Exibir lista de lojas e LUCs"} title={listOpen ? "Recolher lista" : "Exibir lista"}><ChevronDown className={`h-4 w-4 transition-transform ${listOpen ? "rotate-180" : ""}`} /></Button></CollapsibleTrigger></div></div>
    <CollapsibleContent><div className="overflow-x-auto rounded-md border"><div className="grid min-w-[620px] grid-cols-[100px_1fr_1fr_72px] gap-3 bg-primary/20 px-3 py-2 text-xs font-semibold"><span>LUC</span><span>Nome da loja</span><span>Localização</span><span>Ações</span></div>{rows.map((row) => <div key={row.id} className="grid min-w-[620px] grid-cols-[100px_1fr_1fr_72px] items-center gap-3 border-t px-3 py-2 text-sm"><span className="font-medium">{row.luc_number}</span><span className="min-w-0 truncate">{row.shop_name}</span><span className="min-w-0 truncate text-muted-foreground">{row.location || "—"}</span><div className="flex gap-1">{canEdit ? <Button type="button" size="compactIcon" variant="ghost" title="Editar ambiente" onClick={() => startEdit(row)}><Pencil className="h-3.5 w-3.5" /></Button> : null}{canEdit ? <ConfirmDeleteButton title={`Excluir LUC ${row.luc_number}?`} description="O ambiente será removido desta OS, mantendo o histórico registrado." onConfirm={async () => { const { error } = await supabase.from("site_survey_visit_lucs").update({ active: false, updated_by: userId }).eq("id", row.id); if (error) return toast.error(error.message); toast.success("Ambiente removido da OS."); await load(); onChanged?.(); }} /> : null}</div></div>)}{!rows.length ? <p className="border-t p-4 text-sm text-muted-foreground">Nenhuma loja ou LUC cadastrado nesta OS.</p> : null}</div></CollapsibleContent>
    {history.some((item) => item.valid_until) ? <details className="rounded-md border px-3 py-2"><summary className="cursor-pointer text-sm font-medium">Histórico de nomes</summary><div className="mt-2 divide-y">{history.filter((item) => item.valid_until).map((item) => <div key={item.id} className="grid gap-1 py-2 text-sm sm:grid-cols-[110px_1fr_170px]"><span>LUC {item.luc_number}</span><span>{item.shop_name}</span><span className="text-muted-foreground">até {new Date(item.valid_until ?? item.valid_from).toLocaleString("pt-BR")}</span></div>)}</div></details> : null}
    <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}><DialogContent><DialogHeader><DialogTitle>{editing?.id ? "Editar ambiente" : "Adicionar ambiente"}</DialogTitle><DialogDescription>Informe o LUC, o nome atual da loja e, se desejar, sua localização.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="luc-draft">LUC</Label><Input id="luc-draft" value={draftLuc} onChange={(event) => setDraftLuc(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="shop-draft">Nome da loja</Label><Input id="shop-draft" value={draftName} onChange={(event) => setDraftName(event.target.value)} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="location-draft">Localização (opcional)</Label><Input id="location-draft" value={draftLocation} onChange={(event) => setDraftLocation(event.target.value)} placeholder="Ex.: 3º andar" /></div></div><div className="space-y-2"><input ref={facadeCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void analyzeFacade(file); }} /><input ref={facadeGalleryRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void analyzeFacade(file); }} /><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" disabled={analyzing}>{analyzing ? <Sparkles className="h-4 w-4" /> : <Camera className="h-4 w-4" />}{analyzing ? "Analisando fachada..." : "Identificar pela fachada"}</Button></DropdownMenuTrigger><DropdownMenuContent align="start" className="min-w-56"><DropdownMenuItem onSelect={() => facadeCameraRef.current?.click()}><Camera className="h-4 w-4" />Tirar foto</DropdownMenuItem><DropdownMenuItem onSelect={() => facadeGalleryRef.current?.click()}><Images className="h-4 w-4" />Escolher da galeria</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div><DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button><Button type="button" onClick={() => void saveEdit()}>Salvar</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}><DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Conferir importação</DialogTitle><DialogDescription>{validPreview.length} linha(s) válida(s) e {invalidCount} com pendência. LUCs já cadastrados terão nome e localização atualizados.</DialogDescription></DialogHeader><div className="overflow-x-auto rounded-md border"><div className="grid min-w-[720px] grid-cols-[100px_1fr_1fr_150px] gap-3 bg-primary/20 px-3 py-2 text-xs font-semibold"><span>LUC</span><span>Nome da loja</span><span>Localização</span><span>Resultado</span></div>{preview.map((item, index) => <div key={`${item.lucNumber}-${index}`} className="grid min-w-[720px] grid-cols-[100px_1fr_1fr_150px] gap-3 border-t px-3 py-2 text-sm"><span>{item.lucNumber || "—"}</span><span>{item.shopName || "—"}</span><span>{item.location || "—"}</span><span className={item.issue ? "text-destructive" : "text-muted-foreground"}>{item.issue ?? (currentByLuc.has(item.lucNumber.toLocaleLowerCase("pt-BR")) ? "Atualizar" : "Adicionar")}</span></div>)}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>Cancelar</Button><Button type="button" disabled={loading || !validPreview.length} onClick={() => void importRows()}>{loading ? "Importando..." : `Importar ${validPreview.length} ambiente(s)`}</Button></DialogFooter></DialogContent></Dialog>
  </section></Collapsible>;
}