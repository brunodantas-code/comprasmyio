import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Clock, History, Pencil, Plus, Trash2, XCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
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

const formatInt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number(v ?? 0));

const shortName = (full: string | null | undefined): string => {
  if (!full) return "—";
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

const TRAVEL_TYPE_LABELS: Record<string, string> = {
  passagens: "Passagens",
  hospedagens: "Hospedagens",
  aluguel_veiculos: "Aluguel de Veículos",
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  materiais: "Materiais",
  servicos: "Serviços",
  viagens: "Viagens",
  reembolso: "Reembolso de Despesas",
  rh: "Contratação de RH",
  importacao: "Importação",
  dispositivos: "Dispositivos",
  pagamento: "Pagamento",
};

function requestTypeLabel(o: { request_type?: string | null; travel_type?: string | null } | null | undefined): string {
  const rt = o?.request_type ?? "";
  if (rt === "viagens") {
    const sub = o?.travel_type ? TRAVEL_TYPE_LABELS[o.travel_type] : undefined;
    return sub ?? "Viagens";
  }
  return REQUEST_TYPE_LABELS[rt] ?? rt ?? "—";
}

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
          "id, order_id, step_index, role_label, approver_id, status, comment, decided_at, decided_by, created_at, purchase_orders(id, item_name, quantity, estimated_value, approval_status, requester_id, created_at, approval_number, request_type, travel_type)"
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

export function PendingForMe() {
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
                      {requestTypeLabel(o)}
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
                      {requestTypeLabel(o)}{" "}
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
    return next ? profilesMap && Array.from(profilesMap.values()).find((p) => p.jobTitle?.id === next)?.jobTitle?.name ?? null : null;
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
    <div className="flex flex-col items-center">
      <div className="w-[220px] rounded-lg border bg-card px-4 py-2 text-center shadow-sm">
        <p className="text-sm font-bold leading-tight">{node.title}</p>
        <div className="mt-1 space-y-0.5">
          {node.names.length === 0 ? (
            <p className="text-xs italic leading-tight text-muted-foreground">Sem usuário no cargo</p>
          ) : (
            node.names.map((n, i) => (
              <div
                key={`${n.name}-${i}`}
                className="flex items-center justify-center gap-1.5 text-xs leading-tight text-muted-foreground"
              >
                <span>{n.name}</span>
                <span className="text-border">|</span>
                <span className="font-medium text-foreground/80">{formatInt(n.limit)}</span>
              </div>
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

function OrgChartAdmin() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const { data: profiles } = useProfiles();
  const { data: jobTitles } = useQuery({
    queryKey: ["job_titles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_titles").select("id,name").eq("active", true).order("name");
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
        .select("id, full_name, email, approval_level, approval_limit, job_title_id")
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
    const map = new Map<string, { name: string; limit: number }[]>();
    (rows ?? []).forEach((p) => {
      const main = p.job_title_id;
      if (!main) return;
      if (!map.has(main)) map.set(main, []);
      map.get(main)!.push({ name: shortName(p.full_name), limit: Number(p.approval_limit ?? 0) });
    });
    return map;
  }, [rows, profiles]);

  const roots = useMemo(() => {
    const h = hierarchy ?? new Map<string, string | null>();
    const nodes = new Map<string, RoleNode>();
    (jobTitles ?? []).forEach((title) =>
      nodes.set(title.id, { role: title.id, title: title.name, names: namesByRole.get(title.id) ?? [], children: [] })
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
              {(jobTitles ?? []).map((title) => (
                <TableRow key={title.id}>
                  <TableCell className="font-medium">{title.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(namesByRole.get(title.id) ?? []).map((n) => n.name).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={hierarchy?.get(title.id) ?? "none"}
                      disabled={!isAdmin}
                      onValueChange={(v) => saveApprover.mutate({ role: title.id, approverRole: v === "none" ? null : v })}
                    >
                      <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Sem aprovador" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem aprovador</SelectItem>
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
                      {profiles?.get(p.id)?.jobTitle?.name ?? "Sem cargo"}
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
        <TabsTrigger value="padrao">Alçadas de Aprovação</TabsTrigger>
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
