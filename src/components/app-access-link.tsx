import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

type AppPath = "/dashboard" | "/cash-flow" | "/crm" | "/legal" | "/rh" | "/site-survey" | "/chamados" | "/development" | "/mytosis" | "/wishlist" | "/projects" | "/cde" | "/indicadores";

export function AppAccessLink({ appKey: _appKey, to, children, ...props }: {
  appKey: string;
  to: AppPath;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
  title?: string;
}) {
  return <Link {...props} to={to}>{children}</Link>;
}