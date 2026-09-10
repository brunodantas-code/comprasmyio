import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Frequency = "diaria" | "duas_vezes" | "semanal";

type Settings = {
  enabled: boolean;
  frequency: Frequency;
  time_1: string;
  time_2: string;
  weekday: number;
  body_text: string;
  last_sent_at: string | null;
};

const WEEKDAYS = [
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" },
  { value: "0", label: "Domingo" },
];

const hhmm = (v: string | null | undefined) => (v ? v.slice(0, 5) : "09:00");

export function RemindersTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Settings | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["reminder_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminder_settings")
        .select("enabled,frequency,time_1,time_2,weekday,body_text,last_sent_at")
        .eq("id", true)
        .maybeSingle();
      if (error) throw error;
      return data as Settings | null;
    },
  });

  useEffect(() => {
    if (data && !form) {
      setForm({ ...data, time_1: hhmm(data.time_1), time_2: hhmm(data.time_2) });
    }
  }, [data, form]);

  const save = useMutation({
    mutationFn: async (v: Settings) => {
      const { error } = await supabase
        .from("reminder_settings")
        .update({
          enabled: v.enabled,
          frequency: v.frequency,
          time_1: v.time_1,
          time_2: v.time_2,
          weekday: v.weekday,
          body_text: v.body_text,
        })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lembretes atualizados");
      qc.invalidateQueries({ queryKey: ["reminder_settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: logs } = useQuery({
    queryKey: ["reminder_send_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminder_send_log")
        .select("id,recipient,pending_count,status,error_message,created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !form) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const link = typeof window !== "undefined" ? `${window.location.origin}/pendentes` : "/pendentes";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lembretes de approvals pendentes</CardTitle>
          <CardDescription>
            Envio automático de e-mail aos aprovadores com pendências. Se não houver approvals pendentes, nenhum e-mail é enviado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3">
            <Switch
              id="rem-enabled"
              checked={form.enabled}
              onCheckedChange={(v) => setForm({ ...form, enabled: v })}
            />
            <Label htmlFor="rem-enabled">Envio automático ativo</Label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Frequência</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => setForm({ ...form, frequency: v as Frequency })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diaria">Diária</SelectItem>
                  <SelectItem value="duas_vezes">2x ao dia</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.frequency === "semanal" && (
              <div className="space-y-1.5">
                <Label>Dia da semana</Label>
                <Select
                  value={String(form.weekday)}
                  onValueChange={(v) => setForm({ ...form, weekday: Number(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="rem-t1">{form.frequency === "duas_vezes" ? "1º horário" : "Horário"}</Label>
              <Input
                id="rem-t1"
                type="time"
                className="w-32"
                value={form.time_1}
                onChange={(e) => setForm({ ...form, time_1: e.target.value })}
              />
            </div>

            {form.frequency === "duas_vezes" && (
              <div className="space-y-1.5">
                <Label htmlFor="rem-t2">2º horário</Label>
                <Input
                  id="rem-t2"
                  type="time"
                  className="w-32"
                  value={form.time_2}
                  onChange={(e) => setForm({ ...form, time_2: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rem-body">Texto do corpo do e-mail</Label>
            <Textarea
              id="rem-body"
              rows={5}
              value={form.body_text}
              onChange={(e) => setForm({ ...form, body_text: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              O e-mail inclui automaticamente o botão “Pendentes comigo” apontando para: <span className="font-medium">{link}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
            {form.last_sent_at && (
              <span className="text-xs text-muted-foreground">
                Último envio: {new Date(form.last_sent_at).toLocaleString("pt-BR")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {logs && logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos envios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {logs.map((l) => (
              <div key={l.id} className="flex flex-wrap gap-x-3 border-b border-border/60 py-1 last:border-0">
                <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                <span>{l.recipient}</span>
                <span>{l.pending_count} pendência(s)</span>
                <span className={l.status === "failed" ? "text-destructive" : ""}>{l.status}</span>
                {l.error_message && <span className="text-destructive">{l.error_message}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
