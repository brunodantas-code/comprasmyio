export type AccessCapabilities = {
  erpAdmin: boolean;
  supplyAdmin: boolean;
  surveyUsers: boolean;
  surveyProfiles: boolean;
  mytosisAdmin: boolean;
  codeAdmin: boolean;
};

export function canOpenAccessManagement(c: AccessCapabilities) {
  return c.erpAdmin || c.supplyAdmin || c.surveyUsers || c.surveyProfiles || c.mytosisAdmin || c.codeAdmin;
}

export function accessProfileApps(c: AccessCapabilities) {
  return [
    ...(c.supplyAdmin ? ["supply"] : []),
    ...(c.surveyUsers || c.surveyProfiles ? ["site_survey"] : []),
    ...(c.mytosisAdmin ? ["mytosis"] : []),
    ...(c.codeAdmin ? ["development"] : []),
  ];
}

export function legacySupplyAccessDestination(subsection?: string) {
  if (subsection === "usuarios") return { section: "cadastro" as const, app: "supply" as const };
  if (subsection === "acesso-restrito") return { section: "perfis" as const, app: "supply" as const };
  return null;
}