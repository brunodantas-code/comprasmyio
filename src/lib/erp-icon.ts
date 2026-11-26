export const ERP_ICON_OPTIONS = [
  { key: "myio", label: "Logo myio", base: "" },
  { key: "io-purple", label: "IO verde · fundo roxo", base: "/erp-icons/io-purple" },
  { key: "io-black", label: "IO verde · fundo preto", base: "/erp-icons/io-black" },
  { key: "official-purple", label: "IO oficial · roxo", base: "/erp-icons/official-purple" },
  { key: "official-dark", label: "IO oficial · roxo escuro", base: "/erp-icons/official-dark" },
] as const;
export type ErpIconKey = typeof ERP_ICON_OPTIONS[number]["key"];
export type AppIconChoices = Record<string, "white" | "green">;
export function appIconChoices(value: unknown): AppIconChoices {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, "white" | "green"] => entry[1] === "white" || entry[1] === "green"));
}
export function erpIconKey(value: unknown): ErpIconKey {
  return ERP_ICON_OPTIONS.find(option => option.key === value)?.key ?? "myio";
}