import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { AlertTriangle, CloudDownload, HardHat, RefreshCw } from "lucide-react";

export type ExternalState = {
  id: string;
  code: string;
  product_type: string | null;
  location: string;
  status: string | null;
  technician: string | null;
  qr_value: string | null;
  last_change_at: string;
};

export const EXTERNAL_LOCATION_LABELS: Record<string, string> = {
  estoque: "Estoque",
  cliente: "Cliente",
  tecnico: "Técnico",
  perdido: "Perdido",
  avariado: "Itens Avariados",
};

export const EXTERNAL_LOCATION_CLASSES: Record<string, string> = {
  estoque: "border-green-300 bg-green-100 text-green-800",
  cliente: "border-blue-300 bg-blue-100 text-blue-800",
  tecnico: "border-purple-300 bg-purple-100 text-purple-800",
  perdido: "border-red-300 bg-red-100 text-red-800",
  avariado: "border-amber-300 bg-amber-100 text-amber-800",
};

export const EXTERNAL_STATUS_LABELS: Record<string, string> = {
  instalado: "Instalado",
  parado: "Parado",
};

function fmt(d: string) {
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function useExternalStates(location?: string) {
  return useQuery({
    queryKey: ["external-product-states", location ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("external_product_states")
        .select("id, code, product_type, location, status, technician, qr_value, last_change_at")
        .order("last_change_at", { ascending: false });
      if (location) q = q.eq("location", location);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ExternalState[];
    },
  });
}

function ExternalStateTable({ states }: { states: ExternalState[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Produto</TableHead>
          <TableHead>Código do QR</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Atualizado em</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {states.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">{s.product_type ?? "—"}</TableCell>
            <TableCell>
              <Badge variant="outline" className="font-mono text-[11px]">
                {s.code}
              </Badge>
            </TableCell>
            <TableCell>
              {s.status ? (
                <Badge variant="outline">{EXTERNAL_STATUS_LABELS[s.status] ?? s.status}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{fmt(s.last_change_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Card de status da sincronização automática + botão manual. Renderizado na aba Checar QR Code. */
export function ExternalSyncCard() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const { data: sync } = useQuery({
    queryKey: ["external-sync-state"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("external_sync_state")
        .select("last_run_at, last_status, last_message, total_items")
        .eq("id", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: states } = useExternalStates();

  async function runNow() {
    setRunning(true);
    try {
      const res = await fetch("/api/public/hooks/sync-product-status", {
        method: "POST",
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        skipped?: boolean;
        total?: number;
        changed?: number;
        error?: string;
      };
      if (!res.ok || body.ok === false) throw new Error(body.error ?? `Falha (${res.status})`);
      toast.success(
        body.skipped
          ? "Já existe uma sincronização em andamento."
          : `Sincronizado: ${body.total ?? 0} produto(s), ${body.changed ?? 0} mudança(s).`,
      );
      qc.invalidateQueries({ queryKey: ["external-product-states"] });
      qc.invalidateQueries({ queryKey: ["external-sync-state"] });
      qc.invalidateQueries({ queryKey: ["unit-products"] });
      qc.invalidateQueries({ queryKey: ["damaged-items"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao sincronizar.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudDownload className="h-5 w-5" />
          Sincronização com a plataforma externa
        </CardTitle>
        <CardDescription>
          A cada 5 minutos o sistema consulta o status dos QR codes no programa principal e reflete aqui: estoque,
          cliente (instalado/parado), técnico, perdido e avariado.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <Button onClick={runNow} disabled={running}>
          <RefreshCw className={`mr-1 h-4 w-4 ${running ? "animate-spin" : ""}`} />
          {running ? "Sincronizando..." : "Sincronizar agora"}
        </Button>
        <Badge variant="outline">{states?.length ?? 0} produto(s) rastreado(s)</Badge>
        {sync?.last_run_at && (
          <Badge
            variant="outline"
            className={
              sync.last_status === "ok"
                ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                : sync.last_status === "parcial"
                  ? "border-amber-300 bg-amber-100 text-amber-800"
                  : "border-red-300 bg-red-100 text-red-800"
            }
          >
            Última sync: {fmt(sync.last_run_at)}
          </Badge>
        )}
        {sync?.last_message && <span className="text-xs text-muted-foreground">{sync.last_message}</span>}
      </CardContent>
    </Card>
  );
}

/** Produtos que a plataforma externa reporta como estando com técnicos, separados por técnico. */
export function ExternalTechnicianCard() {
  const { data: states, isLoading } = useExternalStates("tecnico");

  const groups = new Map<string, ExternalState[]>();
  for (const s of states ?? []) {
    const tech = s.technician?.trim() || "Sem técnico informado";
    const list = groups.get(tech) ?? [];
    list.push(s);
    groups.set(tech, list);
  }
  const entries = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardHat className="h-5 w-5" />
          Com os técnicos — plataforma externa
        </CardTitle>
        <CardDescription>
          Produtos que o programa principal reporta como estando com técnicos, separados por técnico (sincronização
          automática a cada 5 minutos).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !entries.length ? (
          <p className="text-sm text-muted-foreground">Nenhum produto com técnico na plataforma externa.</p>
        ) : (
          entries.map(([tech, list]) => (
            <div key={tech} className="space-y-2 rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{tech}</span>
                <Badge variant="outline">{list.length} item(ns)</Badge>
                <Badge variant="outline" className="border-purple-300 bg-purple-100 text-purple-800">
                  Plataforma externa
                </Badge>
              </div>
              <ExternalStateTable states={list} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/** Produtos que a plataforma externa reporta como perdidos. */
export function ExternalLostCard() {
  const { data: states, isLoading } = useExternalStates("perdido");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Perdidos — plataforma externa
        </CardTitle>
        <CardDescription>
          Produtos que o programa principal reporta como perdidos (sincronização automática a cada 5 minutos).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !states?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum produto perdido na plataforma externa.</p>
        ) : (
          <ExternalStateTable states={states} />
        )}
      </CardContent>
    </Card>
  );
}
