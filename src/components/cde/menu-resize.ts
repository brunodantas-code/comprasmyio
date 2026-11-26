export function menuResizeLimits(viewport: number) {
  // Preserve 800px of desktop list workspace plus the existing 16px menu gap.
  const reserve = viewport < 1024 ? 160 : 816;
  const max = Math.max(1, Math.min(400, viewport - reserve));
  return { min: Math.min(160, max), max };
}
export function clampMenuWidth(width: number, viewport: number) {
  const { min, max } = menuResizeLimits(viewport);
  return Math.round(Math.max(min, Math.min(max, width)));
}
export function draggedMenuWidth(start: number, delta: number, side: string, viewport: number) {
  return clampMenuWidth(start + (side === "right" ? -delta : delta), viewport);
}
export function personalMenuWidthKey(userId: string, app: string, desktop: boolean) {
  return `erp-menu-width:${userId}:${app}:${desktop ? "desktop" : "mobile"}`;
}