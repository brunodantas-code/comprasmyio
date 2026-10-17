import { useState } from "react";
import { Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSurveyImage } from "@/hooks/use-survey-image";

export type FacadeThumbnailAttachment = {
  id: string;
  storage_path: string;
  file_name: string;
  content_type?: string | null;
  visit_luc_id: string | null;
  visit_environment_id: string | null;
  attachment_kind?: string;
};

function InterventionBadge({ count, name }: { count: number; name: string }) {
  if (!count) return null;
  return <span className="pointer-events-none absolute -right-1 -top-1 z-10 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground shadow-sm" title={`${count} intervenção(ões) para o cliente em ${name}`} aria-hidden="true">{count > 9 ? "9+" : count}</span>;
}

export function SiteSurveyFacadeThumbnail({ attachment, name, interventionCount = 0 }: { attachment?: FacadeThumbnailAttachment; name: string; interventionCount?: number }) {
  const [open, setOpen] = useState(false);
  const { url, ref } = useSurveyImage(attachment, true);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const visibleUrl = url && url !== failedUrl ? url : null;
  if (!attachment) return <span className="relative inline-flex shrink-0"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary sm:h-10 sm:w-10"><Store className="h-4 w-4" /></span><InterventionBadge count={interventionCount} name={name} /></span>;
  return <span className="relative inline-flex shrink-0">
    <Button ref={ref} type="button" variant="ghost" className="h-8 w-8 shrink-0 overflow-hidden rounded-full !bg-primary/15 p-0 hover:!bg-primary/15 sm:h-10 sm:w-10" disabled={!visibleUrl} aria-label={`Ampliar fachada de ${name}${interventionCount ? ` — ${interventionCount} intervenção(ões) para o cliente` : ""}`} title={`Ampliar fachada de ${name}`} onClick={() => setOpen(true)}>
      {visibleUrl ? <img src={visibleUrl} alt={`Fachada de ${name}`} loading="lazy" className="h-full w-full object-cover" onError={() => setFailedUrl(visibleUrl)} /> : <Store className="h-4 w-4 text-primary" />}
    </Button>
    <InterventionBadge count={interventionCount} name={name} />
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[88dvh] w-[calc(100vw-2rem)] max-w-5xl overflow-hidden p-3 sm:p-4"><DialogTitle className="sr-only">Fachada de {name}</DialogTitle>{visibleUrl ? <img src={visibleUrl} alt={`Fachada de ${name}`} className="mx-auto max-h-[80dvh] w-auto max-w-full rounded-md object-contain" /> : null}</DialogContent></Dialog>
  </span>;
}
