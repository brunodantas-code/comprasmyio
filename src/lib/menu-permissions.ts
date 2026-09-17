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
      { key: "approvals_pendentes", label: "Aguardando minha aprovação" },
      { key: "approvals_meus", label: "Meus em aprovação" },
      { key: "approvals_meus_supply", label: "Meus com Supply" },
      { key: "approvals_fila_supply", label: "Fila do Supply" },
      { key: "approvals_todos", label: "Todos" },
      { key: "approvals_consolidado", label: "Consolidado por Cargo" },
    ],
  },
  {
    key: "armazem",
    label: "Armazém",
    children: [
      { key: "armazem_fabrica", label: "Fábrica" },
      { key: "armazem_estoque_myio", label: "Estoque" },
      { key: "armazem_expedicao", label: "Expedição" },
      { key: "armazem_homologacao", label: "Homologação" },
      { key: "armazem_transporte", label: "Transporte" },
      { key: "armazem_cliente", label: "Cliente" },
      { key: "armazem_tecnico", label: "Técnico" },
      { key: "armazem_perdido", label: "Perdido" },
      { key: "armazem_itens_avariados", label: "Itens Avariados" },
      { key: "armazem_checar_qr", label: "Checar QR Code" },
      { key: "armazem_almoxarifado", label: "Almoxarifado" },
      { key: "armazem_ferramentas_ativos", label: "Ferramentas/Ativos" },
    ],
  },
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
  "approvals_meus_supply",
  "approvals_fila_supply",
  "approvals_todos",
  "approvals_consolidado",
  "armazem",
  "armazem_fabrica",
  "armazem_estoque_myio",
  "armazem_expedicao",
  "armazem_homologacao",
  "armazem_transporte",
  "armazem_cliente",
  "armazem_tecnico",
  "armazem_perdido",
  "armazem_itens_avariados",
  "armazem_checar_qr",
  "armazem_almoxarifado",
  "armazem_ferramentas_ativos",
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