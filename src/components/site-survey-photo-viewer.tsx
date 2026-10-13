import type { KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function isSurveyImageFile(attachment: { content_type: string | null; file_name: string }) {
  return attachment.content_type?.startsWith("image/") ?? /\.(jpe?g|png|webp|gif|heic)$/i.test(attachment.file_name);
}

/** Arrows + counter overlaid on the photo dialog; hidden when the group has a single photo. */
export function SurveyPhotoNav({ position, total, onPrev, onNext }: { position: number; total: number; onPrev: () => void; onNext: () => void }) {
  if (total <= 1) return null;
  return <>
    <button
      type="button"
      aria-label="Foto anterior"
      title="Foto anterior"
      className="absolute left-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-background/85 text-foreground shadow-md ring-1 ring-border transition hover:bg-background sm:left-3 sm:h-11 sm:w-11"
      onClick={(event) => { event.stopPropagation(); onPrev(); }}
    ><ChevronLeft className="h-5 w-5" /></button>
    <button
      type="button"
      aria-label="Próxima foto"
      title="Próxima foto"
      className="absolute right-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-background/85 text-foreground shadow-md ring-1 ring-border transition hover:bg-background sm:right-3 sm:h-11 sm:w-11"
      onClick={(event) => { event.stopPropagation(); onNext(); }}
    ><ChevronRight className="h-5 w-5" /></button>
    <span className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-background/85 px-3 py-1 text-xs font-semibold tabular-nums text-foreground shadow-md ring-1 ring-border">{position + 1} de {total}</span>
  </>;
}

/** Keyboard support (setas esquerda/direita) for the photo dialog. */
export function surveyPhotoKeydown(event: KeyboardEvent, total: number, onPrev: () => void, onNext: () => void) {
  if (total <= 1) return;
  if (event.key === "ArrowLeft") { event.preventDefault(); event.stopPropagation(); onPrev(); }
  if (event.key === "ArrowRight") { event.preventDefault(); event.stopPropagation(); onNext(); }
}
