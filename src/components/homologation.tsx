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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Camera, CheckCircle2, Loader2, QrCode, Image as ImageIcon, Keyboard, PackageMinus, PackagePlus, Sparkles } from "lucide-react";
import { generateExternalQr } from "@/lib/external-products.functions";
import { pushQrsToExternal } from "@/lib/push-external";
import { normalizeQrValue } from "@/components/myio-delivery-qr";

export const BOX_SIZES = [1, 10, 50, 100, 224] as const;

/* ---------------- QR scanner ---------------- */

export function QrScannerDialog({ onResult, label }: { onResult: (v: string) => void; label: string }) {
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

export function GalleryQrButton({ label, onResult }: { label: string; onResult: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          const url = URL.createObjectURL(file);
          try {
            const reader = new BrowserMultiFormatReader();
            const result = await reader.decodeFromImageUrl(url);
            onResult(result.getText());
          } catch {
            toast.error("Nenhum QR Code encontrado nesta imagem");
          } finally {
            URL.revokeObjectURL(url);
            setBusy(false);
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={busy}
        title={`${label} — escolher da galeria`}
        onClick={() => inputRef.current?.click()}
      >
        <ImageIcon className="h-4 w-4" />
      </Button>
    </>
  );
}

export function ManualQrDialog({ label, value, onResult }: { label: string; value: string; onResult: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setText(value);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon" title={`${label} — digitar manualmente`}>
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar manualmente</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="https://..." autoFocus />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (!text.trim()) return toast.error("Informe o valor do QR Code");
              onResult(text.trim());
              setOpen(false);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
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
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-56 shrink-0 text-sm">{label}</span>
      <Input className="min-w-40 flex-1" value={value} readOnly placeholder="https://..." />
      <ManualQrDialog label={label} value={value} onResult={onChange} />
      <GalleryQrButton label={label} onResult={onChange} />
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

/* ---------------- QR de caixa (geração automática) ---------------- */

export function useBoxQrCodes() {
  return useQuery({
    queryKey: ["box-qr-codes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("homologations").select("box_qr").not("box_qr", "is", null);
      if (error) throw error;
      return (data ?? []).map((d) => d.box_qr as string);
    },
  });
}

/** QR padrão da caixa: link do site / modelo da caixa / código incremental a partir de 1. */
export function genBoxQr(size: number, existingBoxQrs: string[] | undefined) {
  const prefix = `https://comprasmyio.lovable.app/caixa-${size}/`;
  let max = 0;
  for (const qr of existingBoxQrs ?? []) {
    if (qr.startsWith(prefix)) {
      const n = parseInt(qr.slice(prefix.length), 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${max + 1}`;
}

/* ---------------- Movimentação de produtos entre caixas ---------------- */

type UnitRow = { id: string; position: number; qr_value: string };
type HomologationRef = { id: string; release_id: string; material_id: string };

function useInvalidateHomologationData() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["homologations"] });
    qc.invalidateQueries({ queryKey: ["homologations-qr"] });
    qc.invalidateQueries({ queryKey: ["boxes-list"] });
    qc.invalidateQueries({ queryKey: ["box-qr-codes"] });
    qc.invalidateQueries({ queryKey: ["incomplete-boxes"] });
  };
}

async function moveUnitTo(unitId: string, homologationId: string, position: number) {
  const { error } = await supabase
    .from("homologation_units")
    .update({ homologation_id: homologationId, position })
    .eq("id", unitId);
  if (error) throw error;
}

/** Tira um produto de uma caixa: ele vira unitário (nova homologação unitária) e a caixa mantém os demais. */
function useRemoveUnitFromBox() {
  const invalidate = useInvalidateHomologationData();
  return useMutation({
    mutationFn: async ({ unit, box }: { unit: UnitRow; box: HomologationRef }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: hom, error } = await supabase
        .from("homologations")
        .insert({
          release_id: box.release_id,
          material_id: box.material_id,
          box_size: 1,
          box_qr: null,
          created_by: auth.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      await moveUnitTo(unit.id, hom.id, 1);
    },
    onSuccess: () => {
      toast.success("Produto retirado da caixa — agora ele é unitário.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Adiciona um produto unitário a uma caixa incompleta ou a uma caixa nova. */
function useAddUnitToBox() {
  const invalidate = useInvalidateHomologationData();
  return useMutation({
    mutationFn: async ({
      unit,
      source,
      targetHomologationId,
      newBox,
    }: {
      unit: UnitRow;
      source: HomologationRef;
      targetHomologationId?: string;
      newBox?: { size: number; qr: string };
    }) => {
      let homologationId = targetHomologationId;
      if (!homologationId) {
        if (!newBox) throw new Error("Selecione a caixa de destino");
        if (!newBox.qr) throw new Error("Informe o QR Code da nova caixa");
        // QR da caixa não pode ser repetido no banco
        const [{ data: dupBoxes, error: e1 }, { data: dupUnits, error: e2 }] = await Promise.all([
          supabase.from("homologations").select("box_qr").eq("box_qr", newBox.qr),
          supabase.from("homologation_units").select("qr_value").eq("qr_value", newBox.qr),
        ]);
        if (e1) throw e1;
        if (e2) throw e2;
        if ((dupBoxes?.length ?? 0) > 0 || (dupUnits?.length ?? 0) > 0) {
          throw new Error("QR Code da caixa já cadastrado no banco");
        }
        const { data: auth } = await supabase.auth.getUser();
        const { data: hom, error } = await supabase
          .from("homologations")
          .insert({
            release_id: source.release_id,
            material_id: source.material_id,
            box_size: newBox.size,
            box_qr: newBox.qr,
            created_by: auth.user?.id ?? null,
          })
          .select("id")
          .single();
        if (error) throw error;
        homologationId = hom.id;
      }
      const { data: last, error: posErr } = await supabase
        .from("homologation_units")
        .select("position")
        .eq("homologation_id", homologationId)
        .order("position", { ascending: false })
        .limit(1);
      if (posErr) throw posErr;
      await moveUnitTo(unit.id, homologationId, (last?.[0]?.position ?? 0) + 1);
      // Se a homologação de origem ficou vazia, tenta removê-la (sem falhar caso não permitido)
      const { data: left } = await supabase
        .from("homologation_units")
        .select("id")
        .eq("homologation_id", source.id)
        .limit(1);
      if (!left?.length) {
        await supabase.from("homologations").delete().eq("id", source.id);
      }
    },
    onSuccess: () => {
      toast.success("Produto adicionado à caixa.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Card de um produto homologado; quando está numa caixa, pode ser arrastado para fora ou removido pelo botão. */
function UnitQrCard({
  unit,
  box,
  extraAction,
}: {
  unit: UnitRow;
  box?: HomologationRef;
  extraAction?: React.ReactNode;
}) {
  const remove = useRemoveUnitFromBox();
  return (
    <div
      className="flex flex-col items-center gap-1 rounded border p-2"
      draggable={!!box}
      onDragStart={(e) => {
        if (!box) return;
        e.dataTransfer.setData("text/myio-unit", JSON.stringify({ unit, box }));
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <QrImage value={unit.qr_value} size={96} />
      <span className="text-xs font-medium">#{unit.position}</span>
      <span className="w-full break-all text-center text-[10px] text-muted-foreground">{unit.qr_value}</span>
      {box && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={remove.isPending}
          onClick={() => remove.mutate({ unit, box })}
        >
          <PackageMinus className="mr-1 h-3 w-3" /> Tirar da caixa
        </Button>
      )}
      {extraAction}
    </div>
  );
}

/** Área de destino para arrastar produtos para fora da caixa (viram unitários). */
function UnitaryDropZone() {
  const remove = useRemoveUnitFromBox();
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        try {
          const payload = JSON.parse(e.dataTransfer.getData("text/myio-unit")) as {
            unit?: UnitRow;
            box?: HomologationRef;
          };
          if (payload.unit && payload.box) remove.mutate({ unit: payload.unit, box: payload.box });
        } catch {
          /* arrasto inválido — ignora */
        }
      }}
      className={`flex items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors ${
        over ? "border-primary bg-primary/5 text-primary" : "border-muted-foreground/30 text-muted-foreground"
      }`}
    >
      <PackageMinus className="h-4 w-4 shrink-0" />
      Arraste um produto aqui para tirá-lo da caixa (ele vira unitário)
    </div>
  );
}

/** Diálogo para colocar um produto unitário dentro de uma caixa incompleta ou de uma caixa nova. */
function AddUnitToBoxDialog({
  unit,
  source,
  materialId,
  materialName,
}: {
  unit: UnitRow;
  source: HomologationRef;
  materialId: string;
  materialName: string;
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>("new");
  const [newSize, setNewSize] = useState<number>(10);
  const [newQr, setNewQr] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [scanStatus, setScanStatus] = useState<{ type: "full" | "selected" | "notfound" | "other"; msg: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const { data: existingBoxQrs } = useBoxQrCodes();
  const add = useAddUnitToBox();

  const { data: boxes, isLoading } = useQuery({
    queryKey: ["incomplete-boxes", materialId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homologations")
        .select("id, box_size, box_qr, created_at, homologation_units(id)")
        .eq("material_id", materialId)
        .gt("box_size", 1)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((b) => (b.homologation_units?.length ?? 0) < b.box_size);
    },
  });

  // Preenche o QR da nova caixa automaticamente (sem sobrescrever edição manual)
  useEffect(() => {
    if (open && (!newQr.trim() || newQr.startsWith("https://comprasmyio.lovable.app/caixa-"))) {
      setNewQr(genBoxQr(newSize, existingBoxQrs));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, newSize, existingBoxQrs]);

  /** Procura uma caixa existente pelo QR Code (câmera, galeria ou manual). */
  async function findBoxByQr(qr: string) {
    const v = normalizeQrValue(qr);
    if (!v || scanning) return;
    setScanValue(v);
    setScanning(true);
    setScanStatus(null);
    try {
      const { data, error } = await supabase
        .from("homologations")
        .select("id, box_size, box_qr, material_id, homologation_units(id)")
        .eq("box_qr", v)
        .maybeSingle();
      if (error) throw error;
      if (!data || data.box_size <= 1) {
        setScanStatus({ type: "notfound", msg: "Nenhuma caixa encontrada com este QR Code." });
        return;
      }
      if (data.material_id !== materialId) {
        setScanStatus({ type: "other", msg: "Esta caixa é de outro produto — escolha uma caixa deste material." });
        return;
      }
      const count = data.homologation_units?.length ?? 0;
      if (count >= data.box_size) {
        setScanStatus({ type: "full", msg: `Esta caixa está cheia (${count}/${data.box_size}). Escolha outra caixa.` });
        return;
      }
      setTarget(data.id);
      setScanStatus({ type: "selected", msg: `Caixa selecionada — ${count}/${data.box_size} produtos.` });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setScanning(false);
    }
  }

  function submit() {
    if (target === "new") {
      add.mutate(
        { unit, source, newBox: { size: newSize, qr: newQr.trim() } },
        { onSuccess: () => setOpen(false) },
      );
    } else {
      add.mutate({ unit, source, targetHomologationId: target }, { onSuccess: () => setOpen(false) });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setTarget("new");
          setNewSize(10);
          setNewQr("");
          setScanValue("");
          setScanStatus(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <PackagePlus className="mr-1 h-3 w-3" /> Adicionar à caixa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar à caixa — {materialName}</DialogTitle>
          <DialogDescription>
            Escolha uma caixa incompleta deste produto ou crie uma caixa nova (de qualquer tipo) para este produto
            unitário.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 rounded border p-3">
            <Label>Procurar caixa pelo QR Code</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="min-w-40 flex-1"
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    findBoxByQr(scanValue);
                  }
                }}
                placeholder="https://.../caixa-10/1"
              />
              <ManualQrDialog label="QR Code da caixa" value={scanValue} onResult={findBoxByQr} />
              <GalleryQrButton label="QR Code da caixa" onResult={findBoxByQr} />
              <QrScannerDialog label="QR Code da caixa" onResult={findBoxByQr} />
              <Button type="button" variant="secondary" disabled={scanning || !scanValue.trim()} onClick={() => findBoxByQr(scanValue)}>
                {scanning ? "Buscando..." : "Buscar"}
              </Button>
            </div>
            {scanStatus && (
              <p
                className={`text-xs ${
                  scanStatus.type === "selected"
                    ? "text-green-600"
                    : scanStatus.type === "full"
                      ? "text-amber-600"
                      : "text-destructive"
                }`}
              >
                {scanStatus.msg}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Leia o QR Code pela câmera, galeria ou digite manualmente. Caixa cheia é avisada; caixa incompleta é
              selecionada automaticamente.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Caixa de destino</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Criar nova caixa</SelectItem>
                {(boxes ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    Caixa de {b.box_size} — {b.homologation_units?.length ?? 0}/{b.box_size} produtos
                    {b.box_qr ? ` · ${b.box_qr}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isLoading && <p className="text-xs text-muted-foreground">Buscando caixas incompletas...</p>}
            {!isLoading && !(boxes ?? []).length && (
              <p className="text-xs text-muted-foreground">Nenhuma caixa incompleta deste produto — crie uma nova.</p>
            )}
          </div>

          {target === "new" && (
            <>
              <div className="space-y-2">
                <Label>Tipo da nova caixa</Label>
                <Select value={String(newSize)} onValueChange={(v) => setNewSize(Number(v))}>
                  <SelectTrigger className="w-full sm:w-[220px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BOX_SIZES.filter((s) => s > 1).map((s) => (
                      <SelectItem key={s} value={String(s)}>Caixa de {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 rounded border p-3">
                <QrField label={`QR Code da Caixa de ${newSize}:`} value={newQr} onChange={setNewQr} />
                <p className="text-xs text-muted-foreground">
                  Gerado automaticamente (site / modelo da caixa / código sequencial) — edite manualmente se necessário.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={add.isPending} onClick={submit}>
            {add.isPending ? "Adicionando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
  const { data: existing } = useHomologations(releaseId);
  const done = (existing ?? []).filter((h) => h.material_id === materialId);
  const alreadyHomologated = done.reduce((a, h) => a + (h.homologation_units?.length ?? 0), 0);
  const remaining = Math.max(quantity - alreadyHomologated, 0);
  const sizes = useMemo(() => BOX_SIZES.filter((s) => s <= Math.max(remaining, 1)), [remaining]);
  const [boxSize, setBoxSize] = useState<number>(1);
  const [boxQr, setBoxQr] = useState("");
  const [units, setUnits] = useState<string[]>([""]);
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);

  // QR da caixa é gerado automaticamente: link do site / modelo da caixa / código incremental (a partir de 1)
  const { data: existingBoxQrs } = useBoxQrCodes();

  const { data: profiles } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email").order("full_name");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string | null; email: string | null }[];
    },
  });
  const [responsible, setResponsible] = useState(userId);

  function changeSize(n: number) {
    setBoxSize(n);
    setUnits(Array.from({ length: n }, (_, i) => units[i] ?? ""));
    setBoxQr(n > 1 ? genBoxQr(n, existingBoxQrs) : "");
  }

  // Quando a lista de QRs de caixa carrega, recalcula o código gerado (sem sobrescrever edição manual)
  useEffect(() => {
    if (boxSize > 1 && (!boxQr.trim() || boxQr.startsWith("https://comprasmyio.lovable.app/caixa-"))) {
      setBoxQr(genBoxQr(boxSize, existingBoxQrs));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingBoxQrs]);

  useEffect(() => {
    const max = sizes[sizes.length - 1] ?? 1;
    if (boxSize > max) changeSize(max);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizes.join(",")]);

  function reset() {
    setBoxSize(1);
    setUnits([""]);
    setBoxQr("");
    setNotes("");
  }

  /** Gera QR codes novos na plataforma externa para os campos vazios (nascem no Estoque Myio). */
  async function generateViaApi() {
    const emptyIdx = units.map((u, i) => (u.trim() ? -1 : i)).filter((i) => i >= 0);
    if (!emptyIdx.length) return toast.error("Todos os campos de QR já estão preenchidos.");
    setGenerating(true);
    try {
      const next = [...units];
      for (const i of emptyIdx) {
        const r = await generateExternalQr({ data: { productType: materialName } });
        next[i] = r.qrUrl;
        setUnits([...next]);
      }
      toast.success(
        `${emptyIdx.length} QR code(s) gerado(s) na plataforma externa — já nascem no Estoque Myio.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar QR code via API");
    } finally {
      setGenerating(false);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      const filled = units.map((u) => normalizeQrValue(u));
      if (remaining <= 0) throw new Error("Todos os produtos deste item já foram homologados");
      if (boxSize > remaining) throw new Error(`Restam apenas ${remaining} produto(s) para homologar`);
      if (boxSize > 1 && !normalizeQrValue(boxQr)) throw new Error("Leia o QR Code da caixa");
      if (filled.some((u) => !u)) throw new Error("Preencha o QR Code de todos os produtos unitários");
      const uniq = new Set(filled);
      if (uniq.size !== filled.length) throw new Error("Existem QR Codes repetidos");
      if (!responsible) throw new Error("Selecione o responsável");

      // Não pode existir QR Code repetido no banco (caixas ou unidades já homologadas)
      const allQrs = boxSize > 1 ? [normalizeQrValue(boxQr), ...filled] : filled;
      const [{ data: dupUnits, error: dupUnitsErr }, { data: dupBoxes, error: dupBoxesErr }] = await Promise.all([
        supabase.from("homologation_units").select("qr_value").in("qr_value", allQrs),
        supabase.from("homologations").select("box_qr").in("box_qr", allQrs),
      ]);
      if (dupUnitsErr) throw dupUnitsErr;
      if (dupBoxesErr) throw dupBoxesErr;
      const existing = [
        ...(dupUnits ?? []).map((d) => d.qr_value),
        ...(dupBoxes ?? []).map((d) => d.box_qr).filter(Boolean),
      ];
      if (existing.length > 0) {
        throw new Error(`QR Code já cadastrado no banco: ${Array.from(new Set(existing)).join(", ")}`);
      }

      const { data: hom, error } = await supabase
        .from("homologations")
        .insert({
          release_id: releaseId,
          material_id: materialId,
          box_size: boxSize,
          box_qr: boxSize > 1 ? normalizeQrValue(boxQr) : null,
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

      // Entrada no Estoque (sempre no produto, mesmo quando embalado em caixa)
      const stockName = materialName;
      const { data: found } = await supabase
        .from("materials")
        .select("id")
        .eq("name", stockName)
        .eq("location", "almoxarifado")
        .maybeSingle();
      let stockMaterialId = found?.id as string | undefined;
      if (!stockMaterialId) {
        const { data: created, error: matErr } = await supabase
          .from("materials")
          .insert({ name: stockName, location: "almoxarifado", created_by: userId })
          .select("id")
          .single();
        if (matErr) throw new Error("Não foi possível criar o item no estoque: " + matErr.message);
        stockMaterialId = created.id;
      }
      const { error: stockErr } = await supabase.from("stock_movements").insert({
        material_id: stockMaterialId,
        quantity: boxSize,
        type: "entrada",
        reason: boxSize === 1 ? "Homologação — produto unitário" : `Homologação — caixa de ${boxSize}`,
        created_by: userId,
      });
      if (stockErr) throw stockErr;

      // Produto homologado entra no Estoque Myio: reflete o local na plataforma externa.
      pushQrsToExternal(filled, { location: "estoque" });
    },
    onSuccess: () => {
      const remainingAfter = remaining - boxSize;
      toast.success(
        remainingAfter > 0
          ? `Liberado! Restam ${remainingAfter} produto(s) — continue homologando nesta tela.`
          : "Produtos homologados e adicionados ao estoque",
      );
      qc.invalidateQueries({ queryKey: ["homologations"] });
      qc.invalidateQueries({ queryKey: ["box-qr-codes"] });
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["materials"] });
      qc.invalidateQueries({ queryKey: ["boxes-list"] });
      if (remainingAfter > 0) {
        // Mantém a tela aberta para liberar mais produtos sem reabrir o diálogo
        setUnits(Array.from({ length: boxSize }, () => ""));
        setBoxQr(boxSize > 1 ? genBoxQr(boxSize, existingBoxQrs) : "");
      } else {
        setOpen(false);
        reset();
      }
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
            Liberados: {quantity} · Já homologados: {alreadyHomologated} · Restantes: {remaining}
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
                <SelectTrigger className="w-full sm:w-[220px]"><SelectValue /></SelectTrigger>
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
            <div className="space-y-1 rounded border p-3">
              <QrField label={`QR Code da Caixa de ${boxSize}:`} value={boxQr} onChange={setBoxQr} />
              <p className="text-xs text-muted-foreground">
                Gerado automaticamente (site / modelo da caixa / código sequencial) — edite manualmente se necessário.
              </p>
            </div>
          )}

          <div className="max-h-[45vh] space-y-2 overflow-y-auto rounded border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
              <p className="text-xs text-muted-foreground">
                Preencha pela câmera, galeria ou manualmente — ou gere QR codes novos pela API.
              </p>
              <Button type="button" variant="outline" size="sm" disabled={generating} onClick={generateViaApi}>
                {generating ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-4 w-4" />
                )}
                Gerar via API
              </Button>
            </div>
            {units.map((u, i) => (
              <QrField
                key={i}
                label={`${i + 1} - QR Code do produto unitário:`}
                value={u}
                onChange={(v) => setUnits((prev) => prev.map((x, idx) => (idx === i ? v : x)))}
              />
            ))}
          </div>

          <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2">
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

          {!!done.filter((h) => (h.homologation_units?.length ?? 0) > 0).length && (
            <div className="space-y-1 rounded border p-3 text-sm">
              <p className="font-medium">Homologações anteriores deste produto</p>
              {done.filter((h) => (h.homologation_units?.length ?? 0) > 0).map((h) => (
                <div key={h.id} className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  {new Date(h.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} ·
                  {h.box_size === 1 ? " unitário" : ` caixa de ${h.box_size}`} · {h.homologation_units?.length ?? 0} produto(s)
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Concluir
            </Button>
            <Button type="submit" disabled={save.isPending || remaining <= 0} className="bg-blue-600 text-white hover:bg-blue-700">
              <QrCode className="mr-1 h-4 w-4" /> {save.isPending ? "Liberando..." : remaining - boxSize > 0 ? "Liberar e continuar" : "Liberar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- QR viewer (caixas homologadas) ---------------- */

function QrImage({ value, size = 128 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    import("qrcode").then((m) =>
      m.toDataURL(value, { width: size, margin: 1 }).then((url) => {
        if (alive) setSrc(url);
      }),
    );
    return () => {
      alive = false;
    };
  }, [value, size]);
  return src ? (
    <img src={src} width={size} height={size} alt={`QR Code ${value}`} className="rounded bg-white" />
  ) : (
    <div className="rounded bg-muted" style={{ width: size, height: size }} />
  );
}

export function StockQrDialog({ stockName, trigger }: { stockName: string; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const m = stockName.match(/^(.*) — Caixa de (\d+)$/);
  const baseName = m ? m[1] : stockName;
  const boxSize = m ? Number(m[2]) : 1;

  const { data, isLoading } = useQuery({
    queryKey: ["homologations-qr", baseName],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homologations")
        .select("id, release_id, material_id, box_size, box_qr, notes, created_at, materials(name), homologation_units(id, position, qr_value)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter(
        (h) =>
          (h.materials as { name: string } | null)?.name === baseName &&
          (h.homologation_units?.length ?? 0) > 0,
      );
    },
  });

  const boxes = data ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>QR Codes — {stockName}</DialogTitle>
          <DialogDescription>
            Todos os QR Codes homologados deste produto — unitários e os que estão dentro de caixas.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !boxes.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma homologação registrada para este item.</p>
        ) : (
          <div className="space-y-5">
            {boxes.map((h, idx) => {
              const units = [...(h.homologation_units ?? [])].sort((a, b) => a.position - b.position);
              return (
                <div key={h.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start gap-4">
                    {h.box_size > 1 && (
                      <div className="flex flex-col items-center gap-2">
                        {h.box_qr ? <QrImage value={h.box_qr} size={140} /> : (
                          <div className="flex h-[140px] w-[140px] items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                            sem QR
                          </div>
                        )}
                        <Badge variant="outline">Caixa {boxes.length - idx}</Badge>
                        {h.box_qr && (
                          <span className="max-w-[160px] break-all text-center text-[10px] text-muted-foreground">
                            {h.box_qr}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="text-sm text-muted-foreground">
                        {new Date(h.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} ·{" "}
                        {units.length} dispositivo(s)
                      </div>
                      <p className="text-sm font-medium">Vista explodida</p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
                        {units.map((u) => (
                          <UnitQrCard
                            key={u.id}
                            unit={{ id: u.id, position: u.position, qr_value: u.qr_value }}
                            box={
                              h.box_size > 1
                                ? { id: h.id, release_id: h.release_id, material_id: h.material_id }
                                : undefined
                            }
                            extraAction={
                              h.box_size === 1 ? (
                                <AddUnitToBoxDialog
                                  unit={{ id: u.id, position: u.position, qr_value: u.qr_value }}
                                  source={{ id: h.id, release_id: h.release_id, material_id: h.material_id }}
                                  materialId={h.material_id}
                                  materialName={baseName}
                                />
                              ) : undefined
                            }
                          />
                        ))}
                      </div>
                      {h.notes && <p className="text-sm text-muted-foreground">{h.notes}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
            <UnitaryDropZone />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Lista de caixas (separada do estoque de produtos) ---------------- */

type BoxRow = {
  id: string;
  release_id: string;
  material_id: string;
  box_size: number;
  box_qr: string | null;
  notes: string | null;
  created_at: string;
  materials: { name: string } | null;
  homologation_units: { id: string; position: number; qr_value: string }[];
};

export function BoxesCard() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["boxes-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homologations")
        .select("id, release_id, material_id, box_size, box_qr, notes, created_at, materials(name), homologation_units(id, position, qr_value)")
        .gt("box_size", 1)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BoxRow[];
    },
  });

  const rows = (data ?? []).filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (b.materials?.name ?? "").toLowerCase().includes(q) || (b.box_qr ?? "").toLowerCase().includes(q);
  });

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Caixas</CardTitle>
          <CardDescription>
            Cada caixa tem seu próprio QR Code. Os produtos dentro dela já entraram no estoque principal. Clique em uma
            caixa para ver os produtos e seus QR Codes.
          </CardDescription>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar caixa"
          className="w-full sm:w-[200px]"
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !rows.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma caixa homologada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caixa</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Produtos</TableHead>
                <TableHead>QR Code da caixa</TableHead>
                <TableHead>Homologada em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">
                    <BoxDetailsDialog
                      box={b}
                      trigger={
                        <button type="button" className="text-left hover:underline">
                          Caixa de {b.box_size}
                        </button>
                      }
                    />
                  </TableCell>
                  <TableCell>{b.materials?.name ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{b.homologation_units?.length ?? 0}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[280px] break-all text-xs text-muted-foreground">
                    {b.box_qr ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(b.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function BoxDetailsDialog({ box, trigger }: { box: BoxRow; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const units = [...(box.homologation_units ?? [])].sort((a, b) => a.position - b.position);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Caixa de {box.box_size} — {box.materials?.name ?? ""}
          </DialogTitle>
          <DialogDescription>QR Code da caixa e de cada produto dentro dela.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex flex-col items-center gap-2">
            {box.box_qr ? (
              <QrImage value={box.box_qr} size={140} />
            ) : (
              <div className="flex h-[140px] w-[140px] items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                sem QR
              </div>
            )}
            <Badge variant="outline">QR da caixa</Badge>
            {box.box_qr && (
              <span className="max-w-[160px] break-all text-center text-[10px] text-muted-foreground">{box.box_qr}</span>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium">Produtos na caixa ({units.length})</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {units.map((u) => (
                <UnitQrCard
                  key={u.id}
                  unit={{ id: u.id, position: u.position, qr_value: u.qr_value }}
                  box={{ id: box.id, release_id: box.release_id, material_id: box.material_id }}
                />
              ))}
            </div>
            <UnitaryDropZone />
            {box.notes && <p className="text-sm text-muted-foreground">{box.notes}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
