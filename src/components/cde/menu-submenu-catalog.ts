import { Bell, Boxes, Briefcase, Building2, CalendarDays, CheckCircle2, ClipboardCheck, ClipboardList, DatabaseBackup, FileText, FolderKanban, Landmark, Layers3, Plus, ScrollText, ShoppingCart, Tag } from "lucide-react";
const entries = (parent: string, icon: typeof Boxes, rows: [string, string][]) => rows.map(([value, label]) => ({ parent, value, label, icon }));
/** Parent/value pairs match commands independently of editable names. */
export const MENU_SUBMENUS = {
  Supply: [
    ...entries("pedidos", ClipboardList, [["mine", "Minhas Solicitações"]]), ...entries("pedidos", Plus, [["new", "Novas Solicitações"]]),
    ...entries("queue", ShoppingCart, [["mine", "Aguardando minha aprovação"], ["flow", "Meus em aprovação"], ["mine-supply", "Meus com Supply"], ["supply", "Fila do Supply"], ["all", "Todos"], ["roles", "Consolidado por Cargo"]]),
    ...entries("stock", Boxes, [["fabrica:estoque", "Estoque de Componentes"], ["fabrica:fila", "Fila de Produção"], ["fabrica:liberados", "Dispositivos Liberados"], ["fabrica:homologacao", "Homologação"], ["estoque:dispositivos", "Estoque myio"], ["estoque:cliente", "Clientes"], ["estoque:tecnico", "Técnicos"], ["estoque:insumos", "Insumos de Instalação"], ["estoque:ordens", "Solicitações"], ["estoque:expedicao", "Expedição"], ["estoque:qr-check", "Checar QR Code"], ["almoxarifado_geral", "Almoxarifado"], ["ferramentas", "Ferramentas/Ativos"]]),
    ...entries("stock", ClipboardList, [["inventario", "Inventário"]]),
    ...entries("projects", FolderKanban, [["projetos", "Projetos"]]), ...entries("projects", Building2, [["clientes", "Clientes"]]), ...entries("projects", Landmark, [["centros", "Centro de Custo"]]),
    ...entries("projects", Tag, [["etiquetas", "Etiquetas"]]), ...entries("projects", Briefcase, [["cargos", "Cargos"]]), ...entries("projects", Bell, [["lembretes", "Lembretes"]]), ...entries("projects", Layers3, [["diversos", "Diversos"]]),
    ...entries("admin", CheckCircle2, [["workflow:organograma", "Organograma de Aprovação"], ["workflow:padrao", "Alçadas de Aprovação"], ["workflow:etapas-adicionais", "Etapas Adicionais"]]), ...entries("admin", ScrollText, [["logs", "Logs"]]), ...entries("admin", DatabaseBackup, [["backup", "Backup"]]),
  ],
  "Site Survey": [
    ...entries("visitas", Plus, [["nova", "Nova visita"]]), ...entries("visitas", CalendarDays, [["minhas", "Realizar Visita"]]),
    ...entries("visitas", ClipboardCheck, [["pendencias", "Sanar Pendências"], ["realizada", "Cadastrar visita realizada"]]), ...entries("visitas", FileText, [["resumo", "Histórico de Visitas"]]),
  ],
};
export const SUBMENU_PARENTS: Record<string, Record<string, string>> = {
  Supply: { Solicitações: "pedidos", Approvals: "queue", Armazém: "stock", Cadastro: "projects", "Aprovações e logs": "admin" },
  "Site Survey": { Visitas: "visitas" },
};
