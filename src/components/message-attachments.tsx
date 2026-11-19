import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MESSAGE_ATTACHMENT_MAX_BYTES, filterValidMessageAttachments } from "@/components/message-attachment-rules";

export { MESSAGE_ATTACHMENT_MAX_BYTES };

export type MessageAttachmentRow = {
  id: string;
  file_name: string;
  storage_path: string;
  content_type: string | null;
  message_id?: string | null;
};

/** Uploads each file to the app's private bucket and records it, rolling back the object when the record fails. */
export async function uploadMessageAttachments({ bucket, files, pathFor, insert }: {
  bucket: string;
  files: File[];
  pathFor: (file: File, safeName: string) => string;
  insert: (file: File, path: string) => PromiseLike<{ error: { message: string } | null }>;
}) {
  for (const file of files) {
    if (!file.size) throw new Error(`O arquivo ${file.name} está vazio.`);
    if (file.size > MESSAGE_ATTACHMENT_MAX_BYTES) throw new Error(`Selecione arquivos de até 10 MB.`);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180);
    const path = pathFor(file, safeName);
    const uploaded = await supabase.storage.from(bucket).upload(path, file);
    if (uploaded.error) throw uploaded.error;
    const inserted = await insert(file, path);
    if (inserted.error) {
      await supabase.storage.from(bucket).remove([path]);
      throw new Error(inserted.error.message);
    }
  }
}

/** Composer field shared by every conversation: clip symbol, gallery picker, drag, paste and thumbnails. */
export function MessageAttachmentField({ id, files, onChange, label = "Prints e arquivos (até 10 MB por arquivo)" }: {
  id: string;
  files: File[];
  onChange: (files: File[]) => void;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<(string | null)[]>([]);
  useEffect(() => {
    const urls = files.map(f => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null));
    setPreviews(urls);
    return () => urls.forEach(url => url && URL.revokeObjectURL(url));
  }, [files]);
  function add(incoming: File[]) {
    const valid = filterValidMessageAttachments(incoming);
    if (valid.length !== incoming.length) toast.error("Selecione arquivos de até 10 MB.");
    if (valid.length) onChange([...files, ...valid]);
  }
  return <div className="space-y-2">
    <p className="flex items-center gap-2 text-sm font-semibold"><Paperclip className="h-4 w-4" />{label}</p>
    <input ref={input} id={id} type="file" multiple className="hidden" onChange={event => { add(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    <div tabIndex={0} aria-label="Campo de anexos" className="space-y-2 rounded-md border border-dashed border-border p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); event.stopPropagation(); add(Array.from(event.dataTransfer.files)); }} onPaste={event => { const incoming = Array.from(event.clipboardData.files); if (incoming.length) { event.preventDefault(); add(incoming); } }}>
      <Button type="button" variant="ghost" className="!h-auto !max-w-none !w-full !justify-start whitespace-normal !bg-transparent !border-0 !shadow-none text-left text-muted-foreground" title="Selecionar da galeria" onClick={() => input.current?.click()}>
        <Paperclip className="size-5 shrink-0" /><span>Selecione da galeria ou arraste e cole o arquivo neste campo</span>
      </Button>
      <div className="flex flex-wrap gap-2">{files.map((file, index) => <span key={`${file.name}-${index}`} className="relative inline-flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
        {previews[index] ? <img src={previews[index]!} alt={file.name} className="size-full object-cover" /> : <span className="flex size-full flex-col items-center justify-center gap-1 px-1 text-center"><Paperclip className="size-5 text-muted-foreground" /><span className="line-clamp-2 text-[10px] leading-3 text-muted-foreground">{file.name}</span></span>}
        <Button type="button" variant="ghost" size="compactIcon" className="absolute right-0 top-0 bg-background" aria-label={`Remover anexo ${file.name}`} title="Remover anexo selecionado" onClick={() => onChange(files.filter((_, i) => i !== index))}><X /></Button>
      </span>)}</div>
    </div>
  </div>;
}

/** One saved attachment: image thumbnails open a preview, other files keep the clip symbol and a download. */
export function MessageAttachmentThumb({ bucket, attachment, onOpen, onDelete }: {
  bucket: string;
  attachment: MessageAttachmentRow;
  onOpen?: (attachment: MessageAttachmentRow) => void;
  onDelete?: (attachment: MessageAttachmentRow) => void;
}) {
  const isImage = (attachment.content_type ?? "").startsWith("image/");
  const preview = useQuery({
    queryKey: ["message-attachment-preview", bucket, attachment.storage_path],
    enabled: isImage,
    staleTime: 240_000,
    gcTime: 300_000,
    queryFn: async () => {
      const result = await supabase.storage.from(bucket).createSignedUrl(attachment.storage_path, 300);
      if (result.error) throw result.error;
      return result.data.signedUrl;
    },
  });
  if (isImage) return <span className="relative inline-block">
    <Button variant="ghost" className="!size-20 !min-w-0 shrink-0 overflow-hidden !p-0" aria-label={`Visualizar anexo: ${attachment.file_name}`} title={attachment.file_name} onClick={() => onOpen?.(attachment)}>
      {preview.data ? <img src={preview.data} alt={attachment.file_name} loading="lazy" className="size-full rounded-md object-cover" /> : <Paperclip className="size-5 text-muted-foreground" />}
    </Button>
    {onDelete ? <Button type="button" variant="ghost" size="compactIcon" className="absolute right-0 top-0 bg-background" aria-label={`Excluir anexo ${attachment.file_name}`} title="Excluir anexo" onClick={() => onDelete(attachment)}><X /></Button> : null}
  </span>;
  return <span className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-2 py-1">
    <Paperclip className="size-4 shrink-0 text-muted-foreground" />
    <span className="min-w-0 flex-1 break-all text-sm">{attachment.file_name}</span>
    <Button type="button" variant="ghost" size="compactIcon" title={`Baixar ${attachment.file_name}`} aria-label={`Baixar ${attachment.file_name}`} onClick={() => onOpen?.(attachment)}><Download className="size-4" /></Button>
    {onDelete ? <Button type="button" variant="ghost" size="compactIcon" title="Excluir anexo" aria-label={`Excluir anexo ${attachment.file_name}`} onClick={() => onDelete(attachment)}><X className="size-3" /></Button> : null}
  </span>;
}

/** Renders the attachments of one message below its text. */
export function MessageAttachmentList({ bucket, attachments, onOpen, onDelete }: {
  bucket: string;
  attachments: MessageAttachmentRow[];
  onOpen?: (attachment: MessageAttachmentRow) => void;
  onDelete?: (attachment: MessageAttachmentRow) => void;
}) {
  if (!attachments.length) return null;
  return <div className="mt-2 flex flex-wrap gap-2">{attachments.map(attachment => <MessageAttachmentThumb key={attachment.id} bucket={bucket} attachment={attachment} onOpen={onOpen} onDelete={onDelete} />)}</div>;
}
