export type SurveyPointType = "shop" | "kiosk" | "environment";

export function surveyPointType(point: { classification_type?: string | null; point_type?: string | null }, fallback: SurveyPointType = "shop"): SurveyPointType {
  const type = point.classification_type ?? point.point_type ?? fallback;
  return type === "environment" || type === "kiosk" ? type : "shop";
}

export const surveyPointTypeLabel = (type: SurveyPointType) => type === "environment" ? "Ambiente" : type === "kiosk" ? "Quiosque" : "Loja";
export const requiresSurveyFacade = (type: SurveyPointType) => type !== "environment";