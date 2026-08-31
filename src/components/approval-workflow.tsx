import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Clock, History, Plus, Trash2, XCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, type AppRole } from "@/hooks/use-current-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const BRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

const dt = (v: string | null) =>
  v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

const ACTION_LABELS: Record<string, string> = {
  criado: "Criado",
  status_alterado: "Alterado",
  observacao_atualizada: "Alterado",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

const STEP_TYPES: { value: string; label: string }[] = [
  { value: "tecnica", label: "Validação técnica / Compliance" },
  { value: "suprimentos", label: "Suprimentos (3 cotações)" },
  { value: "financeiro", label: "Financeiro / Controller" },
];

type ProfileRow = { id: string; full_name: string | null; email: string | null; approval_limit: number | null };

function useProfiles() {
  return useQuery({
    queryKey: ["aw-profiles"],
    queryFn: async () => {
      const [{ data: profiles, error: pe }, { data: roles, error: re }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, approval_limit").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (pe) throw pe;
      if (re) throw re;
      const rolesBy = new Map<string, AppRole[]>();
      (roles ?? []).forEach((r) => {
        const arr = rolesBy.get(r.user_id) ?? [];
        arr.push(r.role as AppRole);
        rolesBy.set(r.user_id, arr);
      });
      const map = new Map<string, ProfileRow & { roles: AppRole[] }>();
      ((profiles ?? []) as ProfileRow[]).forEach((p) => map.set(p.id, { ...p, roles: rolesBy.get(p.id) ?? [] }));
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
          "id, order_id, step_index, role_label, approver_id, status, comment, decided_at, decided_by, created_at, purchase_orders(id, item_name, quantity, estimated_value, approval_status, requester_id, created_at)"
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

function DecisionDialog({
  step,
  decision,
  onDone,
}: {
  step: StepRow;
  decision: "aprovado" | "rejeitado";
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const decide = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("decide_approval_step", {
        _step_id: step.id,
        _decision: decision,
        _comment: comment.trim() || undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(decision === "aprovado" ? "Etapa aprovada" : "Solicitação rejeitada");
      setOpen(false);
      setComment("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={decision === "aprovado" ? "default" : "outline"}>
          {decision === "aprovado" ? (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          ) : (
            <XCircle className="mr-2 h-4 w-4" />
          )}
          {decision === "aprovado" ? "Aprovar" : "Rejeitar"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{decision === "aprovado" ? "Aprovar etapa" : "Rejeitar solicitação"}</DialogTitle>
          <DialogDescription>
            {step.role_label} — registre uma justificativa para a auditoria.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Justificativa / comentário"
          rows={4}
        />
        <DialogFooter>
          <Button onClick={() => decide.mutate()} disabled={decide.isPending}>
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
                      {(p?.roles ?? []).join(", ") || "—"}
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

function PendingForMe() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const { data: steps, isLoading } = useSteps();
  const { data: profiles } = useProfiles();

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
      if (s.approver_id !== me.id && !me.isAdmin) return false;
      const earlier = (byOrder.get(s.order_id) ?? []).filter(
        (o) => o.step_index < s.step_index && o.status === "pendente"
      );
      return earlier.length === 0;
    });
  }, [steps, me]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["approval-steps"] });
    qc.invalidateQueries({ queryKey: ["orders"] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pendentes comigo</CardTitle>
        <CardDescription>Etapas aguardando sua decisão na sequência de aprovação.</CardDescription>
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
                <TableHead>Item</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead className="text-right">Decisão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mine.map((s) => {
                const o = s.purchase_orders;
                const req = o?.requester_id ? profiles?.get(o.requester_id) : undefined;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {o?.item_name ?? "—"}
                      <span className="ml-1 text-xs text-muted-foreground">x{o?.quantity ?? 1}</span>
                    </TableCell>
                    <TableCell className="text-sm">{req?.full_name || req?.email || "—"}</TableCell>
                    <TableCell className="text-sm">{BRL(Number(o?.estimated_value ?? 0))}</TableCell>
                    <TableCell className="text-sm">
                      {s.step_index}. {s.role_label}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <DecisionDialog step={s} decision="aprovado" onDone={refresh} />
                        <DecisionDialog step={s} decision="rejeitado" onDone={refresh} />
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

function FlowsOverview() {
  const { data: steps, isLoading } = useSteps();
  const { data: profiles } = useProfiles();

  const orders = useMemo(() => {
    const byOrder = new Map<string, StepRow[]>();
    (steps ?? []).forEach((s) => {
      const arr = byOrder.get(s.order_id) ?? [];
      arr.push(s);
      byOrder.set(s.order_id, arr);
    });
    return [...byOrder.entries()].sort((a, b) => {
      const da = a[1][0]?.purchase_orders?.created_at ?? "";
      const db = b[1][0]?.purchase_orders?.created_at ?? "";
      return db.localeCompare(da);
    });
  }, [steps]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitações em fluxo</CardTitle>
        <CardDescription>Sequência de aprovação de cada solicitação e trilha de auditoria.</CardDescription>
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
                    <p className="font-medium">
                      {o?.item_name ?? "—"}{" "}
                      <span className="text-xs text-muted-foreground">x{o?.quantity ?? 1}</span>
                    </p>
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
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                          )}
                          <span className="font-medium">{s.role_label}</span>
                          <span className="text-muted-foreground">
                            {ap?.full_name || ap?.email || "sem responsável"}
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

function RulesAdmin() {
  const qc = useQueryClient();
  const { data: profiles } = useProfiles();
  const { data: rules, isLoading } = useQuery({
    queryKey: ["approval-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("approval_rules").select("*").order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [name, setName] = useState("");
  const [stepType, setStepType] = useState("tecnica");
  const [category, setCategory] = useState("");
  const [approver, setApprover] = useState<string>("none");
  const [position, setPosition] = useState("1");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["approval-rules"] });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("approval_rules").insert({
        name: name.trim(),
        step_type: stepType,
        category: category.trim() || null,
        approver_id: approver === "none" ? null : approver,
        position: Number(position) || 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Etapa criada");
      setName("");
      setCategory("");
      setApprover("none");
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

  const people = [...(profiles?.values() ?? [])];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Etapas adicionais</CardTitle>
          <CardDescription>
            Validação técnica, suprimentos e financeiro. Etapas ativas são adicionadas ao final da sequência de
            aprovação de novas solicitações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5">
            <div className="space-y-2">
              <Label>Nome da etapa</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Diretor de TI" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={stepType} onValueChange={setStepType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STEP_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria (opcional)</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Software/Hardware" />
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
              <Label>Ordem</Label>
              <Input type="number" min={1} value={position} onChange={(e) => setPosition(e.target.value)} />
            </div>
          </div>
          <Button className="mt-4" onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
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
                  <TableHead>Categoria</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Ativa</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rules ?? []).map((r) => {
                  const ap = r.approver_id ? profiles?.get(r.approver_id) : undefined;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.position}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {STEP_TYPES.find((t) => t.value === r.step_type)?.label ?? r.step_type}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.category || "—"}</TableCell>
                      <TableCell className="text-sm">{ap?.full_name || ap?.email || "—"}</TableCell>
                      <TableCell>
                        <Switch
                          checked={r.active}
                          onCheckedChange={(v) => toggle.mutate({ id: r.id, active: v })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => remove.mutate(r.id)}>
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

export function ApprovalWorkflow() {
  return (
    <Tabs defaultValue="pendentes">
      <TabsList className="mb-4">
        <TabsTrigger value="pendentes">Pendentes comigo</TabsTrigger>
        <TabsTrigger value="fluxos">Solicitações em fluxo</TabsTrigger>
        <TabsTrigger value="regras">Etapas adicionais</TabsTrigger>
      </TabsList>
      <TabsContent value="pendentes"><PendingForMe /></TabsContent>
      <TabsContent value="fluxos"><FlowsOverview /></TabsContent>
      <TabsContent value="regras"><RulesAdmin /></TabsContent>
    </Tabs>
  );
}
