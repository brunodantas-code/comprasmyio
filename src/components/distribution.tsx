import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ItemDeliveriesDialog } from "@/components/myio-delivery-qr";
import { AlertTriangle, CheckCircle2, FileText, Loader2, PackageSearch, Send, Truck, Undo2, Upload } from "lucide-react";
import { toast } from "sonner";

const PROOF_BUCKET = "assembly-photos";

const SHIPPING_METHODS = ["Azul Cargo", "Correios", "Carro Myio", "Uber"] as const;

type DistOrder = {
  id: string;
  title: string;
  client_name: string;
  delivery_date: string;
  status: string;
  notes: string | null;
  is_replacement: boolean | null;
  projects: { name: string } | null;
  myio_order_items: { id: string; product: string; quantity: number }[];
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

type ShipmentForm = {
  address: string;
  shipping_method: string;
  responsible: string;
  tracking_code: string;
  notes: string;
  file: File | null;
};

function DistributeDialog({
  order,
  onClose,
  onConfirm,
  pending,
}: {
  order: DistOrder | null;
  onClose: () => void;
  onConfirm: (form: ShipmentForm) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState<ShipmentForm>({
    address: "",
    shipping_method: "",
    responsible: "",
    tracking_code: "",
    notes: "",
    file: null,
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const valid =
    form.address.trim() &&
    form.shipping_method &&
    form.responsible.trim() &&
    form.tracking_code.trim() &&
    form.file;

  return (
    <Dialog
      open={!!order}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Distribuir pedido</DialogTitle>
          <DialogDescription>
            {order ? `${order.projects?.name || order.title} — ${order.client_name}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Endereço final</Label>
            <Textarea
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Rua, número, complemento, cidade/UF, CEP"
            />
          </div>
          <div className="space-y-2">
            <Label>Método de envio</Label>
            <Select
              value={form.shipping_method}
              onValueChange={(v) => setForm((f) => ({ ...f, shipping_method: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {SHIPPING_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Responsável pelo envio</Label>
            <Input
              value={form.responsible}
              onChange={(e) => setForm((f) => ({ ...f, responsible: e.target.value }))}
              placeholder="Nome do responsável"
            />
          </div>
          <div className="space-y-2">
            <Label>Código de rastreio</Label>
            <Input
              value={form.tracking_code}
              onChange={(e) => setForm((f) => ({ ...f, tracking_code: e.target.value }))}
              placeholder="Ex.: AB123456789BR"
            />
          </div>
          <div className="space-y-2">
            <Label>Comprovação (foto ou PDF)</Label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Anexar arquivo
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()}>
                <FileText className="mr-2 h-4 w-4" /> Usar câmera
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))}
            />
            {form.file && <p className="text-xs text-muted-foreground">{form.file.name}</p>}
          </div>
          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button disabled={!valid || pending} onClick={() => onConfirm(form)}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Confirmar distribuição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DistributionCard() {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<DistOrder | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["myio-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("myio_orders")
        .select(
          "id, title, client_name, delivery_date, status, notes, is_replacement, projects(name), myio_order_items(id, product, quantity)",
        )
        .eq("status", "pronto_entrega")
        .order("delivery_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as DistOrder[];
    },
  });

  const distribute = useMutation({
    mutationFn: async (vars: { order: DistOrder; form: ShipmentForm }) => {
      const { order, form } = vars;
      const file = form.file!;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      if (!userId) throw new Error("Sessão expirada.");

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `myio-shipment/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(PROOF_BUCKET).upload(path, file);
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("myio_shipments").insert({
        order_id: order.id,
        address: form.address.trim(),
        shipping_method: form.shipping_method,
        responsible: form.responsible.trim(),
        tracking_code: form.tracking_code.trim(),
        proof_url: path,
        notes: form.notes.trim() || null,
        created_by: userId,
      });
      if (insErr) throw insErr;

      const { error } = await supabase
        .from("myio_orders")
        .update({ status: "em_transito" as never })
        .eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido enviado para Trânsito.");
      setTarget(null);
      queryClient.invalidateQueries({ queryKey: ["myio-distribution"] });
      queryClient.invalidateQueries({ queryKey: ["myio-transit"] });
      queryClient.invalidateQueries({ queryKey: ["myio-orders"] });
      queryClient.invalidateQueries({ queryKey: ["myio-demand"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao distribuir pedido"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Distribuição
        </CardTitle>
        <CardDescription>
          Pedidos com todos os produtos separados e prontos para entrega. Confirme a saída para o cliente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !orders?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum pedido pronto para distribuição.</p>
        ) : (
          orders.map((o) => (
            <div key={o.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{o.projects?.name || o.title}</span>
                <Badge variant="outline">{o.client_name}</Badge>
                <Badge variant="outline">Entrega {formatDate(o.delivery_date)}</Badge>
                <Badge variant="outline" className="border-blue-300 bg-blue-100 text-blue-800">
                  Pronto para entrega
                </Badge>
                {o.is_replacement && (
                  <Badge variant="outline" className="border-orange-300 bg-orange-100 text-orange-800">
                    Reposição
                  </Badge>
                )}
                <Button size="sm" className="ml-auto" onClick={() => setTarget(o)}>
                  <Send className="mr-2 h-4 w-4" />
                  Distribuir
                </Button>
              </div>
              {o.notes && <p className="text-xs text-muted-foreground">{o.notes}</p>}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-28">Quantidade</TableHead>
                    <TableHead className="w-40">Baixa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {o.myio_order_items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.product}</TableCell>
                      <TableCell className="font-medium">{i.quantity}</TableCell>
                      <TableCell>
                        <ItemDeliveriesDialog
                          orderItemId={i.id}
                          product={i.product}
                          trigger={
                            <Badge
                              variant="outline"
                              className="cursor-pointer border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            >
                              Ver baixa
                            </Badge>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))
        )}
      </CardContent>
      <DistributeDialog
        order={target}
        onClose={() => setTarget(null)}
        pending={distribute.isPending}
        onConfirm={(form) => target && distribute.mutate({ order: target, form })}
      />
    </Card>
  );
}

type TransitOrder = DistOrder & {
  myio_shipments: {
    id: string;
    address: string;
    shipping_method: string;
    responsible: string;
    tracking_code: string;
    proof_url: string;
    notes: string | null;
    created_at: string;
  }[];
};

function ProofLink({ path }: { path: string }) {
  const { data } = useQuery({
    queryKey: ["myio-shipment-proof", path],
    queryFn: async () => {
      if (path.startsWith("http")) return path;
      const { data } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    },
  });
  if (!data) return null;
  return (
    <a href={data} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs underline">
      <FileText className="h-3 w-3" /> Ver comprovante
    </a>
  );
}

function ReturnToDistributionDialog({ orderId, notes }: { orderId: string; notes: string | null }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const back = useMutation({
    mutationFn: async () => {
      const stamp = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
      const entry = `[Retornado para Distribuição em ${stamp}] ${reason.trim()}`;
      const { error } = await supabase
        .from("myio_orders")
        .update({ status: "pronto_entrega", notes: notes ? `${notes}\n${entry}` : entry })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido retornado para Distribuição.");
      setOpen(false);
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["myio-transit"] });
      queryClient.invalidateQueries({ queryKey: ["myio-distribution"] });
      queryClient.invalidateQueries({ queryKey: ["myio-orders"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao retornar o pedido"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Undo2 className="mr-2 h-4 w-4" />
        Retornar para distribuição
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Retornar para Distribuição</DialogTitle>
          <DialogDescription>
            Explique o motivo do retorno. O pedido volta para a sub-aba Distribuição.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`return-reason-${orderId}`}>Observação (obrigatório)</Label>
          <Textarea
            id={`return-reason-${orderId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: endereço incorreto, transportadora recusou a carga..."
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button disabled={!reason.trim() || back.isPending} onClick={() => back.mutate()}>
            {back.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Retornar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LostMerchandiseDialog({ orderId, notes }: { orderId: string; notes: string | null }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const lost = useMutation({
    mutationFn: async () => {
      const stamp = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
      const entry = `[Mercadoria perdida em ${stamp}] ${reason.trim()}`;
      const { error } = await supabase
        .from("myio_orders")
        .update({ status: "perdido" as never, notes: notes ? `${notes}\n${entry}` : entry })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido marcado como perdido.");
      setOpen(false);
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["myio-transit"] });
      queryClient.invalidateQueries({ queryKey: ["myio-lost"] });
      queryClient.invalidateQueries({ queryKey: ["myio-orders"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao marcar como perdido"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <AlertTriangle className="mr-2 h-4 w-4" /> Mercadoria perdida
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mercadoria perdida</DialogTitle>
          <DialogDescription>
            Informe o que aconteceu. O pedido será movido imediatamente para a sub-aba Perdidos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`lost-reason-${orderId}`}>Observação (obrigatório)</Label>
          <Textarea
            id={`lost-reason-${orderId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: extraviado pela transportadora, roubo, dano irreparável..."
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button disabled={!reason.trim() || lost.isPending} onClick={() => lost.mutate()}>
            {lost.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TransitCard() {
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["myio-transit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("myio_orders")
        .select(
          "id, title, client_name, delivery_date, status, notes, is_replacement, projects(name), myio_order_items(id, product, quantity), myio_shipments(id, address, shipping_method, responsible, tracking_code, proof_url, notes, created_at)",
        )
        .eq("status", "em_transito" as never)
        .order("delivery_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TransitOrder[];
    },
  });

  const deliver = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("myio_orders")
        .update({ status: "entregue_cliente" })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido entregue ao cliente.");
      queryClient.invalidateQueries({ queryKey: ["myio-transit"] });
      queryClient.invalidateQueries({ queryKey: ["myio-orders"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao concluir entrega"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Pedidos em trânsito
        </CardTitle>
        <CardDescription>Pedidos distribuídos, aguardando confirmação de entrega ao cliente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !orders?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum pedido em trânsito.</p>
        ) : (
          orders.map((o) => {
            const s = o.myio_shipments?.[o.myio_shipments.length - 1];
            return (
              <div key={o.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{o.projects?.name || o.title}</span>
                  <Badge variant="outline">{o.client_name}</Badge>
                  <Badge variant="outline">Entrega {formatDate(o.delivery_date)}</Badge>
                  <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800">
                    Em trânsito
                  </Badge>
                  <Button
                    size="sm"
                    className="ml-auto"
                    disabled={deliver.isPending}
                    onClick={() => deliver.mutate(o.id)}
                  >
                    {deliver.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Entregue ao cliente
                  </Button>
                  <ReturnToDistributionDialog orderId={o.id} notes={o.notes} />
                  <LostMerchandiseDialog orderId={o.id} notes={o.notes} />
                </div>
                {s && (
                  <div className="grid gap-1 rounded-md border p-3 text-xs text-muted-foreground sm:grid-cols-2">
                    <span>
                      <strong className="text-foreground">Endereço:</strong> {s.address}
                    </span>
                    <span>
                      <strong className="text-foreground">Envio:</strong> {s.shipping_method}
                    </span>
                    <span>
                      <strong className="text-foreground">Responsável:</strong> {s.responsible}
                    </span>
                    <span>
                      <strong className="text-foreground">Rastreio:</strong> {s.tracking_code}
                    </span>
                    {s.notes && (
                      <span className="sm:col-span-2">
                        <strong className="text-foreground">Obs.:</strong> {s.notes}
                      </span>
                    )}
                    <span className="sm:col-span-2">
                      <ProofLink path={s.proof_url} />
                    </span>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="w-28">Quantidade</TableHead>
                      <TableHead className="w-40">Baixa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {o.myio_order_items.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>{i.product}</TableCell>
                        <TableCell className="font-medium">{i.quantity}</TableCell>
                        <TableCell>
                          <ItemDeliveriesDialog
                            orderItemId={i.id}
                            product={i.product}
                            trigger={
                              <Badge
                                variant="outline"
                                className="cursor-pointer border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              >
                                Ver baixa
                              </Badge>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
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

const FOUND_SECTORS = [
  { value: "unidade", label: "Unidade (cliente)", status: "entregue_cliente" },
  { value: "distribuicao", label: "Distribuição", status: "pronto_entrega" },
  { value: "tecnico", label: "Técnico", status: "entregue_cliente" },
  { value: "transito", label: "Trânsito", status: "em_transito" },
  { value: "almoxarifado", label: "Almoxarifado", status: "produzindo" },
] as const;

function FoundMerchandiseDialog({ orderId, notes }: { orderId: string; notes: string | null }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sector, setSector] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const { data: projects } = useQuery({
    queryKey: ["projects-for-found"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const found = useMutation({
    mutationFn: async () => {
      const target = FOUND_SECTORS.find((s) => s.value === sector);
      if (!target) throw new Error("Selecione o setor.");
      if (sector === "unidade" && !projectId) throw new Error("Selecione o projeto (unidade do cliente).");
      const stamp = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
      const projectName = projects?.find((p) => p.id === projectId)?.name;
      const entry = `[Mercadoria encontrada em ${stamp} — setor: ${target.label}${
        sector === "unidade" && projectName ? ` — projeto: ${projectName}` : ""
      }] ${reason.trim()}`;
      const { error } = await supabase
        .from("myio_orders")
        .update({
          status: target.status as never,
          notes: notes ? `${notes}\n${entry}` : entry,
          ...(sector === "unidade" ? { project_id: projectId } : {}),
        } as never)
        .eq("id", orderId);
      if (error) throw error;

      if (sector === "unidade") {
        const [{ data: items }, { data: mats }, { data: auth }] = await Promise.all([
          supabase.from("myio_order_items").select("product, quantity").eq("order_id", orderId),
          supabase.from("materials").select("id, name"),
          supabase.auth.getUser(),
        ]);
        const byName = new Map((mats ?? []).map((m) => [m.name.trim().toLowerCase(), m.id]));
        const rows: {
          material_id: string;
          project_id: string;
          status: string;
          notes: string | null;
          created_by: string | null;
        }[] = [];
        for (const it of items ?? []) {
          const materialId = byName.get(it.product.trim().toLowerCase());
          if (!materialId) continue;
          for (let i = 0; i < Math.max(it.quantity ?? 1, 1); i++) {
            rows.push({
              material_id: materialId,
              project_id: projectId,
              status: "parado",
              notes: entry,
              created_by: auth?.user?.id ?? null,
            });
          }
        }
        if (rows.length) {
          const { error: upErr } = await supabase.from("unit_products").insert(rows as never);
          if (upErr) throw upErr;
        }
      }
    },
    onSuccess: () => {
      toast.success("Mercadoria encontrada e movida de setor.");
      setOpen(false);
      setReason("");
      setSector("");
      setProjectId("");
      ["myio-lost", "myio-transit", "myio-distribution", "myio-orders", "myio-demand", "unit-products"].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao registrar"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <PackageSearch className="mr-2 h-4 w-4" /> Mercadoria encontrada
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mercadoria encontrada</DialogTitle>
          <DialogDescription>
            Informe onde a mercadoria foi localizada. O pedido será movido automaticamente para o setor escolhido.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Setor atual (obrigatório)</Label>
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
              <SelectContent>
                {FOUND_SECTORS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {sector === "unidade" && (
            <div className="space-y-2">
              <Label>Projeto / unidade do cliente (obrigatório)</Label>
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
            <Label htmlFor={`found-reason-${orderId}`}>Observação (obrigatório)</Label>
            <Textarea
              id={`found-reason-${orderId}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: localizado na transportadora, já entregue ao técnico..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={!reason.trim() || !sector || (sector === "unidade" && !projectId) || found.isPending}
            onClick={() => found.mutate()}
          >
            {found.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LostCard() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["myio-lost"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("myio_orders")
        .select(
          "id, title, client_name, delivery_date, status, notes, is_replacement, projects(name), myio_order_items(id, product, quantity), myio_shipments(id, address, shipping_method, responsible, tracking_code, proof_url, notes, created_at)",
        )
        .eq("status", "perdido" as never)
        .order("delivery_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TransitOrder[];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Mercadoria perdida
        </CardTitle>
        <CardDescription>Pedidos com mercadoria extraviada ou perdida em trânsito.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !orders?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma mercadoria perdida.</p>
        ) : (
          orders.map((o) => {
            const s = o.myio_shipments?.[o.myio_shipments.length - 1];
            return (
              <div key={o.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{o.projects?.name || o.title}</span>
                  <Badge variant="outline">{o.client_name}</Badge>
                  <Badge variant="outline">Entrega {formatDate(o.delivery_date)}</Badge>
                  <Badge variant="outline" className="border-red-300 bg-red-100 text-red-800">
                    Perdido
                  </Badge>
                  <div className="ml-auto">
                    <FoundMerchandiseDialog orderId={o.id} notes={o.notes} />
                  </div>
                </div>
                {o.notes && (
                  <p className="whitespace-pre-line text-xs text-muted-foreground">{o.notes}</p>
                )}
                {s && (
                  <div className="grid gap-1 rounded-md border p-3 text-xs text-muted-foreground sm:grid-cols-2">
                    <span>
                      <strong className="text-foreground">Endereço:</strong> {s.address}
                    </span>
                    <span>
                      <strong className="text-foreground">Envio:</strong> {s.shipping_method}
                    </span>
                    <span>
                      <strong className="text-foreground">Responsável:</strong> {s.responsible}
                    </span>
                    <span>
                      <strong className="text-foreground">Rastreio:</strong> {s.tracking_code}
                    </span>
                    {s.notes && (
                      <span className="sm:col-span-2">
                        <strong className="text-foreground">Obs.:</strong> {s.notes}
                      </span>
                    )}
                    <span className="sm:col-span-2">
                      <ProofLink path={s.proof_url} />
                    </span>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="w-28">Quantidade</TableHead>
                      <TableHead className="w-40">Baixa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {o.myio_order_items.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>{i.product}</TableCell>
                        <TableCell className="font-medium">{i.quantity}</TableCell>
                        <TableCell>
                          <ItemDeliveriesDialog
                            orderItemId={i.id}
                            product={i.product}
                            trigger={
                              <Badge
                                variant="outline"
                                className="cursor-pointer border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              >
                                Ver baixa
                              </Badge>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
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
