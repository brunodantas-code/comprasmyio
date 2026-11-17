import ts from "typescript";

export type TableSite = { id: string; file: string; line: number; context: string; headers: string[]; reorderable: boolean; start: number; openingEnd: number; marks: number[] };

/** Inventory + transform share ids `${file}|${ordinal}` of each <Table>; headers come from literal TableHead cells. */
export function tableSites(code: string, file: string): TableSite[] {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const labelByKey = new Map<string, string>();
  const headings: { pos: number; text: string }[] = [];
  const sites: TableSite[] = [];
  const tagOf = (n: ts.Node) => ts.isJsxElement(n) ? n.openingElement.tagName.getText(source) : ts.isJsxSelfClosingElement(n) ? n.tagName.getText(source) : "";
  function collect(n: ts.Node) {
    if (ts.isObjectLiteralExpression(n)) {
      const get = (k: string) => { const p = n.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(source) === k); return p && ts.isPropertyAssignment(p) && ts.isStringLiteral(p.initializer) ? p.initializer.text : undefined; };
      const key = get("key") ?? get("id"), label = get("label") ?? get("header") ?? get("title");
      if (key && label && !labelByKey.has(key)) labelByKey.set(key, label);
    }
    const tag = tagOf(n);
    if (/^(h1|h2|h3|h4|CardTitle|DialogTitle|SheetTitle|CdeCategoryHeader)$/.test(tag) && ts.isJsxElement(n)) {
      const t = n.children.filter(ts.isJsxText).map(c => c.text.trim()).join(" ").trim();
      if (t) headings.push({ pos: n.getStart(source), text: t });
    }
    ts.forEachChild(n, collect);
  }
  collect(source);
  const textOf = (n: ts.Node): string => {
    const parts: string[] = [];
    (function walk(x: ts.Node) {
      if (ts.isJsxAttribute(x)) return;
      if (ts.isJsxText(x)) { const s = x.text.replace(/\s+/g, " ").trim(); if (s) parts.push(s); return; }
      if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) { if (x.text.trim()) parts.push(labelByKey.get(x.text) ?? x.text); return; }
      ts.forEachChild(x, walk);
    })(n);
    return parts[0] ?? "";
  };
  let ordinal = 0;
  function visit(node: ts.Node) {
    if (tagOf(node) === "Table") {
      const opening = ts.isJsxElement(node) ? node.openingElement : node as ts.JsxSelfClosingElement;
      let headers: string[] = []; let reorderable = false; const marks: number[] = [];
      (function findHeader(x: ts.Node): boolean {
        if (tagOf(x) === "TableHeader" && ts.isJsxElement(x)) {
          const row = x.children.find(c => tagOf(c) === "TableRow");
          if (row && ts.isJsxElement(row)) {
            reorderable = true;
            for (const c of row.children) {
              if (ts.isJsxText(c) && !c.text.trim()) continue;
              if (tagOf(c) === "TableHead") { marks.push((ts.isJsxElement(c) ? c.openingElement : c as ts.JsxSelfClosingElement).attributes.end); headers.push(textOf(c) || "(sem título)"); continue; }
              if (ts.isJsxExpression(c) && !c.expression) continue;
              if (ts.isJsxExpression(c) && c.expression && ts.isCallExpression(c.expression) && ts.isPropertyAccessExpression(c.expression.expression) && c.expression.expression.name.text === "map" && ts.isArrayLiteralExpression(c.expression.expression.expression) && !marks.length) {
                for (const el of c.expression.expression.expression.elements) { headers.push(ts.isStringLiteral(el) ? (labelByKey.get(el.text) ?? el.text) : "(dinâmico)"); marks.push(-1); }
                continue;
              }
              // Conditional column: one TableHead inside the expression keeps its slot via data-cde-col.
              const inner: ts.Node[] = [];
              (function f(y: ts.Node) { if (tagOf(y) === "TableHead") { inner.push(y); return; } ts.forEachChild(y, f); })(c);
              if (inner.length === 1 && ts.isJsxExpression(c) && c.expression && !(ts.isCallExpression(c.expression))) {
                const h = inner[0];
                marks.push((ts.isJsxElement(h) ? h.openingElement : h as ts.JsxSelfClosingElement).attributes.end);
                headers.push((textOf(h) || "(sem título)") + " (condicional)");
                continue;
              }
              reorderable = false; headers.push("(dinâmico)"); marks.push(-1);
            }
          }
          return true;
        }
        if (x !== node && tagOf(x) === "Table") return false;
        return !!ts.forEachChild(x, findHeader);
      })(node);
      const pos = node.getStart(source);
      const context = [...headings].reverse().find(h => h.pos < pos)?.text ?? "";
      sites.push({ id: `${file}|${ordinal++}`, file, line: source.getLineAndCharacterOfPosition(pos).line + 1, context, headers, reorderable: reorderable && headers.length > 1, start: pos, openingEnd: opening.attributes.end, marks });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return sites;
}

export function eligibleTableFile(file: string) {
  return file.endsWith(".tsx") && !/\.(test|spec)\.tsx$/.test(file) && !file.endsWith("components/ui/table.tsx") && !file.includes("components/cde/");
}

export function instrumentTables(code: string, file: string) {
  if (!eligibleTableFile(file) || !code.includes("<Table")) return null;
  const sites = tableSites(code, file).filter(s => s.reorderable);
  if (!sites.length) return null;
  const edits: { at: number; text: string }[] = [];
  for (const s of sites) {
    edits.push({ at: s.openingEnd, text: ` cdeTableId=${JSON.stringify(s.id)}` });
    s.marks.forEach((m, i) => { if (m >= 0) edits.push({ at: m, text: ` data-cde-col={${i}}` }); });
  }
  let result = code;
  for (const e of edits.sort((a, b) => b.at - a.at)) result = result.slice(0, e.at) + e.text + result.slice(e.at);
  return result;
}
