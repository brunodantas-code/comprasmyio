import { describe, expect, it } from "vitest";
import { accessProfileApps, canOpenAccessManagement, legacySupplyAccessDestination } from "./access-management";

const none = { erpAdmin: false, supplyAdmin: false, surveyUsers: false, surveyProfiles: false, mytosisAdmin: false, codeAdmin: false };
describe("centralized access preserves app-specific administration", () => {
  it("does not give ordinary users administration", () => {
    expect(canOpenAccessManagement(none)).toBe(false);
    expect(accessProfileApps(none)).toEqual([]);
  });
  it("does not turn global app grants into Supply profile permission", () => {
    expect(canOpenAccessManagement({ ...none, erpAdmin: true })).toBe(true);
    expect(accessProfileApps({ ...none, erpAdmin: true })).toEqual(["projects"]);
  });
  it("keeps each app's manager scoped to the same app", () => {
    expect(accessProfileApps({ ...none, surveyProfiles: true })).toEqual(["site_survey"]);
    expect(accessProfileApps({ ...none, mytosisAdmin: true })).toEqual(["mytosis"]);
    expect(accessProfileApps({ ...none, codeAdmin: true })).toEqual(["development"]);
    expect(accessProfileApps({ ...none, supplyAdmin: true })).toEqual(["supply"]);
  });
  it("moves old user/profile links but keeps approval settings in Supply", () => {
    expect(legacySupplyAccessDestination("usuarios")).toEqual({ section: "cadastro", app: "supply" });
    expect(legacySupplyAccessDestination("acesso-restrito")).toEqual({ section: "perfis", app: "supply" });
    expect(legacySupplyAccessDestination("workflow")).toBeNull();
  });
});