export const SITE_SURVEY_PURCHASE_DRAFT_KEY = "myio:site-survey-purchase-draft";

export type SiteSurveyPurchaseDraftItem = {
  sourceKey: string;
  suggestedName: string;
  quantity: number;
  pointLabels: string[];
  reason: string;
};

export type SiteSurveyPurchaseDraft = {
  visitId: string;
  surveyNumber: number;
  projectId: string | null;
  clientId: string | null;
  clientUnitId: string | null;
  items: SiteSurveyPurchaseDraftItem[];
};

export function saveSiteSurveyPurchaseDraft(draft: SiteSurveyPurchaseDraft) {
  sessionStorage.setItem(SITE_SURVEY_PURCHASE_DRAFT_KEY, JSON.stringify(draft));
}

export function takeSiteSurveyPurchaseDraft(): SiteSurveyPurchaseDraft | null {
  const raw = sessionStorage.getItem(SITE_SURVEY_PURCHASE_DRAFT_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(SITE_SURVEY_PURCHASE_DRAFT_KEY);
  try {
    const parsed = JSON.parse(raw) as SiteSurveyPurchaseDraft;
    return parsed?.visitId && Array.isArray(parsed.items) ? parsed : null;
  } catch {
    return null;
  }
}