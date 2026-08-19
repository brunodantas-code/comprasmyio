import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { toast } from "sonner";
import { ExternalLink, ArrowDownCircle, ArrowUpCircle, History, Search, Plus, Library, Trash2, Eraser } from "lucide-react";
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
import { ReleaseAssembledDialog, AssemblyReleasesCard } from "@/components/assembly-release";
import { StockSimulatorDialog, ProductionCapacityCard } from "@/components/stock-simulator";
import { StockQrDialog } from "@/components/homologation";
import { BomSettingsDialog } from "@/components/bom-settings";

type StockRow = {
  material_id: string;
  name: string;
  link: string | null;
  location: StockLocation;
  balance: number;
  total_in: number;
  total_out: number;
  last_movement_at: string | null;
};

type StockLocation = "almoxarifado" | "fabrica" | "unidade" | "tecnico" | "transito" | "perdido";

const LOCATION_LABELS: Record<StockLocation, string> = {
  fabrica: "Fábrica",
  almoxarifado: "Almoxarifado",
  transito: "Em Trânsito",
  unidade: "Unidade (cliente)",
  tecnico: "Técnico",
  perdido: "Perdido",
};

type MovementType = "entrada" | "saida" | "ajuste";

type Movement = {
  id: string;
  material_id: string;
  quantity: number;
  type: MovementType;
  reason: string | null;
  order_id: string | null;
  created_by: string | null;
  created_at: string;
};

const MOVEMENT_LABELS: Record<MovementType, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
};

const MOVEMENT_CLASSES: Record<MovementType, string> = {
  entrada: "bg-green-100 text-green-800 border-green-300",
  saida: "bg-orange-100 text-orange-800 border-orange-300",
  ajuste: "bg-blue-100 text-blue-800 border-blue-300",
};

function fmt(d: string) {
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function useStock() {
  return useQuery({
    queryKey: ["material-stock"],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_stock").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as StockRow[];
    },
  });
}

function useMovements() {
  return useQuery({
    queryKey: ["stock-movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as Movement[];
    },
  });
}

function useStockProfiles() {
  return useQuery({
    queryKey: ["profiles-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email");
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const p of data ?? []) map[p.id] = p.full_name || p.email || p.id;
      return map;
    },
  });
}

function MovementDialog({
  row,
  userId,
  type,
  trigger,
}: {
  row: StockRow;
  userId: string;
  type: MovementType;
  trigger: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const save = useMutation({
    mutationFn: async (v: { quantity: number; reason: string | null }) => {
      const { error } = await supabase.from("stock_movements").insert({
        material_id: row.material_id,
        quantity: v.quantity,
        type,
        reason: v.reason,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(type === "saida" ? "Baixa registrada" : "Movimentação registrada");
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
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
    if (type === "saida" && quantity > row.balance) return toast.error("Saldo insuficiente em estoque");
    save.mutate({ quantity, reason: reason || null });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === "saida" ? "Dar baixa" : type === "entrada" ? "Entrada manual" : "Ajuste"} — {row.name}
          </DialogTitle>
          <DialogDescription>Saldo atual: {row.balance}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`qty-${type}-${row.material_id}`}>Quantidade</Label>
            <Input id={`qty-${type}-${row.material_id}`} name="quantity" type="number" min={1} defaultValue={1} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`reason-${type}-${row.material_id}`}>
              Motivo <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id={`reason-${type}-${row.material_id}`}
              name="reason"
              placeholder={type === "saida" ? "Ex.: usado na obra do projeto X" : "Ex.: compra fora do sistema"}
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

function HistoryDialog({ row }: { row: StockRow }) {
  const [open, setOpen] = useState(false);
  const { data: movements } = useMovements();
  const { data: profiles } = useStockProfiles();
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
          <DialogDescription>Entradas e saídas registradas.</DialogDescription>
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

function DeleteMaterialDialog({ row }: { row: StockRow }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const del = useMutation({
    mutationFn: async () => {
      // Remove movimentações vinculadas para não bloquear o FK, depois o material.
      const { error: mErr } = await supabase.from("stock_movements").delete().eq("material_id", row.material_id);
      if (mErr) throw mErr;
      const { error } = await supabase.from("materials").delete().eq("id", row.material_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item excluída");
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["materials"] });
      setOpen(false);
      setConfirmText("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canConfirm = confirmText.trim().toLowerCase() === "excluir";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setConfirmText("");
      }}
    >
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Excluir item">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir "{row.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação remove o item e todo o seu histórico de movimentações deste local. Não é possível desfazer.
            <br />
            Para confirmar, digite <strong>excluir</strong> no campo abaixo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Digite: excluir"
          autoFocus
          className="mt-2"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={del.isPending || !canConfirm}
            onClick={() => del.mutate()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function StockTab({ userId, canDelete, onlyLocation }: { userId: string; canDelete?: boolean; onlyLocation?: StockLocation }) {
  const locations = (Object.keys(LOCATION_LABELS) as StockLocation[]).filter(
    (loc) => !onlyLocation || loc === onlyLocation,
  );
  return (
    <Tabs defaultValue={locations[0]} className="space-y-4">
      <TabsList>
        {locations.map((loc) => (
          <TabsTrigger key={loc} value={loc}>{LOCATION_LABELS[loc]}</TabsTrigger>
        ))}
      </TabsList>
      {locations.map((loc) => (
        <TabsContent key={loc} value={loc}>
          <StockSection userId={userId} location={loc} canDelete={canDelete} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function AddMaterialDialog({ location, userId }: { location: StockLocation; userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"new" | "import">("new");
  const [importId, setImportId] = useState("");
  const [importSearch, setImportSearch] = useState("");
  const [importIds, setImportIds] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newLink, setNewLink] = useState("");

  const { data: allMaterials } = useQuery({
    queryKey: ["materials", "library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, name, link, location")
        .order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; link: string | null; location: string }[];
    },
    enabled: open,
  });

  const here = new Set(
    (allMaterials ?? []).filter((m) => m.location === location).map((m) => m.name.trim().toLowerCase()),
  );
  const importable = (allMaterials ?? []).filter(
    (m) => m.location !== location && !here.has(m.name.trim().toLowerCase()),
  );

  const save = useMutation({
    mutationFn: async (v: { name: string; link: string | null }) => {
      const { error } = await supabase.from("materials").insert({ ...v, location, created_by: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item adicionado");
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["materials"] });
      setOpen(false);
      setImportId("");
    },
  });

  const importMany = useMutation({
    mutationFn: async (ids: string[]) => {
      const rows = (allMaterials ?? [])
        .filter((m) => ids.includes(m.id))
        .map((m) => ({ name: m.name, link: m.link ?? null, location, created_by: userId }));
      if (!rows.length) throw new Error("Selecione ao menos um material");
      const { error } = await supabase.from("materials").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      toast.success(`${n} item(ns) importado(s)`);
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["materials"] });
      setOpen(false);
      setImportIds([]);
      setImportSearch("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = newName.trim();
    const link = newLink.trim();
    if (!name) return toast.error("Informe o nome do item");
    save.mutate({ name, link: link || null });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setMode("new"); setImportId(""); setImportIds([]); setImportSearch(""); setNewName(""); setNewLink(""); } }}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Adicionar item</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo item — {LOCATION_LABELS[location]}</DialogTitle>
          <DialogDescription>O item fica disponível para entradas e baixas neste local.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={mode === "new" ? "default" : "outline"} onClick={() => setMode("new")}>
            Criar novo
          </Button>
          <Button type="button" size="sm" variant={mode === "import" ? "default" : "outline"} onClick={() => setMode("import")}>
            Importar da biblioteca
          </Button>
        </div>
        {mode === "import" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Biblioteca de materiais</Label>
              <Input
                value={importSearch}
                onChange={(e) => setImportSearch(e.target.value)}
                placeholder="Buscar por nome..."
              />
              <div className="max-h-72 overflow-y-auto rounded-md border divide-y">
                {importable
                  .filter((m) => m.name.toLowerCase().includes(importSearch.trim().toLowerCase()))
                  .map((m) => {
                    const checked = importIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className="flex cursor-pointer items-start gap-3 p-2 text-sm hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          onChange={() =>
                            setImportIds((prev) =>
                              checked ? prev.filter((x) => x !== m.id) : [...prev, m.id],
                            )
                          }
                        />
                        <span>
                          <span className="font-medium">{m.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {LOCATION_LABELS[m.location as StockLocation] ?? m.location}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                {!importable.filter((m) => m.name.toLowerCase().includes(importSearch.trim().toLowerCase())).length && (
                  <p className="p-3 text-xs text-muted-foreground">Nenhum material encontrado.</p>
                )}
              </div>
              {!importable.length && (
                <p className="text-xs text-muted-foreground">Nenhum material disponível para importar.</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                disabled={importMany.isPending || !importIds.length}
                onClick={() => importMany.mutate(importIds)}
              >
                Importar {importIds.length ? `(${importIds.length})` : ""}
              </Button>
            </DialogFooter>
          </div>
        ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`name-${location}`}>Nome</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Library className="mr-1 h-4 w-4" /> Biblioteca
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Buscar material..." />
                    <CommandList>
                      <CommandEmpty>Nenhum material cadastrado.</CommandEmpty>
                      <CommandGroup>
                        {(allMaterials ?? []).map((m) => (
                          <CommandItem
                            key={m.id}
                            value={m.name}
                            onSelect={() => { setNewName(m.name); setNewLink(m.link ?? ""); }}
                          >
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate">{m.name}</span>
                              {m.link && <span className="truncate text-xs text-muted-foreground">{m.link}</span>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <Input
              id={`name-${location}`}
              name="name"
              required
              placeholder="Digite ou selecione da biblioteca"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`link-${location}`}>Link <span className="text-muted-foreground">(opcional)</span></Label>
            <Input id={`link-${location}`} name="link" type="url" placeholder="https://" value={newLink} onChange={(e) => setNewLink(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResetStockDialog({
  rows,
  userId,
  location,
}: {
  rows: StockRow[];
  userId: string;
  location: StockLocation;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");

  const ids = rows.map((r) => r.material_id);

  const reset = useMutation({
    mutationFn: async () => {
      if (!ids.length) return;
      for (let i = 0; i < ids.length; i += 100) {
        const { error } = await supabase.from("stock_movements").delete().in("material_id", ids.slice(i, i + 100));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Estoque zerado");
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      setConfirm("");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setConfirm("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive">
          <Eraser className="mr-2 h-4 w-4" /> Zerar estoque
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zerar estoque — {LOCATION_LABELS[location]}</DialogTitle>
          <DialogDescription>
            Todos os saldos deste local serão zerados e todas as movimentações dos {ids.length} item(ns) serão
            apagadas do histórico. Esta ação não pode ser desfeita. Digite <strong>zerar</strong> para confirmar.
          </DialogDescription>
        </DialogHeader>
        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="zerar" />
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={confirm.trim().toLowerCase() !== "zerar" || !ids.length || reset.isPending}
            onClick={() => reset.mutate()}
          >
            Zerar estoque
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StockSection({ userId, location, canDelete }: { userId: string; location: StockLocation; canDelete?: boolean }) {
  const { data: stock, isLoading } = useStock();
  const { data: movements } = useMovements();
  const { data: profiles } = useStockProfiles();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"all" | "with" | "zero">("all");

  const scoped = (stock ?? []).filter((r) => (r.location ?? "fabrica") === location);
  const scopedIds = new Set(scoped.map((r) => r.material_id));
  const scopedMovements = (movements ?? []).filter((m) => scopedIds.has(m.material_id));

  const rows = scoped
    .filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((r) => (view === "with" ? r.balance > 0 : view === "zero" ? r.balance <= 0 : true));

  const totalItems = scoped.reduce((acc, r) => acc + Math.max(r.balance, 0), 0);
  const materialNames = Object.fromEntries((stock ?? []).map((r) => [r.material_id, r.name]));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Itens cadastrados</CardDescription></CardHeader>
          <CardContent className="text-2xl font-semibold">{scoped.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Itens em estoque</CardDescription></CardHeader>
          <CardContent className="text-2xl font-semibold">{totalItems}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Itens zerados</CardDescription></CardHeader>
          <CardContent className="text-2xl font-semibold">
            {scoped.filter((r) => r.balance <= 0).length}
          </CardContent>
        </Card>
      </div>

      {location === "almoxarifado" && (
        <AssemblyReleasesCard
          materialNames={materialNames}
          userId={userId}
          homologable
          canDelete={canDelete}
          canReportIssue
          title="Produtos para homologar"
          description="Produtos montados liberados pela fábrica, aguardando homologação."
        />
      )}

      {location === "fabrica" && (
        <AssemblyReleasesCard materialNames={materialNames} userId={userId} canCorrect canDelete={canDelete} />
      )}

      {location === "fabrica" && <ProductionCapacityCard />}

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Estoque — {LOCATION_LABELS[location]}</CardTitle>
            <CardDescription>
              {location === "almoxarifado"
                ? "Adicione itens e registre entradas e baixas do almoxarifado."
                : 'A entrada é automática quando o solicitante confirma "Recebido corretamente" em um pedido feito pela biblioteca.'}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AddMaterialDialog location={location} userId={userId} />
            {location === "fabrica" && <ReleaseAssembledDialog userId={userId} />}
            {location === "fabrica" && <BomSettingsDialog />}
            {location === "fabrica" && <StockSimulatorDialog userId={userId} />}
            <ResetStockDialog rows={scoped} userId={userId} location={location} />
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar material"
                className="w-[200px] pl-8"
              />
            </div>
            <Select value={view} onValueChange={(v) => setView(v as "all" | "with" | "zero")}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
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
          ) : !rows.length ? (
            <p className="text-sm text-muted-foreground">Nenhum material encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Entradas</TableHead>
                  <TableHead className="text-right">Saídas</TableHead>
                  <TableHead>Última movimentação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.material_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <StockQrDialog
                          stockName={r.name}
                          trigger={
                            <button type="button" className="text-left hover:underline">
                              {r.name}
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
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={r.balance > 0 ? "bg-green-100 text-green-800 border-green-300" : "bg-muted text-muted-foreground"}
                      >
                        {r.balance}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{r.total_in}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{r.total_out}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.last_movement_at ? fmt(r.last_movement_at) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <MovementDialog
                          row={r}
                          userId={userId}
                          type="entrada"
                          trigger={
                            <Button size="sm" variant="outline">
                              <ArrowDownCircle className="mr-1 h-4 w-4" /> Entrada
                            </Button>
                          }
                        />
                        <MovementDialog
                          row={r}
                          userId={userId}
                          type="saida"
                          trigger={
                            <Button size="sm" variant="outline" disabled={r.balance <= 0}>
                              <ArrowUpCircle className="mr-1 h-4 w-4" /> Dar baixa
                            </Button>
                          }
                        />
                        <HistoryDialog row={r} />
                        {canDelete && <DeleteMaterialDialog row={r} />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimentações recentes</CardTitle>
          <CardDescription>Histórico completo de entradas e saídas.</CardDescription>
        </CardHeader>
        <CardContent>
          {!scopedMovements.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scopedMovements.slice(0, 50).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmt(m.created_at)}</TableCell>
                    <TableCell className="font-medium">
                      {(stock ?? []).find((s) => s.material_id === m.material_id)?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={MOVEMENT_CLASSES[m.type]}>{MOVEMENT_LABELS[m.type]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{m.type === "saida" ? "-" : "+"}{m.quantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.reason ?? "—"}</TableCell>
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