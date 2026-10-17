import { installationApproved, type InstallationApproval } from "./site-survey-installation-scope";

export type RegistrationExportRow = { luc: string; meter: string; type: string; name: string; location: string; water: boolean; energy: boolean };

export function registrationServices(approvals: InstallationApproval[], kind: string, id: string) {
  return { water: installationApproved(approvals, kind, id, "hydraulic"), energy: installationApproved(approvals, kind, id, "electrical") };
}