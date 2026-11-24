import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

export function SpendReceiptPdfPreview({ src, fullSize = false }: { src: string; fullSize?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const host = container.current;
    let destroy: (() => void) | undefined;
    setLoading(true);
    setError(false);
    host?.replaceChildren();
    async function render() {
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const task = pdfjs.getDocument(src);
        destroy = () => { void task.destroy(); };
        const pdf = await task.promise;
        if (!host || cancelled) return;
        for (let number = 1; number <= pdf.numPages && !cancelled; number++) {
          const page = await pdf.getPage(number);
          if (cancelled) return;
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "mb-2 block h-auto w-full rounded-md";
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", `Página ${number} do comprovante fiscal`);
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Visualização indisponível");
          host.appendChild(canvas);
          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch { if (!cancelled) setError(true); }
      finally { if (!cancelled) setLoading(false); }
    }
    void render();
    return () => { cancelled = true; destroy?.(); host?.replaceChildren(); };
  }, [src]);

  return <div className="min-w-0 space-y-1">
    {loading && !error && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Carregando comprovante…</p>}
    {error && <p role="alert" className="text-sm text-destructive">Não foi possível visualizar o comprovante.</p>}
    <div tabIndex={0} aria-label="Prévia do comprovante PDF" className={fullSize ? "max-h-[60dvh] overflow-auto" : "h-40 overflow-auto"}>
      <div ref={container} />
    </div>
    <a href={src} target="_blank" rel="noreferrer" className="text-xs text-foreground underline hover:text-primary">Abrir comprovante PDF</a>
  </div>;
}