import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ExternalLink, ImagePlus, Settings } from "lucide-react";

const BUCKET = "product-images";

type MaterialDetail = {
  id: string;
  name: string;
  link: string | null;
  photo_url: string | null;
  lot_quantity: number | null;
  purchase_type: string | null;
  description: string | null;
};

const TYPE_LABEL: Record<string, string> = { nacional: "Nacional", importacao: "Importação" };

function useMaterialDetail(materialId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["material-detail", materialId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, name, link, photo_url, lot_quantity, purchase_type, description")
        .eq("id", materialId)
        .single();
      if (error) throw error;
      const m = data as MaterialDetail;
      let signed: string | null = null;
      if (m.photo_url) {
        const { data: s } = await supabase.storage.from(BUCKET).createSignedUrl(m.photo_url, 60 * 60);
        signed = s?.signedUrl ?? null;
      }
      return { material: m, signedUrl: signed };
    },
  });
}

export function MaterialDetailDialog({
  materialId,
  name,
  trigger,
}: {
  materialId: string;
  name: string;
  trigger: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const { data, isLoading } = useMaterialDetail(materialId, open);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const m = data?.material;
  const [link, setLink] = useState("");
  const [lot, setLot] = useState("");
  const [type, setType] = useState<string>("");
  const [synced, setSynced] = useState<string | null>(null);
  if (m && synced !== m.id + JSON.stringify([m.link, m.lot_quantity, m.purchase_type])) {
    setSynced(m.id + JSON.stringify([m.link, m.lot_quantity, m.purchase_type]));
    setLink(m.link ?? "");
    setLot(m.lot_quantity != null ? String(m.lot_quantity) : "");
    setType(m.purchase_type ?? "");
  }

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["material-detail", materialId] });
    qc.invalidateQueries({ queryKey: ["materials"] });
    qc.invalidateQueries({ queryKey: ["stock"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const qty = lot.trim() === "" ? null : Number(lot);
      if (qty !== null && (!Number.isFinite(qty) || qty <= 0)) throw new Error("Quantidade por lote inválida");
      const { error } = await supabase
        .from("materials")
        .update({
          link: link.trim() || null,
          lot_quantity: qty,
          purchase_type: type || null,
        })
        .eq("id", materialId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Parâmetros atualizados");
      setEditing(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `materials/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("materials").update({ photo_url: path }).eq("id", materialId);
      if (error) throw error;
      toast.success("Foto atualizada");
      invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(false); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader className="pr-10">
          <DialogTitle className="text-base">{m?.name ?? name}</DialogTitle>
          <DialogDescription>Informações de compra do componente.</DialogDescription>
        </DialogHeader>
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-12 top-3"
          title="Modificar parâmetros"
          onClick={() => setEditing((v) => !v)}
        >
          <Settings className="h-4 w-4" />
        </Button>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex h-40 w-full items-center justify-center overflow-hidden rounded-md border bg-muted/40 transition hover:opacity-90"
              title={data?.signedUrl ? "Trocar foto" : "Adicionar foto"}
            >
              {data?.signedUrl ? (
                <img src={data.signedUrl} alt={m?.name ?? name} className="h-full w-full object-contain" />
              ) : (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ImagePlus className="h-4 w-4" /> {uploading ? "Enviando..." : "Adicionar foto do produto"}
                </span>
              )}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void onFile(f);
              }}
            />

            {editing ? (
              <div className="space-y-3 rounded-md border p-3">
                <div className="space-y-1">
                  <Label htmlFor="detail-link">Link de Referência</Label>
                  <Input id="detail-link" type="url" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="detail-lot">Quantidade por lote</Label>
                  <Input id="detail-lot" type="number" min="1" placeholder="Ex.: 100" value={lot} onChange={(e) => setLot(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Tipo de compra</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nacional">Nacional</SelectItem>
                      <SelectItem value="importacao">Importação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>Salvar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="w-48 font-medium">Link de Referência</TableCell>
                      <TableCell>
                        {m?.link ? (
                          <a href={m.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            Abrir link <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Quantidade por lote</TableCell>
                      <TableCell>
                        {m?.lot_quantity ? `${m.lot_quantity} unidades` : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Tipo de compra</TableCell>
                      <TableCell>
                        {m?.purchase_type ? (
                          <Badge variant="outline">{TYPE_LABEL[m.purchase_type] ?? m.purchase_type}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
