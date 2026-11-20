import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "./button";

export const popupExpandedClass = "!inset-0 !left-0 !top-0 !h-dvh !max-h-dvh !w-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none !overflow-y-auto !content-start";

export function PopupExpandButton({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const label = expanded ? "Restaurar tamanho" : "Ampliar para tela cheia";
  return (
    <Button type="button" variant="ghost" size="compactIcon" className="pointer-events-auto rounded-sm border-0 !bg-transparent opacity-70 shadow-none outline-none ring-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 hover:!bg-transparent hover:opacity-100" aria-label={label} title={label} aria-pressed={expanded} onClick={onToggle}>
      {expanded ? <Minimize2 /> : <Maximize2 />}
    </Button>
  );
}