export type SurveyPointType = "shop" | "kiosk" | "environment" | "vacant";

export function surveyPointType(point: { classification_type?: string | null; point_type?: string | null }, fallback: SurveyPointType = "shop"): SurveyPointType {
  const type = point.classification_type ?? point.point_type ?? fallback;
  return type === "environment" || type === "kiosk" || type === "vacant" ? type : "shop";
}

export const surveyPointTypeLabel = (type: SurveyPointType) => type === "environment" ? "Ambiente" : type === "kiosk" ? "Quiosque" : type === "vacant" ? "Loja vaga" : "Loja";
export const requiresSurveyFacade = (type: SurveyPointType) => type !== "environment" && type !== "vacant";

export type SurveyPointTotals = Record<SurveyPointType, number>;

export const emptySurveyPointTotals = (): SurveyPointTotals => ({ shop: 0, kiosk: 0, environment: 0, vacant: 0 });

// Totaliza por tipo efetivo: loja vaga é categoria própria e não entra em Lojas.
export function surveyPointTotals(points: { classification_type?: string | null; point_type?: string | null }[]): SurveyPointTotals {
  const totals = emptySurveyPointTotals();
  for (const point of points) totals[surveyPointType(point)] += 1;
  return totals;
}
