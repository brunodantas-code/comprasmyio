import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    setContract({ hydraulic_shops: String(c.data?.hydraulic_shops ?? ""), hydraulic_general: String(c.data?.hydraulic_general ?? ""), electrical: String(c.data?.electrical ?? "") });
  };
  useEffect(() => { void load(); }, [visitId]);
  const saveApproval = async (point: Point, discipline: "hydraulic" | "electrical", checked: boolean, onChanged?: () => void) => {
    setBusy(true);
    const previous = approvals.find((a) => a.point_kind === point.source && a.point_id === point.id);
    const { error } = await supabase.from("site_survey_installation_approvals").upsert({ visit_id: visitId, point_kind: point.source, point_id: point.id, hydraulic_approved: discipline === "hydraulic" ? checked : previous?.hydraulic_approved ?? false, electrical_approved: discipline === "electrical" ? checked : previous?.electrical_approved ?? false });
    if (error) toast.error(error.message); else { await load(); onChanged?.(); }
    setBusy(false);
  };
  const saveContract = async (onChanged?: () => void) => {
    const values = Object.fromEntries(Object.entries(contract).map(([key, value]) => [key, value === "" ? null : Number(value)]));
    if (Object.values(values).some((value) => value !== null && (!Number.isInteger(value) || value < 0))) return toast.error("Informe quantidades inteiras, a partir de zero.");
    setBusy(true);
    const { error } = await supabase.from("site_survey_contracted_scope").upsert({ visit_id: visitId, ...values });
    if (error) toast.error(error.message); else { toast.success("Escopo contratado salvo."); onChanged?.(); }
    setBusy(false);
  };
  return { approvals, contract, setContract, busy, saveApproval, saveContract };
}
export function InstallationApprovalCell({ point, scope, canEdit, onChanged }: { point: Point; scope: ReturnType<typeof useInstallationScope>; canEdit: boolean; onChanged?: () => void }) {
  return <div className="space-y-2">{(["hydraulic", "electrical"] as const).map((discipline) => <label key={discipline} className="flex items-center gap-2 text-xs"><Checkbox aria-label={`Instalação ${discipline === "hydraulic" ? "hidráulica" : "elétrica"} aprovada — ${point.shop_name}`} checked={installationApproved(scope.approvals, point.source, point.id, discipline)} disabled={!canEdit || scope.busy} onCheckedChange={(checked) => void scope.saveApproval(point, discipline, checked === true, onChanged)} />{discipline === "hydraulic" ? "Hidráulica" : "Elétrica"}</label>)}</div>;
}
export function ContractedScopeFields({ scope, canEdit, onChanged }: { scope: ReturnType<typeof useInstallationScope>; canEdit: boolean; onChanged?: () => void }) {
  return <div className="flex flex-wrap items-end gap-3 border-b pb-3"><h4 className="w-full text-sm font-semibold">Pontos contratados</h4>{([ ["hydraulic_shops", "Hidrômetros de lojas/quiosques"], ["hydraulic_general", "Hidrômetros gerais"], ["electrical", "Pontos elétricos"] ] as const).map(([key, label]) => <label key={key} className="space-y-1 text-xs"><span className="block">{label}</span><Input aria-label={label} type="number" min="0" step="1" className="h-8 w-44" disabled={!canEdit || scope.busy} value={scope.contract[key]} onChange={(e) => scope.setContract((current) => ({ ...current, [key]: e.target.value }))} /></label>)}{canEdit ? <Button size="sm" variant="action" disabled={scope.busy} onClick={() => void scope.saveContract(onChanged)}>Salvar</Button> : null}</div>;
}