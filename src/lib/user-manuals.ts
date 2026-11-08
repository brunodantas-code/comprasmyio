import v4 from '@/assets/manuals/supply-v4.pdf.asset.json';
import cashFlowV1 from '@/assets/manuals/cash-flow-v1.pdf.asset.json';
import legalV1 from '@/assets/manuals/legal-v1.pdf.asset.json';
import rhV1 from '@/assets/manuals/rh-v1.pdf.asset.json';
import siteSurveyV1 from '@/assets/manuals/site-survey-v1.pdf.asset.json';
import opdeskV1 from '@/assets/manuals/opdesk-v1.pdf.asset.json';
import codeV1 from '@/assets/manuals/code-v1.pdf.asset.json';
import mytosisV1 from '@/assets/manuals/mytosis-v1.pdf.asset.json';
import cdeV1 from '@/assets/manuals/cde-v1.pdf.asset.json';

export const supplyManualVersions = [
  { version: 4, date: '06.11.2026', url: v4.url, summary: 'Capa e numeração revisadas', current: true },
] as const;

const first = 'Versão inicial';
/** Every app manual version; editable sources live in src/content/manuals/*.json. */
export const manualVersions = [
  ...supplyManualVersions.map((m) => ({ app: 'Supply', ...m })),
  { app: 'Cash Flow', version: 1, date: '08.11.2026', url: cashFlowV1.url, summary: first, current: true },
  { app: 'Legal', version: 1, date: '08.11.2026', url: legalV1.url, summary: first, current: true },
  { app: 'RH', version: 1, date: '08.11.2026', url: rhV1.url, summary: first, current: true },
  { app: 'Site Survey', version: 1, date: '08.11.2026', url: siteSurveyV1.url, summary: first, current: true },
  { app: 'OpDesk', version: 1, date: '08.11.2026', url: opdeskV1.url, summary: first, current: true },
  { app: 'Code', version: 1, date: '08.11.2026', url: codeV1.url, summary: first, current: true },
  { app: 'Mytosis', version: 1, date: '08.11.2026', url: mytosisV1.url, summary: first, current: true },
  { app: 'CDE', version: 1, date: '08.11.2026', url: cdeV1.url, summary: first, current: true },
];
