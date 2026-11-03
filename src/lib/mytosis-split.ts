export function splitCount(value: string): number {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 1 || count > 100) throw new Error("Informe uma quantidade inteira entre 1 e 100 etapas.");
  return count;
}