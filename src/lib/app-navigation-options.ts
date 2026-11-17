import { MENU_PERMISSION_GROUPS } from "@/lib/menu-permissions";

export type TicketMenuOption = {
  label: string;
  submenus: string[];
};

export const APP_NAVIGATION_OPTIONS: Record<string, TicketMenuOption[]> = {
  supply: MENU_PERMISSION_GROUPS.map((group) => ({
    label: group.key === "usuarios" ? "Aprovações e logs" : group.label,
    submenus: group.children.filter((child) => !["usuarios_lista", "usuarios_acesso_restrito"].includes(child.key)).map((child) => child.label),
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
  site_survey: [
    { label: "Visitas", submenus: ["Agenda", "Nova visita", "Execução", "Revisão"] },
    { label: "Checklists", submenus: ["Modelos", "Seções", "Perguntas"] },
    { label: "Logs", submenus: [] },
  ],
};