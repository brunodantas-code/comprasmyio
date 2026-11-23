const amountFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: true,
});

export function formatSpendAmount(value: number) {
  return amountFormatter.format(Number.isFinite(value) ? value : 0);
}

export function parseSpendAmount(text: string): number | null {
  let value = text.trim().replace(/R\$/gi, "").replace(/\s/g, "");
  if (!value) return null;
  if (value.includes(",") && value.includes(".")) value = value.replace(/\./g, "").replace(",", ".");
  else if (value.includes(",")) value = value.replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(value)) value = value.replace(/\./g, "");
  if (!/^-?\d+(\.\d{0,2})?$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}
