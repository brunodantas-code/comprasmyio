/** Dots separate levels but do not count as digits in the circular marker. */
export function sequentialNumberIsPlain(value: unknown): boolean {
  if (typeof value !== "string" && typeof value !== "number") return false;
  const text = String(value);
  return /^\d+(?:\.\d+)*$/.test(text) && text.replace(/\./g, "").length > 2;
}