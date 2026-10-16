export type InstallationApproval = { point_kind: string; point_id: string; hydraulic_approved: boolean; electrical_approved: boolean };
export function installationApproved(approvals: InstallationApproval[], kind: string, id: string, discipline: "hydraulic" | "electrical") {
  const approval = approvals.find((item) => item.point_kind === kind && item.point_id === id);
  return discipline === "hydraulic" ? approval?.hydraulic_approved === true : approval?.electrical_approved === true;
}
export function purchasePointFlowLabel(label: string, flow: string | null) {
  const value = (flow ?? "").replace(/^outros?\s*[—–-]\s*/i, "").trim();
  return `${label} (${value || "Vazão não informada"})`;
}