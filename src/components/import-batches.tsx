import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Paperclip, X, Trash2, Plane, ExternalLink } from "lucide-react";

const BUCKET = "order-attachments";
const MAX_FILES = 10;

type ImportStatus = "pendente" | "comprado_aguardando" | "entregue" | "cancelado" | "recebido_ok" | "recebido_problema";

const STATUS_LABELS: Record<ImportStatus, string> = {
  pendente: "Pendente",
  comprado_aguardando: "Comprado e aguardando envio",
  entregue: "Entregue",
  cancelado: "Cancelado",
  recebido_ok: "Recebido corretamente",
  recebido_problema: "Recebido com problemas",
};

const STATUS_CLASSES: Record<ImportStatus, string> = {
  pendente: "bg-yellow-500 hover:bg-yellow-500 text-black border-transparent",
  comprado_aguardando: "bg-green-600 hover:bg-green-600 text-white border-transparent",
  entregue: "bg-blue-600 hover:bg-blue-600 text-white border-transparent",
  cancelado: "bg-red-600 hover:bg-red-600 text-white border-transparent",
  recebido_ok: "bg-slate-200 hover:bg-slate-200 text-slate-700 border-transparent",
  recebido_problema: "bg-amber-100 hover:bg-amber-100 text-amber-900 border-transparent",
};

const STATUS_KEYS = Object.keys(STATUS_LABELS) as ImportStatus[];

type Attachment = { path: string; name: string; size: number; type: string };

type ImportItem = {
  id: string;
  source: "fabrica" | "terceiros" | "ferramenta";
  material_id: string | null;
  terceiros_material_id: string | null;
  tool_asset_id: string | null;
  item_name: string;
  quantity: number;
};

type ImportBatch = {
  id: string;
  name: string;
  notes: string | null;
  status: ImportStatus;
  attachments: Attachment[] | null;
  created_at: string;
  created_by: string | null;
  import_batch_items: ImportItem[];
};

type ImportableItem = {
  key: string;
  id: string;
  name: string;
  source: "fabrica" | "terceiros" | "ferramenta";
  originLabel: string;
  lotQuantity: number;
};

const SOURCE_LABELS: Record<ImportItem["source"], string> = {
  fabrica: "Fábrica/Almoxarifado",
  terceiros: "Myio Terceiros",
  ferramenta: "Ferramentas/Ativos",
};

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("pt-BR");
}

async function openAttachment(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600);
  if (error || !data?.signedUrl) return toast.error(error?.message || "Falha ao abrir");
  window.open(data.signedUrl, "_blank", "noopener");
}

function useImportableItems() {
  return useQuery({
    queryKey: ["importable-items"],
    queryFn: async (): Promise<ImportableItem[]> => {
      const [mats, ters, tools] = await Promise.all([
        supabase.from("materials").select("id, name, is_manufactured, lot_quantity").eq("purchase_type", "importacao").order("name"),
        supabase.from("terceiros_materials").select("id, name, lot_quantity").eq("purchase_type", "importacao").order("name"),
        supabase.from("tool_assets").select("id, name, lot_quantity").eq("purchase_type", "importacao").order("name"),
      ]);
      if (mats.error) throw mats.error;
      if (ters.error) throw ters.error;
      if (tools.error) throw tools.error;
      return [
        ...(mats.data ?? []).filter((m) => !m.is_manufactured).map((m) => ({
          key: `fabrica:${m.id}`, id: m.id, name: m.name, source: "fabrica" as const, originLabel: SOURCE_LABELS.fabrica, lotQuantity: Math.max(1, m.lot_quantity ?? 1),
        })),
        ...(ters.data ?? []).map((m) => ({
          key: `terceiros:${m.id}`, id: m.id, name: m.name, source: "terceiros" as const, originLabel: SOURCE_LABELS.terceiros, lotQuantity: Math.max(1, m.lot_quantity ?? 1),
        })),
        ...(tools.data ?? []).map((m) => ({
          key: `ferramenta:${m.id}`, id: m.id, name: m.name, source: "ferramenta" as const, originLabel: SOURCE_LABELS.ferramenta, lotQuantity: Math.max(1, m.lot_quantity ?? 1),
        })),
      ];
    },
  });
}

function useImportBatches() {
  return useQuery({
    queryKey: ["import-batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("import_batches")
        .select("id, name, notes, status, attachments, created_at, created_by, import_batch_items(id, source, material_id, terceiros_material_id, tool_asset_id, item_name, quantity)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ImportBatch[];
    },
  });
}

function NewImportDialog({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: items, isLoading } = useImportableItems();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const reset = () => { setName(""); setNotes(""); setFiles([]); setQty({}); setRemoved(new Set()); };

  const visible = (items ?? []).filter((i) => !removed.has(i.key));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Informe o nome da importação.");
      const chosen = visible
        .map((i) => ({ item: i, lots: parseInt(qty[i.key] ?? "", 10) }))
        .filter((r) => Number.isFinite(r.lots) && r.lots > 0)
        .map((r) => ({ ...r, quantity: r.lots * r.item.lotQuantity }));
      if (chosen.length === 0) throw new Error("Informe a quantidade de lotes de pelo menos um item.");
      if (files.length > MAX_FILES) throw new Error(`Máximo de ${MAX_FILES} documentos.`);

      const { data: batch, error } = await supabase
        .from("import_batches")
        .insert({ name: name.trim(), notes: notes.trim() || null, created_by: userId })
        .select("id")
        .single();
      if (error) throw error;

      const { error: ie } = await supabase.from("import_batch_items").insert(
        chosen.map((c) => ({
          batch_id: batch.id,
          source: c.item.source,
          material_id: c.item.source === "fabrica" ? c.item.id : null,
          terceiros_material_id: c.item.source === "terceiros" ? c.item.id : null,
          tool_asset_id: c.item.source === "ferramenta" ? c.item.id : null,
          item_name: c.item.name,
          quantity: c.quantity,
        }))
      );
      if (ie) throw ie;

      if (files.length) {
        const uploaded: Attachment[] = [];
        for (const f of files) {
          const safe = f.name.replace(/[^\w.\-]+/g, "_");
          const path = `imports/${batch.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
          const { error: ue } = await supabase.storage.from(BUCKET).upload(path, f, {
            contentType: f.type || "application/octet-stream",
          });
          if (ue) throw ue;
          uploaded.push({ path, name: f.name, size: f.size, type: f.type });
        }
        const { error: ae } = await supabase.from("import_batches").update({ attachments: uploaded }).eq("id", batch.id);
        if (ae) throw ae;
      }
    },
    onSuccess: () => {
      toast.success("Importação criada como Pendente.");
      qc.invalidateQueries({ queryKey: ["import-batches"] });
      reset();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Nova importação</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova importação</DialogTitle>
          <DialogDescription>Dê um nome, anexe documentos e escolha as quantidades dos itens importados.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="import-name">Nome da importação</Label>
          <Input id="import-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Importação Shenzhen Março" />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Paperclip className="h-4 w-4" />Anexos <span className="text-xs text-muted-foreground">(máx. {MAX_FILES} documentos)</span></Label>
          <Input
            type="file"
            multiple
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
            onChange={(e) => {
              const fs = Array.from(e.target.files ?? []);
              const next = [...files, ...fs];
              if (next.length > MAX_FILES) toast.error(`Máximo de ${MAX_FILES} documentos.`);
              setFiles(next.slice(0, MAX_FILES));
              e.target.value = "";
            }}
          />
          {files.length > 0 && (
            <ul className="space-y-1 text-xs">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded border px-2 py-1">
                  <span className="truncate">{f.name} <span className="text-muted-foreground">({Math.round(f.size / 1024)} KB)</span></span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="import-notes">Observação</Label>
          <Textarea id="import-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Itens importados (quantidade em lotes)</Label>
            <div className="flex items-center gap-2">
              <input
                ref={ciInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) ciMutation.mutate(f);
                }}
              />
              <Button type="button" variant="outline" size="sm" disabled={ciMutation.isPending || !items?.length} onClick={() => ciInputRef.current?.click()}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {ciMutation.isPending ? "Lendo planilha..." : "Importar Excel (CI)"}
              </Button>
              {removed.size > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setRemoved(new Set())}>Restaurar removidos</Button>
              )}
            </div>
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando itens...</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item cadastrado como importado.</p>
          ) : (
            <div className="space-y-2">
              {visible.map((i) => (
                <div key={i.key} className="flex items-center justify-between gap-3 rounded-md border p-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{i.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.originLabel} · {i.lotQuantity} un/lote
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <Input
                        type="number"
                        min={0}
                        className="w-24"
                        placeholder="0"
                        aria-label={`Lotes de ${i.name}`}
                        value={qty[i.key] ?? ""}
                        onChange={(e) => setQty((p) => ({ ...p, [i.key]: e.target.value }))}
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {(() => {
                          const l = parseInt(qty[i.key] ?? "", 10);
                          return Number.isFinite(l) && l > 0 ? `${l * i.lotQuantity} un` : "lotes";
                        })()}
                      </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setRemoved((p) => new Set(p).add(i.key))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar importação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportDetailDialog({ batch, canManage }: { batch: ImportBatch; canManage: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const statusMutation = useMutation({
    mutationFn: async (status: ImportStatus) => {
      const { error } = await supabase.from("import_batches").update({ status }).eq("id", batch.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["import-batches"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["tool-stock"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const atts = batch.attachments ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Ver conteúdo</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plane className="h-4 w-4" />{batch.name}</DialogTitle>
          <DialogDescription>Criada em {formatDateTime(batch.created_at)}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className={STATUS_CLASSES[batch.status]}>{STATUS_LABELS[batch.status]}</Badge>
          {canManage && (
            <Select value={batch.status} onValueChange={(v) => statusMutation.mutate(v as ImportStatus)}>
              <SelectTrigger className="h-8 w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_KEYS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label>Itens</Label>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Item</TableHead><TableHead>Origem</TableHead><TableHead className="w-24">Qtd</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {batch.import_batch_items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.item_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{SOURCE_LABELS[i.source]}</TableCell>
                  <TableCell>{i.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-1">
          <Label>Observação</Label>
          <p className="text-sm text-muted-foreground">{batch.notes || "—"}</p>
        </div>

        <div className="space-y-2">
          <Label>Anexos ({atts.length})</Label>
          {atts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum anexo.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {atts.map((a) => (
                <li key={a.path}>
                  <button type="button" className="inline-flex items-center gap-1 hover:underline" onClick={() => openAttachment(a.path)}>
                    <Paperclip className="h-3 w-3" />{a.name}<ExternalLink className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteImportDialog({ id }: { id: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("import_batches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Importação excluída.");
      qc.invalidateQueries({ queryKey: ["import-batches"] });
      setOpen(false);
      setText("");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir importação</DialogTitle>
          <DialogDescription>Digite "excluir" para confirmar. Esta ação é definitiva.</DialogDescription>
        </DialogHeader>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder='digite "excluir"' />
        <DialogFooter>
          <Button variant="destructive" disabled={text.trim().toLowerCase() !== "excluir" || mutation.isPending} onClick={() => mutation.mutate()}>
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ImportBatchesSection({ userId }: { userId: string }) {
  const { data: me } = useCurrentUser();
  const { data: batches, isLoading } = useImportBatches();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const list = (batches ?? []).filter((b) => statusFilter === "all" || b.status === statusFilter);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Plane className="h-5 w-5" />Importações</CardTitle>
          <CardDescription>Cada importação é uma compra única com seus itens, observações e documentos.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-52"><SelectValue placeholder="Filtrar status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_KEYS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <NewImportDialog userId={userId} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma importação cadastrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Importação</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Anexos</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">
                    {b.name}
                    {b.notes && <p className="max-w-xs truncate text-xs text-muted-foreground">{b.notes}</p>}
                  </TableCell>
                  <TableCell>{b.import_batch_items.length}</TableCell>
                  <TableCell>{(b.attachments ?? []).length}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(b.created_at)}</TableCell>
                  <TableCell><Badge className={STATUS_CLASSES[b.status]}>{STATUS_LABELS[b.status]}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <ImportDetailDialog batch={b} canManage={!!(me?.isAdmin || me?.isComprador || b.created_by === userId)} />
                      {me?.isAdmin && <DeleteImportDialog id={b.id} />}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
