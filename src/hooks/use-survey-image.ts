import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type SurveyImage = { storage_path: string; file_name: string; content_type?: string | null };

// Decode one image at a time to bound the decoder's memory on phones.
let decoding: Promise<unknown> = Promise.resolve();

export function useSurveyImage(attachment?: SurveyImage) {
  const [objectUrl, setObjectUrl] = useState<{ blob: Blob; url: string } | null>(null);
  const query = useQuery({
    queryKey: ["site-survey-browser-image", attachment?.storage_path],
    enabled: Boolean(attachment),
    staleTime: 50 * 60 * 1000,
    notifyOnChangeProps: ["data", "error"],
    retry: 1,
    queryFn: async () => {
      if (!attachment) return null;
      const { data, error } = await supabase.storage.from("site-survey-attachments").createSignedUrl(attachment.storage_path, 3600);
      if (error) throw error;
      const heic = /\.(heic|heif)$/i.test(attachment.file_name) || /image\/hei[cf]/i.test(attachment.content_type ?? "");
      if (!heic) return { url: data.signedUrl, blob: null };
      const response = await fetch(data.signedUrl);
      if (!response.ok) throw new Error("Não foi possível carregar a foto da fachada.");
      const original = await response.blob();
      const converted = decoding.catch(() => undefined).then(async () => {
        // Browser-only decoder must not be evaluated during server rendering.
        const { heicTo } = await import("heic-to/csp");
        return heicTo({ blob: original, type: "image/jpeg", quality: 0.85 });
      });
      decoding = converted.then(() => undefined, () => undefined);
      return { url: null, blob: await converted };
    },
  });
  const blob = query.data?.blob;
  useEffect(() => {
    if (!blob) { setObjectUrl(null); return; }
    const url = URL.createObjectURL(blob);
    setObjectUrl({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return { ...query, url: query.data?.url ?? (blob && objectUrl?.blob === blob ? objectUrl.url : null) };
}