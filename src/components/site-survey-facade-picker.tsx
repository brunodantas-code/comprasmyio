import { useRef } from "react";
import { Camera, Images } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function SiteSurveyFacadePicker({ id, hasPhoto, onFile, onOpen }: {
  id: string;
  hasPhoto: boolean;
  onFile: (file: File | undefined) => void;
  onOpen?: () => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  return <div data-survey-facade-picker className="contents">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="action" onClick={onOpen}>
          <Camera className="h-4 w-4" />{hasPhoto ? "Trocar fachada" : "Foto da fachada"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => cameraRef.current?.click()}><Camera className="h-4 w-4" />Tirar foto</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => galleryRef.current?.click()}><Images className="h-4 w-4" />Escolher da galeria</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <input id={id} ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; onFile(file); }} />
    <input id={`${id}-gallery`} ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; onFile(file); }} />
  </div>;
}