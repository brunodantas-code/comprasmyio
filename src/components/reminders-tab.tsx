import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

type Frequency = "diaria" | "duas_vezes" | "semanal";

type Reminder = {
  id: string;
  user_id: string;
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

const DEFAULT_BODY = "Você possui approvals pendentes de liberação. Acesse o sistema para analisá-los.";

const hhmm = (v: string | null | undefined) => (v ? v.slice(0, 5) : "09:00");

const frequencyLabel = (r: Reminder) => {
  if (r.frequency === "diaria") return "Diária";
  if (r.frequency === "duas_vezes") return "2x ao dia";
  return `Semanal — ${WEEKDAYS.find((d) => Number(d.value) === r.weekday)?.label ?? ""}`;
};

const timeLabel = (r: Reminder) =>
  r.frequency === "duas_vezes" ? `${r.time_1} e ${r.time_2}` : r.time_1;

export function RemindersTab() {
  const qc = useQueryClient();
  const [newUserId, setNewUserId] = useState("");
  const [editing, setEditing] = useState<Reminder | null>(null);

  const { data: profiles } = useQuery({
    queryKey: ["profiles", "reminders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,full_name,email").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reminders, isLoading } = useQuery({
    queryKey: ["user_reminders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_reminders")
        .select("id,user_id,enabled,frequency,time_1,time_2,weekday,body_text,last_sent_at")
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        time_1: hhmm(r.time_1),
        time_2: hhmm(r.time_2),
      })) as Reminder[];
    },
  });

  const create = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("user_reminders").insert({ user_id: userId, body_text: DEFAULT_BODY });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewUserId("");
      toast.success("Lembrete criado");
      qc.invalidateQueries({ queryKey: ["user_reminders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (r: Reminder) => {
      const { error } = await supabase
        .from("user_reminders")
        .update({
          enabled: r.enabled,
          frequency: r.frequency,
          time_1: r.time_1,
          time_2: r.time_2,
          weekday: r.weekday,
          body_text: r.body_text,
        })
        .eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditing(null);
      toast.success("Lembrete atualizado");
      qc.invalidateQueries({ queryKey: ["user_reminders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditing(null);
      toast.success("Lembrete excluído");
      qc.invalidateQueries({ queryKey: ["user_reminders"] });
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

  const link = typeof window !== "undefined" ? `${window.location.origin}/pendentes` : "/pendentes";
  const userLabel = (id: string) => {
    const p = profiles?.find((x) => x.id === id);
    return p?.full_name || p?.email || "—";
  };
  const used = new Set((reminders ?? []).map((r) => r.user_id));
  const available = (profiles ?? []).filter((p) => !used.has(p.id));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lembretes de approvals pendentes</CardTitle>
          <CardDescription>
            Um lembrete por usuário. Se não houver approvals pendentes para a pessoa, nenhum e-mail é enviado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Usuário</Label>
              <Select value={newUserId} onValueChange={setNewUserId}>
                <SelectTrigger className="w-64"><SelectValue placeholder="Selecione o usuário" /></SelectTrigger>
                <SelectContent>
                  {available.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => newUserId ? create.mutate(newUserId) : toast.error("Selecione o usuário")}
              disabled={create.isPending}
            >
              {create.isPending ? "Criando..." : "Criar lembrete"}
            </Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !reminders?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum lembrete cadastrado.</p>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <div className="hidden grid-cols-[2fr_2fr_1.5fr_1fr] gap-2 border-b border-t-0 bg-myio-green/20 px-3 py-2 text-center text-sm font-bold sm:grid">
                <span className="text-left">Usuário</span>
                <span>Frequência</span>
                <span>Horário</span>
                <span>Status</span>
              </div>
              {reminders.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setEditing(r)}
                  className="grid w-full grid-cols-2 gap-2 border-b border-border/60 px-3 py-2 text-left text-sm last:border-0 hover:bg-muted/50 sm:grid-cols-[2fr_2fr_1.5fr_1fr] sm:text-center"
                >
                  <span className="font-medium sm:text-left">{userLabel(r.user_id)}</span>
                  <span>{frequencyLabel(r)}</span>
                  <span>{timeLabel(r)}</span>
                  <span className={r.enabled ? "text-myio-green" : "text-muted-foreground"}>
                    {r.enabled ? "Ativo" : "Inativo"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          {editing && (
            <ReminderEditor
              key={editing.id}
              reminder={editing}
              name={userLabel(editing.user_id)}
              link={link}
              onSave={(v) => update.mutate(v)}
              onDelete={() => remove.mutate(editing.id)}
              saving={update.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

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

function ReminderEditor({
  reminder, name, link, onSave, onDelete, saving,
}: {
  reminder: Reminder;
  name: string;
  link: string;
  onSave: (r: Reminder) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Reminder>(reminder);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Lembrete — {name}</DialogTitle>
        <DialogDescription>Edite a frequência, os horários e o texto do e-mail deste lembrete.</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
          <span className="text-sm text-muted-foreground">Envio automático ativo</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Frequência</Label>
            <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as Frequency })}>
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
              <Select value={String(form.weekday)} onValueChange={(v) => setForm({ ...form, weekday: Number(v) })}>
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
            <Label>{form.frequency === "duas_vezes" ? "1º horário" : "Horário"}</Label>
            <Input type="time" className="w-32" value={form.time_1} onChange={(e) => setForm({ ...form, time_1: e.target.value })} />
          </div>

          {form.frequency === "duas_vezes" && (
            <div className="space-y-1.5">
              <Label>2º horário</Label>
              <Input type="time" className="w-32" value={form.time_2} onChange={(e) => setForm({ ...form, time_2: e.target.value })} />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Texto do corpo do e-mail</Label>
          <Textarea rows={4} value={form.body_text} onChange={(e) => setForm({ ...form, body_text: e.target.value })} />
          <p className="text-xs text-muted-foreground">
            O e-mail inclui automaticamente o botão “Pendentes comigo” apontando para: <span className="font-medium">{link}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => onSave(form)} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive"
                title="Excluir lembrete"
                aria-label="Excluir lembrete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir lembrete</AlertDialogTitle>
                <AlertDialogDescription>
                  Deseja excluir o lembrete de {name}? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Excluir definitivamente</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {form.last_sent_at && (
            <span className="text-xs text-muted-foreground">
              Último envio: {new Date(form.last_sent_at).toLocaleString("pt-BR")}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
