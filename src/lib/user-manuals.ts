import v1 from '@/assets/manuals/supply-v1.pdf.asset.json';
import v2 from '@/assets/manuals/supply-v2.pdf.asset.json';
import v3 from '@/assets/manuals/supply-v3.pdf.asset.json';
import v4 from '@/assets/manuals/supply-v4.pdf.asset.json';

export const supplyManualVersions = [
  { version: 4, date: '06.11.2026', url: v4.url, summary: 'Capa e numeração revisadas', current: true },
  { version: 3, date: '06.11.2026', url: v3.url, summary: 'Versão final', current: false },
  { version: 2, date: '06.11.2026', url: v2.url, summary: 'Revisão para aprovação', current: false },
  { version: 1, date: '06.11.2026', url: v1.url, summary: 'Primeira apresentação', current: false },
] as const;