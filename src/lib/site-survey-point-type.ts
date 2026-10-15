export type SurveyPointType = "shop" | "kiosk" | "environment" | "vacant";

export function surveyPointType(point: { classification_type?: string | null; point_type?: string | null }, fallback: SurveyPointType = "shop"): SurveyPointType {
  const type = point.classification_type ?? point.point_type ?? fallback;
  return type === "environment" || type === "kiosk" || type === "vacant" ? type : "shop";
}

export const surveyPointTypeLabel = (type: SurveyPointType) => type === "environment" ? "Ambiente" : type === "kiosk" ? "Quiosque" : type === "vacant" ? "Loja vaga" : "Loja";
export const requiresSurveyFacade = (type: SurveyPointType) => type !== "environment" && type !== "vacant";
