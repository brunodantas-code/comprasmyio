import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QrScannerDialog, GalleryQrButton, ManualQrDialog } from "@/components/homologation";
import { Boxes, QrCode, X } from "lucide-react";
import { toast } from "sonner";

export type LinkedQr = {
  qr_value: string;
  box_qr: string | null;
  homologation_unit_id: string | null;
  /** Material dono do QR (quando homologado). */
  material_id?: string | null;
};

/**
 * Normaliza um QR code lido: links podem vir acompanhados de parâmetros
 * (?query) ou âncoras (#hash) — apenas o código em si é relevante.
 */
export function normalizeQrValue(code: string): string {
  let v = code.trim();
  const hashIdx = v.indexOf("#");
  if (hashIdx >= 0) v = v.slice(0, hashIdx);
  const queryIdx = v.indexOf("?");
  if (queryIdx >= 0) v = v.slice(0, queryIdx);
  return v.trim();
}

/** Extrai o código sequencial (ex.: 1_1_4_15) de um QR no formato https://produto.myio.com.br/<codigo>?... */
export function extractQrCode(value: string): string | null {
  const m = /produto\.myio\.com\.br\/([^?\s#]+)/i.exec(value);
  if (m?.[1]) return m[1];
  const t = value.trim();
  return /^\d+(?:_\d+)+$/.test(t) ? t : null;
}

/** Rótulos/cores do local do QR na plataforma externa (inclui transporte/expedição). */
export const QR_LOCATION_LABELS: Record<string, string> = {
  estoque: "Estoque",
  expedicao: "Expedição",
  transporte: "Transporte",
  cliente: "Cliente",
  tecnico: "Técnico",
  perdido: "Perdido",
  avariado: "Itens Avariados",
};

export const QR_LOCATION_CLASSES: Record<string, string> = {
  estoque: "border-green-300 bg-green-100 text-green-800",
  expedicao: "border-blue-300 bg-blue-100 text-blue-800",
  transporte: "border-amber-300 bg-amber-100 text-amber-800",
  cliente: "border-emerald-300 bg-emerald-100 text-emerald-800",
  tecnico: "border-purple-300 bg-purple-100 text-purple-800",
  perdido: "border-red-300 bg-red-100 text-red-800",
  avariado: "border-orange-300 bg-orange-100 text-orange-800",
};

/** Resolve um código lido: se for QR de caixa, retorna todos os QR unitários dentro dela. */
export async function resolveQrCode(code: string): Promise<LinkedQr[]> {
  const value = normalizeQrValue(code);
  if (!value) return [];

  const { data: box } = await supabase
    .from("homologations")
    .select("id, box_qr, material_id, homologation_units(id, qr_value, position)")
    .eq("box_qr", value)
    .maybeSingle();

  if (box) {
    const units = ((box.homologation_units ?? []) as { id: string; qr_value: string; position: number }[]).sort(
      (a, b) => a.position - b.position,
    );
    if (units.length === 0) throw new Error("Esta caixa não possui produtos vinculados.");
    return units.map((u) => ({
      qr_value: u.qr_value,
      box_qr: value,
      homologation_unit_id: u.id,
      material_id: box.material_id as string,
    }));
  }

  const { data: unit } = await supabase
    .from("homologation_units")
    .select("id, qr_value, homologations(box_qr, box_size, material_id)")
    .eq("qr_value", value)
    .maybeSingle();

  if (unit) {
    const hom = unit.homologations as { box_qr: string | null; box_size: number; material_id: string } | null;
    return [
      {
        qr_value: unit.qr_value,
        box_qr: hom && hom.box_size > 1 ? hom.box_qr : null,
        homologation_unit_id: unit.id,
        material_id: hom?.material_id ?? null,
      },
    ];
  }

  return [{ qr_value: value, box_qr: null, homologation_unit_id: null, material_id: null }];
}

/** QR codes que já saíram do estoque (baixa de pedido ou movimentação de estoque). */
async function alreadyUsed(values: string[]) {
  const [{ data: deliveries }, { data: movements }] = await Promise.all([
    supabase.from("myio_delivery_qrs").select("qr_value").in("qr_value", values),
    supabase.from("stock_movement_qrs").select("qr_value").in("qr_value", values),
  ]);
  return new Set([
    ...(deliveries ?? []).map((r) => r.qr_value),
    ...(movements ?? []).map((r) => r.qr_value),
  ]);
}

type AvailableBox = {
  id: string;
  box_qr: string;
  box_size: number;
  total: number;
  free: { id: string; qr_value: string }[];
};

function BoxPickerDialog({
  materialId,
  maxSelectable,
  onSelect,
}: {
  materialId: string;
  maxSelectable?: number | null;
  onSelect: (box: AvailableBox) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: boxes, isLoading } = useQuery({
    queryKey: ["available-boxes", materialId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homologations")
        .select("id, box_qr, box_size, homologation_units(id, qr_value, position)")
        .eq("material_id", materialId)
        .not("box_qr", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const allQrs = (data ?? []).flatMap((b) =>
        ((b.homologation_units ?? []) as { qr_value: string }[]).map((u) => u.qr_value),
      );
      const used = allQrs.length ? await alreadyUsed(allQrs) : new Set<string>();
      return (data ?? []).map((b) => {
        const units = ((b.homologation_units ?? []) as { id: string; qr_value: string; position: number }[]).sort(
          (a, b2) => a.position - b2.position,
        );
        const free = units.filter((u) => !used.has(u.qr_value));
        return { id: b.id, box_qr: b.box_qr as string, box_size: b.box_size as number, total: units.length, free };
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="icon" title="Selecionar caixa existente" onClick={() => setOpen(true)}>
        <Boxes className="h-4 w-4" />
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar caixa</DialogTitle>
          <DialogDescription>
            Caixas homologadas deste produto. Ao selecionar, todos os QR codes da caixa são vinculados
            automaticamente.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !boxes?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma caixa homologada para este produto.</p>
        ) : (
          <ul className="space-y-2">
            {boxes.map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                <Boxes className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="break-all text-sm font-medium">{b.box_qr}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.free.length} de {b.total} produto(s) disponíveis
                  </p>
                </div>
                {b.free.length === 0 ? (
                  <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800">
                    Indisponível
                  </Badge>
                ) : maxSelectable != null && maxSelectable >= 0 && b.free.length > maxSelectable ? (
                  <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800">
                    Excede o necessário ({maxSelectable})
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onSelect(b);
                      setOpen(false);
                    }}
                  >
                    Selecionar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function QrLinkPicker({
  value,
  onChange,
  required,
  materialId,
  requiredCount,
  stockOnly,
}: {
  value: LinkedQr[];
  onChange: (v: LinkedQr[]) => void;
  required?: boolean;
  materialId?: string | null;
  /** Quantidade exata de QR codes que devem ser vinculados (1 por produto). */
  requiredCount?: number;
  /**
   * Quando true, só aceita QR codes que façam parte do estoque:
   * precisam estar homologados (cadastrados) e ainda não terem saído em
   * nenhuma baixa/movimentação. Códigos "inventados" são rejeitados.
   */
  stockOnly?: boolean;
}) {
  const remaining = requiredCount != null ? requiredCount - value.length : null;
  const complete = remaining === 0;

  const limitMsg = () =>
    `Quantidade máxima atingida (${requiredCount}). Remova um QR code para trocar.`;

  const add = async (code: string) => {
    try {
      if (complete) {
        toast.error(limitMsg());
        return;
      }
      const resolved = await resolveQrCode(code);
      if (!resolved.length) return;
      if (stockOnly) {
        const notInStock = resolved.filter((r) => !r.homologation_unit_id);
        if (notInStock.length) {
          toast.error(
            "QR code não encontrado no estoque. Só é permitido vincular QR codes homologados que constem no estoque.",
          );
          return;
        }
        if (materialId) {
          const wrongMaterial = resolved.filter((r) => r.material_id && r.material_id !== materialId);
          if (wrongMaterial.length) {
            toast.error("Este QR code pertence a outro produto — vincule apenas QR codes deste material.");
            return;
          }
        }
      }
      const used = await alreadyUsed(resolved.map((r) => r.qr_value));
      const existing = new Set(value.map((v) => v.qr_value));
      const fresh = resolved.filter((r) => !existing.has(r.qr_value) && !used.has(r.qr_value));
      if (!fresh.length) {
        toast.error(
          stockOnly
            ? "Este QR code já saiu do estoque (vinculado a outra baixa/movimentação)."
            : "Este QR code já foi vinculado a uma baixa.",
        );
        return;
      }
      if (remaining != null && fresh.length > remaining) {
        toast.error(
          fresh.length > 1
            ? `Esta caixa tem ${fresh.length} produto(s), mas faltam apenas ${remaining}. Vincule QR codes unitários ou ajuste a quantidade.`
            : limitMsg(),
        );
        return;
      }
      onChange([...value, ...fresh]);
      toast.success(
        fresh.length > 1 ? `Caixa vinculada: ${fresh.length} QR codes unitários.` : "QR code vinculado.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao ler o QR code");
    }
  };

  const addBox = (box: AvailableBox) => {
    if (complete) {
      toast.error(limitMsg());
      return;
    }
    const existing = new Set(value.map((v) => v.qr_value));
    const fresh = box.free
      .filter((u) => !existing.has(u.qr_value))
      .map((u) => ({ qr_value: u.qr_value, box_qr: box.box_qr, homologation_unit_id: u.id }));
    if (!fresh.length) {
      toast.error("Esta caixa já foi vinculada a uma baixa.");
      return;
    }
    if (remaining != null && fresh.length > remaining) {
      toast.error(
        `Esta caixa tem ${fresh.length} produto(s) disponíveis, mas faltam apenas ${remaining}. Ajuste a quantidade ou vincule unitários.`,
      );
      return;
    }
    onChange([...value, ...fresh]);
    toast.success(`Caixa vinculada: ${fresh.length} QR codes unitários.`);
  };

  const boxes = [...new Set(value.map((v) => v.box_qr).filter(Boolean))] as string[];

  return (
    <div className="space-y-2">
      <Label>QR codes vinculados {required ? "(obrigatório)" : "(opcional)"}</Label>
      {requiredCount != null && (
        <p
          className={`text-xs font-medium ${
            complete
              ? "text-emerald-700"
              : remaining != null && remaining < 0
                ? "text-red-700"
                : "text-muted-foreground"
          }`}
        >
          {complete
            ? "Todos os QR codes vinculados."
            : remaining != null && remaining < 0
              ? `Remova ${-remaining} QR code(s) — a quantidade é ${requiredCount}.`
              : `Vinculados ${value.length} de ${requiredCount} — um QR code por produto.`}
        </p>
      )}
      {!complete && (
        <div className="flex flex-wrap gap-2">
          <ManualQrDialog label="Digitar código" value="" onResult={add} />
          <GalleryQrButton label="Galeria" onResult={add} />
          <QrScannerDialog label="Câmera" onResult={add} />
          {materialId && (
            <BoxPickerDialog materialId={materialId} maxSelectable={remaining} onSelect={addBox} />
          )}
        </div>
      )}
      {value.length > 0 && (
        <div className="space-y-2 rounded-md border p-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge
              variant="outline"
              className={
                requiredCount == null
                  ? undefined
                  : complete
                    ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                    : remaining != null && remaining < 0
                      ? "border-red-300 bg-red-100 text-red-800"
                      : "border-amber-300 bg-amber-100 text-amber-800"
              }
            >
              {requiredCount != null ? `${value.length} de ${requiredCount}` : `${value.length} unidade(s)`}
            </Badge>
            {boxes.map((b) => (
              <Badge key={b} variant="outline" className="max-w-[220px] gap-1 truncate border-blue-300 bg-blue-100 text-blue-800">
                <Boxes className="h-3 w-3" /> caixa
              </Badge>
            ))}
          </div>
          <ul className="max-h-40 space-y-1 overflow-y-auto">
            {value.map((v) => (
              <li key={v.qr_value} className="flex items-center gap-2 text-xs">
                <QrCode className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 break-all">{v.qr_value}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onChange(value.filter((x) => x.qr_value !== v.qr_value))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DeliveryPhoto({ path }: { path: string }) {
  const { data } = useQuery({
    queryKey: ["myio-delivery-photo", path],
    queryFn: async () => {
      if (path.startsWith("http")) return path;
      const { data } = await supabase.storage.from("assembly-photos").createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    },
  });
  if (!data) return null;
  return <img src={data} alt="Foto da baixa do material" className="max-h-56 rounded border object-contain" />;
}

function fmt(d: string) {
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function ItemDeliveriesDialog({
  orderItemId,
  product,
  trigger,
}: {
  orderItemId: string;
  product: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["myio-item-delivery-details", orderItemId],
    enabled: open,
    queryFn: async () => {
      const { data: deliveries, error } = await supabase
        .from("myio_item_deliveries")
        .select("id, quantity, photo_url, created_at")
        .eq("order_item_id", orderItemId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const ids = (deliveries ?? []).map((d) => d.id);
      let qrs: { delivery_id: string; qr_value: string; box_qr: string | null }[] = [];
      if (ids.length) {
        const { data: q } = await supabase
          .from("myio_delivery_qrs")
          .select("delivery_id, qr_value, box_qr")
          .in("delivery_id", ids);
        qrs = q ?? [];
      }
      // Local atual de cada QR na plataforma externa (sincronização de 5 min).
      const codes = qrs.map((q) => extractQrCode(q.qr_value)).filter((c): c is string => !!c);
      let states: { code: string; location: string; status: string | null }[] = [];
      if (codes.length) {
        const { data: st } = await supabase
          .from("external_product_states")
          .select("code, location, status")
          .in("code", codes);
        states = st ?? [];
      }
      return (deliveries ?? []).map((d) => ({
        ...d,
        qrs: qrs
          .filter((q) => q.delivery_id === d.id)
          .map((q) => ({
            ...q,
            state: states.find((s) => s.code === extractQrCode(q.qr_value)) ?? null,
          })),
      }));
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </span>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Baixas de {product}</DialogTitle>
          <DialogDescription>QR codes e fotos vinculados a este item do pedido.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma baixa registrada.</p>
        ) : (
          <div className="space-y-5">
            {data.map((d) => {
              const boxes = [...new Set(d.qrs.map((q) => q.box_qr).filter(Boolean))] as string[];
              return (
                <div key={d.id} className="space-y-2 rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{d.quantity} un.</Badge>
                    <span className="text-xs text-muted-foreground">{fmt(d.created_at)}</span>
                  </div>
                  {d.photo_url && <DeliveryPhoto path={d.photo_url} />}
                  {boxes.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Caixas</p>
                      {boxes.map((b) => (
                        <p key={b} className="break-all text-xs text-muted-foreground">{b}</p>
                      ))}
                    </div>
                  )}
                  {d.qrs.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-xs font-medium">QR codes ({d.qrs.length})</p>
                      <ul className="space-y-1">
                        {d.qrs.map((q) => (
                          <li key={q.qr_value} className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="min-w-0 flex-1 break-all">{q.qr_value}</span>
                            {q.state && (
                              <Badge variant="outline" className={QR_LOCATION_CLASSES[q.state.location] ?? ""}>
                                {QR_LOCATION_LABELS[q.state.location] ?? q.state.location}
                                {q.state.location === "cliente" && q.state.status
                                  ? ` · ${q.state.status === "instalado" ? "Instalado" : "Parado"}`
                                  : ""}
                              </Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhum QR code vinculado a esta baixa.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
