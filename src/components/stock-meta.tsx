import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BUCKET = "product-images";

export type StockMetaTable = "materials" | "terceiros_materials" | "tool_assets";

export type StockMeta = {
  photo: string | null;
  description: string | null;
  manufacturer_code: string | null;
  myio_code: string | null;
};

export function useStockMeta(table: StockMetaTable) {
  return useQuery({
    queryKey: ["stock-meta", table],
    queryFn: async () => {
      const cols = "id, description, manufacturer_code, myio_code, photo_url";
      const { data, error } =
        table === "terceiros_materials"
          ? await supabase.from("terceiros_materials").select(cols)
          : table === "tool_assets"
            ? await supabase.from("tool_assets").select(cols)
            : await supabase.from("materials").select(cols);
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        id: string;
        description: string | null;
        manufacturer_code: string | null;
        myio_code: string | null;
        photo_url: string | null;
      }>;
      const paths = rows.map((r) => r.photo_url).filter((p): p is string => !!p);
      const signedMap: Record<string, string> = {};
      if (paths.length) {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
        (signed ?? []).forEach((s) => {
          if (s.path && s.signedUrl) signedMap[s.path] = s.signedUrl;
        });
      }
      const map: Record<string, StockMeta> = {};
      rows.forEach((r) => {
        map[r.id] = {
          photo: r.photo_url ? (signedMap[r.photo_url] ?? null) : null,
          description: r.description,
          manufacturer_code: r.manufacturer_code,
          myio_code: r.myio_code,
        };
      });
      return map;
    },
  });
}

export function StockPhotoCell({ url, name }: { url?: string | null; name: string }) {
  const [open, setOpen] = useState(false);
  if (!url) {
    return (
      <div
        className="flex h-10 w-10 items-center justify-center rounded border bg-muted text-muted-foreground"
        title="Sem foto cadastrada"
      >
        <ImageIcon className="h-4 w-4" />
      </div>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Ver foto maior"
        className="h-10 w-10 overflow-hidden rounded border transition hover:opacity-80"
      >
        <img src={url} alt={name} loading="lazy" className="h-full w-full object-cover" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
          </DialogHeader>
          <img src={url} alt={name} className="max-h-[70vh] w-full rounded-md object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}
