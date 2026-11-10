import { useQuery } from "@tanstack/react-query";
import { Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function TodoAttachmentThumbnail({ path, name, onOpen }: { path: string; name: string; onOpen: () => void }) {
  const image = useQuery({
    queryKey: ["todo-attachment-thumbnail", path],
    staleTime: 240_000,
    gcTime: 300_000,
    queryFn: async () => {
      const result = await supabase.storage.from("personal-todo-attachments").createSignedUrl(path, 300);
      if (result.error) throw result.error;
      return result.data.signedUrl;
    },
  });
  return <Button variant="ghost" className="!size-24 !min-w-0 shrink-0 overflow-hidden !p-0" aria-label={`Visualizar anexo: ${name}`} title={name} onClick={onOpen}>
    {image.data ? <img src={image.data} alt={name} loading="lazy" className="size-full rounded-md object-cover" /> : <Paperclip className="size-5 text-muted-foreground" />}
  </Button>;
}