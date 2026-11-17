// Inventories static CardTitle/CardDescription texts -> src/components/cde/title-inventory.json (CDE item Títulos e Subtítulos).
import fs from "fs"; import path from "path";
const out = new Map();
function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith(".tsx") && !p.includes("/ui/") && !p.includes("cde-table-fonts")) scan(p); } }
function scan(p) {
  const s = fs.readFileSync(p, "utf8"); const f = p.replace(/^src\//, "");
  for (const m of s.matchAll(/<Card(Title|Description)\b[^>]*>([^<{}]+)<\/Card\1>/g)) {
    const text = m[2].trim().replace(/\s+/g, " "); if (!text) continue;
    const kind = m[1] === "Title" ? "titulo" : "subtitulo"; const k = `${kind}|${text}`;
    if (!out.has(k)) out.set(k, { kind, text, files: [] });
    const e = out.get(k); if (!e.files.includes(f)) e.files.push(f);
  }
}
walk("src");
fs.writeFileSync("src/components/cde/title-inventory.json", JSON.stringify([...out.values()].sort((a, b) => a.text.localeCompare(b.text, "pt-BR")), null, 1) + "\n");
console.log(out.size);
