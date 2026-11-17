import { tableSites, eligibleTableFile } from './cde-table-sites.ts';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const entries = [];
(function scan(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) { scan(path); continue; }
    if (!eligibleTableFile(path)) continue;
    entries.push(...tableSites(readFileSync(path, 'utf8'), path.replace(/^src\//, '')).filter(s => s.reorderable).map(({ start, openingEnd, reorderable, marks, ...e }) => e));
  }
})('src');
writeFileSync('src/components/cde/table-library.json', JSON.stringify(entries, null, 2) + '\n');
console.log(`CDE: ${entries.length} tabelas reordenáveis.`);
