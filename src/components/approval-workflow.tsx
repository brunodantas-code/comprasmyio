import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Clock, History, Pencil, Plus, Trash2, XCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MoneyInput as UIMoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAdditionalStepTypes, type AdditionalStepType } from "@/components/additional-step-types-tab";
import { requestTypeModel, requestTypeName, useRequestTypes, type RequestTypeRecord } from "@/components/request-types-tab";

const BRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

const dt = (v: string | null) =>
  v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

const formatInt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number(v ?? 0));

const shortName = (full: string | null | undefined): string => {
  if (!full) return "—";
  return full.trim().split(/\s+/)[0];
};

const TRAVEL_TYPE_LABELS: Record<string, string> = {
  passagens: "Passagens",
  hospedagens: "Hospedagens",
  aluguel_veiculos: "Aluguel de Veículos",
};

function requestTypeLabel(o: { request_type?: string | null; travel_type?: string | null } | null | undefined, types?: RequestTypeRecord[]): string {
  const rt = o?.request_type ?? "";
  if (requestTypeModel(rt, types) === "viagens") {
    const sub = o?.travel_type ? TRAVEL_TYPE_LABELS[o.travel_type] : undefined;
    return sub ?? "Viagens";
  }
  return requestTypeName(rt, types);
}

const ACTION_LABELS: Record<string, string> = {
  criado: "Criado",
  status_alterado: "Alterado",
  observacao_atualizada: "Alterado",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

function RequestTypeCheckboxes({ values, onChange, types }: { values: string[]; onChange: (values: string[]) => void; types: RequestTypeRecord[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {types.filter((type) => type.active || values.includes(type.code)).map((type) => (
        <label key={type.code} className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={values.includes(type.code)}
            onCheckedChange={(checked) => onChange(checked ? [...values, type.code] : values.filter((value) => value !== type.code))}
          />
          {type.name}{!type.active ? " (inativo)" : ""}
        </label>
      ))}
    </div>
  );
}

type ProfileRow = { id: string; full_name: string | null; email: string | null; approval_limit: number | null; job_title_id: string | null };
type ProfileWithTitle = ProfileRow & { jobTitle: { id: string; name: string } | null };

function useProfiles() {
  return useQuery({
    queryKey: ["aw-profiles"],
    queryFn: async () => {
      const [{ data: profiles, error: pe }, { data: titles, error: te }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, approval_limit, job_title_id").order("full_name"),
        supabase.from("job_titles").select("id,name").eq("active", true),
      ]);
      if (pe) throw pe;
      if (te) throw te;
      const titleById = new Map((titles ?? []).map((title) => [title.id, title]));
      const map = new Map<string, ProfileWithTitle>();
      ((profiles ?? []) as ProfileRow[]).forEach((p) => map.set(p.id, { ...p, jobTitle: p.job_title_id ? titleById.get(p.job_title_id) ?? null : null }));
      return map;
    },
  });
}

function useSteps() {
  return useQuery({
    queryKey: ["approval-steps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_steps")
        .select(
          "id, order_id, step_index, role_label, approver_id, status, comment, decided_at, decided_by, created_at, purchase_orders(id, item_name, item_link, quantity, estimated_value, approval_status, status, requester_id, requester_notes, buyer_notes, recipient, delivery_point, deadline_type, deadline_date, delivery_forecast, passphrase, created_at, updated_at, approval_number, request_type, travel_type, travel_destination, travel_departure, travel_return, payment_date, allocation_type, for_stock, attachments, budget_exceeded, budget_snapshot, committed_before_snapshot, projected_committed_snapshot, projects(name), clients(name))"
        )
        .order("step_index", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

type StepRow = NonNullable<ReturnType<typeof useSteps>["data"]>[number];

function StatusBadge({ status }: { status: string }) {
  if (status === "aprovado")
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Aprovado</Badge>;
  if (status === "rejeitado") return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejeitado</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pendente</Badge>;
}

function PendingApprovalDetails({ step, requestTypes }: { step: StepRow; requestTypes?: RequestTypeRecord[] }) {
  const order = step.purchase_orders;
  if (!order) return <span>—</span>;
  const project = Array.isArray(order.projects) ? order.projects[0] : order.projects;
  const client = Array.isArray(order.clients) ? order.clients[0] : order.clients;
  const budget = Number(order.budget_snapshot ?? 0);
  const requested = Number(order.projected_committed_snapshot ?? order.estimated_value ?? 0);
  const chartMax = Math.max(budget, requested, 1);
  const allocation = order.allocation_type === "interna" ? "Interna" : order.for_stock ? "Estoque" : project?.name ?? client?.name ?? "—";
  const fields = [
    ["Tipo", requestTypeLabel(order, requestTypes)], ["Item", order.item_name], ["Quantidade", String(order.quantity ?? 1)],
    ["Valor", BRL(Number(order.estimated_value ?? 0))], ["Projeto ou Cliente", allocation], ["Destinatário", order.recipient || "—"],
    ["Endereço de entrega", order.delivery_point || "—"], ["Prazo", order.deadline_date ? new Date(`${order.deadline_date}T00:00:00`).toLocaleDateString("pt-BR") : order.deadline_type],
    ["Previsão de entrega", order.delivery_forecast ? new Date(`${order.delivery_forecast}T00:00:00`).toLocaleDateString("pt-BR") : "—"],
    ["Status da solicitação", order.status], ["Status da aprovação", order.approval_status], ["Palavra passe", order.passphrase || "—"], ["Criado em", dt(order.created_at)],
    ["Destino da viagem", order.travel_destination || "—"], ["Ida", order.travel_departure ? new Date(`${order.travel_departure}T00:00:00`).toLocaleDateString("pt-BR") : "—"], ["Volta", order.travel_return ? new Date(`${order.travel_return}T00:00:00`).toLocaleDateString("pt-BR") : "—"],
    ["Data de pagamento", order.payment_date ? new Date(`${order.payment_date}T00:00:00`).toLocaleDateString("pt-BR") : "—"],
    ["Observações do solicitante", order.requester_notes || "—"], ["Observações de Supply", order.buyer_notes || "—"],
  ];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="h-auto justify-self-start p-0 text-left font-mono text-xs font-normal underline">{order.approval_number ?? "—"}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Approval {order.approval_number}</DialogTitle><DialogDescription>Informações completas da solicitação e da aprovação.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm break-words">{value}</p></div>)}
          {order.item_link && <div><p className="text-xs text-muted-foreground">Link</p><a href={order.item_link} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Abrir link</a></div>}
        </div>
        <section className="border-t pt-4"><h3 className="text-sm font-semibold">Anexos</h3><p className="text-sm text-muted-foreground">{Array.isArray(order.attachments) && order.attachments.length ? `${order.attachments.length} anexo(s)` : "Nenhum anexo."}</p></section>
        {order.budget_snapshot != null && (
          <section className="space-y-3 border-t pt-4">
            <div><h3 className="text-sm font-semibold">Orçado x Solicitado</h3>{order.budget_exceeded && <Badge variant="destructive" className="mt-1">Orçamento excedido</Badge>}</div>
            <div className="space-y-3">
              <div><div className="mb-1 flex justify-between text-xs"><span>Orçado</span><span>{BRL(budget)}</span></div><div className="h-3 overflow-hidden rounded-sm bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (budget / chartMax) * 100)}%` }} /></div></div>
              <div><div className="mb-1 flex justify-between text-xs"><span>Solicitado</span><span>{BRL(requested)}</span></div><div className="h-3 overflow-hidden rounded-sm bg-muted"><div className={`h-full ${order.budget_exceeded ? "bg-destructive" : "bg-myio-green"}`} style={{ width: `${Math.min(100, (requested / chartMax) * 100)}%` }} /></div></div>
            </div>
          </section>
        )}
        <section className="border-t pt-4"><h3 className="text-sm font-semibold">Etapa atual</h3><p className="text-sm">{step.step_index}. {step.role_label}</p></section>
      </DialogContent>
    </Dialog>
  );
}

function ApproveButton({ step, onDone }: { step: StepRow; onDone: () => void }) {
  const approve = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("decide_approval_step", {
        _step_id: step.id,
        _decision: "aprovado",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Etapa aprovada");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Button size="sm" onClick={() => approve.mutate()} disabled={approve.isPending}>
      <CheckCircle2 className="mr-2 h-4 w-4" />
      Aprovar
    </Button>
  );
}

function RejectDialog({ step, onDone }: { step: StepRow; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const decide = useMutation({
    mutationFn: async () => {
      if (!comment.trim()) {
        throw new Error("Informe o motivo da rejeição");
      }
      const { error } = await supabase.rpc("decide_approval_step", {
        _step_id: step.id,
        _decision: "rejeitado",
        _comment: comment.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação rejeitada");
      setOpen(false);
      setComment("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <XCircle className="mr-2 h-4 w-4" />
          Rejeitar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeitar solicitação</DialogTitle>
          <DialogDescription>
            {step.role_label} — descreva o motivo da rejeição. Ele será enviado ao solicitante.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>
            Observações <span className="text-destructive">*</span>
          </Label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Motivo da rejeição"
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => decide.mutate()}
            disabled={decide.isPending || !comment.trim()}
            variant="destructive"
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AuditTrailDialog({ orderId, title }: { orderId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const { data: profiles } = useProfiles();
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-trail", orderId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_logs")
        .select("id, actor_id, action, details, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const describe = (action: string, details: unknown) => {
    const d = (details ?? {}) as Record<string, unknown>;
    if (typeof d["comentario"] === "string" && d["comentario"]) return String(d["comentario"]);
    if (action === "criado") return `Solicitação criada${d["item"] ? `: ${String(d["item"])}` : ""}.`;
    if (action === "status_alterado") return `Status alterado de ${String(d["de"])} para ${String(d["para"])}.`;
    if (action === "observacao_atualizada") return String(d["observacao"] ?? "Observação atualizada.");
    return "—";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <History className="mr-2 h-4 w-4" />
          Histórico
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Histórico de auditoria</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[130px]">Data/Hora</TableHead>
                <TableHead className="w-[150px]">Usuário</TableHead>
                <TableHead className="w-[170px]">Papel/Alçada</TableHead>
                <TableHead className="w-[110px]">Ação</TableHead>
                <TableHead>Justificativa / Comentário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(logs ?? []).map((l) => {
                const p = l.actor_id ? profiles?.get(l.actor_id) : undefined;
                return (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm text-muted-foreground">{dt(l.created_at)}</TableCell>
                    <TableCell className="text-sm">{p?.full_name || p?.email || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p?.jobTitle?.name ?? "—"}
                      {p?.approval_limit ? ` · ${BRL(Number(p.approval_limit))}` : ""}
                    </TableCell>
                    <TableCell className="font-semibold">{ACTION_LABELS[l.action] ?? l.action}</TableCell>
                    <TableCell className="text-sm whitespace-pre-wrap">{describe(l.action, l.details)}</TableCell>
                  </TableRow>
                );
              })}
              {(logs ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    Sem registros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PendingForMe() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const { data: steps, isLoading } = useSteps();
  const { data: profiles } = useProfiles();
  const { data: requestTypes } = useRequestTypes();
  const [search, setSearch] = useState("");

  const mine = useMemo(() => {
    if (!steps || !me) return [] as StepRow[];
    const byOrder = new Map<string, StepRow[]>();
    steps.forEach((s) => {
      const arr = byOrder.get(s.order_id) ?? [];
      arr.push(s);
      byOrder.set(s.order_id, arr);
    });
    return steps.filter((s) => {
      if (s.status !== "pendente") return false;
      // Nunca aprovar a própria solicitação — sempre sobe para o superior
      if (s.purchase_orders?.requester_id === me.id) return false;
      if (s.approver_id !== me.id && !me.isAdmin) return false;
      const earlier = (byOrder.get(s.order_id) ?? []).filter(
        (o) => o.step_index < s.step_index && o.status === "pendente"
      );
      if (earlier.length !== 0) return false;
      const term = search.trim();
      return !term || (s.purchase_orders?.approval_number ?? "").includes(term);
    });
  }, [steps, me, search]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["approval-steps"] });
    qc.invalidateQueries({ queryKey: ["orders"] });
  };

  const totalValue = mine.reduce(
    (sum, s) => sum + Number(s.purchase_orders?.estimated_value ?? 0),
    0,
  );
  const fmtBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>Pendentes comigo</span>
              {mine.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  {mine.length} {mine.length === 1 ? "approval" : "approvals"} · {fmtBRL(totalValue)}
                </span>
              )}
            </CardTitle>
            <CardDescription>Etapas aguardando sua decisão na sequência de aprovação.</CardDescription>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nº do approval"
            className="w-full sm:w-[200px]"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma aprovação pendente.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Approval</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Valor unitário</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Projeto ou Cliente</TableHead>
                <TableHead aria-label="Ações" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {mine.map((s) => {
                const o = s.purchase_orders;
                const req = o?.requester_id ? profiles?.get(o.requester_id) : undefined;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap"><PendingApprovalDetails step={s} requestTypes={requestTypes} /></TableCell>
                    <TableCell className="font-medium">
                      {requestTypeLabel(o, requestTypes)}
                      {o?.budget_exceeded && <Badge variant="destructive" className="ml-2 gap-1"><AlertTriangle className="h-3 w-3" />Orçamento excedido</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">{req?.full_name || req?.email || "—"}</TableCell>
                    <TableCell className="text-sm">{BRL(Number(o?.estimated_value ?? 0))}</TableCell>
                    <TableCell className="text-sm">
                      {BRL(Number(o?.estimated_value ?? 0) / Math.max(Number(o?.quantity ?? 1), 1))}
                    </TableCell>
                    <TableCell className="text-sm">{o?.quantity ?? 1}</TableCell>
                    <TableCell className="text-sm">{o?.allocation_type === "interna" ? "Interna" : o?.for_stock ? "Estoque" : o?.projects?.name ?? o?.clients?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <ApproveButton step={s} onDone={refresh} />
                        <RejectDialog step={s} onDone={refresh} />
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
  );
}

export function MyApprovalFlows() {
  const { data: me } = useCurrentUser();
  const { data: steps, isLoading } = useSteps();
  const { data: profiles } = useProfiles();
  const { data: requestTypes } = useRequestTypes();
  const [search, setSearch] = useState("");

  const orders = useMemo(() => {
    const byOrder = new Map<string, StepRow[]>();
    (steps ?? []).forEach((s) => {
      const arr = byOrder.get(s.order_id) ?? [];
      arr.push(s);
      byOrder.set(s.order_id, arr);
    });
    const term = search.trim();
    return [...byOrder.entries()]
      .filter(([, list]) => {
        const order = list[0]?.purchase_orders;
        return order?.requester_id === me?.id &&
          order.approval_status === "aguardando_aprovacao" &&
          (!term || (order.approval_number ?? "").includes(term));
      })
      .sort((a, b) => {
      const da = a[1][0]?.purchase_orders?.created_at ?? "";
      const db = b[1][0]?.purchase_orders?.created_at ?? "";
      return db.localeCompare(da);
    });
  }, [steps, me?.id, search]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Meus em aprovação</CardTitle>
            <CardDescription>Approvals criados por você que ainda aguardam a conclusão da aprovação.</CardDescription>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nº do approval"
            className="w-full sm:w-[200px]"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma solicitação em fluxo de aprovação.</p>
        ) : (
          orders.map(([orderId, list]) => {
            const o = list[0]?.purchase_orders;
            const req = o?.requester_id ? profiles?.get(o.requester_id) : undefined;
            return (
              <div key={orderId} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{o?.approval_number ?? "—"}</p>
                    <p className="font-medium">
                      {requestTypeLabel(o, requestTypes)}{" "}
                      <span className="text-xs text-muted-foreground">x{o?.quantity ?? 1}</span>
                      {o?.budget_exceeded && <Badge variant="destructive" className="ml-2 gap-1"><AlertTriangle className="h-3 w-3" />Orçamento excedido</Badge>}
                    </p>
                    {o?.budget_exceeded && (
                      <p className="mt-1 text-xs font-medium text-destructive">
                        Total projetado {BRL(Number(o.projected_committed_snapshot ?? 0))} para orçamento de {BRL(Number(o.budget_snapshot ?? 0))}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {req?.full_name || req?.email || "—"} · {BRL(Number(o?.estimated_value ?? 0))} ·{" "}
                      {dt(o?.created_at ?? null)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={o?.approval_status ?? "pendente"} />
                    <AuditTrailDialog orderId={orderId} title={o?.item_name ?? ""} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {list
                    .slice()
                    .sort((a, b) => a.step_index - b.step_index)
                    .map((s) => {
                      const ap = s.approver_id ? profiles?.get(s.approver_id) : undefined;
                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-xs"
                        >
                          {s.status === "aprovado" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : s.status === "rejeitado" ? (
                            <XCircle className="h-3.5 w-3.5 text-red-600" />
                          ) : s.status === "cancelado" ? (
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                          )}
                          <span className="font-medium">{s.role_label}</span>
                          <span className="text-muted-foreground">
                            {ap?.full_name || ap?.email || "sem responsável"}
                            {s.status === "cancelado" ? " · cancelada" : ""}
                          </span>

                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function DualApprovalSettings() {
  const qc = useQueryClient();
  const { data: cfg, isLoading } = useQuery({
    queryKey: ["approval-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_settings")
        .select("id, dual_approval_enabled, dual_approval_threshold")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [value, setValue] = useState<string>("");
  const current = cfg?.dual_approval_threshold ?? 100000;

  const save = useMutation({
    mutationFn: async (patch: { dual_approval_enabled?: boolean; dual_approval_threshold?: number }) => {
      const { error } = await supabase.from("approval_settings").update(patch).eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuração salva");
      qc.invalidateQueries({ queryKey: ["approval-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dupla aprovação (CFO + CEO)</CardTitle>
        <CardDescription>
          Solicitações acima do valor definido exigem aprovação conjunta do CFO e do CEO, em qualquer ordem.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={Boolean(cfg?.dual_approval_enabled)}
                onCheckedChange={(v) => save.mutate({ dual_approval_enabled: v })}
              />
              <Label>Ativa</Label>
            </div>
            <div className="space-y-2">
              <Label>Valor a partir de (R$)</Label>
              <UIMoneyInput
                className="w-32"
                value={value === "" ? String(current) : value}
                onChange={setValue}
              />
            </div>
            <Button
              onClick={() => save.mutate({ dual_approval_threshold: Number(value === "" ? current : value) || 0 })}
              disabled={save.isPending}
            >
              Salvar
            </Button>
            <p className="text-xs text-muted-foreground">Atual: {BRL(Number(current))}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type RuleRow = {
  id: string;
  name: string;
  step_type: string;
  category: string | null;
  approver_id: string | null;
  position: number;
  request_types: string[];
  active: boolean;
};

function EditRuleDialog({
  rule,
  people,
  stepTypes,
  requestTypesCatalog,
  onSaved,
}: {
  rule: RuleRow;
  people: { id: string; full_name: string | null; email: string | null }[];
  stepTypes: AdditionalStepType[];
  requestTypesCatalog: RequestTypeRecord[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(rule.name);
  const [stepType, setStepType] = useState(rule.step_type);
  const [approver, setApprover] = useState(rule.approver_id ?? "none");
  const [requestTypes, setRequestTypes] = useState<string[]>(rule.request_types ?? []);

  const openChange = (v: boolean) => {
    if (v) {
      setName(rule.name);
      setStepType(rule.step_type);
      setApprover(rule.approver_id ?? "none");
      setRequestTypes(rule.request_types ?? []);
    }
    setOpen(v);
  };

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("approval_rules")
        .update({
          name: name.trim(),
          step_type: stepType,
          approver_id: approver === "none" ? null : approver,
          request_types: requestTypes,
        })
        .eq("id", rule.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Etapa atualizada");
      setOpen(false);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" title="Editar etapa" aria-label="Editar etapa">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar etapa</DialogTitle>
          <DialogDescription>Altere os dados da etapa sem precisar excluí-la.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-2">
            <Label>Nome da etapa</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Inserir nome" />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={stepType} onValueChange={setStepType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {stepTypes.filter((type) => type.active || type.code === rule.step_type).map((type) => (
                  <SelectItem key={type.code} value={type.code}>{type.name}{!type.active ? " (inativo)" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Select value={approver} onValueChange={setApprover}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsável</SelectItem>
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Vincular ao Tipo de Solicitação</Label>
            <RequestTypeCheckboxes values={requestTypes} onChange={setRequestTypes} types={requestTypesCatalog} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => update.mutate()} disabled={!name.trim() || requestTypes.length === 0 || update.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RulesAdmin() {
  const qc = useQueryClient();
  const { data: profiles } = useProfiles();
  const { data: stepTypes, isLoading: stepTypesLoading } = useAdditionalStepTypes();
  const { data: requestTypesCatalog = [] } = useRequestTypes();
  const { data: rules, isLoading } = useQuery({
    queryKey: ["approval-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("approval_rules").select("*").order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [name, setName] = useState("");
  const [stepType, setStepType] = useState("");
  const [approver, setApprover] = useState<string>("none");
  const [requestTypes, setRequestTypes] = useState<string[]>([]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["approval-rules"] });
  const activeStepTypes = (stepTypes ?? []).filter((type) => type.active);

  useEffect(() => {
    if (!activeStepTypes.length) {
      setStepType("");
      return;
    }
    if (!activeStepTypes.some((type) => type.code === stepType)) setStepType(activeStepTypes[0].code);
  }, [activeStepTypes, stepType]);

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("approval_rules").insert({
        name: name.trim(),
        step_type: stepType,
        approver_id: approver === "none" ? null : approver,
        position: (rules?.length ?? 0) + 1,
        request_types: requestTypes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Etapa criada");
      setName("");
      setStepType(activeStepTypes[0]?.code ?? "");
      setApprover("none");
      setRequestTypes([]);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("approval_rules").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("approval_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Etapa removida");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: async ({ rule, direction }: { rule: RuleRow; direction: -1 | 1 }) => {
      const ordered = [...((rules ?? []) as RuleRow[])].sort((a, b) => a.position - b.position);
      const index = ordered.findIndex((item) => item.id === rule.id);
      const other = ordered[index + direction];
      if (!other) return;
      const temporaryPosition = Math.max(...ordered.map((item) => item.position), 0) + 1000;
      const { error: firstError } = await supabase.from("approval_rules").update({ position: temporaryPosition }).eq("id", rule.id);
      if (firstError) throw firstError;
      const { error: secondError } = await supabase.from("approval_rules").update({ position: rule.position }).eq("id", other.id);
      if (secondError) throw secondError;
      const { error: thirdError } = await supabase.from("approval_rules").update({ position: other.position }).eq("id", rule.id);
      if (thirdError) throw thirdError;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const people = [...(profiles?.values() ?? [])];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Nova Etapa Adicional</CardTitle>
          <CardDescription>
            Escolha um tipo cadastrado em Cadastro &gt; Diversos e defina em quais solicitações a etapa será aplicada.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Nome da etapa</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Inserir nome" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={stepType} onValueChange={setStepType} disabled={stepTypesLoading || activeStepTypes.length === 0}>
                <SelectTrigger><SelectValue placeholder={stepTypesLoading ? "Carregando..." : "Selecione"} /></SelectTrigger>
                <SelectContent>
                  {activeStepTypes.map((type) => (
                    <SelectItem key={type.code} value={type.code}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={approver} onValueChange={setApprover}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem responsável</SelectItem>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            </div>
            <div className="space-y-2">
              <Label>Vincular ao Tipo de Solicitação</Label>
              <RequestTypeCheckboxes values={requestTypes} onChange={setRequestTypes} types={requestTypesCatalog} />
            </div>
          </div>
          <Button className="mt-4" onClick={() => create.mutate()} disabled={!name.trim() || !stepType || requestTypes.length === 0 || create.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar etapa
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tipos de Solicitação</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Ativa</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rules ?? []).map((r, index) => {
                  const ap = r.approver_id ? profiles?.get(r.approver_id) : undefined;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Mover para cima" title="Mover para cima" disabled={index === 0 || move.isPending} onClick={() => move.mutate({ rule: r as RuleRow, direction: -1 })}><ArrowUp className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Mover para baixo" title="Mover para baixo" disabled={index === (rules?.length ?? 0) - 1 || move.isPending} onClick={() => move.mutate({ rule: r as RuleRow, direction: 1 })}><ArrowDown className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {stepTypes?.find((type) => type.code === r.step_type)?.name ?? r.step_type}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{(r.request_types ?? []).map((value) => requestTypeName(value, requestTypesCatalog)).join(", ") || "Todos"}</TableCell>
                      <TableCell className="text-sm">{ap?.full_name || ap?.email || "—"}</TableCell>
                      <TableCell>
                        <Switch
                          checked={r.active}
                          onCheckedChange={(v) => toggle.mutate({ id: r.id, active: v })}
                        />
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <EditRuleDialog rule={r} people={people} stepTypes={stepTypes ?? []} requestTypesCatalog={requestTypesCatalog} onSaved={invalidate} />
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Excluir etapa"
                          aria-label="Excluir etapa"
                          onClick={() => remove.mutate(r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(rules ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-sm text-muted-foreground">
                      Nenhuma etapa adicional configurada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MoneyInput({
  value,
  disabled,
  onSave,
}: {
  value: number;
  disabled?: boolean;
  onSave: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <UIMoneyInput
      className="h-8 w-32"
      disabled={disabled}
      value={draft ?? String(value ?? 0)}
      onChange={setDraft}
      onBlur={() => {
        if (draft === null) return;
        const n = Number(draft);
        setDraft(null);
        if (!Number.isNaN(n) && n !== value) onSave(n);
      }}
    />
  );
}

function DefaultChainAdmin() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const isAdmin = Boolean(me?.isAdmin);

  const { data: profilesMap } = useProfiles();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["aw-default-chain"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, approval_limit, tier2_limit, tier3_limit, approval_level, job_title_id")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: hierarchy } = useQuery({
    queryKey: ["aw-role-hierarchy"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_title_hierarchy").select("job_title_id, approver_job_title_id");
      if (error) throw error;
      const map = new Map<string, string | null>();
      (data ?? []).forEach((r) => map.set(r.job_title_id, r.approver_job_title_id));
      return map;
    },
  });

  const save = useMutation({
    mutationFn: async ({
      userId,
      patch,
    }: {
      userId: string;
      patch: Partial<{ approval_limit: number; tier2_limit: number; tier3_limit: number }>;
    }) => {
      const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Padrão de aprovação atualizado");
      qc.invalidateQueries({ queryKey: ["aw-default-chain"] });
      qc.invalidateQueries({ queryKey: ["aw-profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const namesByRole = useMemo(() => {
    const m = new Map<string, string[]>();
    (rows ?? []).forEach((p) => {
      const main = profilesMap?.get(p.id)?.jobTitle?.id;
      if (!main) return;
      if (!m.has(main)) m.set(main, []);
      m.get(main)!.push(p.full_name || p.email || "—");
    });
    return m;
  }, [rows, profilesMap]);

  const mainRoleOf = (userId: string) => {
    return profilesMap?.get(userId)?.jobTitle?.id ?? null;
  };

  const approverRoleOf = (userId: string) => {
    const main = mainRoleOf(userId);
    const next = main ? hierarchy?.get(main) ?? null : null;
    return next ? (profilesMap ? Array.from(profilesMap.values()).find((p) => p.jobTitle?.id === next)?.jobTitle?.name ?? null : null) : null;
  };

  const chainFor = (userId: string, levels: number) => {
    const names: string[] = [];
    let cur = mainRoleOf(userId);
    const seen = new Set<string>();
    for (let i = 0; i < levels && cur; i++) {
      const next = hierarchy?.get(cur) ?? null;
      if (!next || seen.has(next)) break;
      seen.add(next);
      const people = namesByRole.get(next) ?? [];
      const titleName = profilesMap && Array.from(profilesMap.values()).find((p) => p.jobTitle?.id === next)?.jobTitle?.name;
      names.push(`${titleName ?? "Cargo"}: ${people.length ? people.join(", ") : "sem usuário no cargo"}`);
      cur = next;
    }
    return names;
  };


  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Alçadas de Aprovação</CardTitle>
          <CardDescription>
            Sequência aplicada automaticamente a cada nova solicitação, conforme o valor total e o organograma.
            {isAdmin ? " Edite somente os valores das alçadas. A definição de gestores é feita no menu “Organograma de Aprovação”." : " Somente administradores podem editar."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Até a alçada automática do solicitante: aprovação automática, sem etapas.</p>
          <p>• Acima da alçada até a Faixa 2: Gestor Direto → Gestor da Área.</p>
          <p>• Acima da Faixa 2 até a Faixa 3: Gestor Direto → Gestor da Área → C-Level.</p>
          <p>• Acima da Faixa 3: sobe pelo organograma até o C-Level.</p>
          <p>• Depois dessas etapas entram as “Etapas adicionais” ativas e, se aplicável, a dupla aprovação.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Aprovado por (cargo)</TableHead>
                  <TableHead>Automática até</TableHead>
                  <TableHead>Faixa 2 até</TableHead>
                  <TableHead>Faixa 3 até</TableHead>
                  <TableHead>Sequência atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows ?? []).map((p) => {
                  const seq = chainFor(p.id, 5);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name || p.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {approverRoleOf(p.id) ?? "—"}
                      </TableCell>

                      <TableCell>
                        <MoneyInput
                          value={Number(p.approval_limit ?? 0)}
                          disabled={!isAdmin}
                          onSave={(v) => save.mutate({ userId: p.id, patch: { approval_limit: v } })}
                        />
                      </TableCell>
                      <TableCell>
                        <MoneyInput
                          value={Number(p.tier2_limit ?? 50000)}
                          disabled={!isAdmin}
                          onSave={(v) => save.mutate({ userId: p.id, patch: { tier2_limit: v } })}
                        />
                      </TableCell>
                      <TableCell>
                        <MoneyInput
                          value={Number(p.tier3_limit ?? 250000)}
                          disabled={!isAdmin}
                          onSave={(v) => save.mutate({ userId: p.id, patch: { tier3_limit: v } })}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {seq.length === 0 ? (
                          <span className="text-amber-600">Sem gestor definido — sem etapas de aprovação</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {seq.map((s) => (
                              <span key={s}>{s}</span>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type RoleNode = {
  role: string;
  title: string;
  names: { name: string; limit: number }[];
  children: RoleNode[];
};

function OrgBox({ node }: { node: RoleNode }) {
  return (
    <div className="org-chart-card mx-auto flex flex-col items-center justify-center overflow-hidden rounded border bg-card px-1 py-1 text-center shadow-sm">
      <p className="w-full break-words text-[9px] font-bold leading-tight sm:text-[10px]">{node.title}</p>
      <div className="mt-0.5 w-full space-y-0.5 overflow-hidden">
        {node.names.length === 0 ? (
          <p className="text-[8px] italic leading-tight text-muted-foreground">Sem usuário</p>
        ) : (
          node.names.map((n, i) => (
            <div
              key={`${n.name}-${i}`}
              className="min-w-0 text-[8px] leading-tight text-muted-foreground sm:text-[9px]"
            >
              <p className="truncate">{n.name}</p>
              <p className="font-medium text-foreground/80">{formatInt(n.limit)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const orgLeafCount = (node: RoleNode): number =>
  node.children.length === 0
    ? 1
    : node.children.reduce((total, child) => total + orgLeafCount(child), 0);

function OrgTreeBranch({ node }: { node: RoleNode }) {
  const childColumns = node.children
    .map((child) => `minmax(0, ${orgLeafCount(child)}fr)`)
    .join(" ");

  return (
    <div className="flex min-w-0 flex-col items-stretch">
      <OrgBox node={node} />
      {node.children.length > 0 && (
        <>
          <div className="mx-auto h-2 w-px bg-border" />
          <div className="border-t border-border pt-2">
            <div
              className="grid min-w-0 grid-cols-1 items-start gap-1.5 sm:[grid-template-columns:var(--org-columns)]"
              style={{ "--org-columns": childColumns } as CSSProperties}
            >
              {node.children.map((child) => (
                <div key={child.role} className="org-chart-child min-w-0">
                  <OrgTreeBranch node={child} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OrgChartAdmin() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const { data: profiles } = useProfiles();
  const { data: jobTitles } = useQuery({
    queryKey: ["job_titles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_titles").select("id,name,short_name").eq("active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const isAdmin = Boolean(me?.isAdmin);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["aw-org-chart"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, approval_limit, job_title_id")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: hierarchy } = useQuery({
    queryKey: ["aw-role-hierarchy"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_title_hierarchy").select("job_title_id, approver_job_title_id");
      if (error) throw error;
      const map = new Map<string, string | null>();
      (data ?? []).forEach((r) => map.set(r.job_title_id, r.approver_job_title_id));
      return map;
    },
  });

  const saveApprover = useMutation({
    mutationFn: async ({ role, approverRole }: { role: string; approverRole: string | null }) => {
      const { error } = await supabase
        .from("job_title_hierarchy")
        .upsert({ job_title_id: role, approver_job_title_id: approverRole }, { onConflict: "job_title_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Organograma atualizado");
      qc.invalidateQueries({ queryKey: ["aw-role-hierarchy"] });
      qc.invalidateQueries({ queryKey: ["aw-default-chain"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const namesByRole = useMemo(() => {
    const map = new Map<string, { name: string; limit: number }[]>();
    (rows ?? []).forEach((p) => {
      const main = p.job_title_id;
      if (!main) return;
      if (!map.has(main)) map.set(main, []);
      map.get(main)!.push({ name: shortName(p.full_name), limit: Number(p.approval_limit ?? 0) });
    });
    return map;
  }, [rows, profiles]);

  const titleById = useMemo(
    () => new Map((jobTitles ?? []).map((title) => [title.id, title.name])),
    [jobTitles],
  );

  const directReportsByRole = useMemo(() => {
    const map = new Map<string, string[]>();
    (jobTitles ?? []).forEach((title) => map.set(title.id, []));
    hierarchy?.forEach((approverId, titleId) => {
      if (!approverId) return;
      const titleName = titleById.get(titleId);
      if (!titleName) return;
      map.set(approverId, [...(map.get(approverId) ?? []), titleName]);
    });
    map.forEach((titles) => titles.sort((a, b) => a.localeCompare(b, "pt-BR")));
    return map;
  }, [hierarchy, jobTitles, titleById]);

  const roots = useMemo(() => {
    const h = hierarchy ?? new Map<string, string | null>();
    const nodes = new Map<string, RoleNode>();
    (jobTitles ?? []).forEach((title) =>
      nodes.set(title.id, { role: title.id, title: title.short_name?.trim() || title.name, names: namesByRole.get(title.id) ?? [], children: [] })
    );
    const top: RoleNode[] = [];
    (jobTitles ?? []).forEach((title) => {
      const r = title.id;
      const parentRole = h.get(r) ?? null;
      const node = nodes.get(r)!;
      if (parentRole && parentRole !== r && nodes.has(parentRole)) {
        nodes.get(parentRole)!.children.push(node);
      } else {
        top.push(node);
      }
    });
    return top;
  }, [hierarchy, namesByRole, jobTitles]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Organograma de Aprovação</CardTitle>
          <CardDescription>
            A hierarquia é definida por cargo. N-1 mostra os subordinados diretos e N+1 define o superior direto.
            Se um cargo ficar sem usuário, a solicitação segue automaticamente para o nível acima.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead>Cargo</TableHead>
                <TableHead>Usuários no cargo</TableHead>
                <TableHead className="w-56">N-1</TableHead>
                <TableHead className="w-56">N+1</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(jobTitles ?? []).map((title) => (
                <TableRow key={title.id}>
                  <TableCell className="font-medium">{title.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(namesByRole.get(title.id) ?? []).map((n) => n.name).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="w-56 text-sm text-muted-foreground">
                    {(directReportsByRole.get(title.id) ?? []).join(", ") || "Não definido"}
                  </TableCell>
                  <TableCell className="w-56">
                    <Select
                      value={hierarchy?.get(title.id) ?? "none"}
                      disabled={!isAdmin}
                      onValueChange={(v) => saveApprover.mutate({ role: title.id, approverRole: v === "none" ? null : v })}
                    >
                      <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Não definido" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não definido</SelectItem>
                        {(jobTitles ?? []).filter((option) => option.id !== title.id).map((option) => (
                          <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visualização</CardTitle>
          <CardDescription>Hierarquia de aprovação por cargo, com os usuários e alçadas</CardDescription>
        </CardHeader>
        <CardContent className="org-chart overflow-hidden px-2 sm:px-4">
          <div
            className="grid min-w-0 grid-cols-1 items-start gap-2 pb-2 sm:[grid-template-columns:var(--org-columns)]"
            style={{
              "--org-leaves": Math.max(1, roots.reduce((total, root) => total + orgLeafCount(root), 0)),
              "--org-columns": roots.length
                ? roots.map((root) => `minmax(0, ${orgLeafCount(root)}fr)`).join(" ")
                : "minmax(0, 1fr)",
            } as CSSProperties}
          >
            {roots.map((root) => (
              <OrgTreeBranch key={root.role} node={root} />
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}


export function ApprovalWorkflow() {
  return (
    <Tabs defaultValue="organograma">
      <TabsList className="mb-4">
        <TabsTrigger value="organograma">Organograma de Aprovação</TabsTrigger>
        <TabsTrigger value="padrao">Alçadas de Aprovação</TabsTrigger>
        <TabsTrigger value="etapas-adicionais">Etapas Adicionais</TabsTrigger>
      </TabsList>
      <TabsContent value="organograma"><OrgChartAdmin /></TabsContent>
      <TabsContent value="padrao">
        <div className="space-y-4">
          <DefaultChainAdmin />
          <DualApprovalSettings />
        </div>
      </TabsContent>
      <TabsContent value="etapas-adicionais"><RulesAdmin /></TabsContent>
    </Tabs>
  );
}
