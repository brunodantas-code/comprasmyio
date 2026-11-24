import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { spendFileUrl } from "./data";

export function SpendStatementPreview({ path }: { path: string }) {
  const url = useQuery({ queryKey: ["spend-file", path], queryFn: () => spendFileUrl(path), staleTime: 300000 });
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [full, setFull] = useState(false);
  useEffect(() => { if (!full) return; const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFull(false); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [full]);
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
          const viewport = page.getViewport({ scale: 2.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width; canvas.height = viewport.height;
          canvas.className = "mb-3 block h-auto max-w-none"; canvas.style.width = "100%";
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
  const step = (d: number) => setZoom(z => Math.min(3, Math.max(0.5, Math.round((z + d) * 100) / 100)));
  return <section aria-label="Fatura em PDF" className={full ? "fixed inset-0 z-50 flex flex-col bg-background p-4" : "min-w-0 lg:sticky lg:top-24"}>
    <div className="mb-2 flex min-w-0 items-center gap-1"><h2 className="mr-auto min-w-0 truncate text-sm text-muted-foreground">Fatura do cartão</h2>
      <Button variant="ghost" size="icon" className="shrink-0" aria-label="Diminuir zoom" title="Diminuir zoom" disabled={zoom <= 0.5} onClick={() => step(-0.25)}><ZoomOut /></Button>
      <button type="button" className="w-12 shrink-0 text-center text-xs tabular-nums text-muted-foreground" title="Voltar a 100%" aria-label="Voltar o zoom a 100%" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
      <Button variant="ghost" size="icon" className="shrink-0" aria-label="Aumentar zoom" title="Aumentar zoom" disabled={zoom >= 3} onClick={() => step(0.25)}><ZoomIn /></Button>
      <Button variant="ghost" size="icon" className="shrink-0" aria-label={full ? "Sair da tela cheia" : "Ver fatura em tela cheia"} title={full ? "Sair da tela cheia" : "Tela cheia"} onClick={() => setFull(f => !f)}>{full ? <Minimize2 /> : <Maximize2 />}</Button>
    </div>
    <div className={full ? "min-h-0 flex-1 overflow-auto" : "h-[50vh] min-h-80 overflow-auto lg:h-[calc(100vh-18rem)]"} tabIndex={0} aria-label="Páginas da fatura">
      {(loading || url.isPending) && !error && <Loader2 className="mx-auto my-8 size-5 animate-spin" />}
      {(error || url.error) && <p className="py-6 text-sm text-destructive">Não foi possível visualizar a fatura.{url.data && <a className="ml-2 underline" href={url.data} target="_blank" rel="noreferrer">Abrir PDF</a>}</p>}
      <div ref={container} style={{ width: `${zoom * 100}%` }} className={zoom < 1 ? "mx-auto" : undefined} />
    </div>
  </section>;
}
