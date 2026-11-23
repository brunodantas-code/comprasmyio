import { z } from "zod";
import { spendStates } from "./fiscal-location";

export const categories = [
  { key: "alimentacao", name: "Alimentação", icon: "Utensils", account: "Despesas com Refeições e Lanches" },
  { key: "transporte", name: "Táxi/Uber", icon: "Car", account: "Despesas com Locomoção Urbana" },
  { key: "estacionamento", name: "Estacionamento", icon: "ParkingCircle", account: "Despesas com Veículos e Estacionamento" },
  { key: "pedagio", name: "Pedágio", icon: "Route", account: "Despesas com Viagens e Pedágios" },
  { key: "combustivel", name: "Combustível", icon: "Fuel", account: "Despesas com Combustíveis" },
  { key: "ferramentas", name: "Ferramentas", icon: "Wrench", account: "Ferramentas e Equipamentos de Pequeno Porte" },
  { key: "insumos", name: "Insumos de instalação", icon: "Cable", account: "Materiais e Insumos Aplicados em Obra" },
  { key: "servicos", name: "Serviços diversos", icon: "Briefcase", account: "Serviços de Terceiros PJ/PP" },
  { key: "ia", name: "IA", icon: "Cpu", account: "Softwares Cloud e IA" },
  { key: "software", name: "Licenças e Assinaturas", icon: "AppWindow", account: "Assinaturas e Licenças de Software SaaS" },
  { key: "outros", name: "Outros", icon: "Ellipsis", account: "Outras Despesas Operacionais" },
] as const;
export const categoryKey = z.string().regex(/^(alimentacao|transporte|estacionamento|pedagio|combustivel|ferramentas|insumos|servicos|ia|software|outros|custom_[0-9a-f-]{36})$/, "Categoria inválida");
export const expenseSchema = z.object({
  id: z.string().uuid(), card_id: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  merchant: z.string().trim().min(1, "Informe o estabelecimento"), amount: z.number().positive("Informe o valor"),
  category: categoryKey, observation: z.string().trim().max(2000), project_id: z.string().uuid().nullable(),
  city: z.string().trim().max(120).default(""), uf: z.union([z.enum(spendStates), z.literal("")]).default(""), access_key: z.string().regex(/^\d{44}$/).nullable().default(null),
  file_path: z.string().min(1), clear_photo: z.boolean(), myio_cnpj: z.boolean({ message: "Confirme Com ou Sem CNPJ myio" }),
  confirmed: z.literal(true, { message: "Confirme todas as informações antes de salvar" }),
}).superRefine((v, ctx) => {
  if (v.category === "insumos" && !v.project_id) ctx.addIssue({ code: "custom", path: ["project_id"], message: "Insumos de instalação exige Projeto" });
  if (["servicos", "outros"].includes(v.category) && !v.observation) ctx.addIssue({ code: "custom", path: ["observation"], message: v.category === "outros" ? "Especifique a despesa em Outros" : "Serviços diversos exige observação" });
  if (v.category === "ferramentas" && !v.clear_photo) ctx.addIssue({ code: "custom", path: ["clear_photo"], message: "Confirme que a foto da NF/cupom está nítida" });
});
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type MatchItem = { card_id: string; date: string; amount: number; final_cartao: string };
export function canMatch(a: MatchItem, b: MatchItem) {
  const days = Math.abs(Date.parse(`${a.date}T00:00:00Z`) - Date.parse(`${b.date}T00:00:00Z`)) / 86400000;
  return a.card_id === b.card_id && /^\d{4}$/.test(a.final_cartao) && a.final_cartao === b.final_cartao && Math.round(a.amount * 100) === Math.round(b.amount * 100) && days <= 2;
}
export const extractionSchema = z.object({ lancamentos: z.array(z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), estabelecimento: z.string().min(1), valor: z.number(),
  parcela: z.string().nullable(), final_cartao: z.string().regex(/^\d{4}$/).nullable(),
  categoria_sugerida: z.string().nullable(), myio_cnpj: z.boolean().nullable(),
  cidade: z.string().nullable().optional(), uf: z.string().nullable().optional(), chave_acesso: z.string().nullable().optional(),
})).max(1000) });
export type Extracted = z.infer<typeof extractionSchema>;
export const extractedJsonSchema = { type: "object", additionalProperties: false, properties: {
  lancamentos: { type: "array", items: { type: "object", additionalProperties: false,
    properties: { data: { type: "string" }, estabelecimento: { type: "string" }, valor: { type: "number" }, parcela: { type: ["string", "null"] }, final_cartao: { type: ["string", "null"] }, categoria_sugerida: { type: ["string", "null"] }, myio_cnpj: { type: ["boolean", "null"] }, cidade: { type: ["string", "null"] }, uf: { type: ["string", "null"] }, chave_acesso: { type: ["string", "null"] } },
    required: ["data", "estabelecimento", "valor", "parcela", "final_cartao", "categoria_sugerida", "myio_cnpj", "cidade", "uf", "chave_acesso"] } },
}, required: ["lancamentos"] };
export type CategorySetting = { name: string; icon: string; account_id: string; cost_center_id: string; active: boolean; deleted?: boolean };
export function configuredCategories(settings: Record<string, CategorySetting>, includeInactive = false) {
  const rows = [...categories.map(c => ({ ...c, ...settings[c.key] })), ...Object.entries(settings)
    .filter(([key]) => key.startsWith("custom_") && categoryKey.safeParse(key).success)
    .map(([key, s]) => ({ key, account: "Conta contábil padrão", ...s }))];
  return rows.filter(c => !settings[c.key]?.deleted && (includeInactive || settings[c.key]?.active !== false));
}
export function removeCategory(settings: Record<string, CategorySetting>, key: string): Record<string, CategorySetting> {
  const base = categories.find(c => c.key === key);
  const setting = settings[key] ?? (base ? { name: base.name, icon: base.icon, account_id: "", cost_center_id: "", active: true } : null);
  return setting ? { ...settings, [key]: { ...setting, active: false, deleted: true } } : settings;
}
export function recurringWarning(category: string, merchant: string, date: string, previous: { category: string; merchant: string; date: string }[]) {
  return category === "ia" && previous.some(p => p.category === "ia" && p.merchant.toLocaleLowerCase().trim() === merchant.toLocaleLowerCase().trim() && p.date.slice(0, 7) === date.slice(0, 7));
}
