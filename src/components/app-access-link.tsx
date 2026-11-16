import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CRM_URL } from "@/lib/external-apps";

type AppPath = "/dashboard" | "/cash-flow" | "/crm" | "/legal" | "/rh" | "/site-survey" | "/chamados" | "/development" | "/mytosis" | "/wishlist" | "/cde";

export function AppAccessLink({ appKey, to, children, ...props }: {
  appKey: string;
  to: AppPath;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
  title?: string;
}) {
  if (appKey === "crm") return <a {...props} href={CRM_URL} target="_blank" rel="noopener noreferrer">{children}</a>;
  return <Link {...props} to={to}>{children}</Link>;
}