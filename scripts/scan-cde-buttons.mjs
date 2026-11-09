import { buttonSites, eligibleButtonFile } from './cde-button-sites.ts';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const entries = [];
function scan(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) { scan(path); continue; }
    if (!eligibleButtonFile(path)) continue;
    entries.push(...buttonSites(readFileSync(path, 'utf8'), path.replace(/^src\//, '')).map(({ start, end, openingEnd, closingStart, ...entry }) => entry));
  }
}
scan('src');
writeFileSync('src/components/cde/button-library.json', JSON.stringify(entries, null, 2) + '\n');
console.log(`CDE: ${entries.length} button sites inventoried.`);