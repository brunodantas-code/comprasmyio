import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { recordDamagedItem } from "./damaged-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowRightLeft, Camera, CheckCircle2, ImageUp, PauseCircle, Plus, Trash2 } from "lucide-react";
import { pushQrsToExternal } from "@/lib/push-external";

type UnitProduct = {
  id: string;
  material_id: string;
  product: string | null;
  project_id: string | null;
  client_name: string | null;
  projects?: { name: string } | null;
  label: string | null;
  status: "parado" | "instalado";
  installed_at: string | null;
  notes: string | null;
  created_at: string;
};

type MoveDestination = "tecnico" | "almoxarifado" | "perdido" | "avariado";

const MOVE_LABELS: Record<MoveDestination, string> = {
  tecnico: "Técnico",
  almoxarifado: "Estoque",
  perdido: "Perdido",
  avariado: "Itens Avariados",
};

type MaterialOption = { material_id: string; name: string };

function fmt(d: string) {
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function useUnitProducts() {
  return useQuery({
    queryKey: ["unit-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_products")
        .select(
          "id, material_id, product, project_id, client_name, label, status, installed_at, notes, created_at, projects(name)",
        )
        .is("moved_to", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as UnitProduct[];
    },
  });
}

function MoveUnitProductDialog({
  product,
  productName,
  userId,
}: {
  product: UnitProduct;
  productName: string;
  userId: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState<MoveDestination | "">("");
  const [technician, setTechnician] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function reset() {
    setDestination("");
    setTechnician("");
    setNotes("");
    setFile(null);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!destination) throw new Error("Selecione o destino.");
      if (destination === "tecnico" && !technician.trim()) throw new Error("Informe o nome do técnico.");
      if (destination === "avariado" && !notes.trim()) throw new Error("Informe o motivo da avaria nas observações.");

      let path: string | null = null;
      if (file) {
        path = `unit-moves/${product.id}/${crypto.randomUUID()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("assembly-photos").upload(path, file);
        if (upErr) throw upErr;
      }

      const { error } = await supabase
        .from("unit_products")
        .update({
          moved_to: destination,
          moved_technician: destination === "tecnico" ? technician.trim() : null,
          move_photo_url: path,
          move_notes: notes.trim() || null,
          moved_at: new Date().toISOString(),
        } as never)
        .eq("id", product.id);
      if (error) throw error;

      if (product.material_id) {
        // A unidade já foi descontada do estoque quando saiu (baixa do pedido,
        // saída para técnico ou baixa automática do sync). Movê-la entre
        // cliente/técnico/perdido/avariado é apenas RASTREIO — gerar nova saída
        // aqui descontaria o mesmo produto duas vezes e deixaria o estoque
        // negativo. Apenas o retorno ao estoque gera movimentação (entrada).
        if (destination === "almoxarifado") {
          const reason = "Retorno do cliente para o estoque";
          const { data: mv, error: mvErr } = await supabase
            .from("stock_movements")
            .insert({
              material_id: product.material_id,
              quantity: 1,
              type: "entrada",
              reason: notes.trim() ? `${reason} — ${notes.trim()}` : reason,
              photo_url: path,
              created_by: userId,
            } as never)
            .select("id")
            .single();
          if (mvErr) throw mvErr;
          // Vincula o QR à entrada para o sync reconhecer o retorno e não estornar de novo.
          if (mv && product.label) {
            await supabase
              .from("stock_movement_qrs")
              .insert({ movement_id: (mv as { id: string }).id, qr_value: product.label } as never);
          }
        }

        if (destination === "avariado") {
          await recordDamagedItem({
            material_id: product.material_id,
            product: productName,
            quantity: 1,
            source: "Cliente",
            source_detail: product.projects?.name ?? null,
            reason: notes.trim(),
            photo_url: path,
            created_by: userId,
          });
        }
      }

      // Cliente → outro setor: reflete o novo local na plataforma externa
      const EXTERNAL_LOC: Record<MoveDestination, "tecnico" | "estoque" | "perdido" | "avariado"> = {
        tecnico: "tecnico",
        almoxarifado: "estoque",
        perdido: "perdido",
        avariado: "avariado",
      };
      pushQrsToExternal([product.label], {
        location: EXTERNAL_LOC[destination],
        technician: destination === "tecnico" ? technician.trim() : null,
      });
    },
    onSuccess: () => {
      toast.success("Produto movido.");
      qc.invalidateQueries({ queryKey: ["unit-products"] });
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["technician-dispatches"] });
      qc.invalidateQueries({ queryKey: ["damaged-items"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ArrowRightLeft className="mr-1 h-4 w-4" /> Mover
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mover produto — {productName}</DialogTitle>
          <DialogDescription>Registre o destino do produto que sai da unidade. A foto é opcional.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label>Foto (opcional)</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()}>
                <Camera className="mr-1 h-4 w-4" /> Câmera
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => galleryRef.current?.click()}>
                <ImageUp className="mr-1 h-4 w-4" /> Galeria
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
            <p className="text-sm text-muted-foreground">{file ? file.name : "Nenhuma foto selecionada"}</p>
          </div>

          <div className="space-y-2">
            <Label>Destino</Label>
            <Select value={destination} onValueChange={(v) => setDestination(v as MoveDestination)}>
              <SelectTrigger><SelectValue placeholder="Selecione o destino" /></SelectTrigger>
              <SelectContent>
                {(Object.keys(MOVE_LABELS) as MoveDestination[]).map((d) => (
                  <SelectItem key={d} value={d}>{MOVE_LABELS[d]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {destination === "tecnico" && (
            <div className="space-y-2">
              <Label htmlFor="move-tech">Nome do técnico</Label>
              <Input id="move-tech" value={technician} onChange={(e) => setTechnician(e.target.value)} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="move-notes">Observações</Label>
            <Input id="move-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Movendo..." : "Confirmar movimentação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** QR Codes homologados para um material (pelo nome do item de estoque). */
function useHomologatedLabels(materialName: string | undefined) {
  return useQuery({
    queryKey: ["homologated-labels", materialName ?? ""],
    enabled: !!materialName,
    queryFn: async () => {
      const base = materialName!.replace(/ — Caixa de \d+$/, "");
      const { data, error } = await supabase
        .from("homologations")
        .select("id, box_size, materials(name), homologation_units(position, qr_value)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .filter((h) => (h.materials as { name: string } | null)?.name === base)
        .flatMap((h) => (h.homologation_units ?? []).map((u) => u.qr_value as string));
    },
  });
}

function AddUnitProductDialog({ materials, userId }: { materials: MaterialOption[]; userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const materialName = materials.find((m) => m.material_id === materialId)?.name;
  const { data: labels } = useHomologatedLabels(materialName);
  const { data: existing } = useUnitProducts();
  const used = new Set((existing ?? []).map((p) => p.label).filter(Boolean) as string[]);
  const available = useMemo(() => (labels ?? []).filter((l) => !used.has(l)), [labels, used]);

  function reset() {
    setMaterialId("");
    setQuantity(1);
    setSelected([]);
    setNotes("");
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!materialId) throw new Error("Selecione o produto");
      const rows: { material_id: string; label: string | null; notes: string | null; created_by: string }[] = selected.length
        ? selected.map((label) => ({ material_id: materialId, label, notes: notes.trim() || null, created_by: userId }))
        : Array.from({ length: Math.max(quantity, 1) }, () => ({
            material_id: materialId,
            label: null,
            notes: notes.trim() || null,
            created_by: userId,
          }));
      const { error } = await supabase.from("unit_products").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produtos adicionados à unidade como parados");
      qc.invalidateQueries({ queryKey: ["unit-products"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" /> Adicionar produto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar produto na unidade</DialogTitle>
          <DialogDescription>
            Todo produto entra como <strong>parado</strong>. Depois use “Marcar como instalado”.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label>Produto</Label>
            <Select
              value={materialId}
              onValueChange={(v) => {
                setMaterialId(v);
                setSelected([]);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.material_id} value={m.material_id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!!materialId && (
            <div className="space-y-2 rounded border p-3">
              <p className="text-sm font-medium">Etiquetas homologadas disponíveis</p>
              {!available.length ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma etiqueta disponível para este produto. Informe apenas a quantidade abaixo.
                </p>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {available.map((l) => (
                    <label key={l} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selected.includes(l)}
                        onCheckedChange={(c) =>
                          setSelected((prev) => (c ? [...prev, l] : prev.filter((x) => x !== l)))
                        }
                      />
                      <span className="break-all">{l}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {!selected.length && (
            <div className="space-y-2">
              <Label htmlFor="unit-qty">Quantidade (sem etiqueta)</Label>
              <Input
                id="unit-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-40"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="unit-notes">Observações</Label>
            <Input id="unit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Salvando..." : `Adicionar ${selected.length || Math.max(quantity, 1)} produto(s)`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProductsTable({
  rows,
  names,
  onToggle,
  onDelete,
  canDelete,
  installed,
  userId,
}: {
  rows: UnitProduct[];
  names: Record<string, string>;
  onToggle: (p: UnitProduct) => void;
  onDelete: (id: string) => void;
  canDelete?: boolean;
  installed: boolean;
  userId: string;
}) {
  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {installed ? "Nenhum produto instalado." : "Nenhum produto parado."}
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Produto</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Projeto</TableHead>
          <TableHead>Etiqueta (QR)</TableHead>
          <TableHead>{installed ? "Instalado em" : "Na unidade desde"}</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-medium">{p.product ?? names[p.material_id] ?? "—"}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{p.client_name ?? "—"}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{p.projects?.name ?? "—"}</TableCell>
            <TableCell className="max-w-[280px] break-all text-sm text-muted-foreground">
              {p.label ?? <span className="italic">sem etiqueta</span>}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {installed ? (p.installed_at ? fmt(p.installed_at) : "—") : fmt(p.created_at)}
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="outline" onClick={() => onToggle(p)}>
                  {installed ? (
                    <>
                      <PauseCircle className="mr-1 h-4 w-4" /> Marcar como parado
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Marcar como instalado
                    </>
                  )}
                </Button>
                <MoveUnitProductDialog
                  product={p}
                  productName={p.product ?? names[p.material_id] ?? "Produto"}
                  userId={userId}
                />
                {canDelete && (
                  <Button size="sm" variant="outline" onClick={() => onDelete(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function UnitProductsCard({
  materials,
  userId,
  canDelete,
}: {
  materials: MaterialOption[];
  userId: string;
  canDelete?: boolean;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useUnitProducts();
  const names = Object.fromEntries(materials.map((m) => [m.material_id, m.name]));
  const rows = data ?? [];
  const installed = rows.filter((p) => p.status === "instalado");
  const stopped = rows.filter((p) => p.status === "parado");

  const toggle = useMutation({
    mutationFn: async (p: UnitProduct) => {
      const next = p.status === "instalado" ? "parado" : "instalado";
      const { error } = await supabase
        .from("unit_products")
        .update({ status: next, installed_at: next === "instalado" ? new Date().toISOString() : null })
        .eq("id", p.id);
      if (error) throw error;
      // Reflete o status (instalado/parado) na plataforma externa
      pushQrsToExternal([p.label], {
        location: "cliente",
        status: next,
        clientName: p.projects?.name ?? p.client_name ?? null,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["unit-products"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("unit_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro removido");
      qc.invalidateQueries({ queryKey: ["unit-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Produtos instalados</CardDescription></CardHeader>
          <CardContent className="text-2xl font-semibold text-green-700">{installed.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Produtos parados</CardDescription></CardHeader>
          <CardContent className="text-2xl font-semibold text-amber-700">{stopped.length}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Produtos na unidade</CardTitle>
            <CardDescription>
              Controle de produtos instalados e parados no cliente, com as etiquetas (QR) da homologação.
            </CardDescription>
          </div>
          {null}
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-green-300 bg-green-100 text-green-800">
                    Instalados · {installed.length}
                  </Badge>
                </div>
                <ProductsTable
                  rows={installed}
                  names={names}
                  userId={userId}
                  installed
                  canDelete={canDelete}
                  onToggle={(p) => toggle.mutate(p)}
                  onDelete={(id) => remove.mutate(id)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800">
                    Parados · {stopped.length}
                  </Badge>
                </div>
                <ProductsTable
                  rows={stopped}
                  names={names}
                  userId={userId}
                  installed={false}
                  canDelete={canDelete}
                  onToggle={(p) => toggle.mutate(p)}
                  onDelete={(id) => remove.mutate(id)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
