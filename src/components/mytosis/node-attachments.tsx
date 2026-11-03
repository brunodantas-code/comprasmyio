import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, File, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const bucket = "mytosis-attachments";

function AttachmentThumbnail({ name, type, url, file }: { name: string; type: string; url?: string; file?: File }) {
  const [localUrl, setLocalUrl] = useState<string>();
  useEffect(() => {
    if (!file || !type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    setLocalUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, type]);
  const source = url ?? localUrl;
  return type.startsWith("image/") && source
    ? <a href={source} target="_blank" rel="noopener noreferrer" className="shrink-0" title={name}><img src={source} alt={name} className="size-16 rounded-md border border-border bg-muted object-contain" loading="lazy" /></a>
    : <File className="size-4 shrink-0 text-muted-foreground" />;
}

export async function uploadNodeAttachments(nodeId: string, files: File[]) {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Entre novamente para anexar arquivos.");
  for (const file of files) {
    if (!file.size) throw new Error(`O arquivo ${file.name} está vazio.`);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180);
    const path = `${auth.user.id}/${nodeId}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    const result = await supabase.from("mytosis_node_attachments").insert({ node_id: nodeId, uploaded_by: auth.user.id, file_name: file.name.slice(0, 255), storage_path: path, content_type: file.type || "application/octet-stream", file_size: file.size });
    if (result.error) { await supabase.storage.from(bucket).remove([path]); throw result.error; }
  }
}

export function NodeAttachments({ nodeId, canEdit, pending = [], onPendingChange, onBusyChange }: { nodeId?: string; canEdit: boolean; pending?: File[]; onPendingChange?: (files: File[]) => void; onBusyChange?: (busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const attachments = useQuery({ queryKey: ["mytosis-attachments", nodeId], enabled: !!nodeId, queryFn: async () => {
    if (!nodeId) return [];
    const { data, error } = await supabase.from("mytosis_node_attachments").select("*").eq("node_id", nodeId).order("created_at");
    if (error) throw error;
    return Promise.all((data ?? []).map(async (file) => {
      const [{ data: signed }, { data: preview }] = await Promise.all([
        supabase.storage.from(bucket).createSignedUrl(file.storage_path, 600, { download: file.file_name }),
        file.content_type.startsWith("image/") ? supabase.storage.from(bucket).createSignedUrl(file.storage_path, 600) : Promise.resolve({ data: null }),
      ]);
      return { ...file, url: signed?.signedUrl, previewUrl: preview?.signedUrl };
    }));
  }, staleTime: 300_000 });
  async function upload(files: File[]) {
    if (!nodeId) { onPendingChange?.([...pending, ...files]); return; }
    setBusy(true); onBusyChange?.(true);
    try { await uploadNodeAttachments(nodeId, files); toast.success("Anexo salvo."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível anexar o arquivo."); }
    finally { await Promise.all([queryClient.invalidateQueries({ queryKey: ["mytosis-attachments", nodeId] }), queryClient.invalidateQueries({ queryKey: ["mytosis"] })]); setBusy(false); onBusyChange?.(false); }
  }
  async function remove(id: string, path: string) {
    if (!window.confirm("Excluir este anexo?")) return;
    setBusy(true); onBusyChange?.(true);
    try {
      const storage = await supabase.storage.from(bucket).remove([path]);
      if (storage.error) throw storage.error;
      const result = await supabase.from("mytosis_node_attachments").delete().eq("id", id);
      if (result.error) throw result.error;
      await queryClient.invalidateQueries({ queryKey: ["mytosis-attachments", nodeId] });
      await queryClient.invalidateQueries({ queryKey: ["mytosis"] });
    } catch { toast.error("Não foi possível excluir o anexo."); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  return <section className="grid gap-2 border-t border-border pt-3">
    <div className="flex items-center justify-between"><span className="text-sm font-medium">Anexo</span>{canEdit ? <Button type="button" variant="outline" size="icon" title="Anexar foto ou arquivo" aria-label="Anexar foto ou arquivo" disabled={busy} onClick={() => input.current?.click()}><Paperclip className="size-4" /></Button> : null}</div>
    <input ref={input} type="file" multiple className="hidden" aria-label="Arquivos da etapa" disabled={busy} onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; if (files.length) void upload(files); }} />
    {attachments.isLoading ? <p className="text-xs text-muted-foreground">Carregando anexos…</p> : attachments.error ? <p role="alert" className="text-xs text-destructive">Não foi possível carregar os anexos.</p> : null}
    {(attachments.data ?? []).map((file) => <div key={file.id} className="flex min-w-0 items-center gap-2 py-1"><AttachmentThumbnail name={file.file_name} type={file.content_type} url={file.previewUrl} /><span className="min-w-0 flex-1 break-all text-sm">{file.file_name}</span>{file.url ? <a href={file.url} aria-label={`Baixar ${file.file_name}`} title={`Baixar ${file.file_name}`} className="shrink-0 text-primary"><Download className="size-4" /></a> : null}{canEdit ? <Button type="button" variant="ghost" size="icon" aria-label={`Excluir anexo ${file.file_name}`} title="Excluir anexo" disabled={busy} onClick={() => void remove(file.id, file.storage_path)}><Trash2 className="size-3" /></Button> : null}</div>)}
    {pending.map((file, index) => <div key={`${file.name}-${index}`} className="flex min-w-0 items-center gap-2 text-sm"><AttachmentThumbnail name={file.name} type={file.type} file={file} /><span className="min-w-0 flex-1 break-all">{file.name}</span><Button type="button" variant="ghost" size="icon" aria-label={`Remover anexo ${file.name}`} title="Remover anexo" onClick={() => onPendingChange?.(pending.filter((_, i) => i !== index))}><Trash2 className="size-3" /></Button></div>)}
  </section>;
}

export function NodeAttachmentDialog({ node, canEdit, onClose }: { node: { id: string; title: string } | null; canEdit: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return <Dialog open={!!node} onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg" onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }} onInteractOutside={(event) => { if (busy) event.preventDefault(); }}><DialogHeader><DialogTitle className="font-normal">{node?.title}</DialogTitle></DialogHeader>{node ? <NodeAttachments nodeId={node.id} canEdit={canEdit} onBusyChange={setBusy} /> : null}</DialogContent></Dialog>;
}