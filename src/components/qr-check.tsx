import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrScannerDialog, GalleryQrButton, ManualQrDialog } from "@/components/homologation";
import { EXTERNAL_LOCATION_LABELS, EXTERNAL_STATUS_LABELS } from "@/components/external-sync";
import { MapPin, QrCode, Search, X } from "lucide-react";

const EXT_STAGE: Record<string, string> = {
  estoque: "almoxarifado",
  cliente: "unidade",
  tecnico: "tecnico",
  perdido: "perdido",
  avariado: "avariado",
};

function fmt(d: string) {
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const STAGE_LABELS: Record<string, string> = {
  fabrica: "Fábrica",
  almoxarifado: "Estoque",
  homologacao: "Homologação",
  distribuicao: "Expedição",
  transito: "Transporte",
  unidade: "Cliente",
  tecnico: "Técnico",
  perdido: "Perdido",
  avariado: "Avariado",
  escritorio: "Escritório",
  almoxarifado_geral: "Almoxarifado",
};

type Event = { at: string; title: string; detail?: string; stage?: string; photo?: string | null };

type Release = {
  id: string;
  created_at: string;
  responsibles: string[];
  photo_url: string;
  notes: string | null;
};

function useQrTrace(code: string) {
  return useQuery({
    queryKey: ["qr-trace", code],
    enabled: !!code,
    queryFn: async () => {
      const extCode =
        /produto\.myio\.com\.br\/([^?\s#]+)/i.exec(code)?.[1] ??
        (!code.includes("/") && code.trim() ? code.trim() : null);
      const [unitRes, boxRes, unitProdRes, profilesRes, deliveryQrRes, movQrRes, extRes] = await Promise.all([
        supabase
          .from("homologation_units")
          .select(
            "id, position, qr_value, homologation_id, homologations(id, box_size, box_qr, notes, created_at, responsible_id, release_id, material_id, materials(name, location))",
          )
          .eq("qr_value", code)
          .maybeSingle(),
        supabase
          .from("homologations")
          .select("id, box_size, box_qr, notes, created_at, responsible_id, release_id, material_id, materials(name, location), homologation_units(position, qr_value)")
          .eq("box_qr", code)
          .maybeSingle(),
        supabase
          .from("unit_products")
          .select(
            "id, status, installed_at, notes, created_at, material_id, product, moved_to, moved_technician, moved_at, move_notes, move_photo_url, project_id, materials(name), projects(name)",
          )
          .eq("label", code)
          .maybeSingle(),
        supabase.from("profiles").select("id, full_name, email"),
        supabase
          .from("myio_delivery_qrs")
          .select(
            "id, qr_value, box_qr, created_at, delivery_id, myio_item_deliveries(id, quantity, created_at, order_id, product, photo_url, myio_orders(id, title, client_name, status, delivery_date))",
          )
          .or(`qr_value.eq.${code},box_qr.eq.${code}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("stock_movement_qrs")
          .select(
            "id, qr_value, box_qr, created_at, movement_id, stock_movements(id, type, quantity, reason, responsible, photo_url, created_at, created_by, material_id, materials(name, location))",
          )
          .or(`qr_value.eq.${code},box_qr.eq.${code}`)
          .order("created_at", { ascending: true }),
        extCode
          ? supabase
              .from("external_product_states")
              .select("code, product_type, location, status, technician, last_change_at")
              .eq("code", extCode)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const names: Record<string, string> = {};
      for (const p of profilesRes.data ?? []) names[p.id] = p.full_name || p.email || p.id;

      const hom =
        (unitRes.data?.homologations as Record<string, unknown> | null) ??
        (boxRes.data as Record<string, unknown> | null) ??
        null;

      let release: Release | null = null;
      if (hom?.["release_id"]) {
        const { data } = await supabase
          .from("assembly_releases")
          .select("id, created_at, responsibles, photo_url, notes")
          .eq("id", hom["release_id"] as string)
          .maybeSingle();
        release = (data as Release | null) ?? null;
      }

      const unitProd = unitProdRes.data as
        | {
            id: string;
            status: string;
            installed_at: string | null;
            notes: string | null;
            created_at: string;
            product: string | null;
            moved_to: string | null;
            moved_technician: string | null;
            moved_at: string | null;
            move_notes: string | null;
            move_photo_url: string | null;
            materials: { name: string } | null;
            projects: { name: string } | null;
          }
        | null;

      const dq = deliveryQrRes.data as
        | {
            created_at: string;
            delivery_id: string;
            myio_item_deliveries: {
              id: string;
              quantity: number;
              created_at: string;
              order_id: string;
              product: string;
              photo_url: string | null;
              myio_orders: { id: string; title: string; client_name: string; status: string; delivery_date: string } | null;
            } | null;
          }
        | null;
      const delivery = dq?.myio_item_deliveries ?? null;
      const order = delivery?.myio_orders ?? null;

      type MovementRow = {
        id: string;
        type: string;
        quantity: number;
        reason: string | null;
        responsible: string | null;
        photo_url: string | null;
        created_at: string;
        created_by: string | null;
        materials: { name: string; location: string } | null;
      };
      const movements = ((movQrRes.data ?? []) as { stock_movements: MovementRow | null }[])
        .map((r) => r.stock_movements)
        .filter((m): m is MovementRow => !!m)
        .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));

      type TechMove = {
        created_at: string;
        technician: string;
        destination: string;
        quantity: number;
        notes: string | null;
        projects: { name: string } | null;
      };
      let techMoves: TechMove[] = [];
      if (movements.length) {
        const { data } = await supabase
          .from("technician_moves")
          .select("created_at, technician, destination, quantity, notes, projects(name)")
          .in(
            "movement_id",
            movements.map((m) => m.id),
          )
          .order("created_at", { ascending: true });
        techMoves = (data ?? []) as unknown as TechMove[];
      }

      type Shipment = {
        created_at: string;
        address: string;
        shipping_method: string;
        responsible: string;
        tracking_code: string;
        notes: string | null;
        proof_url: string | null;
      };
      let shipment: Shipment | null = null;
      if (order) {
        const { data } = await supabase
          .from("myio_shipments")
          .select("created_at, address, shipping_method, responsible, tracking_code, notes, proof_url")
          .eq("order_id", order.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        shipment = (data as Shipment | null) ?? null;
      }

      const materialName =
        (hom?.["materials"] as { name: string } | null)?.name ??
        unitProd?.materials?.name ??
        unitProd?.product ??
        movements[0]?.materials?.name ??
        delivery?.product ??
        extRes.data?.product_type ??
        null;
      const materialLocation =
        ((hom?.["materials"] as { location?: string } | null)?.location as string | undefined) ??
        movements[movements.length - 1]?.materials?.location ??
        null;

      const events: Event[] = [];
      if (release) {
        events.push({
          at: release.created_at,
          title: "Produto montado liberado na Fábrica",
          detail: `Responsáveis: ${(release.responsibles ?? []).map((r) => names[r] ?? r).join(", ") || "—"}`,
          stage: "fabrica",
          photo: release.photo_url,
        });
      }
      if (hom) {
        const boxSize = hom["box_size"] as number;
        events.push({
          at: hom["created_at"] as string,
          title: "Homologado / etiquetado",
          detail:
            (boxSize === 1 ? "Produto unitário" : `Caixa de ${boxSize}`) +
            (hom["responsible_id"] ? ` · Responsável: ${names[hom["responsible_id"] as string] ?? "—"}` : ""),
          stage: "homologacao",
        });
        events.push({
          at: hom["created_at"] as string,
          title: "Entrada no Estoque",
          detail: boxSize === 1 ? materialName ?? "" : `${materialName ?? ""} — Caixa de ${boxSize}`,
          stage: "almoxarifado",
        });
      }

      for (const m of movements) {
        const who = m.responsible || (m.created_by ? names[m.created_by] : "") || "";
        const loc = m.materials?.location ?? "almoxarifado";
        if (m.type === "saida") {
          events.push({
            at: m.created_at,
            title: `Baixa no estoque (${STAGE_LABELS[loc] ?? loc})`,
            detail: [m.reason, who ? `Responsável: ${who}` : "", `Qtd: ${m.quantity}`].filter(Boolean).join(" · "),
            photo: m.photo_url,
            stage: "tecnico",
          });
        } else if (m.type === "entrada") {
          events.push({
            at: m.created_at,
            title: `Entrada no Estoque — ${STAGE_LABELS[loc] ?? loc}`,
            detail: [m.reason, who ? `Responsável: ${who}` : "", `Qtd: ${m.quantity}`].filter(Boolean).join(" · "),
            photo: m.photo_url,
            stage: loc,
          });
        } else {
          events.push({
            at: m.created_at,
            title: "Ajuste de estoque",
            detail: [m.reason, who ? `Responsável: ${who}` : ""].filter(Boolean).join(" · "),
            photo: m.photo_url,
          });
        }
      }

      for (const t of techMoves) {
        const destStage =
          t.destination === "unidade"
            ? "unidade"
            : t.destination === "perdido"
              ? "perdido"
              : t.destination === "almoxarifado"
                ? "almoxarifado"
                : t.destination === "avariado"
                  ? "avariado"
                  : "tecnico";
        events.push({
          at: t.created_at,
          title: `Movido pelo técnico → ${STAGE_LABELS[destStage] ?? t.destination}`,
          detail: [`Técnico: ${t.technician}`, t.projects?.name ? `Projeto: ${t.projects.name}` : "", t.notes].filter(Boolean).join(" · "),
          stage: destStage,
        });
      }

      if (unitProd) {
        events.push({
          at: unitProd.created_at,
          title: "Enviado para o Cliente",
          detail: [unitProd.projects?.name ? `Projeto: ${unitProd.projects.name}` : "", "Situação inicial: parado"]
            .filter(Boolean)
            .join(" · "),
          stage: "unidade",
        });
        if (unitProd.status === "instalado" && unitProd.installed_at) {
          events.push({ at: unitProd.installed_at, title: "Instalado na unidade do cliente", stage: "unidade" });
        }
        if (unitProd.moved_to && unitProd.moved_at) {
          const destStage =
            unitProd.moved_to === "tecnico"
              ? "tecnico"
              : unitProd.moved_to === "perdido"
                ? "perdido"
                : unitProd.moved_to === "avariado"
                  ? "avariado"
                  : "almoxarifado";
          events.push({
            at: unitProd.moved_at,
            title: `Saiu da unidade → ${STAGE_LABELS[destStage] ?? unitProd.moved_to}`,
            detail: [unitProd.moved_technician ? `Técnico: ${unitProd.moved_technician}` : "", unitProd.move_notes]
              .filter(Boolean)
              .join(" · "),
            photo: unitProd.move_photo_url,
            stage: destStage,
          });
        }
      }
      if (delivery && order) {
        events.push({
          at: delivery.created_at,
          title: "Baixa no Estoque (separado para pedido)",
          detail: `${order.title} · ${order.client_name} · ${delivery.product}`,
          photo: delivery.photo_url,
          stage: "distribuicao",
        });
        if (order.status === "pronto_entrega") {
          events.push({ at: delivery.created_at, title: "Aguardando em Expedição", detail: order.title, stage: "distribuicao" });
        }
      }
      if (shipment) {
        events.push({
          at: shipment.created_at,
          title: "Enviado — Transporte",
          detail: `${shipment.shipping_method} · Resp.: ${shipment.responsible} · Rastreio: ${shipment.tracking_code}`,
          photo: shipment.proof_url,
          stage: "transito",
        });
        if (order?.status === "entregue_cliente") {
          events.push({ at: shipment.created_at, title: "Entregue ao cliente", detail: shipment.address, stage: "unidade" });
        }
        if (order?.status === "perdido") {
          events.push({ at: shipment.created_at, title: "Mercadoria perdida", detail: shipment.address, stage: "perdido" });
        }
      }
      const ext = extRes.data;
      if (ext) {
        events.push({
          at: ext.last_change_at,
          title: `Plataforma externa — ${EXTERNAL_LOCATION_LABELS[ext.location] ?? ext.location}`,
          detail: [
            ext.product_type ? `Tipo: ${ext.product_type}` : "",
            ext.status ? `Status: ${EXTERNAL_STATUS_LABELS[ext.status] ?? ext.status}` : "",
            ext.technician ? `Técnico: ${ext.technician}` : "",
          ]
            .filter(Boolean)
            .join(" · "),
          stage: EXT_STAGE[ext.location],
        });
      }
      events.sort((a, b) => +new Date(a.at) - +new Date(b.at));

      const STOCK_LABELS: Record<string, string> = {
        fabrica: "Estoque — Fábrica",
        almoxarifado: "Estoque",
        transito: "Transporte",
        unidade: "Cliente",
        tecnico: "Técnico",
        perdido: "Perdido",
        avariado: "Itens Avariados",
        escritorio: "Escritório",
        almoxarifado_geral: "Almoxarifado",
      };

      let location = "Não encontrado";
      let stage: string | null = null;
      if (unitProd && !unitProd.moved_to) {
        location = unitProd.status === "instalado" ? "Cliente — instalado" : "Cliente — parado";
        stage = "unidade";
      } else if (order?.status === "entregue_cliente") {
        location = "Cliente — entregue";
        stage = "unidade";
      } else if (order?.status === "em_transito") {
        location = "Transporte";
        stage = "transito";
      } else if (order?.status === "perdido") {
        location = "Perdido";
        stage = "perdido";
      } else if (order?.status === "pronto_entrega") {
        location = "Expedição — aguardando envio";
        stage = "distribuicao";
      } else if (delivery) {
        location = "Expedição — separado para pedido";
        stage = "distribuicao";
      } else if (hom) {
        location = STOCK_LABELS[materialLocation ?? "almoxarifado"] ?? "Estoque";
        stage = materialLocation ?? "almoxarifado";
      }

      if (location === "Não encontrado" && ext) {
        stage = EXT_STAGE[ext.location] ?? null;
        location =
          ext.location === "cliente" && ext.status
            ? `Cliente — ${EXTERNAL_STATUS_LABELS[ext.status] ?? ext.status}`
            : (EXTERNAL_LOCATION_LABELS[ext.location] ?? ext.location);
      }

      const lastStaged = [...events].reverse().find((e) => !!e.stage && e.stage !== "homologacao");
      if (lastStaged?.stage && (unitProd?.moved_to || movements.length || techMoves.length)) {
        stage = lastStaged.stage;
        location = STOCK_LABELS[lastStaged.stage] ?? STAGE_LABELS[lastStaged.stage] ?? location;
      }

      return {
        found: !!hom || !!unitProd || !!delivery || movements.length > 0 || !!ext,
        isBox: !!boxRes.data,
        materialName,
        stage,
        order,
        shipment,
        delivery,
        movements,
        techMoves,
        unitProd,
        position: unitRes.data?.position ?? null,
        boxSize: (hom?.["box_size"] as number | undefined) ?? null,
        boxQr: (hom?.["box_qr"] as string | null) ?? null,
        boxUnits:
          ((boxRes.data?.homologation_units ?? []) as { position: number; qr_value: string }[]).sort(
            (a, b) => a.position - b.position,
          ),
        notes: (hom?.["notes"] as string | null) ?? null,
        release,
        location,
        events,
      };
    },
  });
}

export function QrCheckSection() {
  const [input, setInput] = useState("");
  const [code, setCode] = useState("");
  const { data, isFetching } = useQrTrace(code);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Checar QR Code</CardTitle>
          <CardDescription>
            Escaneie com a câmera, importe uma foto da galeria ou digite o código para ver onde o produto está e todo o
            seu histórico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 [&>button]:w-full sm:[&>button]:w-auto">
            <div className="relative w-full flex-1 sm:min-w-[240px]">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setCode(input.trim());
                }}
                placeholder="Código do QR (https://...)"
                className="pl-8"
              />
            </div>
            <Button type="button" onClick={() => setCode(input.trim())} disabled={!input.trim()}>
              <QrCode className="mr-1 h-4 w-4" /> Checar
            </Button>
            <ManualQrDialog
              label="Digitar código do QR"
              value={input}
              onResult={(v) => {
                setInput(v);
                setCode(v);
              }}
            />
            <GalleryQrButton
              label="Importar da galeria"
              onResult={(v) => {
                setInput(v);
                setCode(v);
              }}
            />
            <QrScannerDialog
              label="Escanear com a câmera"
              onResult={(v) => {
                setInput(v);
                setCode(v);
              }}
            />
            {!!code && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setCode("");
                  setInput("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!!code && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              <MapPin className="h-4 w-4" />
              {isFetching ? "Buscando..." : data?.found ? data.location : "QR Code não encontrado"}
            </CardTitle>
            <CardDescription className="break-all">{code}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {isFetching ? (
              <p className="text-sm text-muted-foreground">Carregando histórico...</p>
            ) : !data?.found ? (
              <p className="text-sm text-muted-foreground">
                Este QR Code não está vinculado a nenhuma homologação ou produto registrado.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {data.materialName && <Badge variant="outline">{data.materialName}</Badge>}
                  {data.stage && <Badge>{STAGE_LABELS[data.stage] ?? data.stage}</Badge>}
                  {(data.isBox || data.boxSize != null) && (
                    <Badge variant="outline">
                      {data.isBox
                        ? `QR da caixa de ${data.boxSize}`
                        : data.boxSize === 1
                          ? "Produto unitário"
                          : `Produto ${data.position ?? "?"} de ${data.boxSize} (caixa)`}
                    </Badge>
                  )}
                  {!data.isBox && data.boxQr && (
                    <Badge variant="outline" className="max-w-[320px] break-all">
                      Caixa: {data.boxQr}
                    </Badge>
                  )}
                </div>

                {(data.order || data.shipment) && (
                  <div className="space-y-1 rounded-md border p-3 text-xs">
                    {data.order && (
                      <>
                        <p className="text-sm font-medium">Pedido vinculado</p>
                        <p className="text-muted-foreground">
                          {data.order.title} · {data.order.client_name}
                        </p>
                      </>
                    )}
                    {data.shipment && (
                      <div className="pt-1 text-muted-foreground">
                        <p className="text-sm font-medium text-foreground">Envio</p>
                        <p>Endereço: {data.shipment.address}</p>
                        <p>Método: {data.shipment.shipping_method}</p>
                        <p>Responsável: {data.shipment.responsible}</p>
                        <p className="break-all">Rastreio: {data.shipment.tracking_code}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-sm font-medium">Histórico</p>
                  <ol className="space-y-3 border-l pl-4">
                    {data.events.map((e, i) => (
                      <li key={i} className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                        <p className="text-sm font-medium">{e.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmt(e.at)}
                          {e.detail ? ` · ${e.detail}` : ""}
                        </p>
                        {e.photo && <ReleasePhoto path={e.photo} className="mt-2 max-h-40" />}
                      </li>
                    ))}
                  </ol>
                </div>

                {data.isBox && !!data.boxUnits.length && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Produtos dentro desta caixa</p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {data.boxUnits.map((u) => (
                        <li key={u.position} className="break-all">
                          #{u.position} — {u.qr_value}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.release?.photo_url && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Foto da montagem</p>
                    <ReleasePhoto path={data.release.photo_url} />
                  </div>
                )}

                {data.notes && <p className="text-sm text-muted-foreground">Observações: {data.notes}</p>}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReleasePhoto({ path, className }: { path: string; className?: string }) {
  const { data } = useQuery({
    queryKey: ["assembly-photo", path],
    queryFn: async () => {
      if (path.startsWith("http")) return path;
      const { data } = await supabase.storage.from("assembly-photos").createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    },
  });
  if (!data) return null;
  return <img src={data} alt="Foto do registro" className={`max-h-64 rounded border object-contain ${className ?? ""}`} />;
}
