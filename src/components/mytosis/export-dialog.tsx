import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, FileDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { createMytosisPdf, downloadMytosisPdf } from "@/lib/mytosis-pdf";
import type { MytosisNode } from "@/lib/mytosis";

type Version = { id: string; root_id: string; root_title: string; version: number; file_path: string; created_at: string };

export function versionLabel(version: number, date: string | Date) {
  const d = new Date(date);
  const p = (n: number) => String(n).padStart(2, "0");
  return `V${version} ${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(-2)}`;
}

export function ExportDialog({ open, onClose, roots, currentId, onSelect, getCanvas, canEdit, process }: {
  open: boolean; onClose: () => void; roots: MytosisNode[]; currentId: string; onSelect: (id: string) => void;
  getCanvas: () => HTMLElement | null; canEdit: boolean; process: boolean;
}) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const current = roots.find((r) => r.id === currentId);
  const versions = useQuery({
    queryKey: ["mytosis-versions"], enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("mytosis_flow_versions").select("id,root_id,root_title,version,file_path,created_at").order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Version[];
    },
  });
  const groups = useMemo(() => {
    const map = new Map<string, Version[]>();
    for (const v of versions.data ?? []) map.set(v.root_id, [...(map.get(v.root_id) ?? []), v]);
    return roots.filter((r) => map.has(r.id)).map((r) => ({ root: r, items: map.get(r.id)! }));
  }, [versions.data, roots]);

  async function capture() {
    const canvas = getCanvas();
    if (!canvas || !current) throw new Error("Fluxograma não encontrado na tela.");
    return createMytosisPdf(canvas);
  }
  async function download() {
    if (!current) return;
    setBusy(true);
    try { await downloadMytosisPdf(await capture(), current.title); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível gerar o PDF."); }
    finally { setBusy(false); }
  }
  const saveVersion = useMutation({
    mutationFn: async () => {
      if (!current) throw new Error("Selecione o fluxograma.");
      const blob = await capture();
      const next = Math.max(0, ...(versions.data ?? []).filter((v) => v.root_id === current.id).map((v) => v.version)) + 1;
      const path = `${current.id}/v${next}-${Date.now()}.pdf`;
      const up = await supabase.storage.from("mytosis-versions").upload(path, blob, { contentType: "application/pdf" });
      if (up.error) throw up.error;
      const { error } = await supabase.from("mytosis_flow_versions").insert({ root_id: current.id, root_title: current.title, version: next, file_path: path });
      if (error) throw error;
      return { blob, label: versionLabel(next, new Date()) };
    },
    onSuccess: ({ label }) => { toast.success(`Versão ${label} salva.`); if (current) setExpanded((s) => new Set(s).add(current.id)); queryClient.invalidateQueries({ queryKey: ["mytosis-versions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  async function openVersion(v: Version) {
    const { data, error } = await supabase.storage.from("mytosis-versions").download(v.file_path);
    if (error || !data) { toast.error("Não foi possível baixar a versão."); return; }
    await downloadMytosisPdf(data, `${v.root_title} ${versionLabel(v.version, v.created_at)}`);
  }
  const working = busy || saveVersion.isPending;
  const toggle = (id: string) => setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !working) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle className="font-normal">Exportar PDF</DialogTitle><DialogDescription>O PDF reproduz o {process ? "fluxograma" : "objetivo"} como exibido em tela.</DialogDescription></DialogHeader>
        <div className="grid gap-1.5"><Label>{process ? "Fluxograma" : "Objetivo"}</Label>
          <SearchableSelect value={currentId} onChange={onSelect} options={roots.map((r) => ({ value: r.id, label: r.title }))} placeholder="Selecione" disabled={working} />
        </div>
        <div className="grid gap-2">
          <Label>Versões salvas</Label>
          {groups.length ? groups.map(({ root, items }) => {
            const isOpen = expanded.has(root.id);
            return <div key={root.id} className="rounded-md border border-border">
              <button type="button" onClick={() => toggle(root.id)} aria-expanded={isOpen} className="flex w-full items-center gap-2 p-2 text-left text-sm">
                {isOpen ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-primary" />}
                <span className="flex-1 truncate">{root.title}</span><span className="text-xs text-muted-foreground">{items.length}</span>
              </button>
              {isOpen ? <ul className="border-t border-border">{items.map((v) => <li key={v.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                <span>{versionLabel(v.version, v.created_at)}</span>
                <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" title="Baixar versão" aria-label={`Baixar ${versionLabel(v.version, v.created_at)}`} onClick={() => void openVersion(v)}><FileDown className="h-3.5 w-3.5" /></Button>
              </li>)}</ul> : null}
            </div>;
          }) : <p className="text-sm text-muted-foreground">{versions.isLoading ? "Carregando…" : "Nenhuma versão salva."}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={working}>Cancelar</Button>
          <Button variant="outline" onClick={() => void download()} disabled={working || !current}>Baixar PDF</Button>
          {canEdit ? <Button variant="outline" onClick={() => saveVersion.mutate()} disabled={working || !current}>{saveVersion.isPending ? "Salvando…" : "Salvar versão"}</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
