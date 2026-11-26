export const APP_SHORTCUTS = [
  { key: "spend", name: "Spend", path: "/spend" },
  { key: "supply", name: "Supply", path: "/dashboard" },
  { key: "cash_flow", name: "Finance", path: "/cash-flow" },
  { key: "crm", name: "CRM", path: "/crm" },
  { key: "legal", name: "Legal", path: "/legal" },
  { key: "rh", name: "RH", path: "/rh" },
  { key: "site_survey", name: "Site Survey", path: "/site-survey" },
  { key: "chamados", name: "OpDesk", path: "/chamados" },
  { key: "development", name: "Code", path: "/development" },
  { key: "mytosis", name: "Mytosis", path: "/mytosis" },
  { key: "indicadores", name: "Indicadores", path: "/indicadores" },
  { key: "wishlist", name: "Wishlist", path: "/wishlist" },
  { key: "projects", name: "Projects", path: "/projects" },
  { key: "cde", name: "CDE", path: "/cde" },
] as const;

export function appShortcutHead(pathname: string) {
  const path = pathname.replace(/\/$/, "");
  const app = APP_SHORTCUTS.find(item => path === item.path || path.startsWith(`${item.path}/`))
    ?? (["/supply-manual", "/inventory-signatures"].includes(path) ? APP_SHORTCUTS.find(item => item.key === "supply") : undefined);
  const base = app ? `/app-icons/${app.key}` : "";
  return {
    meta: [
      { name: "apple-mobile-web-app-title", content: app ? `myio ${app.name}` : "myio ERP" },
    ],
    links: [
      { rel: "icon", href: app ? `${base}/favicon.png` : "/favicon.png", type: "image/png" },
      { rel: "manifest", href: app ? `${base}/manifest.webmanifest` : "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: `${base}/apple-touch-icon.png`, sizes: "180x180" },
      { rel: "apple-touch-icon", href: `${base}/icon-192.png`, sizes: "192x192" },
      { rel: "apple-touch-icon", href: `${base}/icon-512.png`, sizes: "512x512" },
    ],
  };
}