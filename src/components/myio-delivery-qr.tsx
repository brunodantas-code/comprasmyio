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
};

/** Resolve um código lido: se for QR de caixa, retorna todos os QR unitários dentro dela. */
export async function resolveQrCode(code: string): Promise<LinkedQr[]> {
  const value = code.trim();
  if (!value) return [];

  const { data: box } = await supabase
    .from("homologations")
    .select("id, box_qr, homologation_units(id, qr_value, position)")
    .eq("box_qr", value)
    .maybeSingle();

  if (box) {
    const units = ((box.homologation_units ?? []) as { id: string; qr_value: string; position: number }[]).sort(
      (a, b) => a.position - b.position,
    );
    if (units.length === 0) throw new Error("Esta caixa não possui produtos vinculados.");
    return units.map((u) => ({ qr_value: u.qr_value, box_qr: value, homologation_unit_id: u.id }));
  }

  const { data: unit } = await supabase
    .from("homologation_units")
    .select("id, qr_value, homologations(box_qr, box_size)")
    .eq("qr_value", value)
    .maybeSingle();

  if (unit) {
    const hom = unit.homologations as { box_qr: string | null; box_size: number } | null;
    return [
      {
        qr_value: unit.qr_value,
        box_qr: hom && hom.box_size > 1 ? hom.box_qr : null,
        homologation_unit_id: unit.id,
      },
    ];
  }

  return [{ qr_value: value, box_qr: null, homologation_unit_id: null }];
}

async function alreadyUsed(values: string[]) {
  const { data } = await supabase.from("myio_delivery_qrs").select("qr_value").in("qr_value", values);
  return new Set((data ?? []).map((r) => r.qr_value));
}

export function QrLinkPicker({
  value,
  onChange,
}: {
  value: LinkedQr[];
  onChange: (v: LinkedQr[]) => void;
}) {
  const add = async (code: string) => {
    try {
      const resolved = await resolveQrCode(code);
      if (!resolved.length) return;
      const used = await alreadyUsed(resolved.map((r) => r.qr_value));
      const existing = new Set(value.map((v) => v.qr_value));
      const fresh = resolved.filter((r) => !existing.has(r.qr_value) && !used.has(r.qr_value));
      if (!fresh.length) {
        toast.error("Este QR code já foi vinculado a uma baixa.");
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

  const boxes = [...new Set(value.map((v) => v.box_qr).filter(Boolean))] as string[];

  return (
    <div className="space-y-2">
      <Label>QR codes vinculados (opcional)</Label>
      <div className="flex flex-wrap gap-2">
        <ManualQrDialog label="Digitar código" value="" onResult={add} />
        <GalleryQrButton label="Galeria" onResult={add} />
        <QrScannerDialog label="Câmera" onResult={add} />
      </div>
      {value.length > 0 && (
        <div className="space-y-2 rounded-md border p-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline">{value.length} unidade(s)</Badge>
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
      return (deliveries ?? []).map((d) => ({ ...d, qrs: qrs.filter((q) => q.delivery_id === d.id) }));
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
                          <li key={q.qr_value} className="break-all text-xs text-muted-foreground">
                            {q.qr_value}
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
