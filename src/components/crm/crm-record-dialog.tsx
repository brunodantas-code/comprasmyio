import { useEffect, useState, type ReactNode } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

export type FieldSpec = { key: string; label: string; type?: "text" | "textarea" | "number" | "date" | "select" | "email"; options?: { value: string; label: string }[]; required?: boolean; wide?: boolean; placeholder?: string; render?: (values: Values, change: (v: Values) => void) => ReactNode };
type Values = Record<string, string>;

/** Shared CRM editor: fields in a responsive grid, ghost floppy save, confirmed delete; caller persists. */
export function CrmRecordDialog({ open, title, fields, initial, onClose, onSave, onDelete, deleteTitle, footer }: {
  open: boolean; title: string; fields: FieldSpec[]; initial: Values; onClose: () => void;
  onSave: (v: Values) => Promise<void>; onDelete?: () => Promise<void>; deleteTitle?: string; footer?: (v: Values) => ReactNode;
}) {
  const [v, setV] = useState<Values>(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setV(initial); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  async function save() {
    const miss = fields.find((f) => f.required && !v[f.key]?.trim());
    if (miss) { toast.error(`Preencha ${miss.label}.`); return; }
    setSaving(true);
    try { await onSave(v); onClose(); } catch (e) { toast.error(e instanceof Error && e.message ? e.message : "Não foi possível salvar."); } finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-1 items-end gap-x-6 gap-y-4 sm:grid-cols-2">
        {fields.map((f) => <div key={f.key} className={`min-w-0 space-y-1 ${f.wide || f.type === "textarea" ? "sm:col-span-2" : ""}`}>
          <Label htmlFor={`crm-${f.key}`}>{f.label}{f.required ? " *" : ""}</Label>
          {f.render ? f.render(v, setV) : f.type === "textarea" ? <Textarea id={`crm-${f.key}`} rows={3} value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
            : f.type === "select" ? <Select value={v[f.key] || "__none"} onValueChange={(x) => setV({ ...v, [f.key]: x === "__none" ? "" : x })}>
              <SelectTrigger id={`crm-${f.key}`} aria-label={f.label}><SelectValue /></SelectTrigger>
              <SelectContent>{!f.required && <SelectItem value="__none">—</SelectItem>}{(f.options ?? []).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
            : <Input id={`crm-${f.key}`} type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "email" ? "email" : "text"} inputMode={f.type === "number" ? "decimal" : undefined} placeholder={f.placeholder} value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />}
        </div>)}
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button variant="ghost" size="icon" aria-label="Salvar" title="Salvar" onClick={save} disabled={saving}><Save /></Button>
        {onDelete && <ConfirmDeleteButton title={deleteTitle ?? "Excluir registro?"} description="Esta ação não pode ser desfeita." onConfirm={async () => { try { await onDelete(); onClose(); } catch { toast.error("Não foi possível excluir. Verifique registros vinculados."); } }} />}
        <div className="ml-auto">{footer?.(v)}</div>
      </div>
    </DialogContent>
  </Dialog>;
}

/** Text form value → nullable column value. */
export const nn = (s: string | undefined) => (s && s.trim() ? s.trim() : null);
export const num = (s: string | undefined) => (s && s.trim() ? Number(s.replace(",", ".")) : null);
