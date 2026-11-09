import ts from 'typescript';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const entries = [];
function scan(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) { scan(path); continue; }
    if (!path.endsWith('.tsx') || path.endsWith('/cde-button-library.tsx') || path.includes('/ui/')) continue;
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const value = (attrs, name) => {
      const a = attrs.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(source) === name);
      return a?.initializer && ts.isStringLiteral(a.initializer) ? a.initializer.text : '';
    };
    function visit(node) {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const opening = ts.isJsxElement(node) ? node.openingElement : node;
        const tag = opening.tagName.getText(source);
        if (tag === 'button' || /Button$/.test(tag)) {
          const labels = [], icons = [];
          let dynamic = false;
          function content(n) {
            if (ts.isJsxText(n)) { const s = n.text.replace(/\s+/g, ' ').trim(); if (s) labels.push(s); }
            if (ts.isJsxExpression(n) && n.expression) {
              dynamic = true;
              function literals(x) { if (ts.isJsxAttribute(x)) return; if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) { if (x.text.trim()) labels.push(x.text.trim()); } else ts.forEachChild(x, literals); }
              literals(n.expression);
            }
            if (ts.isJsxSelfClosingElement(n)) icons.push(n.tagName.getText(source));
            if (!ts.isJsxExpression(n)) ts.forEachChild(n, content);
          }
          if (ts.isJsxElement(node)) node.children.forEach(content);
          const contentLabel = [...new Set(labels)].join(' / ');
          const sourceText = node.getText(source);
          const descriptiveLabel = value(opening.attributes, 'aria-label') || value(opening.attributes, 'title')
            || (sourceText.includes('approval_number') ? 'Abrir detalhes do Approval' : sourceText.includes('survey_number') ? 'Abrir checklist da visita' : '');
          const placeholderOnly = /^[\s—–\-0/]*$/.test(contentLabel);
          const label = placeholderOnly && descriptiveLabel ? descriptiveLabel : contentLabel || descriptiveLabel || icons[0] || 'Sem nome fixo';
          const hasAttribute = name => opening.attributes.properties.some(p => ts.isJsxAttribute(p) && p.name.getText(source) === name);
          const hasSpread = opening.attributes.properties.some(p => ts.isJsxSpreadAttribute(p));
          entries.push({ file: path.replace(/^src\//, ''), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, tag, label, dynamic, autoCdeSafe: !dynamic && !hasAttribute('style') && !hasAttribute('asChild') && !hasSpread, icon: icons[0] || '', variant: value(opening.attributes, 'variant'), size: value(opening.attributes, 'size'), className: value(opening.attributes, 'className'), group: value(opening.attributes, 'group') });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
scan('src');
writeFileSync('src/components/cde/button-library.json', JSON.stringify(entries, null, 2) + '\n');
console.log(`CDE: ${entries.length} button sites inventoried.`);