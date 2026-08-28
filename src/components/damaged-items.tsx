import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { AlertTriangle, Camera, Eye, ImageUp, Recycle } from "lucide-react";
import { pushQrsToExternal } from "@/lib/push-external";

export type DamagedItem = {
  id: string;
  material_id: string | null;
  product: string;
  quantity: number;
  source: string;
  source_detail: string | null;
  reason: string;
  photo_url: string | null;
  status: "avariado" | "recuperado";
  recovered_to: string | null;
  recovery_notes: string | null;
  recovered_at: string | null;
  created_at: string;
};

function fmt(d: string) {
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function useDamagedItems() {
  return useQuery({
    queryKey: ["damaged-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("damaged_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DamagedItem[];
    },
  });
}

/** Registra um item avariado (usado pelo estoque, técnicos e unidades de cliente). */
export async function recordDamagedItem(input: {
  material_id: string | null;
  product: string;
  quantity: number;
  source: string;
  source_detail?: string | null;
  reason: string;
  photo_url?: string | null;
  created_by: string;
}) {
  const { error } = await supabase.from("damaged_items").insert({
    material_id: input.material_id,
    product: input.product,
    quantity: input.quantity,
    source: input.source,
    source_detail: input.source_detail ?? null,
    reason: input.reason,
    photo_url: input.photo_url ?? null,
    created_by: input.created_by,
  });
  if (error) throw error;
}

function DamagedPhoto({ path }: { path: string }) {
  const open = async () => {
    const { data, error } = await supabase.storage.from("assembly-photos").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return toast.error("Não foi possível abrir a foto");
    window.open(data.signedUrl, "_blank");
  };
  return (
    <Button size="sm" variant="ghost" onClick={open} title="Ver foto">
      <Eye className="h-4 w-4" />
    </Button>
  );
}

/** Dá baixa de itens do estoque como avariados (botão por linha nas tabelas de estoque). */
export function DamageItemDialog({
  materialId,
  materialName,
  source,
  max,
  userId,
}: {
  materialId: string;
  materialName: string;
  source: string;
  max: number;
  userId: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const limit = Math.max(1, Math.floor(max));

  function reset() {
    setQuantity("1");
    setReason("");
    setFile(null);
  }

  const save = useMutation({
    mutationFn: async () => {
      const qty = parseInt(quantity, 10);
      if (!Number.isInteger(qty) || qty <= 0) throw new Error("Quantidade inválida.");
      if (qty > limit) throw new Error("Quantidade maior que o saldo em estoque.");
      if (!reason) throw new Error("Selecione o motivo da avaria.");
      if (!file) throw new Error("A foto da avaria é obrigatória.");

      let path: string | null = null;
      {
        path = `damaged/${materialId}/${crypto.randomUUID()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("assembly-photos").upload(path, file);
        if (upErr) throw upErr;
      }

      const { error: mvErr } = await supabase.from("stock_movements").insert({
        material_id: materialId,
        quantity: qty,
        type: "saida",
        reason: `Item avariado — ${reason.trim()}`,
        responsible: null,
        photo_url: path,
        created_by: userId,
      } as never);
      if (mvErr) throw mvErr;

      await recordDamagedItem({
        material_id: materialId,
        product: materialName,
        quantity: qty,
        source,
        reason: reason.trim(),
        photo_url: path,
        created_by: userId,
      });
    },
    onSuccess: () => {
      toast.success("Item registrado como avariado e baixado do estoque.");
      qc.invalidateQueries({ queryKey: ["damaged-items"] });
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Registrar avaria (baixa do estoque)">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar avaria — {materialName}</DialogTitle>
          <DialogDescription>
            O item sai do estoque ({source}) e passa para a lista de Itens Avariados. Saldo disponível: {limit}.
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
            <Label htmlFor={`dmg-qty-${materialId}`}>Quantidade</Label>
            <Input
              id={`dmg-qty-${materialId}`}
              type="number"
              min={1}
              max={limit}
              className="w-40"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`dmg-reason-${materialId}`}>Motivo da avaria *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id={`dmg-reason-${materialId}`}>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {DAMAGE_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Foto da avaria *</Label>
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()}>
                <Camera className="mr-1 h-4 w-4" /> Câmera
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
            <p className="text-sm text-muted-foreground">{file ? file.name : "Nenhuma foto selecionada"}</p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Registrando..." : "Registrar avaria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type RecoverDestination = "estoque" | "tecnico" | "unidade";

const RECOVER_LABELS: Record<RecoverDestination, string> = {
  estoque: "Estoque",
  tecnico: "Técnico",
  unidade: "Cliente (unidade)",
};

function RecoverDamagedDialog({ item, userId }: { item: DamagedItem; userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState<RecoverDestination | "">("");
  const [technician, setTechnician] = useState("");
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");

  const { data: projects } = useQuery({
    queryKey: ["projects-for-recovery"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").neq("name", "Estoque").order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  function reset() {
    setDestination("");
    setTechnician("");
    setProjectId("");
    setNotes("");
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!item.material_id) throw new Error("Item sem material vinculado — não é possível recuperar.");
      if (!destination) throw new Error("Selecione o destino da recuperação.");
      if (destination === "tecnico" && !technician.trim()) throw new Error("Informe o nome do técnico.");
      if (destination === "unidade" && !projectId) throw new Error("Selecione o projeto da unidade.");

      const projectName = projects?.find((p) => p.id === projectId)?.name ?? "";
      const obs = notes.trim();

      // Identidade do QR: itens reportados pela plataforma externa guardam o
      // código em source_detail. A recuperação precisa CARREGAR esse QR para o
      // destino — sem isso a unidade vira "Sem QR" na lista do técnico e a
      // plataforma externa continua marcando o produto como avariado (o sync
      // então desfaz a recuperação).
      let qrLabel: string | null = null;
      let qrUnitId: string | null = null;
      const extCode = item.source === "Plataforma externa" ? item.source_detail?.trim() : null;
      if (extCode && /^\d+(?:_\d+)+$/.test(extCode)) {
        const { data: ext } = await supabase
          .from("external_product_states")
          .select("qr_value, homologation_unit_id")
          .eq("code", extCode)
          .maybeSingle();
        qrLabel = ext?.qr_value ?? `https://produto.myio.com.br/${extCode}`;
        qrUnitId = ext?.homologation_unit_id ?? null;
      }
      const attachQr = async (movementId: string) => {
        if (!qrLabel) return;
        const { error } = await supabase.from("stock_movement_qrs").insert({
          movement_id: movementId,
          qr_value: qrLabel,
          homologation_unit_id: qrUnitId,
          created_by: userId,
        } as never);
        if (error) throw error;
      };

      // Retorna ao estoque
      const { data: inMv, error: inErr } = await supabase
        .from("stock_movements")
        .insert({
          material_id: item.material_id,
          quantity: item.quantity,
          type: "entrada",
          reason: `Recuperação de item avariado${obs ? ` — ${obs}` : ""}`,
          created_by: userId,
        } as never)
        .select("id")
        .single();
      if (inErr) throw inErr;

      let recoveredTo = RECOVER_LABELS[destination];

      if (destination === "estoque" && inMv) {
        await attachQr((inMv as { id: string }).id);
      }

      if (destination === "tecnico") {
        const tech = technician.trim();
        recoveredTo = `Técnico — ${tech}`;
        const { data: outMv, error: outErr } = await supabase
          .from("stock_movements")
          .insert({
            material_id: item.material_id,
            quantity: item.quantity,
            type: "saida",
            reason: `Item recuperado enviado ao técnico ${tech}${obs ? ` — ${obs}` : ""}`,
            responsible: tech,
            created_by: userId,
          } as never)
          .select("id")
          .single();
        if (outErr) throw outErr;
        if (outMv) await attachQr((outMv as { id: string }).id);
      }

      if (destination === "unidade") {
        recoveredTo = `Cliente — ${projectName}`;
        const { data: outMv, error: outErr } = await supabase
          .from("stock_movements")
          .insert({
            material_id: item.material_id,
            quantity: item.quantity,
            type: "saida",
            reason: `Item recuperado entregue ao cliente${obs ? ` — ${obs}` : ""}`,
            responsible: null,
            created_by: userId,
          } as never)
          .select("id")
          .single();
        if (outErr) throw outErr;
        if (outMv) await attachQr((outMv as { id: string }).id);

        const { error: upErr } = await supabase.from("unit_products").insert(
          Array.from({ length: item.quantity }, (_, i) => ({
            material_id: item.material_id,
            product: item.product,
            label: i === 0 ? qrLabel : null,
            project_id: projectId,
            notes: obs || "Recuperado de avaria",
            created_by: userId,
          })) as never,
        );
        if (upErr) throw upErr;
      }

      const { error: upDamaged } = await supabase
        .from("damaged_items")
        .update({
          status: "recuperado",
          recovered_to: recoveredTo,
          recovery_notes: obs || null,
          recovered_by: userId,
          recovered_at: new Date().toISOString(),
        })
        .eq("id", item.id);
      if (upDamaged) throw upDamaged;

      // Avisa a plataforma externa que o QR saiu de "avariado" — sem isso o
      // sync a cada 5 min desfaz a recuperação (o produto continuaria avariado lá).
      // O novo local sempre acompanha o status: item recuperado volta "parado"
      // (não está instalado em lugar nenhum) — em unidade, o toggle de
      // instalado/parado na aba Cliente continua sendo o caminho para instalar.
      if (qrLabel) {
        pushQrsToExternal([qrLabel], {
          location: destination === "tecnico" ? "tecnico" : destination === "unidade" ? "cliente" : "estoque",
          status: "parado",
          technician: destination === "tecnico" ? technician.trim() : null,
          clientName: destination === "unidade" ? projectName : null,
        });
      }
    },
    onSuccess: () => {
      toast.success("Item recuperado e movido para o destino.");
      qc.invalidateQueries({ queryKey: ["damaged-items"] });
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["technician-dispatches"] });
      qc.invalidateQueries({ queryKey: ["technician-dispatch-qrs"] });
      qc.invalidateQueries({ queryKey: ["external-product-states"] });
      qc.invalidateQueries({ queryKey: ["unit-products"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Recycle className="mr-1 h-4 w-4" /> Recuperar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recuperar item — {item.product}</DialogTitle>
          <DialogDescription>
            {item.quantity} un. avariada(s). O item volta ao estoque e, se o destino for técnico ou cliente, já é
            movido automaticamente.
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
            <Label>Destino</Label>
            <Select value={destination} onValueChange={(v) => setDestination(v as RecoverDestination)}>
              <SelectTrigger><SelectValue placeholder="Selecione o destino" /></SelectTrigger>
              <SelectContent>
                {(Object.keys(RECOVER_LABELS) as RecoverDestination[]).map((d) => (
                  <SelectItem key={d} value={d}>{RECOVER_LABELS[d]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {destination === "tecnico" && (
            <div className="space-y-2">
              <Label htmlFor={`rec-tech-${item.id}`}>Nome do técnico</Label>
              <Input id={`rec-tech-${item.id}`} value={technician} onChange={(e) => setTechnician(e.target.value)} />
            </div>
          )}

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
            <Label htmlFor={`rec-notes-${item.id}`}>Observações</Label>
            <Input id={`rec-notes-${item.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Recuperando..." : "Confirmar recuperação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DamagedItemsCard({ userId }: { userId: string; canDelete?: boolean }) {
  const { data: items, isLoading } = useDamagedItems();

  const sorted = [...(items ?? [])].sort((a, b) => {
    if (a.status !== b.status) return a.status === "avariado" ? -1 : 1;
    return +new Date(b.created_at) - +new Date(a.created_at);
  });
  const pending = sorted.filter((i) => i.status === "avariado").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Itens Avariados
          {pending > 0 && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
              {pending} aguardando
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Produtos danificados vindos do estoque, de técnicos ou de clientes. Use “Recuperar” para devolver o item ao
          estoque, a um técnico ou a uma unidade de cliente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !sorted.length ? (
          <p className="text-sm text-muted-foreground">Nenhum item avariado registrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Foto</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((item) => (
                  <TableRow key={item.id} className={item.status === "recuperado" ? "opacity-60" : undefined}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmt(item.created_at)}</TableCell>
                    <TableCell className="font-medium">{item.product}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-sm">
                      {item.source}
                      {item.source_detail ? (
                        <span className="block text-xs text-muted-foreground">{item.source_detail}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground" title={item.reason}>
                      {item.reason}
                    </TableCell>
                    <TableCell>{item.photo_url ? <DamagedPhoto path={item.photo_url} /> : "—"}</TableCell>
                    <TableCell>
                      {item.status === "avariado" ? (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                          Avariado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-600">
                          Recuperado
                          {item.recovered_to ? ` · ${item.recovered_to}` : ""}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.status === "avariado" && <RecoverDamagedDialog item={item} userId={userId} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
