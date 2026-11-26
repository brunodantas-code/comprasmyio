import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cdeDraftChanged } from "./draft-changes";

/** Mount with the editor: its opening values are the baseline until it closes. */
export function CdeDraftSave({ value, disabled = false, onSave, label = "Salvar alterações" }: {
  value: unknown;
  disabled?: boolean;
  onSave: () => void;
  label?: string;
}) {
  const [initial] = useState(() => value);
  return <Button type="button" variant="ghost" size="compactIcon" aria-label={label} title={label}
    disabled={disabled || !cdeDraftChanged(value, initial)} onClick={onSave}><Save /></Button>;
}