import { Pencil } from "lucide-react";
import { useContext, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CdeCategoryNameContext } from "./cde-category-name";
import { CdeDraftSave } from "./cde-draft-save";
import { CdeButton, CdeNumber } from "./cde-button";

/** Top-level categories stay unframed; green bands belong to subcategories. */
export function CdeCategoryHeader({ number, title, hint, open, onToggle, action, handle }: {
  handle?: ReactNode;
  number: ReactNode;
  title: string;
  hint?: string;
  open?: boolean;
  onToggle?: () => void;
  action?: ReactNode;
}) {
  const category = useContext(CdeCategoryNameContext);
  const editable = category?.number === String(number) ? category : null;
  const displayTitle = editable?.title ?? title;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  async function saveName() {
    if (!editable || !draft.trim() || saving) return;
    setSaving(true);
    try { if (await editable.onSave(draft.trim())) setEditing(false); }
    finally { setSaving(false); }
  }
  const content = <>
    <CdeNumber>{number}</CdeNumber>
    <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1"><span className="cde-cat-title min-w-0 break-words font-normal">{displayTitle}</span>
      {hint && <span className="min-w-0 whitespace-normal break-words cde-cat-hint font-normal sm:truncate" title={hint}>{hint}</span>}
    </span>
  </>;
  return <><div className="cde-cat-band flex min-h-12 items-center gap-3 border-b px-2 py-3">
    {handle}
    {onToggle ? <Button variant="ghost" aria-expanded={open} onClick={onToggle} className="h-auto min-w-0 flex-1 justify-start gap-3 rounded-none p-0 text-left hover:bg-transparent">{content}</Button>
      : <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>}
    {action}
    {editable && <Button variant="ghost" size="compactIcon" aria-label={`Editar nome do item ${number}`} title={`Editar ${displayTitle}`} onClick={() => { setDraft(displayTitle); setEditing(true); }}><Pencil /></Button>}
    {onToggle && <CdeButton group="toggle" screen="components/cde/cde-workspace.tsx" aria-label={`${open ? "Recolher" : "Exibir"} ${displayTitle}`} title={`${open ? "Recolher" : "Exibir"} ${displayTitle}`} aria-expanded={open} onClick={onToggle} />}
  </div>
    <Dialog open={editing} onOpenChange={value => { if (!saving) setEditing(value); }}>
      <DialogContent topActions={editing ? <CdeDraftSave value={draft.trim()} disabled={saving || !draft.trim()} onSave={saveName} label="Salvar nome do item" /> : undefined}>
        <DialogHeader><DialogTitle>Editar nome do item {number}</DialogTitle></DialogHeader>
        <div className="space-y-2"><Label htmlFor={`cde-category-name-${number}`}>Nome</Label><Input id={`cde-category-name-${number}`} value={draft} onChange={event => setDraft(event.target.value)} /></div>
      </DialogContent>
    </Dialog>
  </>;
}