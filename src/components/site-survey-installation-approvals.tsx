import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { installationApproved, type InstallationApproval } from "@/lib/site-survey-installation-scope";
import { proposalGroupQuantities, proposalScopeSchema } from "@/lib/site-survey-proposal";

type Point = { id: string; source: string; shop_name: string; luc_number: string };
export function useInstallationScope(visitId: string) {
  const [approvals, setApprovals] = useState<InstallationApproval[]>([]);
  const [contract, setContract] = useState<{ hydraulic_shops: number | null; hydraulic_general: number | null; electrical: number | null; scope_breakdown: { hydraulic_entry: number | null; electrical_shops: number | null; electrical_entry: number | null } | null }>({ hydraulic_shops: null, hydraulic_general: null, electrical: null, scope_breakdown: null });
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const [a, c] = await Promise.all([supabase.from("site_survey_installation_approvals").select("*").eq("visit_id", visitId), supabase.from("site_survey_commercial_proposals").select("hydraulic_shops,hydraulic_general,electrical,scope_breakdown").eq("visit_id", visitId).maybeSingle()]);
    if (a.error || c.error) return toast.error(a.error?.message ?? c.error?.message);
    setApprovals(a.data ?? []);
    const breakdown = proposalScopeSchema.shape.scope_breakdown.safeParse(c.data?.scope_breakdown);
    setContract({ hydraulic_shops: c.data?.hydraulic_shops ?? null, hydraulic_general: c.data?.hydraulic_general ?? null, electrical: c.data?.electrical ?? null, scope_breakdown: breakdown.success ? breakdown.data ?? null : null });
  };
  useEffect(() => { void load(); const onProposal = (event: Event) => { if ((event as CustomEvent<string>).detail === visitId) void load(); }; window.addEventListener("survey-proposal-changed", onProposal); return () => window.removeEventListener("survey-proposal-changed", onProposal); }, [visitId]);
  const saveApproval = async (point: Point, discipline: "hydraulic" | "electrical", checked: boolean, onChanged?: () => void) => {
    setBusy(true);
    const previous = approvals.find((a) => a.point_kind === point.source && a.point_id === point.id);
    const { error } = await supabase.from("site_survey_installation_approvals").upsert({ visit_id: visitId, point_kind: point.source, point_id: point.id, hydraulic_approved: discipline === "hydraulic" ? checked : previous?.hydraulic_approved ?? false, electrical_approved: discipline === "electrical" ? checked : previous?.electrical_approved ?? false });
    if (error) toast.error(error.message); else { await load(); onChanged?.(); }
    setBusy(false);
  };
  return { approvals, contract, busy, saveApproval };
}
export function InstallationApprovalCell({ point, scope, canEdit, onChanged }: { point: Point; scope: ReturnType<typeof useInstallationScope>; canEdit: boolean; onChanged?: () => void }) {
  return <div className="flex items-center gap-3 whitespace-nowrap">{(["hydraulic", "electrical"] as const).map((discipline) => <label key={discipline} className="flex items-center gap-1.5 text-xs"><Checkbox aria-label={`Instalação ${discipline === "hydraulic" ? "hidráulica" : "elétrica"} aprovada — ${point.shop_name}`} checked={installationApproved(scope.approvals, point.source, point.id, discipline)} disabled={!canEdit || scope.busy} onCheckedChange={(checked) => void scope.saveApproval(point, discipline, checked === true, onChanged)} />{discipline === "hydraulic" ? "Água" : "Energia"}</label>)}</div>;
}
export function ContractedScopeFields({ scope, canEdit, onChanged }: { scope: ReturnType<typeof useInstallationScope>; canEdit: boolean; onChanged?: () => void }) {
  const groups = proposalGroupQuantities(scope.contract);
  return <div className="space-y-3 border-b pb-3" aria-label="Pontos contratados por grupo"><h4 className="text-sm font-semibold">Pontos contratados · Proposta aprovada</h4><div className="grid max-w-2xl grid-cols-[minmax(0,1fr)_5rem_5rem] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_8rem_8rem]"><span /><span className="text-xs font-semibold">Água</span><span className="text-xs font-semibold">Energia</span>{groups.map((group) => <div key={group.key} className="contents"><span className="min-w-0 text-xs font-medium">{group.label}</span>{(["water", "energy"] as const).map((discipline) => <div key={discipline} aria-label={`${group.label} — ${discipline === "water" ? "Água" : "Energia"}`} className="flex h-9 min-w-0 items-center gap-2 border-b text-base tabular-nums"><span className={`h-5 w-1.5 shrink-0 rounded-full ${group[discipline] !== null && group[discipline] > 0 ? "bg-myio-green" : "bg-muted-foreground/25"}`} aria-hidden="true" />{group[discipline] ?? "—"}</div>)}</div>)}</div></div>;
}