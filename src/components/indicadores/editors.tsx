import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CONFIDENCES, MEASURES, cycleDates } from "@/lib/indicadores";
import type { Cycle, Metric, Objective, IndicadoresData } from "./data";
export type EditSelection =
  | { type: "objective"; row?: Objective; parent?: Objective }
  | { type: "metric"; row?: Metric; objective?: Objective; kind: "kr" | "kpi" }
  | { type: "cycle"; row?: Cycle }
  | { type: "checkin"; row: Metric }
  | { type: "convert"; row: Metric };
export function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <div className="min-w-0 space-y-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
export function IndicadorEditor({
  selection,
  data,
  onClose,
}: {
  selection: EditSelection;
  data: IndicadoresData;
  onClose: () => void;
}) {
  const obj = selection.type === "objective" ? selection.row : undefined;
  const metric =
    selection.type === "metric" || selection.type === "checkin" || selection.type === "convert"
      ? selection.row
      : undefined;
  const cycle = selection.type === "cycle" ? selection.row : undefined;
  const parent = selection.type === "objective" ? selection.parent : undefined;
  const [title, setTitle] = useState(obj?.title ?? metric?.title ?? cycle?.name ?? "");
  const [description, setDescription] = useState(obj?.description ?? "");
  const [parentId, setParentId] = useState(obj?.parent_id ?? parent?.id ?? "none");
  const [cycleId, setCycleId] = useState(
    obj?.cycle_id ?? parent?.cycle_id ?? data.cycles.find((c) => !c.archived)?.id ?? "none",
  );
  const [scope, setScope] = useState(obj?.scope ?? (parent ? "departamento" : "empresa"));
  const [alignment, setAlignment] = useState(obj?.alignment_name ?? "");
  const [responsible, setResponsible] = useState(
    obj?.responsible_id ?? metric?.responsible_id ?? data.userId,
  );
  const [confidential, setConfidential] = useState(obj?.confidential ?? false);
  const [allowed, setAllowed] = useState<string[]>(obj?.allowed_user_ids ?? []);
  const [measure, setMeasure] = useState(metric?.measure ?? "percentage");
  const [initial, setInitial] = useState(String(metric?.initial_value ?? 0));
  const [target, setTarget] = useState(String(metric?.target_value ?? 100));
  const [value, setValue] = useState(String(metric?.current_value ?? 0));
  const [confidence, setConfidence] = useState(metric?.confidence ?? "on_track");
  const [comment, setComment] = useState("");
  const [due, setDue] = useState(metric?.due_on ?? "");
  const [unit, setUnit] = useState(metric?.unit ?? "");
  const [period, setPeriod] = useState("quarter");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [part, setPart] = useState("1");
  const dates = cycleDates(Number(year), "quarter", 1);
  const [start, setStart] = useState(cycle?.starts_on ?? dates.starts_on);
  const [end, setEnd] = useState(cycle?.ends_on ?? dates.ends_on);
  const qc = useQueryClient();
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["indicadores"] });
    onClose();
  };
  function updatePeriod(y: string, p: string, i: string) {
    const d = cycleDates(Number(y), p, Number(i));
    setStart(d.starts_on);
    setEnd(d.ends_on);
    setTitle(`${p === "quarter" ? `Q${i}` : p === "semester" ? `${i}º semestre` : "Ano"} ${y}`);
  }
  const save = useMutation({
    mutationFn: async () => {
      if (selection.type === "checkin") {
        const n = Number(value.replace(",", "."));
        if (!value.trim() || !Number.isFinite(n)) throw new Error("Informe o valor.");
        const r = await supabase.rpc("indicadores_checkin", {
          _metric_id: selection.row.id,
          _value: n,
          _confidence: confidence,
          _comment: comment,
        });
        if (r.error) throw r.error;
        return;
      }
      if (!title.trim()) throw new Error("Informe o nome.");
      if (selection.type === "convert") {
        if (cycleId === "none") throw new Error("Selecione um ciclo.");
        const r = await supabase.rpc("indicadores_convert_kpi", {
          _metric_id: selection.row.id,
          _cycle_id: cycleId,
          _title: title,
        });
        if (r.error) throw r.error;
        return;
      }
      if (selection.type === "cycle") {
        if (!start || !end || end < start) throw new Error("Confira as datas do ciclo.");
        const row = { name: title.trim(), starts_on: start, ends_on: end };
        const r = cycle
          ? await supabase
              .from("indicadores_cycles")
              .update(row)
              .eq("id", cycle.id)
              .select("id")
              .single()
          : await supabase.from("indicadores_cycles").insert(row).select("id").single();
        if (r.error) throw r.error;
        return;
      }
      if (selection.type === "objective") {
        const superior = data.objectives.find((o) => o.id === parentId);
        const row = {
          title: title.trim(),
          description: description.trim() || null,
          parent_id: parentId === "none" ? null : parentId,
          cycle_id: superior?.cycle_id ?? (cycleId === "none" ? null : cycleId),
          scope,
          alignment_name: alignment.trim() || null,
          responsible_id: responsible || null,
          ...(data.role === "admin" ? { confidential, allowed_user_ids: allowed } : {}),
        };
        const r = obj
          ? await supabase
              .from("indicadores_objectives")
              .update(row)
              .eq("id", obj.id)
              .select("id")
              .single()
          : await supabase.from("indicadores_objectives").insert(row).select("id").single();
        if (r.error) throw r.error;
        return;
      }
      const a = Number(initial.replace(",", ".")),
        t = Number(target.replace(",", "."));
      if (
        !responsible ||
        !initial.trim() ||
        !target.trim() ||
        ![a, t].every(Number.isFinite) ||
        a === t
      )
        throw new Error("Informe responsável, valor inicial e meta diferente do inicial.");
      const row = {
        title: title.trim(),
        kind: selection.kind,
        objective_id: selection.objective?.id ?? metric?.objective_id ?? null,
        responsible_id: responsible,
        measure,
        initial_value: measure === "binary" ? 0 : a,
        target_value: measure === "binary" ? 1 : t,
        unit,
        due_on: due || null,
      };
      const r = metric
        ? await supabase
            .from("indicadores_metrics")
            .update(row)
            .eq("id", metric.id)
            .select("id")
            .single()
        : await supabase.from("indicadores_metrics").insert(row).select("id").single();
      if (r.error) throw r.error;
    },
    onSuccess: () => {
      toast.success(selection.type === "checkin" ? "Check-in registrado" : "Salvo");
      void refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const names = data.users.map((u) => ({ value: u.id, label: u.full_name }));
  const field = (label: string, v: string, change: (v: string) => void, type = "text") => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input aria-label={label} type={type} value={v} onChange={(e) => change(e.target.value)} />
    </div>
  );
  const modalTitle =
    selection.type === "checkin"
      ? "Check-in semanal"
      : selection.type === "convert"
        ? "Criar OKR a partir do KPI"
        : selection.type === "cycle"
          ? cycle
            ? "Editar ciclo"
            : "Novo ciclo"
          : selection.type === "objective"
            ? obj
              ? "Editar objetivo"
              : "Novo objetivo"
            : metric
              ? "Editar indicador"
              : selection.kind === "kr"
                ? "Novo Key Result"
                : "Novo KPI";
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o && !save.isPending) onClose();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          {selection.type === "checkin" ? (
            <>
              <p className="font-medium">{metric?.title}</p>
              {measure === "binary" ? (
                <Choice
                  label="Resultado"
                  value={value}
                  onChange={setValue}
                  options={[
                    { value: "0", label: "Não feito" },
                    { value: "1", label: "Feito" },
                  ]}
                />
              ) : (
                field("Valor atual", value, setValue)
              )}
              <Choice
                label="Confiança"
                value={confidence}
                onChange={setConfidence}
                options={CONFIDENCES}
              />
              <div className="space-y-1">
                <Label>Bloqueios ou conquistas da semana</Label>
                <Textarea
                  aria-label="Bloqueios ou conquistas da semana"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              {field("Nome", title, setTitle)}
              {(selection.type === "objective" || selection.type === "convert") && (
                <Choice
                  label="Ciclo"
                  value={cycleId}
                  onChange={setCycleId}
                  options={[
                    { value: "none", label: "Sem ciclo" },
                    ...data.cycles
                      .filter((c) => !c.archived)
                      .map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />
              )}
              {selection.type === "cycle" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Choice
                      label="Período"
                      value={period}
                      onChange={(p) => {
                        setPeriod(p);
                        setPart("1");
                        updatePeriod(year, p, "1");
                      }}
                      options={[
                        { value: "quarter", label: "Trimestre" },
                        { value: "semester", label: "Semestre" },
                        { value: "year", label: "Anual" },
                      ]}
                    />
                    {field(
                      "Ano",
                      year,
                      (y) => {
                        setYear(y);
                        if (Number(y) > 1900) updatePeriod(y, period, part);
                      },
                      "number",
                    )}
                  </div>
                  {period !== "year" && (
                    <Choice
                      label="Número do período"
                      value={part}
                      onChange={(i) => {
                        setPart(i);
                        updatePeriod(year, period, i);
                      }}
                      options={Array.from({ length: period === "quarter" ? 4 : 2 }, (_, i) => ({
                        value: String(i + 1),
                        label: period === "quarter" ? `Q${i + 1}` : `${i + 1}º semestre`,
                      }))}
                    />
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {field("Início", start, setStart, "date")}
                    {field("Fim", end, setEnd, "date")}
                  </div>
                </>
              )}
              {selection.type === "objective" && (
                <>
                  <Choice
                    label="Objetivo superior"
                    value={parentId}
                    onChange={setParentId}
                    options={[
                      { value: "none", label: "Objetivo global" },
                      ...data.objectives
                        .filter((o) => o.id !== obj?.id)
                        .map((o) => ({ value: o.id, label: o.title })),
                    ]}
                  />
                  <Choice
                    label="Nível de alinhamento"
                    value={scope}
                    onChange={setScope}
                    options={[
                      { value: "empresa", label: "Empresa" },
                      { value: "departamento", label: "Departamento" },
                      { value: "equipe", label: "Equipe" },
                      { value: "individual", label: "Individual" },
                    ]}
                  />
                  {scope !== "empresa" && field("Departamento / Equipe", alignment, setAlignment)}
                  <div className="space-y-1">
                    <Label>Descrição</Label>
                    <Textarea
                      aria-label="Descrição"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </>
              )}
              {(selection.type === "objective" || selection.type === "metric") && (
                <div className="space-y-1">
                  <Label>Responsável</Label>
                  <SearchableSelect
                    aria-label="Responsável"
                    value={responsible}
                    onChange={setResponsible}
                    options={names}
                  />
                </div>
              )}
              {selection.type === "objective" && data.role === "admin" && (
                <>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={confidential}
                      onCheckedChange={(v) => setConfidential(v === true)}
                    />
                    Confidencial
                  </label>
                  {confidential && (
                    <div className="space-y-2">
                      <Label>Usuários autorizados</Label>
                      {data.users.map((u) => (
                        <label key={u.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={allowed.includes(u.id)}
                            onCheckedChange={(v) =>
                              setAllowed(
                                v ? [...allowed, u.id] : allowed.filter((id) => id !== u.id),
                              )
                            }
                          />
                          {u.full_name}
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
              {selection.type === "metric" && (
                <>
                  <Choice
                    label="Medição"
                    value={measure}
                    onChange={(m) => {
                      setMeasure(m);
                      if (m === "binary") {
                        setInitial("0");
                        setTarget("1");
                      }
                    }}
                    options={MEASURES}
                  />
                  {measure !== "binary" && (
                    <div className="grid grid-cols-2 gap-3">
                      {field("Valor inicial", initial, setInitial)}
                      {field("Meta", target, setTarget)}
                    </div>
                  )}
                  {measure === "number" && field("Unidade", unit, setUnit)}
                  {field("Prazo", due, setDue, "date")}
                </>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            size="icon"
            title="Salvar"
            aria-label="Salvar"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            <Save />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
