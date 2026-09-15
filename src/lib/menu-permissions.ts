export type MenuPermissionItem = {
  key: string;
  label: string;
};

export type MenuPermissionGroup = MenuPermissionItem & {
  children: MenuPermissionItem[];
};

export const MENU_PERMISSION_GROUPS: MenuPermissionGroup[] = [
  {
    key: "solicitacoes",
    label: "Solicitações",
    children: [
      { key: "solicitacoes_minhas", label: "Minhas Solicitações" },
      { key: "solicitacoes_novas", label: "Novas Solicitações" },
    ],
  },
  {
    key: "approvals",
    label: "Approvals",
    children: [
      { key: "approvals_pendentes", label: "Pendentes comigo" },
      { key: "approvals_meus", label: "Meus em aprovação" },
      { key: "approvals_todos", label: "Todos" },
      { key: "approvals_consolidado", label: "Consolidado por Cargo" },
    ],
  },
  { key: "armazem", label: "Armazém", children: [] },
  {
    key: "cadastro",
    label: "Cadastro",
    children: [
      { key: "cadastro_projetos", label: "Projetos" },
      { key: "cadastro_clientes", label: "Clientes" },
      { key: "cadastro_centros", label: "Centro de Custo" },
      { key: "cadastro_cargos", label: "Cargos" },
      { key: "cadastro_lembretes", label: "Lembretes" },
      { key: "cadastro_diversos", label: "Diversos" },
    ],
  },
  {
    key: "usuarios",
    label: "Usuários e logs",
    children: [
      { key: "usuarios_lista", label: "Usuários" },
      { key: "usuarios_acesso_restrito", label: "Perfis de acesso" },
      { key: "usuarios_workflow", label: "Approval Workflow" },
      { key: "usuarios_logs", label: "Logs" },
      { key: "usuarios_backup", label: "Backup" },
    ],
  },
];

export const ALL_MENU_PERMISSION_KEYS = MENU_PERMISSION_GROUPS.flatMap((group) => [
  group.key,
  ...group.children.map((child) => child.key),
]);

export const STANDARD_MENU_PERMISSION_KEYS = [
  "solicitacoes",
  "solicitacoes_minhas",
  "solicitacoes_novas",
  "approvals",
  "approvals_pendentes",
  "approvals_meus",
  "approvals_todos",
  "approvals_consolidado",
  "armazem",
];

export function togglePermissionGroup(current: Set<string>, group: MenuPermissionGroup, allowed: boolean) {
  const next = new Set(current);
  for (const key of [group.key, ...group.children.map((child) => child.key)]) {
    if (allowed) next.add(key);
    else next.delete(key);
  }
  return next;
}

export function togglePermissionItem(current: Set<string>, group: MenuPermissionGroup, key: string, allowed: boolean) {
  const next = new Set(current);
  if (allowed) {
    next.add(group.key);
    next.add(key);
  } else {
    next.delete(key);
    if (group.children.every((child) => child.key === key || !next.has(child.key))) next.delete(group.key);
  }
  return next;
}