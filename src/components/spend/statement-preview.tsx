import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { spendFileUrl } from "./data";

export function SpendStatementPreview({ path }: { path: string }) {
  const url = useQuery({ queryKey: ["spend-file", path], queryFn: () => spendFileUrl(path), staleTime: 300000 });
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!url.data) return;
    let cancelled = false;
    const host = container.current;
    let destroy: (() => void) | undefined;
    setLoading(true); setError(false);
    async function render() {
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const task = pdfjs.getDocument(url.data);
        destroy = () => { void task.destroy(); };
        const pdf = await task.promise;
        if (!host || cancelled) return;
        host.replaceChildren();
        for (let number = 1; number <= pdf.numPages && !cancelled; number++) {
          const page = await pdf.getPage(number);
          if (cancelled) break;
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width; canvas.height = viewport.height;
          canvas.className = "mb-3 h-auto w-full";
          canvas.setAttribute("aria-label", `Página ${number} da fatura`);
          const context = canvas.getContext("2d");
          if (!context) continue;
          host.appendChild(canvas);
          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch { if (!cancelled) setError(true); }
      finally { if (!cancelled) setLoading(false); }
    }
    void render();
    return () => { cancelled = true; destroy?.(); host?.replaceChildren(); };
  }, [url.data]);
  return <section aria-label="Fatura em PDF" className="min-w-0 lg:sticky lg:top-24">
    <h2 className="mb-3 text-sm text-muted-foreground">Fatura do cartão</h2>
    <div className="h-[50vh] min-h-80 overflow-y-auto lg:h-[calc(100vh-18rem)]" tabIndex={0} aria-label="Páginas da fatura">
      {(loading || url.isPending) && !error && <Loader2 className="mx-auto my-8 size-5 animate-spin" />}
      {(error || url.error) && <p className="py-6 text-sm text-destructive">Não foi possível visualizar a fatura.{url.data && <a className="ml-2 underline" href={url.data} target="_blank" rel="noreferrer">Abrir PDF</a>}</p>}
      <div ref={container} />
    </div>
  </section>;
}