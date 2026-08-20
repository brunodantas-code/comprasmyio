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
import { Camera, CheckCircle2, QrCode, Image as ImageIcon, Keyboard } from "lucide-react";

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
  }

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

  const save = useMutation({
    mutationFn: async () => {
      const filled = units.map((u) => u.trim());
      if (remaining <= 0) throw new Error("Todos os produtos deste item já foram homologados");
      if (boxSize > remaining) throw new Error(`Restam apenas ${remaining} produto(s) para homologar`);
      if (boxSize > 1 && !boxQr.trim()) throw new Error("Leia o QR Code da caixa");
      if (filled.some((u) => !u)) throw new Error("Preencha o QR Code de todos os produtos unitários");
      const uniq = new Set(filled);
      if (uniq.size !== filled.length) throw new Error("Existem QR Codes repetidos");
      if (!responsible) throw new Error("Selecione o responsável");

      // Não pode existir QR Code repetido no banco (caixas ou unidades já homologadas)
      const allQrs = boxSize > 1 ? [boxQr.trim(), ...filled] : filled;
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

      // Entrada no Estoque — Almoxarifado (sempre no produto, mesmo quando embalado em caixa)
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
        if (matErr) throw new Error("Não foi possível criar o item no estoque do almoxarifado: " + matErr.message);
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
    },
    onSuccess: () => {
      toast.success("Produtos homologados e adicionados ao estoque do almoxarifado");
      qc.invalidateQueries({ queryKey: ["homologations"] });
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["materials"] });
      qc.invalidateQueries({ queryKey: ["boxes-list"] });
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
            <Button type="submit" disabled={save.isPending || remaining <= 0} className="bg-blue-600 text-white hover:bg-blue-700">
              <QrCode className="mr-1 h-4 w-4" /> {save.isPending ? "Liberando..." : "Liberar"}
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
        .select("id, box_size, box_qr, notes, created_at, materials(name), homologation_units(position, qr_value)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((h) => (h.materials as { name: string } | null)?.name === baseName);
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
                          <div key={u.position} className="flex flex-col items-center gap-1 rounded border p-2">
                            <QrImage value={u.qr_value} size={96} />
                            <span className="text-xs font-medium">#{u.position}</span>
                            <span className="w-full break-all text-center text-[10px] text-muted-foreground">
                              {u.qr_value}
                            </span>
                          </div>
                        ))}
                      </div>
                      {h.notes && <p className="text-sm text-muted-foreground">{h.notes}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Lista de caixas (separada do estoque de produtos) ---------------- */

type BoxRow = {
  id: string;
  box_size: number;
  box_qr: string | null;
  notes: string | null;
  created_at: string;
  materials: { name: string } | null;
  homologation_units: { position: number; qr_value: string }[];
};

export function BoxesCard() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["boxes-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homologations")
        .select("id, box_size, box_qr, notes, created_at, materials(name), homologation_units(position, qr_value)")
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
                <div key={u.position} className="flex flex-col items-center gap-1 rounded border p-2">
                  <QrImage value={u.qr_value} size={96} />
                  <span className="text-xs font-medium">#{u.position}</span>
                  <span className="w-full break-all text-center text-[10px] text-muted-foreground">{u.qr_value}</span>
                </div>
              ))}
            </div>
            {box.notes && <p className="text-sm text-muted-foreground">{box.notes}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
