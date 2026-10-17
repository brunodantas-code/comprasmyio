import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileCheck2, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { saveSurveyProposal } from "@/lib/site-survey-proposal.functions";
import { validateProposalPdf } from "@/lib/site-survey-proposal";

function ProposalPages({ blob }: { blob: Blob }) {
  const root = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    setError("");
    const render = async () => {
      const pdfjs = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
      cleanup = () => { void task.destroy(); };
      const pdf = await task.promise;
      const container = root.current;
      if (!container || cancelled) { cleanup(); return; }
      container.replaceChildren();
      for (let number = 1; number <= pdf.numPages && !cancelled; number++) {
        const page = await pdf.getPage(number);
        const viewport = page.getViewport({ scale: Math.min(1.5, (container.clientWidth || 800) / page.getViewport({ scale: 1 }).width) });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width; canvas.height = viewport.height;
        canvas.className = "mx-auto mb-3 max-w-full";
        canvas.setAttribute("aria-label", `Página ${number} da proposta comercial`);
        const context = canvas.getContext("2d");
        if (!context || cancelled) break;
        container.appendChild(canvas);
        await page.render({ canvasContext: context, viewport }).promise;
        page.cleanup();
      }
    };
    void render().catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : "Não foi possível visualizar o PDF."); });
    return () => { cancelled = true; cleanup(); };
  }, [blob]);
  return <>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<div ref={root} className="min-h-32" /></>;
}

export function SiteSurveyProposalButton({ visitId, visitNumber, canEdit, onChanged }: { visitId: string; visitNumber: number; canEdit: boolean; onChanged?: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [current, setCurrent] = useState<{ storage_path: string; file_name: string; evidence: string | null } | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const save = useServerFn(saveSurveyProposal);
  const load = async () => {
    setLoading(true); setError(""); setBlob(null);
    try {
      const { data, error } = await supabase.from("site_survey_commercial_proposals").select("storage_path,file_name,evidence").eq("visit_id", visitId).maybeSingle();
      if (error) throw error;
      setCurrent(data);
      if (data) {
        const result = await supabase.storage.from("site-survey-proposals").download(data.storage_path);
        if (result.error) throw result.error;
        setBlob(result.data);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível abrir a proposta."); }
    finally { setLoading(false); }
  };
  const upload = async () => {
    if (!file || !canEdit || busy) return;
    setBusy(true); setError("");
    const path = `${visitId}/${crypto.randomUUID()}.pdf`;
    let uploaded = false, persisted = false;
    try {
      await validateProposalPdf(file);
      const result = await supabase.storage.from("site-survey-proposals").upload(path, file, { contentType: "application/pdf", upsert: false });
      if (result.error) throw result.error;
      uploaded = true;
      const scope = await save({ data: { visitId, path, fileName: file.name } });
      persisted = true;
      if (current) await supabase.storage.from("site-survey-proposals").remove([current.storage_path]);
      setFile(null); await load(); onChanged?.();
      window.dispatchEvent(new CustomEvent("survey-proposal-changed", { detail: visitId }));
      toast.success([scope.hydraulic_shops, scope.hydraulic_general, scope.electrical].some((v) => v === null) ? "Proposta salva. Há quantidades não identificadas; confira o documento." : "Proposta salva e pontos contratados atualizados.");
    } catch (e) {
      if (uploaded && !persisted) await supabase.storage.from("site-survey-proposals").remove([path]);
      setError(e instanceof Error ? e.message : "Não foi possível salvar a proposta.");
    } finally { setBusy(false); }
  };
  const download = () => {
    if (!blob || !current) return;
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = current.file_name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };
  return <><Button type="button" size="compactIcon" variant="ghost" aria-label={`Proposta Comercial da visita ${visitNumber}`} title="Proposta Comercial" onClick={() => { setOpen(true); setFile(null); void load(); }}><FileCheck2 className="h-4 w-4" /></Button><Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}><DialogContent className="flex max-h-[90dvh] max-w-5xl flex-col overflow-hidden"><DialogHeader><DialogTitle>Proposta Comercial · Site Survey #{visitNumber}</DialogTitle><DialogDescription>{current?.file_name ?? "Proposta aprovada"}</DialogDescription></DialogHeader><div className="flex flex-wrap items-center gap-3 border-b pb-3">{canEdit ? <><input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" aria-label="Selecionar PDF da proposta comercial" onChange={(event) => { setFile(event.target.files?.[0] ?? null); event.target.value = ""; }} /><Button type="button" variant="outline" disabled={busy || loading} onClick={() => input.current?.click()}><Upload className="h-4 w-4" />{current ? "Substituir proposta" : "Selecionar PDF"}</Button>{file ? <><span className="min-w-0 break-all text-sm">{file.name}</span><Button type="button" variant="action" disabled={busy} onClick={() => void upload()}>{busy ? "Lendo proposta…" : "Confirmar"}</Button><Button type="button" variant="action" disabled={busy} onClick={() => setFile(null)}>Cancelar</Button></> : null}</> : null}{blob ? <Button type="button" size="compactIcon" variant="ghost" title="Baixar proposta" aria-label="Baixar proposta comercial" onClick={download}><Download className="h-4 w-4" /></Button> : null}</div>{error ? <p role="alert" className="break-words text-sm text-destructive">{error}</p> : null}<div className="min-h-0 flex-1 overflow-y-auto">{loading ? <p className="py-6 text-sm text-muted-foreground">Abrindo proposta…</p> : blob ? <ProposalPages blob={blob} /> : <p className="py-6 text-sm text-muted-foreground">Nenhuma proposta anexada.</p>}{current?.evidence ? <p className="whitespace-pre-wrap border-t py-3 text-sm text-muted-foreground">{current.evidence}</p> : null}</div></DialogContent></Dialog></>;
}