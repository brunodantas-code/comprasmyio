import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { cdeHighlightHash } from "./cde-highlight";

type UsageTarget = { to: "/dashboard" | "/cash-flow" | "/legal" | "/mytosis" | "/cde" | "/site-survey" | "/portal" | "/development" | "/chamados" | "/" | "/reset-password"; label: string; search?: { section: string; subsection: string } };
const supply = (section: string, subsection: string): UsageTarget => ({ to: "/dashboard", label: "Supply", search: { section, subsection } });
const supplyFiles: Record<string, UsageTarget> = {
  "access-profile-definitions-tab": supply("admin", "acesso-restrito"),
  "access-profiles-tab": supply("admin", "acesso-restrito"),
  "erp-app-access-admin": supply("admin", "usuarios"),
  "approval-workflow": supply("admin", "workflow"),
  "clients-tab": supply("projects", "clientes"),
  "clients-map-dialog": supply("projects", "clientes"),
  "cost-centers-tab": supply("projects", "centros"),
  "supply-tags-tab": supply("projects", "etiquetas"),
  "job-titles-tab": supply("projects", "cargos"),
  "reminders-tab": supply("projects", "lembretes"),
};
const various = new Set(["additional-step-types-tab", "client-categories-tab", "materials-registry-tab", "request-types-tab", "stock-destinations-tab", "delivery-points-tab", "damage-reasons-tab", "material-stock-types-tab", "supply-order-statuses-tab", "user-manuals-tab"]);
const stock = new Set(["assembly-release", "bom-settings", "damaged-items", "distribution", "external-sync", "homologation", "import-batches", "material-detail", "myio-delivery-qr", "myio-demand", "myio-orders-tab", "myio-product-image", "qr-check", "stock-meta", "stock-simulator", "stock-tab", "technician-items", "tools-assets", "unit-products"]);
const shared = new Set(["app-header", "column-filter", "column-sort-button", "confirm-delete-button", "change-password-dialog", "linked-record-deletion-dialog", "table-report-actions", "use-table-filters", "address-autocomplete", "br-city-picker"]);

/** Only known destinations are linked; shared controls expose their consumer apps. */
export function usageTargets(file: string): UsageTarget[] {
  const name = file.split("/").at(-1)?.replace(/\.tsx$/, "") ?? "";
  if (file === "routes/index.tsx") return [{ to: "/", label: "Entrada" }];
  if (file === "routes/reset-password.tsx") return [{ to: "/reset-password", label: "Senha" }];
  const routes: Record<string, UsageTarget> = { dashboard: supply("queue", "all"), development: { to: "/development", label: "Code" }, chamados: { to: "/chamados", label: "OpDesk" }, portal: { to: "/portal", label: "Todos os apps" } };
  if (file.startsWith("routes/") && routes[name]) return [routes[name]];
  if (file.includes("/cde/")) return [{ to: "/cde", label: "CDE" }];
  if (file.includes("/cash-flow/")) return [{ to: "/cash-flow", label: "Cash Flow" }];
  if (file.includes("/legal/")) return [{ to: "/legal", label: "Legal" }];
  if (file.includes("/mytosis/")) return [{ to: "/mytosis", label: "Mytosis" }];
  if (name.startsWith("site-survey")) return [{ to: "/site-survey", label: "Site Survey" }];
  if (supplyFiles[name]) return [supplyFiles[name]];
  if (various.has(name)) return [supply("projects", "diversos")];
  if (stock.has(name)) return [supply("stock", "")];
  if (name.startsWith("supply-") || name === "project-type-fields") return [supply("queue", "all")];
  if (name === "pending-groups") return [{ to: "/portal", label: "Central" }];
  if (shared.has(name)) return [supply("queue", "all"), { to: "/site-survey", label: "Site Survey" }, { to: "/legal", label: "Legal" }, { to: "/cde", label: "CDE" }];
  return [];
}

export function UsageLinks({ file, siteId }: { file: string; siteId?: string }) {
  const targets = usageTargets(file);
  const hash = siteId ? cdeHighlightHash(siteId) : undefined;
  return <span className="ml-2 inline-flex flex-wrap gap-2">{targets.map(target => <Link key={`${target.to}:${target.search?.subsection ?? ""}`} to={target.to} search={target.search} hash={hash} target="_blank" rel="noopener noreferrer" title={`Abrir ${target.label} para verificar ${file}`} aria-label={`Ver uso de ${file} em ${target.label}`} className="inline-flex items-center gap-1 text-foreground hover:text-primary"><ExternalLink className="h-3 w-3" />{targets.length > 1 ? target.label : null}</Link>)}</span>;
}