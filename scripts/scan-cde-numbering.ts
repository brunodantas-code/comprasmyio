import ts from "typescript";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
export function numberSites(code: string, file: string) {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const entries: { file: string; line: number; group: string }[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      if (["CdeNumber", "CdeNumberButton"].includes(opening.tagName.getText(source))) {
        const sub = opening.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(source) === "subcategory");
        const dynamic = sub && ts.isJsxAttribute(sub) && sub.initializer && !sub.initializer.getText(source).includes("false");
        entries.push({ file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, group: sub && (!ts.isJsxAttribute(sub) || !sub.initializer || dynamic) ? "number_subsection" : "number_section" });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return entries;
}
export function scanNumbers() {
  const entries: ReturnType<typeof numberSites> = [];
  function scan(dir: string) {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, item.name);
      if (item.isDirectory()) scan(path);
      else if (path.endsWith(".tsx") && !/\.(test|spec)\.tsx$/.test(path) && !path.endsWith("/cde-button.tsx")) entries.push(...numberSites(readFileSync(path, "utf8"), path.replace(/^src\//, "")));
    }
  }
  scan("src");
  writeFileSync("src/components/cde/number-usage.json", JSON.stringify(entries, null, 2) + "\n");
  console.log(`CDE numbering: ${entries.length} source uses`);
}
if (import.meta.main) scanNumbers();