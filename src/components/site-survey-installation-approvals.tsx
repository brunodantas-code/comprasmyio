import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { installationApproved, type InstallationApproval } from "@/lib/site-survey-installation-scope";

type Point = { id: string; source: string; shop_name: string; luc_number: string };
export function useInstallationScope(visitId: string) {
  const [approvals, setApprovals] = useState<InstallationApproval[]>([]);
  const [contract, setContract] = useState({ hydraulic_shops: "", hydraulic_general: "", electrical: "" });
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const [a, c] = await Promise.all([supabase.from("site_survey_installation_approvals").select("*").eq("visit_id", visitId), supabase.from("site_survey_contracted_scope").select("*").eq("visit_id", visitId).maybeSingle()]);
    if (a.error || c.error) return toast.error(a.error?.message ?? c.error?.message);
    setApprovals(a.data ?? []);
    setContract({ hydraulic_shops: String(c.data?.proposal_storage_path ? c.data.hydraulic_shops ?? "" : ""), hydraulic_general: String(c.data?.proposal_storage_path ? c.data.hydraulic_general ?? "" : ""), electrical: String(c.data?.proposal_storage_path ? c.data.electrical ?? "" : "") });
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
  const fields = ([ ["hydraulic_shops", "Hidrômetros de lojas/quiosques"], ["hydraulic_general", "Hidrômetros gerais"], ["electrical", "Pontos elétricos"] ] as const).map(([key, label]) => ({ key, label }));
  return <div className="space-y-3 border-b pb-3"><h4 className="text-sm font-semibold">Pontos contratados · Proposta aprovada</h4><div className="flex flex-wrap items-start gap-x-6 gap-y-3">{fields.map((field) => <div key={field.key} className="min-w-0 space-y-1"><div aria-label={field.label} className="flex h-10 w-40 min-w-0 items-center gap-2 border-b text-base tabular-nums"><span className={`h-5 w-1.5 shrink-0 rounded-full ${scope.contract[field.key] ? "bg-myio-green" : "bg-muted-foreground/25"}`} aria-hidden="true" />{scope.contract[field.key] || "—"}</div><div className="min-h-5 text-[11px] leading-tight text-muted-foreground">{field.label}</div></div>)}</div></div>;
}