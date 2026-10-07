import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export type FacadeThumbnailAttachment = {
  id: string;
  storage_path: string;
  file_name: string;
  visit_luc_id: string | null;
  visit_environment_id: string | null;
  attachment_kind?: string;
};

export function SiteSurveyFacadeThumbnail({ attachment, name }: { attachment?: FacadeThumbnailAttachment; name: string }) {
  const [open, setOpen] = useState(false);
  const { data: url } = useQuery({
    queryKey: ["site-survey-screen-summary-photo", attachment?.storage_path],
    enabled: Boolean(attachment),
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      if (!attachment) return null;
      const { data, error } = await supabase.storage.from("site-survey-attachments").createSignedUrl(attachment.storage_path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  if (!attachment) return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary sm:h-10 sm:w-10"><Store className="h-4 w-4" /></span>;
  return <>
    <Button type="button" variant="ghost" className="h-8 w-8 shrink-0 overflow-hidden rounded-md !bg-muted p-0 hover:!bg-muted sm:h-10 sm:w-10" disabled={!url} aria-label={`Ampliar fachada de ${name}`} title={`Ampliar fachada de ${name}`} onClick={() => setOpen(true)}>
      {url ? <img src={url} alt={`Fachada de ${name}`} loading="lazy" className="h-full w-full object-cover" /> : <Store className="h-4 w-4 text-primary" />}
    </Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[88dvh] w-[calc(100vw-2rem)] max-w-5xl overflow-hidden p-3 sm:p-4"><DialogTitle className="sr-only">Fachada de {name}</DialogTitle>{url ? <img src={url} alt={`Fachada de ${name}`} className="mx-auto max-h-[80dvh] w-auto max-w-full rounded-md object-contain" /> : null}</DialogContent></Dialog>
  </>;
}