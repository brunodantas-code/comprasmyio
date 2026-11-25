import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SupplyAllocationSelector, InheritedProjectClient } from "@/components/supply-allocation-selector";
import { useClients, useClientUnits } from "@/components/clients-tab";
import { useCostCenters } from "@/components/cost-centers-tab";
import { useSupplyTags } from "@/components/supply-tags-tab";
import type { SupplyAllocationType } from "@/lib/supply-allocation";
import type { ReimbursementAllocation } from "@/lib/reimbursement-allocation";

type Props = {
  value: ReimbursementAllocation;
  onChange: (patch: Partial<ReimbursementAllocation>) => void;
  options: SupplyAllocationType[];
  projects: { id: string; name: string; status?: string | null; client_id: string | null }[];
  showCostCenter: boolean;
};

/** Classificação completa de um reembolso: Alocação, Centro de Custo e Projeto/Cliente/Etiqueta. */
export function ReimbursementAllocationFields({ value, onChange, options, projects, showCostCenter }: Props) {
  const { data: clients } = useClients();
  const { data: units } = useClientUnits(value.clientId || undefined);
  const { data: costCenters } = useCostCenters();
  const { data: tags } = useSupplyTags();
  return (
    <div className="space-y-3 border-t pt-3">
      <div className="space-y-2">
        <Label>Alocação</Label>
        <SupplyAllocationSelector value={value.alloc} options={options.filter((o) => o !== "estoque")} hasDestination={!!(value.projectId || value.clientId)}
          onChange={(next) => onChange({ alloc: next === "estoque" ? "projeto" : next, projectId: "", clientId: "", clientUnitId: "", tagId: "" })} />
        {value.alloc === "projeto" && <p className="text-xs text-muted-foreground">Implantação ou upsell — custos associados ao Projeto e ao Cliente vinculado.</p>}
        {value.alloc === "cliente" && <p className="text-xs text-muted-foreground">Sustentação e manutenção do Cliente — custos associados à receita de MRR.</p>}
        {value.alloc === "interna" && <p className="text-xs text-muted-foreground">Qualquer despesa interna não atrelada a clientes ou projetos</p>}
      </div>
      {value.alloc === "interna" && (
        <div className="space-y-2">
          <Label>Etiqueta (opcional)</Label>
          <SearchableSelect value={value.tagId} onChange={(tagId) => onChange({ tagId })} placeholder="Digite ou selecione a etiqueta" options={(tags ?? []).filter((t) => t.active).map((t) => ({ value: t.id, label: t.name }))} />
        </div>
      )}
      {showCostCenter && (
        <div className="space-y-2">
          <Label>Centro de Custo</Label>
          <SearchableSelect value={value.costCenterId} onChange={(costCenterId) => onChange({ costCenterId })} placeholder="Digite ou selecione o centro de custo" options={(costCenters ?? []).filter((c) => c.active).map((c) => ({ value: c.id, label: c.code ? `${c.code} — ${c.name}` : c.name }))} />
        </div>
      )}
      {value.alloc === "projeto" && (
        <div className="space-y-2">
          <Label>Projeto</Label>
          <SearchableSelect value={value.projectId} onChange={(projectId) => onChange({ projectId })} placeholder="Digite ou selecione o projeto" options={projects.filter((p) => !p.status || p.status === "active").map((p) => ({ value: p.id, label: p.name }))} />
          <InheritedProjectClient projectId={value.projectId} projects={projects} clients={clients ?? []} />
        </div>
      )}
      {value.alloc === "cliente" && (
        <div className="space-y-2">
          <Label>Cliente</Label>
          <SearchableSelect value={value.clientId} onChange={(clientId) => onChange({ clientId, clientUnitId: "" })} placeholder="Digite ou selecione o cliente" options={(clients ?? []).map((c) => ({ value: c.id, label: c.name }))} />
          {!!value.clientId && !!units?.length && (
            <div className="space-y-2 pt-2">
              <Label>Filial ou unidade</Label>
              <Select value={value.clientUnitId || "corporativo"} onValueChange={(v) => onChange({ clientUnitId: v === "corporativo" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporativo">Cliente corporativo</SelectItem>
                  {units.filter((u) => u.active).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
