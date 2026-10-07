import { useRef, useState } from "react";
import { Camera, Images } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function SiteSurveyFacadePicker({ id, hasPhoto, onFile, onOpen, askToStart = false, canStart = true }: {
  id: string;
  hasPhoto: boolean;
  onFile: (file: File, startVisit: boolean) => Promise<unknown>;
  onOpen?: () => void;
  askToStart?: boolean;
  canStart?: boolean;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const send = async (file: File, startVisit: boolean) => {
    setSaving(true);
    try { await onFile(file, startVisit); setPendingFile(null); }
    finally { setSaving(false); }
  };
  const choose = (file: File | undefined) => {
    if (!file) return;
    if (askToStart) setPendingFile(file);
    else void send(file, false);
  };
  return <div data-survey-facade-picker className="contents">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="action" onClick={onOpen} disabled={saving}>
          <Camera className="h-4 w-4" />{hasPhoto ? "Trocar fachada" : "Foto da fachada"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => cameraRef.current?.click()}><Camera className="h-4 w-4" />Tirar foto</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => galleryRef.current?.click()}><Images className="h-4 w-4" />Escolher da galeria</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <input id={id} ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; choose(file); }} />
    <input id={`${id}-gallery`} ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; choose(file); }} />
    <Dialog open={Boolean(pendingFile)} onOpenChange={(open) => { if (!open && !saving) setPendingFile(null); }}>
      <DialogContent><DialogHeader><DialogTitle>Deseja iniciar a visita deste ponto?</DialogTitle><DialogDescription>A foto pode iniciar a visita da loja ou ambiente, ou apenas completar o cadastro sem registrar o início.</DialogDescription></DialogHeader>
        <DialogFooter className="flex-wrap gap-2">
          <Button type="button" variant="action" disabled={saving} onClick={() => setPendingFile(null)}>Cancelar</Button>
          <Button type="button" variant="action" disabled={saving} onClick={() => { if (pendingFile) void send(pendingFile, false); }}>Somente completar cadastro</Button>
          <Button type="button" variant="action" disabled={saving || !canStart} onClick={() => { if (pendingFile) void send(pendingFile, true); }}><Camera className="h-4 w-4" />{saving ? "Salvando..." : "Iniciar visita"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}