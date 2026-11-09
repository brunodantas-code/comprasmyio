type Site = { id: string; file: string; label: string; dynamic: boolean; icon: string };

const actions: Record<string, string> = {
  plus: "Adicionar um item", add: "Criar um cadastro", save: "Salvar alterações",
  cancel: "Cancelar a operação", confirm: "Confirmar a operação", trash: "Excluir um item",
  pencil: "Editar um item", toggle: "Exibir ou recolher conteúdo", move: "Mover um item",
  sort: "Ordenar a lista", filter: "Filtrar resultados", close: "Encerrar a janela",
  send: "Enviar uma mensagem ou resposta", attach: "Adicionar um anexo", export: "Exportar um documento",
  clear: "Limpar a seleção", organize: "Organizar o conteúdo",
};

export function libraryDescription(site: Site, group: string) {
  if (site.file === "components/approval-workflow.tsx" && site.label === "—") {
    return "Número do Approval: abre os detalhes da solicitação e da aprovação.";
  }
  const meaningful = site.label !== site.icon && !/^[\s—–\-0/]*$/.test(site.label) && site.label !== "Sem nome fixo";
  if (meaningful && !site.dynamic) return `${site.label}${site.label.endsWith(".") ? "" : "."}`;
  if (actions[group]) return `${actions[group]}.${site.dynamic ? " Texto varia conforme o registro ou estado." : ""}`;
  return "Controle com conteúdo variável; consulte a tela vinculada para identificar sua função.";
}

/** Cards are individual source sites; repeated rendered rows are not measurable from this ledger. */
export function libraryUsageCounts<T extends Site>(site: T, sites: T[], groupOf: (entry: T) => string) {
  return {
    here: sites.filter(entry => entry.id === site.id).length,
    sameFunction: sites.filter(entry => entry.label === site.label && groupOf(entry) === groupOf(site)).length,
  };
}