import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Paperclip, X } from 'lucide-react';
import { CdeButton } from '@/components/cde/cde-button';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { LegalAttachment } from '@/lib/legal';
import { filterValidMessageAttachments } from '@/components/message-attachment-rules';
import { toast } from 'sonner';

function Attachment({ attachment }: { attachment: LegalAttachment }) {
  const image = attachment.contentType.startsWith('image/');
  const preview = useQuery({ queryKey: ['legal-attachment', attachment.path], enabled: image, staleTime: 240000, queryFn: async () => {
    const result = await supabase.storage.from(attachment.bucket ?? 'legal-attachments').createSignedUrl(attachment.path, 300);
    if (result.error) throw result.error;
    return result.data.signedUrl;
  } });
  async function open() {
    const tab = window.open('', '_blank');
    try {
      const result = await supabase.storage.from(attachment.bucket ?? 'legal-attachments').createSignedUrl(attachment.path, 60);
      if (result.error) throw result.error;
      if (tab) tab.location.href = result.data.signedUrl;
      else window.location.assign(result.data.signedUrl);
    } catch { tab?.close(); toast.error('Não foi possível abrir o anexo'); }
  }
  return <Button variant="ghost" className="!h-auto !w-auto !min-w-0 !justify-start !p-0 whitespace-normal text-left" title={attachment.name} aria-label={`Abrir anexo ${attachment.name}`} onClick={open}>{image && preview.data ? <img src={preview.data} alt={attachment.name} className="size-20 shrink-0 rounded-md object-cover" /> : <Paperclip className="size-4 shrink-0" />}<span className="min-w-0 break-all text-xs">{attachment.name}</span></Button>;
}

export function MinutesAttachments({ id, attachments = [], files = [], onFilesChange, onRemove, disabled = false }: { id: string; attachments?: LegalAttachment[]; files?: File[]; onFilesChange?: (files: File[]) => void; onRemove?: (id: string) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  function add(incoming: File[]) {
    const valid = filterValidMessageAttachments(incoming);
    if (valid.length !== incoming.length) toast.error('Selecione arquivos de até 10 MB.');
    if (!disabled) onFilesChange?.([...files, ...valid]);
  }
  if (!onFilesChange && !attachments.length) return null;
  return <div className="space-y-2" aria-label={id} onDragOver={e => { if (onFilesChange) e.preventDefault(); }} onDrop={e => { if (onFilesChange) { e.preventDefault(); e.stopPropagation(); add(Array.from(e.dataTransfer.files)); } }} onPaste={e => { if (onFilesChange && e.clipboardData.files.length) { e.preventDefault(); add(Array.from(e.clipboardData.files)); } }}>
    <div className="flex items-center justify-between gap-2"><h4 className="text-sm text-muted-foreground">Anexos</h4>{onFilesChange && <><input ref={input} type="file" multiple className="hidden" aria-label={`Selecionar anexos ${id}`} disabled={disabled} onChange={e => { add(Array.from(e.target.files ?? [])); e.target.value = ''; }} /><CdeButton group="attach" screen="components/legal/minutes-attachments.tsx" title="Anexar documento ou foto" aria-label={`Anexar documento ou foto ${id}`} disabled={disabled} onClick={() => input.current?.click()} /></>}</div>
    <div className="flex flex-wrap gap-3">{attachments.map(a => <span key={a.id} className="flex min-w-0 items-center gap-2"><Attachment attachment={a} />{onRemove && <Button variant="ghost" size="compactIcon" title="Remover anexo" aria-label={`Remover anexo ${a.name}`} disabled={disabled} onClick={() => onRemove(a.id)}><X /></Button>}</span>)}{files.map((f, i) => <span key={`${f.name}-${i}`} className="flex min-w-0 items-center gap-2 text-xs"><Paperclip className="size-4 shrink-0" /><span className="min-w-0 break-all">{f.name}</span><Button variant="ghost" size="compactIcon" title="Remover arquivo selecionado" aria-label={`Remover arquivo ${f.name}`} disabled={disabled} onClick={() => onFilesChange?.(files.filter((_, n) => n !== i))}><X /></Button></span>)}</div>
  </div>;
}