import { useId, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { allocationTypeSchema, type SupplyAllocationType } from "@/lib/supply-allocation";

const labels: Record<SupplyAllocationType, string> = {
  projeto: "Projeto — Implantação/Upsell", cliente: "Cliente — Sustentação", estoque: "Estoque", interna: "Interna",
};

export function SupplyAllocationSelector({ value, options, hasDestination, onChange }: { value: SupplyAllocationType; options: SupplyAllocationType[]; hasDestination: boolean; onChange: (value: SupplyAllocationType) => void }) {
  const id = useId();
  const [pending, setPending] = useState<SupplyAllocationType | null>(null);
  return <>
    <RadioGroup aria-label="Finalidade da alocação" value={value} onValueChange={(next) => {
      const parsed = allocationTypeSchema.parse(next);
      if (parsed === value) return;
      if (hasDestination) setPending(parsed); else onChange(parsed);
    }} className="flex flex-wrap gap-x-6 gap-y-3">
      {options.map((option) => <label key={option} htmlFor={`${id}-${option}`} className="flex cursor-pointer items-center gap-2 text-sm"><RadioGroupItem id={`${id}-${option}`} value={option} />{labels[option]}</label>)}
    </RadioGroup>
    <AlertDialog open={pending !== null} onOpenChange={(open) => { if (!open) setPending(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Alterar a finalidade da compra?</AlertDialogTitle><AlertDialogDescription>O Projeto, Cliente e unidade selecionados serão limpos. O Centro de Custo e os demais dados serão mantidos.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (pending) onChange(pending); setPending(null); }}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </>;
}

export function InheritedProjectClient({ projectId, projects, clients }: { projectId: string; projects: { id: string; client_id: string | null }[]; clients: { id: string; name: string }[] }) {
  if (!projectId) return null;
  const project = projects.find((entry) => entry.id === projectId);
  const client = clients.find((entry) => entry.id === project?.client_id);
  return <div className="space-y-2"><Label>Cliente vinculado ao Projeto</Label><Input aria-label="Cliente vinculado ao Projeto" readOnly value={client?.name ?? ""} placeholder="Projeto sem Cliente vinculado" />{!project?.client_id && <p className="text-sm text-destructive">Vincule um Cliente ao Projeto no Cadastro antes de solicitar a compra.</p>}</div>;
}