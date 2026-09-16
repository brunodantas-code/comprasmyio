import { MENU_PERMISSION_GROUPS } from "@/lib/menu-permissions";

export type TicketMenuOption = {
  label: string;
  submenus: string[];
};

export const APP_NAVIGATION_OPTIONS: Record<string, TicketMenuOption[]> = {
  supply: MENU_PERMISSION_GROUPS.map((group) => ({
    label: group.label,
    submenus: group.children.map((child) => child.label),
  })),
  cash_flow: [
    { label: "Contas a pagar", submenus: [] },
    { label: "Plano de Contas", submenus: [] },
    { label: "Caixa", submenus: [] },
  ],
  crm: [],
  legal: [],
  rh: [],
  development: [
    { label: "Tickets", submenus: ["Novo ticket", "Acompanhamento"] },
  ],
};