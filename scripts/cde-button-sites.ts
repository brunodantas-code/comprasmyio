import ts from "typescript";
import { createHash } from "node:crypto";

/** One inventory and transform share IDs; line numbers are informational, never identity. */
export function buttonSites(code: string, file: string) {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const sites: { id: string; file: string; line: number; tag: string; label: string; dynamic: boolean; visualCustom: boolean; autoCdeSafe: boolean; icon: string; variant: string; size: string; className: string; group: string; start: number; end: number; openingEnd: number; closingStart?: number }[] = [];
  const occurrences = new Map<string, number>();
  const value = (attrs: ts.JsxAttributes, name: string) => {
    const attr = attrs.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(source) === name);
    return attr && ts.isJsxAttribute(attr) && attr.initializer && ts.isStringLiteral(attr.initializer) ? attr.initializer.text : "";
  };
  function visit(node: ts.Node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const tag = opening.tagName.getText(source);
      if (["Button", "button", "CdeButton"].includes(tag)) {
        const labels: string[] = [], icons: string[] = [];
        let dynamic = false;
        function content(n: ts.Node) {
          if (ts.isJsxAttribute(n) || ts.isJsxSpreadAttribute(n)) return;
          if (ts.isJsxText(n)) { const s = n.text.replace(/\s+/g, " ").trim(); if (s) labels.push(s); }
          if (ts.isJsxExpression(n) && n.expression) {
            dynamic = true;
            function literals(x: ts.Node) {
              if (ts.isJsxAttribute(x)) return;
              if ((ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) && x.text.trim()) labels.push(x.text.trim());
              else ts.forEachChild(x, literals);
            }
            literals(n.expression);
          }
          if (ts.isJsxSelfClosingElement(n)) icons.push(n.tagName.getText(source));
          if (!ts.isJsxExpression(n)) ts.forEachChild(n, content);
        }
        if (ts.isJsxElement(node)) node.children.forEach(content);
        const contentLabel = [...new Set(labels)].join(" / ");
        const description = value(opening.attributes, "aria-label") || value(opening.attributes, "title");
        const label = /^[\s—–\-0/]*$/.test(contentLabel) && description ? description : contentLabel || description || icons[0] || "Sem nome fixo";
        const identity = `${tag}|${label}|${opening.attributes.properties.filter(p => ts.isJsxAttribute(p) && ["onClick", "onSubmit", "group", "type"].includes(p.name.getText(source))).map(p => p.getText(source)).join("|")}`;
        const hash = createHash("sha256").update(identity).digest("hex").slice(0, 16);
        const ordinal = occurrences.get(hash) ?? 0;
        occurrences.set(hash, ordinal + 1);
        const has = (name: string) => opening.attributes.properties.some(p => ts.isJsxAttribute(p) && p.name.getText(source) === name);
        sites.push({ id: `${file}|${hash}|${ordinal}`, file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, tag, label, dynamic,
          visualCustom: has("style") || value(opening.attributes, "actionKind") === "specific", autoCdeSafe: true,
          icon: icons[0] || "", variant: value(opening.attributes, "variant"), size: value(opening.attributes, "size"), className: value(opening.attributes, "className"), group: value(opening.attributes, "group"),
          start: opening.tagName.getStart(source), end: opening.tagName.end, openingEnd: opening.attributes.end,
          closingStart: ts.isJsxElement(node) ? node.closingElement.tagName.getStart(source) : undefined });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return sites;
}

export function eligibleButtonFile(file: string) {
  return file.endsWith(".tsx") && !/\.(test|spec)\.tsx$/.test(file) && !file.endsWith("components/ui/button.tsx") && !file.endsWith("components/cde/cde-button-library.tsx") && !file.endsWith("components/cde/cde-button.tsx");
}

export function instrumentButtons(code: string, file: string) {
  if (!eligibleButtonFile(file)) return null;
  const sites = buttonSites(code, file);
  if (!sites.length) return null;
  const edits: { start: number; end: number; text: string }[] = [];
  for (const s of sites) {
    edits.push({ start: s.openingEnd, end: s.openingEnd, text: ` cdeId=${JSON.stringify(s.id)}${s.tag === "button" ? " cdeNative" : ""}` });
    if (s.tag === "button") {
      edits.push({ start: s.start, end: s.end, text: "CdeNativeControl" });
      if (s.closingStart !== undefined) edits.push({ start: s.closingStart, end: s.closingStart + 6, text: "CdeNativeControl" });
    }
  }
  let result = code;
  for (const e of edits.sort((a, b) => b.start - a.start)) result = result.slice(0, e.start) + e.text + result.slice(e.end);
  return `${sites.some(s => s.tag === "button") ? 'import { Button as CdeNativeControl } from "@/components/ui/button";\n' : ""}${result}`;
}