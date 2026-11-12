import type { SurveyPointType } from "./site-survey-point-type";

export type SurveyPointChoice = SurveyPointType | "depot";
type EnvironmentType = { id: string; name: string };

export function surveyDepotType(types: EnvironmentType[]) {
  return types.find((type) => type.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR") === "deposito");
}

export function surveyPointChoice(type: SurveyPointType | null, environmentTypeId: string, types: EnvironmentType[]): SurveyPointChoice | null {
  const depot = surveyDepotType(types);
  return type === "environment" && depot?.id === environmentTypeId ? "depot" : type;
}

export function resolveSurveyPointChoice(choice: SurveyPointChoice | null, types: EnvironmentType[]) {
  return {
    pointType: choice === "depot" ? "environment" as const : choice,
    environmentTypeId: choice === "depot" ? surveyDepotType(types)?.id ?? "" : "",
  };
}