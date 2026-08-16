import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BUCKET = "product-images";

export function useProductImages() {
  return useQuery({
    queryKey: ["myio-product-images"],
    queryFn: async () => {
      const { data, error } = await supabase.from("myio_product_images").select("product, image_url");
      if (error) throw error;
      const map: Record<string, string> = {};
      await Promise.all(
        (data ?? []).map(async (row) => {
          const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(row.image_url, 60 * 60);
          if (signed?.signedUrl) map[row.product] = signed.signedUrl;
        }),
      );
      return map;
    },
  });
}

export function ProductThumb({ url, name, size = 40 }: { url?: string; name: string; size?: number }) {
  if (!url) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded border bg-muted text-muted-foreground"
        style={{ width: size, height: size }}
      >
        <ImagePlus className="h-4 w-4" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={name}
      loading="lazy"
      className="shrink-0 rounded border object-cover"
      style={{ width: size, height: size }}
    />
  );
}

export function ProductImageUploader({
  product,
  url,
  userId,
}: {
  product: string;
  url?: string;
  userId: string;
}) {
  product,
  url,
  userId,
}: {
  product: string;
  url?: string;
  userId: string;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File) => {
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error } = await supabase
        .from("myio_product_images")
        .upsert({ product, image_url: path, created_by: userId }, { onConflict: "product" });
      if (error) throw error;
      toast.success("Foto atualizada.");
      qc.invalidateQueries({ queryKey: ["myio-product-images"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <button
      type="button"
      title={url ? "Trocar foto" : "Adicionar foto"}
      onClick={() => inputRef.current?.click()}
      className="rounded ring-offset-background transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ProductThumb url={url} name={product} />
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
    </button>
  );
}
