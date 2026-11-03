/** Conservative single-line title capacity, accounting for shape padding and font size. */
export function boxTitleLimit(width: number, fontSize: number, shape = "process"): number {
  const padding: Record<string, number> = { terminal: .2, decision: .44, connector: .32, io: .24, multidoc: .08, preparation: .24, or: .36, delay: .12 };
  const usable = width * (1 - (padding[shape] ?? 0)) - 20;
  return Math.max(1, Math.min(200, Math.floor(usable / (Math.max(10, fontSize) * .6))));
}