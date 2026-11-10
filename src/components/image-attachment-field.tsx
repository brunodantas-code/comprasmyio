import { useEffect, useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ImageAttachmentField({ id, files, onChange }: { id: string; files: File[]; onChange: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => { const urls = files.map(f => URL.createObjectURL(f)); setPreviews(urls); return () => urls.forEach(url => URL.revokeObjectURL(url)); }, [files]);
  function add(incoming: File[]) {
    const valid = incoming.filter(f => f.type.startsWith("image/") && f.size > 0 && f.size <= 10 * 1024 * 1024);
    if (valid.length !== incoming.length) toast.error("Selecione imagens de até 10 MB.");
    onChange([...files, ...valid]);
  }
  return <div tabIndex={0} aria-label="Campo de anexos" className="space-y-2 outline-none focus-visible:ring-2 focus-visible:ring-ring" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); e.stopPropagation(); add(Array.from(e.dataTransfer.files)); }} onPaste={e => { const incoming = Array.from(e.clipboardData.files); if (incoming.length) { e.preventDefault(); add(incoming); } }}>
    <input ref={input} id={id} type="file" accept="image/*" multiple className="hidden" onChange={e => { add(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
    <Button type="button" variant="ghost" className="!h-auto !max-w-none !w-full !justify-start whitespace-normal !bg-transparent !border-0 !shadow-none text-left text-muted-foreground" title="Selecionar da galeria" onClick={() => input.current?.click()}><Paperclip className="size-5 shrink-0" /><span>Selecione da galeria ou arraste e cole o arquivo neste campo</span></Button>
    <div className="flex flex-wrap gap-2">{previews.map((url, i) => <span key={url} className="relative inline-block"><img src={url} alt={files[i]?.name ?? "Imagem selecionada"} className="size-20 rounded-md object-cover" /><Button type="button" variant="ghost" size="compactIcon" className="absolute right-0 top-0 bg-background" aria-label={`Remover imagem ${i + 1}`} title="Remover imagem selecionada" onClick={() => onChange(files.filter((_, index) => index !== i))}><X /></Button></span>)}</div>
  </div>;
}