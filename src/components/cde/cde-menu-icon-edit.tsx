import { Suspense, useState } from "react";
import { ArrowLeftRight, Check, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports.mjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CdeDraftSave } from "./cde-draft-save";
import { getMenuIcon, useMenuIcons } from "./menu-icon";
import { MENU_ICONS_GROUP, MENU_ICONS_QUERY, parseMenuIcons, resolveMenuIcon, setMenuIcon } from "./menu-icons";
import { useMenuDisplayName } from "./use-menu-names";

const aliases: Record<string, string> = {
  box: "caixa estoque armazém embalagem", package: "pacote produto estoque componentes", truck: "caminhão entrega expedição transporte",
  shopping: "compras carrinho pedido", cart: "carrinho compras", clipboard: "prancheta solicitação aprovação tarefas", check: "aprovação confirmar concluído homologação",
  clock: "relógio prazo tempo aguardando", users: "usuários equipe pessoas clientes técnicos", user: "usuário pessoa técnico responsável", building: "empresa cliente prédio",
  wallet: "carteira financeiro pagamento", credit: "cartão crédito", receipt: "comprovante fatura despesa reembolso", dollar: "dinheiro valor financeiro", bank: "banco conta",
  folder: "pasta projeto cadastro", kanban: "quadro projetos tarefas", file: "arquivo documento relatório", calendar: "calendário data prazo agenda",
  bell: "lembrete alerta sino notificação", tag: "etiqueta classificação", landmark: "centro custo banco", factory: "fábrica produção", cpu: "processador dispositivo componentes",
  wrench: "ferramenta manutenção", tool: "ferramenta", settings: "configuração ajustes", cog: "engrenagem produção ajustes", qr: "código leitura", scan: "leitura conferir código",
  list: "lista tarefas", chart: "gráfico indicadores painel", layers: "camadas diversos", archive: "arquivo estoque armazém", shield: "segurança aprovação permissão", search: "busca pesquisa lupa",
};
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const names = Object.keys(dynamicIconImports);
function keywords(name: string) { return normalize(`${name} ${Object.entries(aliases).filter(([key]) => name.includes(key)).map(([, words]) => words).join(" ")}`); }

export function CdeMenuIconEdit({ app, group, identity, label = identity }: { app: string; group: string; identity: string; label?: string }) {
  const qc = useQueryClient();
  const { data: icons } = useMenuIcons();
  const displayName = useMenuDisplayName(app, group)(identity, label);
  const { data: admin } = useQuery({ queryKey: ["cde-menu-name-admin"], queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase.from("erp_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    return Boolean(data);
  } });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const filtered = names.filter(name => normalize(search).split(/\s+/).every(term => keywords(name).includes(term)));
  const visible = filtered.slice(page * 48, (page + 1) * 48);
  async function save() {
    if (!admin || saving) return;
    setSaving(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw authError ?? new Error("Sessão expirada");
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", MENU_ICONS_GROUP).eq("is_primary", true).maybeSingle();
      if (existing.error) throw existing.error;
      const next = setMenuIcon(parseMenuIcons(existing.data?.variant_key), app, group, identity, draft);
      const row = { variant_key: JSON.stringify(next), chosen_by: user.id };
      const result = existing.data
        ? await supabase.from("cde_selected").update(row).eq("group_key", MENU_ICONS_GROUP).eq("is_primary", true).eq("variant_key", existing.data.variant_key).select("variant_key").single()
        : await supabase.from("cde_selected").insert({ ...row, group_key: MENU_ICONS_GROUP, is_primary: true }).select("variant_key").single();
      if (result.error) throw result.error;
      if (result.data.variant_key !== row.variant_key) throw new Error("Salvamento não confirmado");
      qc.setQueryData(MENU_ICONS_QUERY, next);
      await qc.invalidateQueries({ queryKey: MENU_ICONS_QUERY });
      setOpen(false); toast.success("Ícone aplicado ao menu");
    } catch { toast.error("Não foi possível salvar o ícone. Tente novamente."); }
    finally { setSaving(false); }
  }
  if (!admin) return null;
  return <>
    <Button variant="ghost" size="compactIcon" aria-label={`Alterar símbolo do menu ${label} de ${app}`} title={`Alterar símbolo de ${displayName}`} onClick={() => { setDraft(resolveMenuIcon(icons, app, group, identity) ?? ""); setSearch(""); setPage(0); setOpen(true); }}><ArrowLeftRight /></Button>
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}>
      <DialogContent topActions={open ? <CdeDraftSave value={draft} disabled={saving} onSave={save} label="Salvar ícone do menu" /> : undefined}>
        <DialogHeader><DialogTitle>Ícone · {displayName}</DialogTitle></DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-2"><Input type="search" aria-label="Buscar ícones" placeholder="Buscar ícones" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /><Button variant="ghost" title="Restaurar ícone original" aria-pressed={!draft} onClick={() => setDraft("")}><RotateCcw />Original{!draft ? <Check /> : null}</Button></div>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8" role="group" aria-label="Biblioteca de ícones">{visible.map(name => {
          const Icon = getMenuIcon(name);
          return <Button key={name} variant="ghost" size="icon" title={name} aria-label={`Ícone ${name}`} aria-pressed={draft === name} onClick={() => setDraft(name)} className="relative">{Icon ? <Suspense fallback={<span className="size-5" />}><Icon className="size-5" /></Suspense> : null}{draft === name ? <Check className="absolute bottom-0 right-0 size-3" /> : null}</Button>;
        })}</div>
        {!visible.length ? <p className="text-sm text-muted-foreground">Nenhum ícone encontrado.</p> : null}
        <div className="flex items-center justify-between text-sm text-muted-foreground"><span>{filtered.length} ícones · {page + 1}/{Math.max(1, Math.ceil(filtered.length / 48))}</span><div className="flex gap-1"><Button variant="ghost" size="compactIcon" aria-label="Página anterior de ícones" title="Página anterior" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft /></Button><Button variant="ghost" size="compactIcon" aria-label="Próxima página de ícones" title="Próxima página" disabled={(page + 1) * 48 >= filtered.length} onClick={() => setPage(page + 1)}><ChevronRight /></Button></div></div>
      </DialogContent>
    </Dialog>
  </>;
}