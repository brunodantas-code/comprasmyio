import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";
import { ArrowRightLeft, HardHat, History } from "lucide-react";

function DispatchPhoto({ path }: { path: string }) {
  const { data } = useQuery({
    queryKey: ["assembly-photo", path],
    queryFn: async () => {
      if (path.startsWith("http")) return path;
      const { data } = await supabase.storage.from("assembly-photos").createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    },
  });
  if (!data) return null;
  return (
    <a href={data} target="_blank" rel="noreferrer">
      <img src={data} alt="Foto do material com o técnico" className="h-12 w-12 rounded border object-cover" />
    </a>
  );
}

type Destination = "unidade" | "perdido" | "almoxarifado";

const DEST_LABELS: Record<Destination, string> = {
  unidade: "Cliente",
  perdido: "Perdido",
  almoxarifado: "Estoque",
};

const DEST_CLASSES: Record<Destination, string> = {
  unidade: "border-blue-300 bg-blue-100 text-blue-800",
  perdido: "border-red-300 bg-red-100 text-red-800",
  almoxarifado: "border-green-300 bg-green-100 text-green-800",
};

type Dispatch = {
  id: string;
  material_id: string;
  quantity: number;
  responsible: string | null;
  reason: string | null;
  created_at: string;
  photo_url: string | null;
};

type Move = {
  id: string;
  movement_id: string;
  material_id: string;
  technician: string;
  destination: Destination;
  project_id: string | null;
  quantity: number;
  notes: string | null;
  created_at: string;
};

function fmt(d: string) {
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function useDispatches() {
  return useQuery({
    queryKey: ["technician-dispatches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("id, material_id, quantity, responsible, reason, created_at, photo_url")
        .eq("type", "saida")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as Dispatch[]).filter((d) => !!d.responsible?.trim());
    },
  });
}

function useDispatchQrs() {
  return useQuery({
    queryKey: ["technician-dispatch-qrs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movement_qrs")
        .select("movement_id, qr_value, box_qr");
      if (error) throw error;
      const map: Record<string, string[]> = {};
      ((data ?? []) as { movement_id: string; qr_value: string; box_qr: string | null }[]).forEach((q) => {
        (map[q.movement_id] ??= []).push(q.box_qr ? `${q.box_qr} / ${q.qr_value}` : q.qr_value);
      });
      return map;
    },
  });
}

function useTechnicianMoves() {
  return useQuery({
    queryKey: ["technician-moves"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technician_moves")
        .select("id, movement_id, material_id, technician, destination, project_id, quantity, notes, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Move[];
    },
  });
}

function useProjectOptions() {
  return useQuery({
    queryKey: ["projects-for-technician"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });
}

function MoveDialog({
  dispatch,
  materialName,
  remaining,
  userId,
}: {
  dispatch: Dispatch;
  materialName: string;
  remaining: number;
  userId: string;
}) {
  const qc = useQueryClient();
  const { data: projects } = useProjectOptions();
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState<Destination | "">("");
  const [projectId, setProjectId] = useState("");
  const [quantity, setQuantity] = useState(String(remaining));
  const [notes, setNotes] = useState("");

  const reset = () => {
    setDestination("");
    setProjectId("");
    setQuantity(String(remaining));
    setNotes("");
  };

  const save = useMutation({
    mutationFn: async () => {
      const qty = parseInt(quantity, 10);
      if (!destination) throw new Error("Selecione o destino.");
      if (!Number.isInteger(qty) || qty <= 0) throw new Error("Quantidade inválida.");
      if (qty > remaining) throw new Error("Quantidade maior que o disponível com o técnico.");
      if (destination === "unidade" && !projectId) throw new Error("Selecione o projeto da unidade.");

      const { error } = await supabase.from("technician_moves").insert({
        movement_id: dispatch.id,
        material_id: dispatch.material_id,
        technician: dispatch.responsible!.trim(),
        destination,
        project_id: destination === "unidade" ? projectId : null,
        quantity: qty,
        notes: notes.trim() || null,
        created_by: userId,
      } as never);
      if (error) throw error;

      if (destination === "unidade") {
        const { error: upErr } = await supabase.from("unit_products").insert(
          Array.from({ length: qty }, () => ({
            material_id: dispatch.material_id,
            label: null,
            project_id: projectId,
            notes: notes.trim() || `Entregue pelo técnico ${dispatch.responsible}`,
            created_by: userId,
          })) as never,
        );
        if (upErr) throw upErr;
      }

      if (destination === "almoxarifado") {
        const { error: mvErr } = await supabase.from("stock_movements").insert({
          material_id: dispatch.material_id,
          quantity: qty,
          type: "entrada",
          reason: `Devolução do técnico ${dispatch.responsible}${notes.trim() ? ` — ${notes.trim()}` : ""}`,
          created_by: userId,
        } as never);
        if (mvErr) throw mvErr;
      }
    },
    onSuccess: () => {
      toast.success("Movimentação registrada.");
      qc.invalidateQueries({ queryKey: ["technician-moves"] });
      qc.invalidateQueries({ queryKey: ["technician-dispatches"] });
      qc.invalidateQueries({ queryKey: ["unit-products"] });
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ArrowRightLeft className="mr-1 h-4 w-4" /> Mover
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mover produto — {materialName}</DialogTitle>
          <DialogDescription>
            Com o técnico {dispatch.responsible}: {remaining} unidade(s) disponível(is).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Destino</Label>
            <Select value={destination} onValueChange={(v) => setDestination(v as Destination)}>
              <SelectTrigger><SelectValue placeholder="Selecione o destino" /></SelectTrigger>
              <SelectContent>
                {(Object.keys(DEST_LABELS) as Destination[]).map((d) => (
                  <SelectItem key={d} value={d}>{DEST_LABELS[d]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {destination === "unidade" && (
            <div className="space-y-2">
              <Label>Projeto (unidade do cliente)</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Selecione o projeto" /></SelectTrigger>
                <SelectContent>
                  {(projects ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`tm-qty-${dispatch.id}`}>Quantidade</Label>
            <Input
              id={`tm-qty-${dispatch.id}`}
              type="number"
              min={1}
              max={remaining}
              className="w-40"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`tm-notes-${dispatch.id}`}>Observação</Label>
            <Input id={`tm-notes-${dispatch.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Salvando..." : "Confirmar movimentação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovesHistoryDialog({ moves, projectNames, materialNames }: {
  moves: Move[];
  projectNames: Record<string, string>;
  materialNames: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Histórico de movimentações">
          <History className="mr-1 h-4 w-4" /> Histórico
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Movimentações do técnico</DialogTitle>
          <DialogDescription>Produtos que saíram do técnico e seus destinos.</DialogDescription>
        </DialogHeader>
        {!moves.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
        ) : (
          <ul className="space-y-3">
            {moves.map((m) => (
              <li key={m.id} className="flex items-start gap-3 border-l-2 border-border pl-3">
                <Badge variant="outline" className={DEST_CLASSES[m.destination]}>
                  {DEST_LABELS[m.destination]}
                </Badge>
                <div className="min-w-0 text-sm">
                  <div className="font-medium">{m.quantity}x {materialNames[m.material_id] ?? "—"}</div>
                  <div className="text-muted-foreground">{fmt(m.created_at)}</div>
                  {m.project_id && (
                    <div className="text-muted-foreground">Projeto: {projectNames[m.project_id] ?? "—"}</div>
                  )}
                  {m.notes && <div className="text-muted-foreground">{m.notes}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function TechnicianItemsCard({
  userId,
  materialNames,
}: {
  userId: string;
  materialNames: Record<string, string>;
}) {
  const { data: dispatches, isLoading } = useDispatches();
  const { data: moves } = useTechnicianMoves();
  const { data: qrsByMovement } = useDispatchQrs();
  const { data: projects } = useProjectOptions();
  const projectNames = Object.fromEntries((projects ?? []).map((p) => [p.id, p.name]));

  const movedByDispatch: Record<string, number> = {};
  (moves ?? []).forEach((m) => {
    movedByDispatch[m.movement_id] = (movedByDispatch[m.movement_id] ?? 0) + m.quantity;
  });

  const technicians = new Map<string, Dispatch[]>();
  (dispatches ?? []).forEach((d) => {
    const tech = d.responsible!.trim();
    const remaining = d.quantity - (movedByDispatch[d.id] ?? 0);
    if (remaining <= 0) return;
    const list = technicians.get(tech) ?? [];
    list.push(d);
    technicians.set(tech, list);
  });

  const techList = Array.from(technicians.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><HardHat className="h-5 w-5" />Produtos com os técnicos</CardTitle>
        <CardDescription>
          Materiais separados por técnico. Cada produto pode ser movido para o cliente (projeto), para perdido ou devolvido ao estoque.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !techList.length ? (
          <p className="text-sm text-muted-foreground">Nenhum produto com técnicos no momento.</p>
        ) : (
          techList.map(([tech, list]) => {
            const techMoves = (moves ?? []).filter((m) => m.technician === tech);
            const total = list.reduce((acc, d) => acc + (d.quantity - (movedByDispatch[d.id] ?? 0)), 0);
            return (
              <div key={tech} className="space-y-2 rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{tech}</span>
                    <Badge variant="outline">{total} item(ns)</Badge>
                  </div>
                  <MovesHistoryDialog moves={techMoves} projectNames={projectNames} materialNames={materialNames} />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>QR code / Foto</TableHead>
                      <TableHead>Saída</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((d) => {
                      const remaining = d.quantity - (movedByDispatch[d.id] ?? 0);
                      const name = materialNames[d.material_id] ?? "—";
                      return (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">
                            {name}
                            {d.reason && <p className="text-xs text-muted-foreground">{d.reason}</p>}
                          </TableCell>
                          <TableCell>{remaining}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {(qrsByMovement?.[d.id] ?? []).length > 0 && (
                                <div className="space-y-0.5">
                                  {(qrsByMovement?.[d.id] ?? []).map((q) => (
                                    <Badge key={q} variant="outline" className="font-mono text-[11px]">{q}</Badge>
                                  ))}
                                </div>
                              )}
                              {d.photo_url && <DispatchPhoto path={d.photo_url} />}
                              {!(qrsByMovement?.[d.id] ?? []).length && !d.photo_url && (
                                <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800">
                                  Sem QR/foto
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{fmt(d.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <MoveDialog dispatch={d} materialName={name} remaining={remaining} userId={userId} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
