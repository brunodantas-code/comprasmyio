/** Conservative single-line title capacity, accounting for shape padding and font size. */
export function boxTitleLimit(width: number, fontSize: number, shape = "process"): number {
  const padding: Record<string, number> = { terminal: .2, decision: .44, connector: .32, io: .24, multidoc: .08, preparation: .24, or: .36, delay: .12 };
  const usable = width * (1 - (padding[shape] ?? 0)) - 20;
  return Math.max(1, Math.min(200, Math.floor(usable / (Math.max(10, fontSize) * .6))));
}

/** Description capacity uses the remaining height after header, title and footer. */
export function boxDescriptionLimit(width: number, height: number, fontSize: number, titleFontSize: number, shape = "process"): number {
  const verticalPadding: Record<string, number> = { document: .12, decision: .28, connector: .16, multidoc: .38, manual: .12, or: .2 };
  const availableHeight = height * (1 - (verticalPadding[shape] ?? 0)) - 44 - Math.max(10, titleFontSize) * 1.25;
  const lines = Math.max(1, Math.floor(availableHeight / (Math.max(10, fontSize) * 1.25)));
  return Math.min(1000, boxTitleLimit(width, fontSize, shape) * lines);
}