import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Clock, History, Pencil, Plus, Trash2, XCircle } from "lucide-react";

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
import { MoneyInput as UIMoneyInput } from "@/components/ui/money-input";
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
          "id, order_id, step_index, role_label, approver_id, status, comment, decided_at, decided_by, created_at, purchase_orders(id, item_name, quantity, estimated_value, approval_status, requester_id, created_at, approval_number)"
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Pendentes comigo</CardTitle>
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
                    <TableCell className="whitespace-nowrap font-mono text-xs">{o?.approval_number ?? "—"}</TableCell>
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

function FlowsOverview() {
  const { data: steps, isLoading } = useSteps();
  const { data: profiles } = useProfiles();
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
      .filter(([, list]) => !term || (list[0]?.purchase_orders?.approval_number ?? "").includes(term))
      .sort((a, b) => {
      const da = a[1][0]?.purchase_orders?.created_at ?? "";
      const db = b[1][0]?.purchase_orders?.created_at ?? "";
      return db.localeCompare(da);
    });
  }, [steps, search]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Solicitações em fluxo</CardTitle>
            <CardDescription>Sequência de aprovação de cada solicitação e trilha de auditoria.</CardDescription>
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
  active: boolean;
};

function EditRuleDialog({
  rule,
  people,
  onSaved,
}: {
  rule: RuleRow;
  people: { id: string; full_name: string | null; email: string | null }[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(rule.name);
  const [stepType, setStepType] = useState(rule.step_type);
  const [category, setCategory] = useState(rule.category ?? "");
  const [approver, setApprover] = useState(rule.approver_id ?? "none");
  const [position, setPosition] = useState(String(rule.position));

  const openChange = (v: boolean) => {
    if (v) {
      setName(rule.name);
      setStepType(rule.step_type);
      setCategory(rule.category ?? "");
      setApprover(rule.approver_id ?? "none");
      setPosition(String(rule.position));
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
          category: category.trim() || null,
          approver_id: approver === "none" ? null : approver,
          position: Number(position) || 1,
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
            <Input value={name} onChange={(e) => setName(e.target.value)} />
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
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
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
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => update.mutate()} disabled={!name.trim() || update.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      <DualApprovalSettings />
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
                      <TableCell className="text-right whitespace-nowrap">
                        <EditRuleDialog rule={r} people={people} onSaved={invalidate} />
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

const LEVEL_LABELS: Record<string, string> = {
  gestor: "Gestor Direto",
  gerente: "Gerente da Área",
  c_level: "C-Level",
};

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

  const { data: rows, isLoading } = useQuery({
    queryKey: ["aw-default-chain"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, approval_limit, tier2_limit, tier3_limit, manager_id, approval_level")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async ({
      userId,
      patch,
    }: {
      userId: string;
      patch: Partial<{ approval_limit: number; tier2_limit: number; tier3_limit: number; manager_id: string | null }>;
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

  const byId = useMemo(() => {
    const m = new Map<string, NonNullable<typeof rows>[number]>();
    (rows ?? []).forEach((r) => m.set(r.id, r));
    return m;
  }, [rows]);

  const chainFor = (userId: string, levels: number) => {
    const names: string[] = [];
    let cur = userId;
    for (let i = 0; i < levels; i++) {
      const mgrId = byId.get(cur)?.manager_id;
      if (!mgrId) break;
      const mgr = byId.get(mgrId);
      const lbl = LEVEL_LABELS[mgr?.approval_level ?? ""] ?? "Gestor Direto";
      names.push(`${lbl}: ${mgr?.full_name || mgr?.email || "—"}`);
      if (mgr?.approval_level === "c_level") break;
      cur = mgrId;
    }
    return names;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Padrão de aprovação por alçada</CardTitle>
          <CardDescription>
            Sequência aplicada automaticamente a cada nova solicitação, conforme o valor total e o organograma.
            {isAdmin ? " Edite os valores e o gestor direto de cada usuário." : " Somente administradores podem editar."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Até a alçada automática do solicitante: aprovação automática, sem etapas.</p>
          <p>• Acima da alçada até a Faixa 2: Gestor Direto → Gerente da Área.</p>
          <p>• Acima da Faixa 2 até a Faixa 3: Gestor Direto → Gerente da Área → C-Level.</p>
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
                  <TableHead>Gestor direto</TableHead>
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
                      <TableCell>
                        <Select
                          value={p.manager_id ?? "none"}
                          disabled={!isAdmin}
                          onValueChange={(v) =>
                            save.mutate({ userId: p.id, patch: { manager_id: v === "none" ? null : v } })
                          }
                        >
                          <SelectTrigger className="h-8 w-52"><SelectValue placeholder="Sem gestor" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem gestor</SelectItem>
                            {(rows ?? [])
                              .filter((o) => o.id !== p.id)
                              .map((o) => (
                                <SelectItem key={o.id} value={o.id}>{o.full_name || o.email}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
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

const ROLE_TITLES: Record<string, string> = {
  ceo: "CEO",
  coo: "COO",
  cfo: "CFO",
  cto: "CTO",
  admin: "Admin",
  comprador: "Supply",
  estoquista: "Estoquista",
  fabrica: "Fábrica",
  solicitante: "Solicitante",
};

const ROLE_PRIORITY = ["ceo", "coo", "cfo", "cto", "comprador", "estoquista", "fabrica", "solicitante", "admin"];

function roleTitle(roles: AppRole[]) {
  const found = ROLE_PRIORITY.find((r) => roles.includes(r as AppRole));
  return found ? ROLE_TITLES[found]! : "Sem perfil";
}

type RoleNode = {
  role: string;
  title: string;
  names: string[];
  children: RoleNode[];
};

function OrgBox({ node }: { node: RoleNode }) {
  return (
    <div className="flex flex-col items-center">
      <div className="min-w-[170px] rounded-lg border bg-card px-4 py-2 text-center shadow-sm">
        <p className="text-sm font-bold leading-tight">{node.title}</p>
        <div className="mt-1 space-y-0.5">
          {node.names.length === 0 ? (
            <p className="text-xs italic leading-tight text-muted-foreground">Sem usuário no cargo</p>
          ) : (
            node.names.map((n, i) => (
              <p key={`${n}-${i}`} className="text-xs leading-tight text-muted-foreground">{n}</p>
            ))
          )}
        </div>
      </div>
      {node.children.length > 0 && (
        <>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-start gap-6 border-t border-border pt-5">
            {node.children.map((c) => (
              <div key={c.role} className="relative flex flex-col items-center">
                <div className="absolute -top-5 h-5 w-px bg-border" />
                <OrgBox node={c} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const ORG_ROLES = ["ceo", "cfo", "coo", "cto", "comprador", "estoquista", "fabrica", "solicitante"];

function OrgChartAdmin() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const { data: profiles } = useProfiles();
  const isAdmin = Boolean(me?.isAdmin);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["aw-org-chart"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, approval_level")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: hierarchy } = useQuery({
    queryKey: ["aw-role-hierarchy"],
    queryFn: async () => {
      const { data, error } = await supabase.from("role_hierarchy").select("role, approver_role");
      if (error) throw error;
      const map = new Map<string, string | null>();
      (data ?? []).forEach((r) => map.set(r.role as string, (r.approver_role as string | null) ?? null));
      return map;
    },
  });

  const saveApprover = useMutation({
    mutationFn: async ({ role, approverRole }: { role: string; approverRole: string | null }) => {
      const { error } = await supabase
        .from("role_hierarchy")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert({ role, approver_role: approverRole } as any, { onConflict: "role" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Organograma atualizado");
      qc.invalidateQueries({ queryKey: ["aw-role-hierarchy"] });
      qc.invalidateQueries({ queryKey: ["aw-default-chain"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveLevel = useMutation({
    mutationFn: async ({ userId, level }: { userId: string; level: string | null }) => {
      const { error } = await supabase.from("profiles").update({ approval_level: level }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nível de aprovação atualizado");
      qc.invalidateQueries({ queryKey: ["aw-org-chart"] });
      qc.invalidateQueries({ queryKey: ["aw-default-chain"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const namesByRole = useMemo(() => {
    const map = new Map<string, string[]>();
    (rows ?? []).forEach((p) => {
      const roles = profiles?.get(p.id)?.roles ?? [];
      const main = ROLE_PRIORITY.find((r) => roles.includes(r as AppRole));
      if (!main || main === "admin") return;
      if (!map.has(main)) map.set(main, []);
      map.get(main)!.push(p.full_name || p.email || "—");
    });
    return map;
  }, [rows, profiles]);

  const roots = useMemo(() => {
    const h = hierarchy ?? new Map<string, string | null>();
    const nodes = new Map<string, RoleNode>();
    ORG_ROLES.forEach((r) =>
      nodes.set(r, { role: r, title: ROLE_TITLES[r] ?? r, names: namesByRole.get(r) ?? [], children: [] })
    );
    const top: RoleNode[] = [];
    ORG_ROLES.forEach((r) => {
      const parentRole = h.get(r) ?? null;
      const node = nodes.get(r)!;
      if (parentRole && parentRole !== r && nodes.has(parentRole)) {
        nodes.get(parentRole)!.children.push(node);
      } else {
        top.push(node);
      }
    });
    return top;
  }, [hierarchy, namesByRole]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Organograma de Aprovação</CardTitle>
          <CardDescription>
            A hierarquia é definida por cargo, não por pessoa: defina qual cargo aprova cada cargo. Se o cargo aprovador
            ficar sem nenhum usuário, a solicitação segue automaticamente para o cargo acima.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cargo</TableHead>
                <TableHead>Usuários no cargo</TableHead>
                <TableHead>Aprovado por (cargo)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ORG_ROLES.map((r) => (
                <TableRow key={r}>
                  <TableCell className="font-medium">{ROLE_TITLES[r] ?? r}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(namesByRole.get(r) ?? []).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={hierarchy?.get(r) ?? "none"}
                      disabled={!isAdmin}
                      onValueChange={(v) => saveApprover.mutate({ role: r, approverRole: v === "none" ? null : v })}
                    >
                      <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Sem aprovador" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem aprovador</SelectItem>
                        {ORG_ROLES.filter((o) => o !== r).map((o) => (
                          <SelectItem key={o} value={o}>{ROLE_TITLES[o] ?? o}</SelectItem>
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
          <CardTitle>Nível de aprovação por usuário</CardTitle>
          <CardDescription>Classificação de cada usuário como Gestor Direto, Gerente da Área ou C-Level.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Nível de aprovação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name || p.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {roleTitle(profiles?.get(p.id)?.roles ?? [])}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={p.approval_level ?? "none"}
                        disabled={!isAdmin}
                        onValueChange={(v) => saveLevel.mutate({ userId: p.id, level: v === "none" ? null : v })}
                      >
                        <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Não definido" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não definido</SelectItem>
                          <SelectItem value="gestor">Gestor Direto</SelectItem>
                          <SelectItem value="gerente">Gerente da Área</SelectItem>
                          <SelectItem value="c_level">C-Level</SelectItem>
                        </SelectContent>
                      </Select>
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
          <CardTitle>Visualização</CardTitle>
          <CardDescription>Hierarquia de aprovação por cargo, com os usuários de cada cargo agrupados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max items-start gap-10 p-4">
              {roots.map((r) => (
                <OrgBox key={r.role} node={r} />
              ))}
            </div>
          </div>
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
        <TabsTrigger value="organograma">Organograma de Aprovação</TabsTrigger>
        <TabsTrigger value="padrao">Padrão de aprovação</TabsTrigger>
        <TabsTrigger value="regras">Etapas adicionais</TabsTrigger>
      </TabsList>
      <TabsContent value="pendentes"><PendingForMe /></TabsContent>
      <TabsContent value="fluxos"><FlowsOverview /></TabsContent>
      <TabsContent value="organograma"><OrgChartAdmin /></TabsContent>
      <TabsContent value="padrao"><DefaultChainAdmin /></TabsContent>
      <TabsContent value="regras"><RulesAdmin /></TabsContent>
    </Tabs>
  );
}
