import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MaterialDetailDialog } from "@/components/material-detail";
import { StockPhotoCell, useStockMeta } from "@/components/stock-meta";

import { toast } from "sonner";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Camera,
  ExternalLink,
  History,
  ImagePlus,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

type MovementType = "entrada" | "saida" | "ajuste";

const MOVEMENT_LABELS: Record<MovementType, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
};
const MOVEMENT_CLASSES: Record<MovementType, string> = {
  entrada: "bg-green-100 text-green-800 border-green-300",
  saida: "bg-red-100 text-red-800 border-red-300",
  ajuste: "bg-amber-100 text-amber-800 border-amber-300",
};

function fmt(d: string) {
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

type ToolRow = {
  material_id: string;
  name: string;
  link: string | null;
  balance: number;
  total_in: number;
  total_out: number;
  last_movement_at: string | null;
};

type ToolMovement = {
  id: string;
  material_id: string;
  quantity: number;
  type: MovementType;
  reason: string | null;
  destination: string | null;
  responsible: string | null;
  created_by: string | null;
  created_at: string;
};

function useToolProfiles() {
  return useQuery({
    queryKey: ["tool-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((p) => [p.id, p.full_name || p.email || "Usuário"]));
    },
  });
}

function useToolStock() {
  return useQuery({
    queryKey: ["tool-stock"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tool_asset_stock").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as unknown as ToolRow[];
    },
  });
}

function useToolMovements() {
  return useQuery({
    queryKey: ["tool-movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tool_movements")
        .select("id, material_id, quantity, type, reason, destination, responsible, created_by, created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as ToolMovement[];
    },
  });
}

function ToolMovementDialog({
  row,
  userId,
  type,
  trigger,
}: {
  row: ToolRow;
  userId: string;
  type: MovementType;
  trigger: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: profiles } = useToolProfiles();
  const [destination, setDestination] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const isExit = type === "saida";

  const save = useMutation({
    mutationFn: async (v: { quantity: number; reason: string | null }) => {
      let photo_url: string | null = null;
      if (isExit && file) {
        const path = `stock-exits/ferramentas-${row.material_id}/${crypto.randomUUID()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("assembly-photos").upload(path, file);
        if (upErr) throw upErr;
        photo_url = path;
      }
      const { error } = await supabase.from("tool_movements").insert({
        material_id: row.material_id,
        quantity: v.quantity,
        type,
        reason: v.reason,
        created_by: userId,
        ...(isExit ? { destination: destination.trim(), responsible: destination.trim(), photo_url } : {}),
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isExit ? "Baixa registrada" : "Movimentação registrada");
      qc.invalidateQueries({ queryKey: ["tool-stock"] });
      qc.invalidateQueries({ queryKey: ["tool-movements"] });
      setDestination("");
      setFile(null);
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const quantity = Number(fd.get("quantity"));
    const reason = String(fd.get("reason") || "").trim();
    if (!Number.isInteger(quantity) || quantity <= 0) return toast.error("Quantidade inválida");
    if (isExit && quantity > row.balance) return toast.error("Saldo insuficiente em estoque");
    if (isExit && !destination.trim()) return toast.error("Informe o destino (técnico ou local)");
    save.mutate({ quantity, reason: reason || null });
  }

  const profileNames = Object.values(profiles ?? {}).sort((a, b) => a.localeCompare(b));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isExit ? "Dar baixa" : type === "entrada" ? "Entrada manual" : "Ajuste"} — {row.name}
          </DialogTitle>
          <DialogDescription>Saldo atual: {row.balance} (Ferramentas/Ativos)</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`fqty-${type}-${row.material_id}`}>Quantidade</Label>
            <Input id={`fqty-${type}-${row.material_id}`} name="quantity" type="number" min={1} defaultValue={1} required />
          </div>
          {isExit && (
            <div className="space-y-2">
              <Label htmlFor={`fdest-${row.material_id}`}>Destino — técnico ou local (obrigatório)</Label>
              <Input
                id={`fdest-${row.material_id}`}
                list={`fdest-list-${row.material_id}`}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Ex.: João (técnico) ou Obra Cliente X"
              />
              <datalist id={`fdest-list-${row.material_id}`}>
                {profileNames.map((n) => (
                  <option key={n} value={n} />
                ))}
                <option value="Almoxarifado" />
                <option value="Fábrica" />
                <option value="Escritório" />
              </datalist>
            </div>
          )}
          {isExit && (
            <div className="space-y-2">
              <Label>Foto <span className="text-muted-foreground">(opcional)</span></Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => cameraRef.current?.click()}>
                  <Camera className="mr-2 h-4 w-4" /> Câmera
                </Button>
                <Button type="button" variant="outline" onClick={() => galleryRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" /> Galeria
                </Button>
              </div>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor={`freason-${type}-${row.material_id}`}>
              Observação <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id={`freason-${type}-${row.material_id}`}
              name="reason"
              placeholder={isExit ? "Ex.: uso em campo" : "Ex.: compra fora do sistema"}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>Confirmar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ToolHistoryDialog({ row }: { row: ToolRow }) {
  const [open, setOpen] = useState(false);
  const { data: movements } = useToolMovements();
  const { data: profiles } = useToolProfiles();
  const list = (movements ?? []).filter((m) => m.material_id === row.material_id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Histórico">
          <History className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico — {row.name}</DialogTitle>
          <DialogDescription>Entradas e baixas registradas em Ferramentas/Ativos.</DialogDescription>
        </DialogHeader>
        {!list.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma movimentação ainda.</p>
        ) : (
          <ul className="space-y-3">
            {list.map((m) => (
              <li key={m.id} className="flex items-start gap-3 border-l-2 border-border pl-3">
                <Badge variant="outline" className={MOVEMENT_CLASSES[m.type]}>
                  {MOVEMENT_LABELS[m.type]} {m.type === "saida" ? "-" : "+"}
                  {m.quantity}
                </Badge>
                <div className="min-w-0 text-sm">
                  <div className="text-muted-foreground">{fmt(m.created_at)}</div>
                  <div>{m.created_by ? (profiles?.[m.created_by] ?? "Usuário") : "Sistema"}</div>
                  {(m.destination || m.responsible) && (
                    <div className="text-muted-foreground">Destino: {m.destination ?? m.responsible}</div>
                  )}
                  {m.reason && <div className="text-muted-foreground">{m.reason}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ToolDeleteDialog({ row }: { row: ToolRow }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tool_assets").delete().eq("id", row.material_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ferramenta excluída");
      qc.invalidateQueries({ queryKey: ["tool-stock"] });
      qc.invalidateQueries({ queryKey: ["tool-movements"] });
      qc.invalidateQueries({ queryKey: ["purchasable-items"] });
      setOpen(false);
      setConfirmText("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canConfirm = confirmText.trim().toLowerCase() === "excluir";

  return (
    <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmText(""); }}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive" title="Excluir">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {row.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            A ferramenta e todas as suas movimentações serão apagadas. Digite <strong>excluir</strong> para confirmar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="excluir" />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canConfirm || del.isPending}
            onClick={(e) => { e.preventDefault(); if (canConfirm) del.mutate(); }}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AddToolDialog({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newLot, setNewLot] = useState("");
  const [newType, setNewType] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setNewName("");
    setNewLink("");
    setNewLot("");
    setNewType("");
    setNewDescription("");
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const save = useMutation({
    mutationFn: async () => {
      const name = newName.trim();
      if (!name) throw new Error("Informe o nome da ferramenta");
      const lot = newLot.trim() === "" ? null : Number(newLot);
      if (lot !== null && (!Number.isFinite(lot) || lot <= 0)) throw new Error("Quantidade por lote inválida");
      let photo_url: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop() ?? "jpg";
        const path = `materials/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, photoFile);
        if (upErr) throw upErr;
        photo_url = path;
      }
      const { error } = await supabase.from("tool_assets").insert({
        name,
        link: newLink.trim() || null,
        lot_quantity: lot,
        purchase_type: newType || null,
        description: newDescription.trim() || null,
        photo_url,
        created_by: userId,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ferramenta adicionada");
      qc.invalidateQueries({ queryKey: ["tool-stock"] });
      qc.invalidateQueries({ queryKey: ["purchasable-items"] });
      setOpen(false);
      resetForm();
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("tool_assets_unique_name") ? "Já existe uma ferramenta com esse nome" : e.message,
      ),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Adicionar ferramenta</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova ferramenta / ativo</DialogTitle>
          <DialogDescription>
            Banco de dados próprio e independente dos demais estoques.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="flex h-36 w-full items-center justify-center overflow-hidden rounded-md border bg-muted/40 transition hover:opacity-90"
            title={photoPreview ? "Trocar foto" : "Adicionar foto"}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Foto da ferramenta" className="h-full w-full object-contain" />
            ) : (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <ImagePlus className="h-4 w-4" /> Adicionar foto <span className="text-xs">(opcional)</span>
              </span>
            )}
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              setPhotoFile(f);
              setPhotoPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
          <div className="space-y-2">
            <Label htmlFor="tool-name">Nome</Label>
            <Input id="tool-name" required placeholder="Nome da ferramenta/ativo" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tool-link">Link de Referência <span className="text-muted-foreground">(opcional)</span></Label>
            <Input id="tool-link" type="url" placeholder="https://" value={newLink} onChange={(e) => setNewLink(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tool-lot">Quantidade por lote <span className="text-muted-foreground">(opcional)</span></Label>
            <Input id="tool-lot" type="number" min="1" placeholder="Ex.: 10" value={newLot} onChange={(e) => setNewLot(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tipo de compra <span className="text-muted-foreground">(opcional)</span></Label>
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nacional">Nacional</SelectItem>
                <SelectItem value="importacao">Importação</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tool-desc">Observações <span className="text-muted-foreground">(opcional)</span></Label>
            <Textarea id="tool-desc" rows={3} placeholder="Detalhes da ferramenta" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ToolAssetsSection({ userId, canDelete }: { userId: string; canDelete?: boolean }) {
  const { data: rows, isLoading } = useToolStock();
  const { data: movements } = useToolMovements();
  const { data: profiles } = useToolProfiles();
  const { data: metaMap } = useStockMeta("tool_assets");

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"all" | "with" | "zero">("all");

  const filtered = (rows ?? [])
    .filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((r) => (view === "with" ? r.balance > 0 : view === "zero" ? r.balance <= 0 : true));
  const nameById = Object.fromEntries((rows ?? []).map((r) => [r.material_id, r.name]));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Ferramentas / Ativos</CardTitle>
            <CardDescription>
              Banco de dados próprio. Toda baixa exige um destino (técnico ou local). Toque no nome para ver foto,
              link de referência e configurações de compra.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AddToolDialog userId={userId} />
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ferramenta"
                className="w-full pl-8 sm:w-[200px]"
              />
            </div>
            <Select value={view} onValueChange={(v) => setView(v as "all" | "with" | "zero")}>
              <SelectTrigger className="w-full sm:w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="with">Com saldo</SelectItem>
                <SelectItem value="zero">Sem saldo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !filtered.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma ferramenta encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ferramenta / Ativo</TableHead>
                  <TableHead>Código Myio</TableHead>
                  <TableHead>Código Fabricante</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Imagem</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const meta = metaMap?.[r.material_id];
                  return (
                  <TableRow key={r.material_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MaterialDetailDialog
                          materialId={r.material_id}
                          name={r.name}
                          table="tool_assets"
                          trigger={
                            <button type="button" className="text-left hover:underline">
                              {meta?.description?.trim() || r.name}
                            </button>
                          }
                        />
                        {r.link && (
                          <a href={r.link} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{meta?.myio_code || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{meta?.manufacturer_code || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={r.balance > 0 ? "bg-green-100 text-green-800 border-green-300" : "bg-muted text-muted-foreground"}
                      >
                        {r.balance}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StockPhotoCell url={meta?.photo} name={r.name} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <ToolMovementDialog
                          row={r}
                          userId={userId}
                          type="entrada"
                          trigger={
                            <Button size="icon" variant="outline" title="Entrada" aria-label="Entrada">
                              <ArrowDownCircle className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <ToolMovementDialog
                          row={r}
                          userId={userId}
                          type="saida"
                          trigger={
                            <Button size="icon" variant="outline" disabled={r.balance <= 0} title="Saída" aria-label="Saída">
                              <ArrowUpCircle className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <ToolHistoryDialog row={r} />
                        {canDelete && <ToolDeleteDialog row={r} />}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>

          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimentações recentes</CardTitle>
          <CardDescription>Últimas entradas e baixas de ferramentas/ativos.</CardDescription>
        </CardHeader>
        <CardContent>
          {!movements?.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma movimentação ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Ferramenta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.slice(0, 50).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm text-muted-foreground">{fmt(m.created_at)}</TableCell>
                    <TableCell>{nameById[m.material_id] ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={MOVEMENT_CLASSES[m.type]}>{MOVEMENT_LABELS[m.type]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{m.type === "saida" ? "-" : "+"}{m.quantity}</TableCell>
                    <TableCell className="text-sm">{m.destination ?? m.responsible ?? "—"}</TableCell>
                    <TableCell className="text-sm">{m.created_by ? (profiles?.[m.created_by] ?? "Usuário") : "Sistema"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
