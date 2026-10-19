import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { installationApproved, type InstallationApproval } from "@/lib/site-survey-installation-scope";
import { proposalGroupQuantities, proposalScopeSchema, proposalShopKioskComparison } from "@/lib/site-survey-proposal";

type Point = { id: string; source: string; shop_name: string; luc_number: string };
export function useInstallationScope(visitId: string) {
  const [approvals, setApprovals] = useState<InstallationApproval[]>([]);
  const [contract, setContract, setContractRaw] = useState as never;
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
export function ContractedScopeFields({ scope, canEdit, onChanged, approvedShopKiosk }: { scope: ReturnType<typeof useInstallationScope>; canEdit: boolean; onChanged?: () => void; approvedShopKiosk?: { water: number; energy: number } }) {
  const groups = proposalGroupQuantities(scope.contract);
  const comparison = approvedShopKiosk ? proposalShopKioskComparison(scope.contract, approvedShopKiosk.water, approvedShopKiosk.energy) : [];
  const chip = (label: string, value: number | null, ariaLabel: string) => { const active = value !== null && value > 0; return <div aria-label={ariaLabel} className={`flex min-w-0 items-center gap-2 rounded-sm px-2.5 py-1.5 sm:w-44 ${active ? "bg-myio-green/5" : ""}`}><span className={`h-5 w-1.5 shrink-0 rounded-full ${active ? "bg-myio-green" : "bg-muted-foreground/25"}`} aria-hidden="true" /><span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span><strong className={`text-base leading-none tabular-nums ${active ? "text-foreground" : "text-muted-foreground/70"}`}>{value ?? "—"}</strong></div>; };
  return <div className="space-y-3 pb-3" aria-label="Pontos contratados por grupo"><h4 className="text-sm font-semibold">Pontos contratados · Proposta aprovada</h4><div className="grid max-w-2xl grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-2">{groups.map((group) => <div key={group.key} className="contents"><span className="min-w-0 text-xs font-medium">{group.label}</span>{chip("Água", group.water, `${group.label} — Água`)}{chip("Energia", group.energy, `${group.label} — Energia`)}</div>)}</div>{comparison.length ? <div className="space-y-1" aria-label="Conferência entre proposta e instalações aprovadas">{comparison.map((item) => item.matches === null ? null : <p key={item.discipline} className={`text-xs ${item.matches ? "text-muted-foreground" : "font-medium text-amber-600"}`}>{item.matches ? `${item.label}: ${item.approved} aprovados no cadastro, conforme a proposta (${item.proposal}).` : `${item.label}: proposta prevê ${item.proposal}, mas ${item.approved} estão aprovados no cadastro (diferença de ${Math.abs((item.proposal ?? 0) - item.approved)}).`}</p>)}</div> : null}</div>;
}