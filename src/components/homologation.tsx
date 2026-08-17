import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Camera, CheckCircle2, QrCode, Image as ImageIcon, Keyboard } from "lucide-react";

export const BOX_SIZES = [1, 10, 50, 100, 224] as const;

/* ---------------- QR scanner ---------------- */

function QrScannerDialog({ onResult, label }: { onResult: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    let controls: { stop: () => void } | undefined;
    let stream: MediaStream | undefined;
    const reader = new BrowserMultiFormatReader();
    (async () => {
      setError(null);
      setStarting(true);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("insecure");
        }
        // wait for the <video> to be mounted inside the dialog
        for (let i = 0; i < 40 && !videoRef.current; i++) {
          await new Promise((r) => setTimeout(r, 50));
        }
        if (stopped || !videoRef.current) return;

        // prefer the rear camera on phones, fall back to any camera
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setStarting(false);
        controls = await reader.decodeFromStream(stream, videoRef.current, (result) => {
          if (result && !stopped) {
            stopped = true;
            onResult(result.getText());
            controls?.stop();
            stream?.getTracks().forEach((t) => t.stop());
            setOpen(false);
          }
        });
      } catch (e) {
        setStarting(false);
        const err = e as { name?: string; message?: string };
        if (!window.isSecureContext || err.message === "insecure") {
          setError("A câmera só funciona em conexão segura (https). Abra o app pelo link https.");
        } else if (err.name === "NotAllowedError") {
          setError("Permissão de câmera negada. Toque no cadeado da barra de endereço e permita a câmera.");
        } else if (err.name === "NotFoundError") {
          setError("Nenhuma câmera encontrada neste dispositivo.");
        } else if (err.name === "NotReadableError") {
          setError("A câmera está em uso por outro app. Feche-o e tente novamente.");
        } else {
          setError("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
        }
      }
    })();
    return () => {
      stopped = true;
      controls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, onResult]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon" title={label}>
          <Camera className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>Aponte a câmera para o QR Code. O link é extraído automaticamente.</DialogDescription>
        </DialogHeader>
        {error ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => { setError(null); setOpen(false); setTimeout(() => setOpen(true), 100); }}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="aspect-square w-full rounded border bg-black object-cover"
              muted
              autoPlay
              playsInline
            />
            {starting && <p className="text-sm text-muted-foreground">Iniciando câmera...</p>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function QrField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-56 shrink-0 text-sm">{label}</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://..." />
      <QrScannerDialog label={label} onResult={onChange} />
    </div>
  );
}

/* ---------------- Homologation data ---------------- */

export function useHomologations(releaseId?: string) {
  return useQuery({
    queryKey: ["homologations", releaseId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("homologations")
        .select("id, release_id, material_id, box_size, box_qr, responsible_id, notes, created_at, homologation_units(id, position, qr_value)")
        .order("created_at", { ascending: false });
      if (releaseId) q = q.eq("release_id", releaseId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ---------------- Homologate dialog ---------------- */

export function HomologateDialog({
  releaseId,
  materialId,
  materialName,
  quantity,
  userId,
  trigger,
}: {
  releaseId: string;
  materialId: string;
  materialName: string;
  quantity: number;
  userId: string;
  trigger: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const sizes = useMemo(() => BOX_SIZES.filter((s) => s <= Math.max(quantity, 1)), [quantity]);
  const [boxSize, setBoxSize] = useState<number>(sizes[sizes.length - 1] ?? 1);
  const [boxQr, setBoxQr] = useState("");
  const [units, setUnits] = useState<string[]>([""]);
  const [notes, setNotes] = useState("");

  const { data: profiles } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email").order("full_name");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string | null; email: string | null }[];
    },
  });
  const [responsible, setResponsible] = useState(userId);

  const { data: existing } = useHomologations(releaseId);
  const done = (existing ?? []).filter((h) => h.material_id === materialId);
  const alreadyHomologated = done.reduce((a, h) => a + (h.homologation_units?.length ?? 0), 0);

  function changeSize(n: number) {
    setBoxSize(n);
    setUnits(Array.from({ length: n }, (_, i) => units[i] ?? ""));
  }

  function reset() {
    setBoxQr("");
    setNotes("");
    setUnits(Array.from({ length: boxSize }, () => ""));
  }

  const save = useMutation({
    mutationFn: async () => {
      const filled = units.map((u) => u.trim());
      if (boxSize > 1 && !boxQr.trim()) throw new Error("Leia o QR Code da caixa");
      if (filled.some((u) => !u)) throw new Error("Preencha o QR Code de todos os produtos unitários");
      const uniq = new Set(filled);
      if (uniq.size !== filled.length) throw new Error("Existem QR Codes repetidos");
      if (!responsible) throw new Error("Selecione o responsável");

      const { data: hom, error } = await supabase
        .from("homologations")
        .insert({
          release_id: releaseId,
          material_id: materialId,
          box_size: boxSize,
          box_qr: boxSize > 1 ? boxQr.trim() : null,
          responsible_id: responsible,
          notes: notes.trim() || null,
          created_by: userId,
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: unitsErr } = await supabase
        .from("homologation_units")
        .insert(filled.map((qr_value, i) => ({ homologation_id: hom.id, position: i + 1, qr_value })));
      if (unitsErr) throw unitsErr;
    },
    onSuccess: () => {
      toast.success("Produtos homologados e liberados");
      qc.invalidateQueries({ queryKey: ["homologations"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Homologar — {materialName}</DialogTitle>
          <DialogDescription>
            Liberados: {quantity} · Já homologados: {alreadyHomologated}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label>Tipo de caixa</Label>
              <Select value={String(boxSize)} onValueChange={(v) => changeSize(Number(v))}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sizes.map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {s === 1 ? "Unitário (1 produto)" : `Caixa de ${s}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline">{boxSize} QR Code(s) de produto</Badge>
          </div>

          {boxSize > 1 && (
            <div className="rounded border p-3">
              <QrField label={`QR Code da Caixa de ${boxSize}:`} value={boxQr} onChange={setBoxQr} />
            </div>
          )}

          <div className="max-h-[45vh] space-y-2 overflow-y-auto rounded border p-3">
            {units.map((u, i) => (
              <QrField
                key={i}
                label={`${i + 1} - QR Code do produto unitário:`}
                value={u}
                onChange={(v) => setUnits((prev) => prev.map((x, idx) => (idx === i ? v : x)))}
              />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={responsible} onValueChange={setResponsible}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(profiles ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name || p.email || p.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hom-notes">Observações</Label>
              <Textarea id="hom-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          {!!done.length && (
            <div className="space-y-1 rounded border p-3 text-sm">
              <p className="font-medium">Homologações anteriores deste produto</p>
              {done.map((h) => (
                <div key={h.id} className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  {new Date(h.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} ·
                  {h.box_size === 1 ? " unitário" : ` caixa de ${h.box_size}`} · {h.homologation_units?.length ?? 0} produto(s)
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={save.isPending} className="bg-blue-600 text-white hover:bg-blue-700">
              <QrCode className="mr-1 h-4 w-4" /> {save.isPending ? "Liberando..." : "Liberar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
