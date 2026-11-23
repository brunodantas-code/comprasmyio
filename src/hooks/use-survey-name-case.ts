import { useTextCaseChoice } from "./use-text-case-choice";

export function useSurveyNameCase(visitId: string): [boolean, (enabled: boolean) => void] {
  return useTextCaseChoice(`survey:${visitId}`);
}