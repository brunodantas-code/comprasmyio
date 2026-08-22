import { useRef, useState } from "react";
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
import { DistributionCard, TransitCard, LostCard } from "@/components/distribution";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { toast } from "sonner";
import { ExternalLink, ArrowDownCircle, ArrowUpCircle, History, Search, Plus, Library, Trash2, Eraser, ArrowLeftRight, Camera, Upload } from "lucide-react";
import { QrLinkPicker, type LinkedQr } from "@/components/myio-delivery-qr";
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
import { StockQrDialog, BoxesCard } from "@/components/homologation";
import { BomSettingsDialog } from "@/components/bom-settings";
import { UnitProductsCard } from "@/components/unit-products";
import { QrCheckSection } from "@/components/qr-check";
import { MyioDemandCard, ProductionQueueCard } from "@/components/myio-demand";
import { TechnicianItemsCard } from "@/components/technician-items";
import { MaterialDetailDialog } from "@/components/material-detail";


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
  almoxarifado: "Estoque",
  transito: "Transporte",
  unidade: "Cliente",
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
  responsible?: string | null;
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
    queryKey: ["profiles-name-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email");
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const p of data ?? []) map[p.id] = p.full_name || p.email || p.id;
      return map;
    },
  });
}

function useManufacturedMap() {
  return useQuery({
    queryKey: ["materials-manufactured-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("materials").select("id, is_manufactured");
      if (error) throw error;
      const map: Record<string, boolean> = {};
      for (const m of data ?? []) map[m.id] = !!m.is_manufactured;
      return map;
    },
  });
}

function MovementDialog({
  row,
  userId,
  type,
  trigger,
  isManufactured: isManufacturedProp,
}: {
  row: StockRow;
  userId: string;
  type: MovementType;
  trigger: React.ReactNode;
  isManufactured?: boolean;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: profiles } = useStockProfiles();
  const { data: manufacturedMap } = useManufacturedMap();
  const isManufactured = isManufacturedProp ?? !!manufacturedMap?.[row.material_id];
  const [responsible, setResponsible] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [qrs, setQrs] = useState<LinkedQr[]>([]);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const isExit = type === "saida";
  const needsQr = isExit && !!isManufactured;

  const save = useMutation({
    mutationFn: async (v: { quantity: number; reason: string | null }) => {
      let photo_url: string | null = null;
      if (isExit && file) {
        const path = `stock-exits/${row.material_id}/${crypto.randomUUID()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("assembly-photos").upload(path, file);
        if (upErr) throw upErr;
        photo_url = path;
      }
      const { data: movement, error } = await supabase
        .from("stock_movements")
        .insert({
          material_id: row.material_id,
          quantity: v.quantity,
          type,
          reason: v.reason,
          created_by: userId,
          ...(isExit ? { responsible: responsible.trim(), photo_url } : {}),
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      if (isExit && qrs.length) {
        const { error: qrErr } = await supabase.from("stock_movement_qrs").insert(
          qrs.map((q) => ({
            movement_id: (movement as { id: string }).id,
            qr_value: q.qr_value,
            box_qr: q.box_qr,
            homologation_unit_id: q.homologation_unit_id,
            created_by: userId,
          })) as never,
        );
        if (qrErr) throw qrErr;
      }
    },
    onSuccess: () => {
      toast.success(type === "saida" ? "Baixa registrada" : "Movimentação registrada");
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      setResponsible("");
      setFile(null);
      setQrs([]);
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const quantity = needsQr && qrs.length ? qrs.length : Number(fd.get("quantity"));
    const reason = String(fd.get("reason") || "").trim();
    if (!Number.isInteger(quantity) || quantity <= 0) return toast.error("Quantidade inválida");
    if (type === "saida" && quantity > row.balance) return toast.error("Saldo insuficiente em estoque");
    if (isExit && !responsible.trim()) return toast.error("Informe o técnico/responsável");
    if (needsQr && qrs.length === 0) return toast.error("Vincule ao menos um QR code");
    if (needsQr && !file) return toast.error("Foto obrigatória para produtos Myio");
    if (isExit && qrs.length === 0 && !file)
      return toast.error("Todo produto entregue ao técnico precisa de QR code ou foto");
    save.mutate({ quantity, reason: reason || null });
  }

  const profileNames = Object.values(profiles ?? {}).sort((a, b) => a.localeCompare(b));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type === "saida" ? "Dar baixa" : type === "entrada" ? "Entrada manual" : "Ajuste"} — {row.name}
          </DialogTitle>
          <DialogDescription>Saldo atual: {row.balance}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`qty-${type}-${row.material_id}`}>Quantidade</Label>
            <Input
              id={`qty-${type}-${row.material_id}`}
              name="quantity"
              type="number"
              min={1}
              defaultValue={1}
              value={needsQr && qrs.length ? qrs.length : undefined}
              disabled={needsQr && qrs.length > 0}
              readOnly={needsQr && qrs.length > 0}
              required
            />
            {needsQr && qrs.length > 0 && (
              <p className="text-xs text-muted-foreground">Quantidade definida pelos QR codes vinculados.</p>
            )}
          </div>
          {isExit && (
            <div className="space-y-2">
              <Label htmlFor={`resp-${row.material_id}`}>Técnico / responsável (obrigatório)</Label>
              <Input
                id={`resp-${row.material_id}`}
                list={`resp-list-${row.material_id}`}
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="Nome do técnico ou responsável"
              />
              <datalist id={`resp-list-${row.material_id}`}>
                {profileNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
          )}
          {isExit && <QrLinkPicker value={qrs} onChange={setQrs} required={needsQr} />}
          {isExit && (
            <div className="space-y-2">
              <Label>
                Foto do material {isManufactured ? "(obrigatória)" : qrs.length ? "(opcional)" : "(obrigatória se não houver QR code)"}
              </Label>
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
                  {m.responsible && <div className="text-muted-foreground">Destinado a: {m.responsible}</div>}
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
  const showHomologacao = !onlyLocation;
  const tabs: string[] = [];
  locations.forEach((loc) => {
    tabs.push(loc);
    if (loc === "almoxarifado") tabs.push("distribuicao");
    if (loc === "fabrica" && showHomologacao) tabs.push("homologacao");
  });
  if (!onlyLocation) tabs.push("qr-check");
  return (
    <Tabs defaultValue={tabs[0]} className="space-y-4">
      <TabsList>
        {tabs.map((t) => (
          <TabsTrigger key={t} value={t} className={t === "qr-check" ? "ml-2" : undefined}>
            {t === "homologacao"
              ? "Homologação"
              : t === "distribuicao"
                ? "Expedição"
                : t === "qr-check"
                  ? "Checar QR Code"
                  : LOCATION_LABELS[t as StockLocation]}
          </TabsTrigger>
        ))}
      </TabsList>
      {locations.map((loc) => (
        <TabsContent key={loc} value={loc}>
          {loc === "transito" ? (
            <div className="space-y-4">
              <TransitCard />
              <StockSection userId={userId} location={loc} canDelete={canDelete} />
            </div>
          ) : loc === "perdido" ? (
            <LostCard />
          ) : loc === "tecnico" ? (
            <TechnicianSection userId={userId} />
          ) : (
            <StockSection userId={userId} location={loc} canDelete={canDelete} />
          )}
        </TabsContent>
      ))}
      {locations.includes("almoxarifado") && (
        <TabsContent value="distribuicao">
          <DistributionCard />
        </TabsContent>
      )}
      {showHomologacao && (
        <TabsContent value="homologacao">
          <HomologationSection userId={userId} canDelete={canDelete} />
        </TabsContent>
      )}
      {!onlyLocation && (
        <TabsContent value="qr-check">
          <QrCheckSection />
        </TabsContent>
      )}
    </Tabs>
  );
}

function TechnicianSection({ userId }: { userId: string }) {
  const { data: stock } = useStock();
  const materialNames = Object.fromEntries((stock ?? []).map((r) => [r.material_id, r.name]));
  return <TechnicianItemsCard userId={userId} materialNames={materialNames} />;
}

function HomologationSection({ userId, canDelete }: { userId: string; canDelete?: boolean }) {
  const { data: stock } = useStock();
  const materialNames = Object.fromEntries((stock ?? []).map((r) => [r.material_id, r.name]));
  return (
    <AssemblyReleasesCard
      materialNames={materialNames}
      userId={userId}
      homologable
      canDelete={canDelete}
      canReportIssue
      title="Produtos para homologar"
      description="Etiquetagem e homologação dos produtos montados. Após homologados em caixas, seguem para o estoque."
    />
  );
}

function AddMaterialDialog({ location, userId }: { location: StockLocation; userId: string }) {
  const qc = useQueryClient();
  const isFabrica = location === "fabrica";
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
      const { error } = await supabase
        .from("materials")
        .insert({ ...v, location, created_by: userId, ...(isFabrica ? { is_product: false } : {}) });
      if (error) throw error;

    },
    onSuccess: () => {
      toast.success("Item adicionado");
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["materials"] });
      setOpen(false);
      setImportId("");
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("materials_fabrica_unique_name")
          ? "Já existe um componente com esse nome na Fábrica"
          : e.message.includes("materials_fabrica_only_components")
            ? "O Estoque — Fábrica aceita apenas componentes"
            : e.message,
      ),
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
        {!isFabrica && (
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={mode === "new" ? "default" : "outline"} onClick={() => setMode("new")}>
            Criar novo
          </Button>
          <Button type="button" size="sm" variant={mode === "import" ? "default" : "outline"} onClick={() => setMode("import")}>
            Importar da biblioteca
          </Button>
        </div>
        )}
        {isFabrica && (
          <p className="text-xs text-muted-foreground">
            O Estoque — Fábrica aceita apenas componentes criados aqui. Produtos Myio (industrializados) não entram
            nesta lista e não podem ser importados de outros estoques.
          </p>
        )}

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
              {!isFabrica && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Library className="mr-1 h-4 w-4" /> Biblioteca
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-0" align="end">
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
              )}

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
      // Limpa também os QR Codes (homologações/caixas e etiquetas de unidades) destes materiais
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const { error: homErr } = await supabase.from("homologations").delete().in("material_id", chunk);
        if (homErr) throw homErr;
        const { error: unitErr } = await supabase.from("unit_products").delete().in("material_id", chunk);
        if (unitErr) throw unitErr;
      }
    },
    onSuccess: () => {
      toast.success("Estoque e QR Codes zerados");
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["homologations"] });
      qc.invalidateQueries({ queryKey: ["boxes-list"] });
      qc.invalidateQueries({ queryKey: ["homologated-labels"] });
      qc.invalidateQueries({ queryKey: ["unit-products"] });
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
            Todos os saldos deste local serão zerados, as movimentações dos {ids.length} item(ns) serão apagadas e
            todos os QR Codes (caixas, unidades homologadas e etiquetas) destes itens serão removidos. Esta ação não
            pode ser desfeita. Digite <strong>zerar</strong> para confirmar.
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
  return <StockSectionInner userId={userId} location={location} canDelete={canDelete} />;
}

function MoveOriginButton({ row, target }: { row: StockRow; target: "myio" | "terceiros" }) {
  const qc = useQueryClient();
  const move = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("materials")
        .update({ is_manufactured: target === "myio" })
        .eq("id", row.material_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(target === "myio" ? "Movido para Estoque Myio" : "Movido para Estoque Terceiros");
      qc.invalidateQueries({ queryKey: ["materials-manufactured-map"] });
      qc.invalidateQueries({ queryKey: ["materials"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={move.isPending}
      onClick={() => move.mutate()}
      title={target === "myio" ? "Mover para Estoque Myio (fabricado)" : "Mover para Estoque Terceiros (comprado)"}
    >
      <ArrowLeftRight className="h-4 w-4" />
    </Button>
  );
}

function StockTableCard({
  title,
  description,
  rows,
  isLoading,
  userId,
  canDelete,
  actions,
  moveTo,
  detail,
}: {
  title: string;
  description: string;
  rows: StockRow[];
  isLoading?: boolean;
  userId: string;
  canDelete?: boolean;
  actions?: React.ReactNode;
  moveTo?: "myio" | "terceiros";
  detail?: boolean;
}) {

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
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
                      {detail ? (
                        <MaterialDetailDialog
                          materialId={r.material_id}
                          name={r.name}
                          trigger={
                            <button type="button" className="text-left hover:underline">
                              {r.name}
                            </button>
                          }
                        />
                      ) : (
                        <StockQrDialog
                          stockName={r.name}
                          trigger={
                            <button type="button" className="text-left hover:underline">
                              {r.name}
                            </button>
                          }
                        />
                      )}

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
                      {moveTo && <MoveOriginButton row={r} target={moveTo} />}
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
  );
}

function StockSectionInner({ userId, location, canDelete }: { userId: string; location: StockLocation; canDelete?: boolean }) {
  const { data: stock, isLoading } = useStock();
  const { data: movements } = useMovements();
  const { data: profiles } = useStockProfiles();
  const { data: manufactured } = useManufacturedMap();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"all" | "with" | "zero">("all");

  const scoped = (stock ?? [])
    .filter((r) => (r.location ?? "fabrica") === location)
    .filter((r) => !/ — Caixa de \d+$/.test(r.name));
  const scopedIds = new Set(scoped.map((r) => r.material_id));
  const scopedMovements = (movements ?? []).filter((m) => scopedIds.has(m.material_id));

  const rows = scoped
    .filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((r) => (view === "with" ? r.balance > 0 : view === "zero" ? r.balance <= 0 : true));

  const totalItems = scoped.reduce((acc, r) => acc + Math.max(r.balance, 0), 0);
  const materialNames = Object.fromEntries((stock ?? []).map((r) => [r.material_id, r.name]));

  const almoxarifadoBalances = Object.fromEntries(
    (stock ?? []).filter((r) => (r.location ?? "fabrica") === "almoxarifado").map((r) => [r.name.trim().toLowerCase(), r.balance]),
  );

  const toolbar = (
    <>
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
    </>
  );

  return (
    <div className="space-y-6">
      {location === "almoxarifado" ? (
        <MyioDemandCard
          balances={Object.fromEntries(scoped.map((r) => [r.name.trim().toLowerCase(), r.balance]))}
        />
      ) : location === "fabrica" ? (
        <ProductionQueueCard balances={almoxarifadoBalances} />
      ) : location === "unidade" || location === "transito" ? null : (
      <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-3">
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
      )}

      {location === "fabrica" && (
        <AssemblyReleasesCard materialNames={materialNames} userId={userId} canCorrect canDelete={canDelete} />
      )}

      {location === "fabrica" && <ProductionCapacityCard />}

      {location === "unidade" && (
        <UnitProductsCard
          materials={scoped.map((r) => ({ material_id: r.material_id, name: r.name }))}
          userId={userId}
          canDelete={canDelete}
        />
      )}

      {location === "almoxarifado" ? (
        <>
          <StockTableCard
            title="Estoque Myio"
            description='Produtos produzidos pela Myio. Use o botão de troca para mover um item para "Terceiros".'
            rows={rows.filter((r) => manufactured?.[r.material_id])}
            isLoading={isLoading}
            userId={userId}
            canDelete={canDelete}
            actions={toolbar}
            moveTo="terceiros"
          />
          <StockTableCard
            title="Estoque Terceiros"
            description='Itens comprados de terceiros. Use o botão de troca para mover um item para "Myio".'
            rows={rows.filter((r) => !manufactured?.[r.material_id])}
            isLoading={isLoading}
            userId={userId}
            canDelete={canDelete}
            moveTo="myio"
          />
        </>
      ) : location === "unidade" || location === "transito" ? null : (
        <StockTableCard
          title={`Estoque — ${LOCATION_LABELS[location]}`}
          description='A entrada é automática quando o solicitante confirma "Recebido corretamente" em um pedido feito pela biblioteca.'
          rows={rows}
          isLoading={isLoading}
          userId={userId}
          canDelete={canDelete}
          actions={toolbar}
          detail={location === "fabrica"}
        />

      )}

      {location === "almoxarifado" && <BoxesCard />}

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