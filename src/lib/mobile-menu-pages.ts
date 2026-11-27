export const MOBILE_MENU_PAGE_SIZE = 4;

export function mobileMenuNeedsPaging(count: number) {
  return count > 5;
}

export function mobileMenuPage(count: number, page: number) {
  const pages = Math.max(1, Math.ceil(count / MOBILE_MENU_PAGE_SIZE));
  const current = Math.max(0, Math.min(page, pages - 1));
  return { start: current * MOBILE_MENU_PAGE_SIZE, end: Math.min(count, (current + 1) * MOBILE_MENU_PAGE_SIZE), next: current + 1 < pages ? current + 1 : 0, last: current === pages - 1 };
}