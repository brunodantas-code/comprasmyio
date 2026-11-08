import * as L from 'lucide-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MytosisIcon } from '/dev-server/src/components/mytosis-icon';
import { CdeIcon } from '/dev-server/src/components/cde-icon';
const custom: any = { MytosisIcon, CdeIcon };
const names = process.argv.slice(2);
const out: Record<string,string> = {};
for (const n of names) { const C = custom[n] ?? (L as any)[n]; if (C) out[n] = renderToStaticMarkup(createElement(C, { size: 12, strokeWidth: 2 })); }
console.log(JSON.stringify(out));
