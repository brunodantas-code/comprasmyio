// Inventories every tag (<Badge>) label: static text plus labels from same-file label maps used in {MAP[...]}; writes src/components/cde/tag-inventory.json.
import fs from "fs"; import path from "path";
const APP = (f) => f.includes("crm/") ? "CRM" : f.includes("code") || f.includes("development") ? "Code" : f.includes("site-survey") ? "Site Survey" : f.includes("legal") ? "Legal" : f.includes("cash-flow") || f.includes("payable") ? "Cash Flow" : f.includes("access") || f.includes("users") ? "Usuários" : "Supply";
const out = new Map();
const add = (label, variant, className, f) => { label = label.trim().replace(/\s+/g, " "); if (!label || label.length > 40) return; const k = label.toLowerCase(); if (!out.has(k)) out.set(k, { label, variant, className, apps: [], files: [] }); const e = out.get(k); if (!e.files.includes(f)) e.files.push(f); if (!e.apps.includes(APP(f))) e.apps.push(APP(f)); };
function mapValues(src, name) { const m = src.match(new RegExp(`(?:const|let)\\s+${name}\\b[^=]*=\\s*\\{([\\s\\S]*?)\\}`)); if (!m) return []; return [...m[1].matchAll(/:\s*"([^"]+)"/g)].map((x) => x[1]); }
function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith(".tsx")) scan(p); } }
function scan(p) {
  const s = fs.readFileSync(p, "utf8"); const f = p.replace(/^src\//, "");
  for (const m of s.matchAll(/<Badge\b([^>]*)>([\s\S]*?)<\/Badge>/g)) {
    const variant = (m[1].match(/variant="(\w+)"/) || [])[1] || "default"; const className = (m[1].match(/className="([^"]*)"/) || [])[1] || "";
    const body = m[2];
    if (!/[{<]/.test(body)) { add(body, variant, className, f); continue; }
    for (const lit of body.matchAll(/"([A-ZÀ-Ú][^"{}]{1,38})"/g)) add(lit[1], variant, className, f);
    for (const id of body.matchAll(/\{\s*([A-Z_]{3,})\[/g)) for (const v of mapValues(s, id[1])) add(v, variant, className, f);
  }
}
walk("src");
const code = fs.readFileSync("src/components/code-status-badge.tsx", "utf8");
const codeLooks = Object.fromEntries([...code.matchAll(/^\s*(\w+):\s*"([^"]+)"/gm)].map(m => [m[1], m[2]]));
for (const [status, label] of [["concluido", "Concluído"], ["aberto", "Em aberto"], ["atendido", "Atendido"], ["em_atendimento", "Em atendimento"]]) {
  const className = `whitespace-nowrap text-xs font-normal ${codeLooks[status] ?? ""}`;
  add(label, "outline", className, "components/code-status-badge.tsx");
  const entry = out.get(label.toLowerCase());
  if (entry) { entry.variant = "outline"; entry.className = className; }
}
for (const l of ["Rascunho", "Enviada", "Aceita", "Recusada"]) add(l, "outline", "", "components/crm/crm-propostas.tsx");
fs.writeFileSync("src/components/cde/tag-inventory.json", JSON.stringify([...out.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR")), null, 1) + "\n");
console.log(out.size);
