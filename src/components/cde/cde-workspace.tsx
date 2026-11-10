import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowDownUp, ArrowUp, ArrowUpDown, Building2, Check, ChevronDown, ChevronsDownUp, ChevronLeft, ChevronRight, ChevronUp, ClipboardCheck, Filter, PackagePlus, Pencil, Percent, Plus, RotateCcw, Save, Settings2, Trash2, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import inventory from "./inventory.json";
import filterUsage from "./filter-usage.json";
import addTextUsage from "./add-text-usage.json";
import { CdeAddTextList } from "./cde-add-text-list";
import { CdeSortableList, useCdeOrder, type CdeOrder } from "./cde-order";
import { BORDERS, FILLS } from "@/components/mytosis/shapes";
import { ColorCode } from "./color-code";
import { FONT_SIZES, FORMS, ICONS, TEXTS, WIDTHS, styleOf, type CdeStyle } from "./cde-render";
import { CdeAppIcons } from "./cde-app-icons";
import { CdeNavigation } from "./cde-navigation";
import { CdeButton, CdeNumber, CdeToggleIcon, addTextKey } from "./cde-button";
import { CdeMainMenu } from "./cde-main-menu";
import { CdeAppOrder } from "./cde-app-order";
import { CdeCategoryHeader } from "./cde-category-header";
import { FormatColorOptions } from "@/components/mytosis/format-color-options";
import { CdeButtonLibrary } from "./cde-button-library";
import { CdeDeadlineAlerts } from "./cde-deadline-alerts";
import { COMMON_ACTION_GROUPS } from "./action-standard";
import { UsageLinks } from "./usage-links";
import { readButtonBindings } from "./library-bindings";
import numberUsage from "./number-usage.json";

type Variant = { key: string; name?: string; custom?: boolean; tag: string; variant: string; size: string; className: string; icon: string; iconClass: string; label: string; count: number; files: string[]; uses?: { file: string; n: number }[]; style?: CdeStyle };


const VARIANTS = ["", "default", "outline", "ghost", "action", "secondary", "destructive", "link"];
const SIZES = ["", "default", "sm", "lg", "icon", "compactIcon"];

type GroupKey = string;
/** Subgrupos dos campos, separados pelo tipo do componente. */
const FIELD_TAGS: Record<string, string[]> = { fields_input: ["Input"], fields_select: ["SelectTrigger"], fields_textarea: ["Textarea"], fields_password: ["PasswordInput"] };
/** multi: grupos que admitem mais de um padrão (ex.: campos têm usos diferentes). */
const GROUPS: { key: GroupKey; title: string; hint: string; multi?: boolean }[] = [
  { key: "fields_input", title: "1.1 Campos de texto e número", hint: "Caixas de uma linha · admite vários padrões", multi: true },
  { key: "fields_select", title: "1.2 Listas suspensas (droplists)", hint: "Seletores de opções · admite vários padrões", multi: true },
  { key: "fields_textarea", title: "1.3 Textos longos", hint: "Áreas de texto com várias linhas · admite vários padrões", multi: true },
  { key: "fields_password", title: "1.4 Senhas", hint: "Campos de senha com olho · admite vários padrões", multi: true },
  { key: "filter", title: "2. Filtros", hint: "Botões de funil · padrão único" },
  { key: "sort", title: "3.1 Ordenar colunas e listas", hint: "Setas de ordem crescente/decrescente · padrão único" },
  { key: "move", title: "3.2 Mover para cima/baixo", hint: "Setas que reposicionam uma linha · padrão único" },
  { key: "summary", title: "3.3 Voltar ao Sumário", hint: "Link de retorno ao sumário · padrão único" },
  { key: "toggle", title: "3.4 Exibir/Recolher", hint: "Setas de expandir e recolher · padrão único" },
  { key: "action_standard", title: "4.0 Padrão visual comum", hint: "Altura, fundo, bordas e cantos dos botões de ação" },
  { key: "plus", title: "4.1 Botões +", hint: "Padrão único" },
  { key: "add", title: "4.2 Adicionar / Novo (texto)", hint: "Padrão único" },
  { key: "save", title: "4.3 Salvar", hint: "Padrão único" },
  { key: "cancel", title: "4.4 Cancelar", hint: "Padrão único" },
  { key: "confirm", title: "4.5 Confirmar / Concluir", hint: "Padrão único" },
  { key: "close", title: "4.6 Fechar", hint: "X do canto das janelas e painéis · padrão único, aplicado ao vivo" },
  { key: "pencil", title: "4.7 Lápis (editar)", hint: "Padrão único" },
  { key: "trash", title: "4.8 Lixeira (excluir)", hint: "Padrão único" },
  { key: "export", title: "4.9 Exportar relatórios (PDF/Excel)", hint: "Botões PDF e Excel · padrão único, aplicado ao vivo" },
  { key: "send", title: "4.10 Enviar (respostas e perguntas)", hint: "Padrão único, aplicado ao vivo" },
  { key: "attach", title: "4.11 Anexar (imagens e arquivos)", hint: "Padrão único, aplicado ao vivo" },
  { key: "clear", title: "4.12 Limpar", hint: "Limpar campos e filtros · padrão único, aplicado ao vivo" },
  { key: "organize", title: "4.13 Agrupar e consolidar", hint: "Agrupamento, consolidação e custo por etiqueta · padrão único, aplicado ao vivo" },
  { key: "box", title: "5.1 Boxes (cartões)", hint: "Forma, borda, espessura e fundo dos cartões · padrão único, aplicado ao vivo" },
  { key: "confirm_dialog", title: "5.2 Mensagens de confirmação", hint: "Janelas de exclusão e confirmação · padrão único, aplicado ao vivo" },
  { key: "restricted", title: "5.3 Acesso restrito (cadeado)", hint: "Símbolo dos assuntos confidenciais · padrão único, aplicado ao vivo" },
  { key: "number_section", title: "6.1 Numeração sequencial dos apps", hint: "Categorias, assuntos, seções, perguntas e ações · padrão principal e secundários por tela" },
  { key: "number_subsection", title: "6.2 Numeração das subcategorias", hint: "Quadrada ou redonda · padrão principal e secundários por tela" },
  { key: "color_swatch", title: "11. Padrões para edição de cores", hint: "Amostras de cor · padrão único, aplicado em todos os apps" },
];

const NUMBER_MODELS: Record<string, Omit<Variant, "key">[]> = Object.fromEntries(["number_section", "number_subsection"].map((group) => [group, ["rounded-md", "rounded-full"].map((shape) => ({ tag: "span", variant: "", size: "", className: `${shape} ${group === "number_section" ? "bg-primary text-foreground" : "bg-cde-number-soft text-primary"}`, icon: "", iconClass: "", label: "1", count: 0, files: ["components/cde/cde-workspace.tsx"] }))]));
NUMBER_MODELS.color_swatch = ["rounded-none", "rounded-full"].map((shape) => ({ tag: "span", variant: "", size: "", className: `${shape} bg-primary`, icon: "", iconClass: "", label: " ", count: 0, files: ["components/mytosis/color-options.tsx", "components/mytosis/format-color-options.tsx", "components/cde/top-icon-style-editor.tsx", "components/cde/list-item-style.tsx"] }));
const ACTION_MODELS: Omit<Variant, "key">[] = [{ tag: "Button", variant: "outline", size: "default", className: "", icon: "Save", iconClass: "h-4 w-4", label: "Salvar", count: 0, files: [] }];

/** Telas conhecidas pelo levantamento, com o app deduzido pelo caminho do arquivo. */
const SCREENS = [...new Set([...Object.values(inventory).flatMap((g) => (g as { files: string[] }[]).flatMap((v) => v.files)), "controls/save-icon", "components/legal/minutes-list.tsx", "components/legal/legal-workspace.tsx", "components/legal/subject-actions.tsx", "routes/_authenticated/site-survey.tsx", "components/site-survey-screen-summary.tsx", "components/mytosis/processes-tab.tsx", "components/mytosis/flowchart.tsx", "components/mytosis/node-preview.tsx", "components/supply-order-statuses-tab.tsx", "components/supply-manual-reader.tsx", "components/cde/cde-app-order.tsx", "components/cde/cde-sortable-icons.tsx"])].sort();
const APP_BY_DIR: Record<string, string> = { mytosis: "Mytosis", "cash-flow": "Cash Flow", legal: "Legal", cde: "CDE", "site-survey": "Site Survey", opdesk: "OpDesk", code: "Code" };
function screenApp(f: string) {
  if (f === "controls/save-icon") return "Todos os apps · Salvar somente com disquete";
  const parts = f.split("/");
  if (parts[0] === "components" && parts.length > 2) return APP_BY_DIR[parts[1]] ?? parts[1];
  if (parts[0] === "routes") return parts[parts.length - 1].replace(/\.tsx$/, "").replace(/^_authenticated\./, "");
  return "Geral";
}

/** Categorias-mãe das subcategorias numeradas (ex.: 3 → 3.1, 3.2). */
const PARENTS: Record<string, string> = { "1": "Campos para preenchimento", "3": "Ordenação", "4": "Botões de ação", "5": "Boxes e mensagens", "6": "Numeração de categorias e subcategorias" };

const baseTitle = (t: string) => t.split(" ").slice(1).join(" ");
const groupParent = (t: string) => { const n = t.split(" ")[0].replace(/\.$/, ""); return n.includes(".") ? n.split(".")[0] : null; };
const CDE_DEFAULT_ORDER: CdeOrder = {
  cats: [...[...new Set(GROUPS.map((g) => groupParent(g.title) ? `p:${groupParent(g.title)}` : g.key))], "icons", "nav", "menu", "apps", "button_library", "deadline_alerts"],
  subs: Object.fromEntries(Object.keys(PARENTS).map((p) => [p, GROUPS.filter((g) => groupParent(g.title) === p).map((g) => g.key)])),
};
const EXTRA_LABELS: Record<string, string> = { icons: "Ícones dos Apps e menus", nav: "Navegação (UI/UX)", menu: "Menu principal", apps: "Apps da página principal", button_library: "Biblioteca de botões em uso", deadline_alerts: "Alertas de Prazo" };

const inventoryKey = (v: Omit<Variant, "key">) => [v.tag, v.variant, v.size, v.className, v.icon, v.iconClass].join("|");

function Preview({ v }: { v: Pick<Variant, "tag" | "variant" | "size" | "className" | "icon" | "iconClass" | "label" | "style"> }) {
  const { css, cls } = styleOf(v.style);
  if (v.tag === "span") return <span style={css} className={cn("flex h-7 w-7 shrink-0 items-center justify-center text-sm font-bold", v.className, cls)}>{v.label || "1"}</span>;
  if (v.tag === "div") return <div style={css} className={cn("flex h-14 w-48 items-center justify-center text-xs", v.className || "rounded-xl border bg-card shadow", cls)}>{v.label || "Box"}</div>;
  if (v.tag === "Textarea") return <textarea style={css} className={cn("min-h-[60px] w-56 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground", v.className, cls)} placeholder="Texto" readOnly />;
  if (["Input", "SelectTrigger", "PasswordInput"].includes(v.tag)) return <input style={css} className={cn("h-9 w-56 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground", v.className, cls)} placeholder={v.tag === "SelectTrigger" ? "Selecione…" : "Texto"} readOnly />;
  const Icon = ICONS[v.icon];
  const content = <>{Icon ? <Icon className={v.iconClass} /> : null}{v.label && !/[=()]/.test(v.label) ? v.label : null}</>;
  if (v.tag === "button") return <button type="button" style={css} className={cn(v.className, cls)}>{content}</button>;
  return <Button type="button" variant={(v.variant || undefined) as never} size={(v.size || undefined) as never} style={css} className={cn(v.className, cls)}>{content}</Button>;
}

const emptyDraft = { name: "", tag: "Button", variant: "outline", size: "", className: "", icon: "", iconClass: "", label: "", style: {} as CdeStyle };

export function CdeWorkspace() {
  const qc = useQueryClient();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [collapseKey, setCollapseKey] = useState(0);
  const { order: cdeOrder, save: saveCdeOrder } = useCdeOrder(CDE_DEFAULT_ORDER);
  const catLabel = (c: string) => c.startsWith("p:") ? PARENTS[c.slice(2)] : EXTRA_LABELS[c] ?? baseTitle(GROUPS.find((x) => x.key === c)?.title ?? c);
  const groupTitle = (key: string) => {
    const g = GROUPS.find((x) => x.key === key); if (!g) return "";
    const p = groupParent(g.title);
    const ci = cdeOrder.cats.indexOf(p ? `p:${p}` : key) + 1;
    return p ? `${ci}.${(cdeOrder.subs[p] ?? []).indexOf(key) + 1} ${baseTitle(g.title)}` : `${ci} ${baseTitle(g.title)}`;
  };
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => new Set(Object.keys(PARENTS)));
  const [expandedWhere, setExpandedWhere] = useState<Set<string>>(new Set());
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState<GroupKey | null>(null);
  const [editing, setEditing] = useState<Variant | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [deleting, setDeleting] = useState<{ group: GroupKey; model: Variant; label: string } | null>(null);
  const [replacement, setReplacement] = useState("");
  const [secondary, setSecondary] = useState<{ group: GroupKey; key: string; label: string; screens: string[] } | null>(null);
  const [screenSearch, setScreenSearch] = useState("");
  const [libraryEdit, setLibraryEdit] = useState<{ ids: string[]; label: string; dynamic: boolean } | null>(null);

  const { data } = useQuery({
    queryKey: ["cde-data"],
    queryFn: async () => {
      const [sel, models, removed] = await Promise.all([
        supabase.from("cde_selected").select("group_key,variant_key,is_primary,screens"),
        supabase.from("cde_models").select("*").order("created_at"),
        supabase.from("cde_removed").select("group_key,variant_key,replaced_by"),
      ]);
      if (sel.error || models.error || removed.error) throw sel.error ?? models.error ?? removed.error;
      return { selected: sel.data, models: models.data, removed: removed.data };
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["cde-data"] }); qc.invalidateQueries({ queryKey: ["cde-standards"] }); };
  const uid = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("Sessão não encontrada.");
    return user.id;
  };

  const groupModels = (g: GroupKey): Variant[] => {
    const removed = new Set((data?.removed ?? []).filter((r) => r.group_key === g).map((r) => r.variant_key));
    const src = (g === "action_standard" ? ACTION_MODELS : NUMBER_MODELS[g]) ?? (FIELD_TAGS[g] ? ((inventory.fields as Omit<Variant, "key">[]).filter((v) => FIELD_TAGS[g].includes(v.tag))) : ((inventory as Record<string, unknown>)[g] ?? []) as Omit<Variant, "key">[]);
    const base = src.map((v) => {
      if (g !== "filter") { const fc = (v as { fileCounts?: number[] }).fileCounts; return { ...v, key: inventoryKey(v), uses: v.files.map((f, i) => ({ file: f, n: fc?.[i] ?? 1 })) }; }
      const primaryDefinition = v.variant === "ghost" && v.size === "icon" && v.files.includes("components/column-filter.tsx");
      const generalDefinition = v.files.includes("components/site-survey-general-filter.tsx");
      const uses = filterUsage.filter((entry) => (generalDefinition ? entry.general : primaryDefinition ? entry.standard : 0) > 0);
      return { ...v, key: inventoryKey(v), count: uses.reduce((total, entry) => total + (generalDefinition ? entry.general : entry.standard), 0), files: uses.map((entry) => entry.file), uses: uses.map((entry) => ({ file: entry.file, n: generalDefinition ? entry.general : entry.standard })) };
    });
    const custom = (data?.models ?? []).filter((m) => m.group_key === g).map((m) => ({ key: `custom:${m.id}`, name: m.name, custom: true, tag: m.tag, variant: m.variant, size: m.size, className: m.class_name, icon: m.icon, iconClass: m.icon_class, label: m.label, style: (m.style ?? {}) as CdeStyle, count: 0, files: [] as string[], uses: [] as { file: string; n: number }[] }));
    const all = [...base, ...custom];
    const kept = all.filter((v) => !removed.has(v.key));
    // Excluídos transferem seus usos ao padrão substituto (seguindo cadeias de substituição).
    const repl = new Map((data?.removed ?? []).filter((r) => r.group_key === g).map((r) => [r.variant_key, r.replaced_by] as const));
    const target = (k: string) => { let cur = k; for (let i = 0; i < 20 && repl.has(cur); i++) cur = repl.get(cur)!; return cur; };
    const merge = (list: { file: string; n: number }[]) => { const m = new Map<string, number>(); for (const u of list) m.set(u.file, (m.get(u.file) ?? 0) + u.n); return [...m].map(([file, n]) => ({ file, n })); };
    const extraUses = new Map<string, { file: string; n: number }[]>();
    all.filter((v) => removed.has(v.key)).forEach((v) => { const t = target(v.key); extraUses.set(t, [...(extraUses.get(t) ?? []), ...v.uses]); });
    const finish = (v: (typeof all)[number], uses: { file: string; n: number }[]) => { const u = merge(uses); return { ...v, uses: u, files: u.map((x) => x.file), count: u.reduce((a, x) => a + x.n, 0) }; };
    let result = kept.map((v) => finish(v, [...v.uses, ...(extraUses.get(v.key) ?? [])]));
    // Grupos de padrão único: o padrão concentra todos os usos; os demais ficam com zero.
    // Secundários ficam com os usos das telas associadas; o principal com o restante.
    const std = primariesOf(g);
    const single = !GROUPS.find((x) => x.key === g)?.multi || Boolean(FIELD_TAGS[g]);
    if (single && std.length === 1 && result.some((v) => v.key === std[0])) {
      const allUses = merge(all.flatMap((v) => v.uses));
      const claimed = new Set<string>();
      const secUses = new Map<string, { file: string; n: number }[]>();
      for (const sec of secondariesOf(g)) {
        const scr = new Set(sec.screens);
        const mine = allUses.filter((u) => scr.has(u.file) && !claimed.has(u.file));
        mine.forEach((u) => claimed.add(u.file));
        secUses.set(sec.variant_key, [...(secUses.get(sec.variant_key) ?? []), ...mine]);
      }
      const rest = allUses.filter((u) => !claimed.has(u.file));
      result = result.map((v) => finish(v, v.key === std[0] ? rest : secUses.get(v.key) ?? []));
    }
    if (g === "number_section" || g === "number_subsection") {
      const uses = merge(numberUsage.filter(u => u.group === g).map(u => ({ file: u.file, n: 1 })));
      const primary = primariesOf(g)[0];
      const secondary = secondariesOf(g);
      result = result.map(v => finish(v, uses.filter(u => {
        const owner = secondary.find(s => s.screens.includes(u.file))?.variant_key ?? primary;
        return owner === v.key;
      })));
    }
    return result;
  };
  const standardsOf = (g: GroupKey) => (data?.selected ?? []).filter((s) => s.group_key === g).map((s) => s.variant_key);
  const primariesOf = (g: GroupKey) => (data?.selected ?? []).filter((s) => s.group_key === g && s.is_primary).map((s) => s.variant_key);
  const secondariesOf = (g: GroupKey) => (data?.selected ?? []).filter((s) => s.group_key === g && !s.is_primary);

  const toggleStandard = useMutation({
    mutationFn: async ({ group, key, multi }: { group: GroupKey; key: string; multi?: boolean }) => {
      const current = primariesOf(group);
      if (current.includes(key)) {
        const { error } = await supabase.from("cde_selected").delete().eq("group_key", group).eq("variant_key", key);
        if (error) throw error;
        return;
      }
      if (!multi && current.length) {
        const { error } = await supabase.from("cde_selected").delete().eq("group_key", group).eq("is_primary", true);
        if (error) throw error;
      }
      await supabase.from("cde_selected").delete().eq("group_key", group).eq("variant_key", key);
      const { error } = await supabase.from("cde_selected").insert({ group_key: group, variant_key: key, chosen_by: await uid() });
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast.success("Padrão atualizado"); },
    onError: () => toast.error("Não foi possível atualizar o padrão."),
  });

  const create = useMutation({
    mutationFn: async (group: GroupKey) => {
      if (!draft.name.trim()) throw new Error("Informe o nome do modelo.");
      const visualChanged = !editing || draft.variant !== editing.variant || draft.size !== editing.size || draft.className !== editing.className || ["shape", "fill", "border", "borderWidth"].some(k => draft.style[k as keyof CdeStyle] !== editing.style?.[k as keyof CdeStyle]);
      const modelStyle = group !== "action_standard" && COMMON_ACTION_GROUPS.has(group) && visualChanged ? { ...draft.style, actionSpecific: true } : draft.style;
      const values = { name: draft.name.trim(), tag: draft.tag, variant: draft.variant, size: draft.size, class_name: draft.className, icon: draft.icon, icon_class: draft.iconClass, label: draft.label, style: modelStyle };
      if (libraryEdit) {
        const row = data?.selected.find(s => s.group_key === "button_bindings" && s.is_primary);
        const bindings = readButtonBindings(row?.variant_key);
        const existingKey = bindings[libraryEdit.ids[0]]?.modelKey;
        const existing = existingKey?.startsWith("custom:") ? data?.models.find(m => m.id === existingKey.slice(7)) : undefined;
        const request = existing ? supabase.from("cde_models").update({ ...values, style: { ...modelStyle, actionSpecific: true } }).eq("id", existing.id) : supabase.from("cde_models").insert({ ...values, group_key: group, style: { ...modelStyle, actionSpecific: true }, created_by: await uid() });
        const { data: model, error } = await request.select("id").single();
        if (error) throw error;
        for (const id of libraryEdit.ids) bindings[id] = { group, label: draft.label, modelKey: `custom:${model.id}`, preserveContent: libraryEdit.dynamic };
        const payload = { variant_key: JSON.stringify(bindings), chosen_by: await uid() };
        const result = row ? await supabase.from("cde_selected").update(payload).eq("group_key", "button_bindings").eq("variant_key", row.variant_key) : await supabase.from("cde_selected").insert({ ...payload, group_key: "button_bindings", is_primary: true });
        if (result.error) throw result.error;
        return;
      }
      if (editing?.custom) {
        const { error } = await supabase.from("cde_models").update(values).eq("id", editing.key.slice(7)).eq("group_key", group);
        if (error) throw error;
      } else {
        const { data: model, error } = await supabase.from("cde_models").insert({ ...values, group_key: group, created_by: await uid() }).select("id").single();
        if (error) throw error;
        if (editing) {
          const key = `custom:${model.id}`;
          const selection = await supabase.from("cde_selected").update({ variant_key: key }).eq("group_key", group).eq("variant_key", editing.key);
          if (selection.error) throw selection.error;
          const replacements = await supabase.from("cde_removed").update({ replaced_by: key }).eq("group_key", group).eq("replaced_by", editing.key);
          if (replacements.error) throw replacements.error;
          const exclusion = await supabase.from("cde_removed").insert({ group_key: group, variant_key: editing.key, replaced_by: key, removed_by: await uid() });
          if (exclusion.error) throw exclusion.error;
        }
      }
    },
    onSuccess: () => { refresh(); setCreating(null); setEditing(null); setLibraryEdit(null); setDraft(emptyDraft); toast.success(editing ? "Modelo atualizado" : "Modelo criado e aplicado"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível criar o modelo."),
  });

  const saveSecondary = useMutation({
    mutationFn: async () => {
      if (!secondary) return;
      const { group, key, screens } = secondary;
      const { error: delErr } = await supabase.from("cde_selected").delete().eq("group_key", group).eq("variant_key", key);
      if (delErr) throw delErr;
      if (!screens.length) return;
      const { error } = await supabase.from("cde_selected").insert({ group_key: group, variant_key: key, is_primary: false, screens, chosen_by: await uid() });
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast.success(secondary?.screens.length ? "Padrão secundário salvo" : "Padrão secundário removido"); setSecondary(null); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar."),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!deleting || !replacement) throw new Error("Escolha o padrão substituto.");
      const { group, model } = deleting;
      const { error } = await supabase.from("cde_removed").insert({ group_key: group, variant_key: model.key, replaced_by: replacement, removed_by: await uid() });
      if (error) throw error;
      if (model.custom) await supabase.from("cde_models").delete().eq("id", model.key.slice(7));
    },
    onSuccess: () => { refresh(); setDeleting(null); toast.success("Modelo excluído e substituído pelo padrão"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível excluir o modelo."),
  });

  const restore = useMutation({
    mutationFn: async ({ group, key }: { group: string; key: string }) => {
      const { error } = await supabase.from("cde_removed").delete().eq("group_key", group).eq("variant_key", key);
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast.success("Modelo restaurado"); },
  });

  const renderGroup = (g0: (typeof GROUPS)[number], num: string, parent: string | null, handle: React.ReactNode) => {
        const g = { ...g0, title: `${num} ${baseTitle(g0.title)}` };
                  const list = groupModels(g.key);
        const standards = standardsOf(g.key);
        const primaries = primariesOf(g.key);
        const secs = secondariesOf(g.key);
        const nameOf = (key: string) => { const i = list.findIndex((v) => v.key === key); return i < 0 ? "Modelo excluído" : list[i].name ?? `Modelo ${i + 1}`; };
        const removed = (data?.removed ?? []).filter((r) => r.group_key === g.key);
        const isOpen = open.has(g.key);
        return (
          <section className={cn(parent ? "min-w-0 overflow-hidden border-b border-border" : "min-w-0")}>
            {!parent ? <CdeCategoryHeader handle={handle} number={num} title={g.title.split(" ").slice(1).join(" ")} hint={`${list.length} modelos · ${g.hint}`} open={isOpen} onToggle={() => setOpen((s) => { const n = new Set(s); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; })} action={<CdeButton group="plus" screen="components/cde/cde-workspace.tsx" title="Criar modelo" aria-label={`Criar modelo em ${g.title}`} onClick={() => { setDraft({ ...emptyDraft, tag: (g.key === "box" || g.key === "confirm_dialog") ? "div" : "Button" }); setCreating(g.key); }} />} /> : <div className="flex items-center gap-3 bg-accent px-5 py-2">{handle}
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; })} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                <span className="flex flex-col">
                  <CdeNumber subcategory={!!parent}>{num}</CdeNumber>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-normal">{g.title.split(" ").slice(1).join(" ")}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{list.length} modelos · {g.hint}</span>
                </span>
              </button>
              <CdeButton group="plus" screen="components/cde/cde-workspace.tsx" title="Criar modelo" aria-label={`Criar modelo em ${g.title}`} onClick={() => { setDraft({ ...emptyDraft, tag: FIELD_TAGS[g.key]?.[0] ?? (NUMBER_MODELS[g.key] ? "span" : (g.key === "box" || g.key === "confirm_dialog") ? "div" : "Button"), label: NUMBER_MODELS[g.key] ? "1" : "" }); setCreating(g.key); }} />
              <CdeButton group="toggle" screen="components/cde/cde-workspace.tsx" title={`${isOpen ? "Recolher" : "Exibir"} ${g.title}`} aria-label={`${isOpen ? "Recolher" : "Exibir"} ${g.title}`} aria-expanded={isOpen} onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; })} />
            </div>}
            {isOpen ? (
              <>
                <div className="flex max-w-full gap-3 overflow-x-auto p-4">
                  {list.map((v, i) => ({ v, i })).sort((a, b) => { const rank = (k: string) => primaries.includes(k) ? 0 : secs.some((x) => x.variant_key === k) ? 1 : 2; return rank(a.v.key) - rank(b.v.key) || a.i - b.i; }).map(({ v, i }) => {
                    const selected = standards.includes(v.key);
                    const isPrimary = primaries.includes(v.key);
                    const sec = secs.find((s) => s.variant_key === v.key);
                    return (
                      <div key={v.key} data-cde-model={g.key} className={cn("flex h-60 w-64 shrink-0 flex-col gap-2 rounded-lg border p-3", selected ? "border-primary bg-accent" : "border-border")}>
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="truncate" title={v.style?.description || undefined}>{v.name ?? `Modelo ${i + 1}`}{v.custom ? " · criado no CDE" : ""}</span>
                          <span className="flex shrink-0 items-center gap-1 whitespace-nowrap" title={g.key.startsWith("number_") ? "Locais no código; cada local pode repetir o marcador em várias linhas" : undefined}>{g.key === "action_standard" ? "compartilhado" : v.custom && !v.count ? "novo" : `${v.count} uso${v.count === 1 ? "" : "s"}`}
                            <Button type="button" variant="outline" size="compactIcon" title="Editar modelo" aria-label={`Editar ${v.name ?? `Modelo ${i + 1}`} em ${g.title}`} onClick={() => { setEditing(v); setDraft({ name: v.name ?? `Modelo ${i + 1}`, tag: v.tag, variant: v.variant, size: v.size, className: v.className, icon: v.icon, iconClass: v.iconClass, label: v.label, style: { ...v.style } }); setCreating(g.key); }}><Pencil /></Button>
                            <Button type="button" variant="outline" size="compactIcon" title={selected ? "Remova o padrão antes de excluir" : "Excluir modelo"} aria-label={`Excluir ${v.name ?? `Modelo ${i + 1}`}`} disabled={selected}
                              onClick={() => { if (!standards.length) return toast.error("Escolha primeiro um padrão para substituir este modelo."); setReplacement(primaries.length === 1 ? primaries[0] : standards.length === 1 ? standards[0] : ""); setDeleting({ group: g.key, model: v, label: v.name ?? `Modelo ${i + 1}` }); }}><Trash2 /></Button>
                          </span>
                        </div>
                        <div className="flex h-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-background p-2"><Preview v={v} /></div>
                        <Button type="button" variant="action" size="sm" style={{ "--wa-bg": "var(--whatsapp-green)", "--wa-bd": "var(--whatsapp-border)", "--wa-tx": "var(--card)" } as React.CSSProperties} className="mt-auto !h-9 !min-h-9 !py-0 !text-sm !rounded-lg !border-2 !border-solid !border-[var(--wa-bd)] !bg-[var(--wa-bg)] !text-[var(--wa-tx)] hover:!brightness-110 disabled:!opacity-100" disabled={toggleStandard.isPending} title={isPrimary ? "Remover a seleção de padrão sem excluir o modelo" : undefined} onClick={() => toggleStandard.mutate({ group: g.key, key: v.key, multi: g.multi })}>
                          {isPrimary ? <><Check className="h-4 w-4" />{g.multi ? "Padrão (remover)" : "Padrão principal (remover)"}</> : g.multi ? "Adicionar como padrão" : sec ? "Tornar principal" : "Escolher como padrão"}
                        </Button>
                        {!g.multi && !isPrimary && primaries.length ? (
                          <Button type="button" variant="action" size="sm" style={{ "--wa-bg": "var(--whatsapp-green)", "--wa-bd": "var(--whatsapp-border)", "--wa-tx": "var(--card)" } as React.CSSProperties} className="!h-9 !min-h-9 !py-0 !text-sm !rounded-lg !border-2 !border-solid !border-[var(--wa-bd)] !bg-[var(--wa-bg)] !text-[var(--wa-tx)] hover:!brightness-110" onClick={() => { setScreenSearch(""); setSecondary({ group: g.key, key: v.key, label: v.name ?? `Modelo ${i + 1}`, screens: sec?.screens ?? [] }); }}>
                            {sec ? `Secundário · ${sec.screens.length} tela${sec.screens.length === 1 ? "" : "s"} (editar)` : "Padrão secundário por tela"}
                          </Button>
                        ) : null}
                        <div className="text-center"><ColorCode color="var(--whatsapp-green)" /> · <ColorCode color="var(--whatsapp-border)" /></div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between gap-2">
                    <span>Detalhes dos modelos</span>
                    <CdeButton group="toggle" screen="components/cde/cde-workspace.tsx" aria-label={`${expandedWhere.has(`details-${g.key}`) ? "Recolher" : "Exibir"} detalhes dos modelos de ${g.title}`} aria-expanded={expandedWhere.has(`details-${g.key}`)} onClick={() => setExpandedWhere((s) => { const n = new Set(s); const key = `details-${g.key}`; if (n.has(key)) n.delete(key); else n.add(key); return n; })} />
                  </div>
                  {expandedWhere.has(`details-${g.key}`) ? <div className="mt-2 space-y-3">{list.map((v, i) => <dl key={v.key} className="space-y-1 break-words">
                    <dt className="font-medium">{v.name ?? `Modelo ${i + 1}`}</dt>
                    <dd>Tipo: {v.tag}{v.variant ? ` · ${v.variant}` : ""}{v.size ? ` · ${v.size}` : ""}</dd>
                    {v.style?.fontSize ? <dd>Fonte: {v.style.fontSize.replace("px", " px")}</dd> : null}
                    {v.style?.fill ? <dd>Fundo: <ColorCode color={FILLS.find((f) => f.key === v.style?.fill)?.color} /></dd> : null}
                    {v.style?.border ? <dd>Borda: <ColorCode color={BORDERS.find((b) => b.key === v.style?.border)?.color} /></dd> : null}
                    {v.style?.description ? <dd className="whitespace-pre-wrap">Descrição: {v.style.description}</dd> : null}
                    {v.className ? <dd>Classes: {v.className}</dd> : null}
                    {v.icon ? <dd>Ícone: {v.icon} {v.iconClass}</dd> : null}
                  </dl>)}</div> : null}
                </div>
                {g.key === "add" ? (
                  <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span>Botões atuais com + e texto ({new Set(addTextUsage.map((e) => addTextKey(e.file, e.label))).size})</span>
                      <CdeButton group="toggle" screen="components/cde/cde-workspace.tsx" aria-label={`${expandedWhere.has("add-text") ? "Recolher" : "Exibir"} botões atuais com + e texto`} aria-expanded={expandedWhere.has("add-text")} onClick={() => setExpandedWhere((c) => { const n = new Set(c); if (n.has("add-text")) n.delete("add-text"); else n.add("add-text"); return n; })}>
                        </CdeButton>
                    </div>
                    {expandedWhere.has("add-text") ? (
                      <CdeAddTextList />
                    ) : null}
                  </div>
                ) : null}
                {list.some((v) => v.files.length) ? (
                  <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span>Onde é utilizado ({list.reduce((n, v) => n + v.count, 0)})</span>
                      <CdeButton group="toggle" screen="components/cde/cde-workspace.tsx" aria-label={`${expandedWhere.has(g.key) ? "Recolher" : "Exibir"} onde é utilizado em ${g.title}`} aria-expanded={expandedWhere.has(g.key)} onClick={() => setExpandedWhere((c) => { const n = new Set(c); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; })}>
                        </CdeButton>
                    </div>
                    {expandedWhere.has(g.key) ? <div className="mt-2 space-y-3">{list.map((v, i) => v.files.length ? <div key={v.key} data-cde-model={g.key} className="break-all"><b>{v.name ?? `Modelo ${i + 1}`} ({v.count}):</b><ol className="mt-1 space-y-1.5">{(v.uses ?? v.files.map((file) => ({ file, n: 1 }))).map((u, fi) => <li key={u.file} className="flex gap-2"><b className="shrink-0">{fi + 1}.</b><span>{u.file}{u.n > 1 ? <b className="ml-1">({u.n})</b> : null}<UsageLinks file={u.file} /></span></li>)}</ol></div> : null)}</div> : null}
                  </div>
                ) : null}
                {removed.length ? (
                  <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span>Histórico de exclusões</span>
                      <CdeButton group="toggle" screen="components/cde/cde-workspace.tsx" aria-label={`${expandedHistory.has(g.key) ? "Recolher" : "Exibir"} histórico de exclusões de ${g.title}`} title={expandedHistory.has(g.key) ? "Recolher histórico de exclusões" : "Exibir histórico de exclusões"} aria-expanded={expandedHistory.has(g.key)} aria-controls={`cde-history-${g.key}`} onClick={() => setExpandedHistory((current) => { const next = new Set(current); if (next.has(g.key)) next.delete(g.key); else next.add(g.key); return next; })}>
                        </CdeButton>
                    </div>
                    {expandedHistory.has(g.key) ? <div id={`cde-history-${g.key}`} className="mt-2">{removed.map((r) => (
                      <span key={r.variant_key} className="mr-3 inline-flex items-center gap-1">
                        {r.variant_key.startsWith("custom:") ? "Modelo criado" : r.variant_key.split("|").filter(Boolean).slice(0, 3).join(" · ")} → substituído por {nameOf(r.replaced_by)}
                        {!r.variant_key.startsWith("custom:") ? <Button type="button" variant="ghost" size="compactIcon" title="Restaurar" aria-label="Restaurar modelo" onClick={() => restore.mutate({ group: r.group_key, key: r.variant_key })}><RotateCcw /></Button> : null}
                      </span>
                    ))}</div> : null}
                  </div>
                ) : null}
              </>
            ) : null}
          </section>
        );
  };

  return (
    <main className="app-workspace mx-auto max-w-7xl space-y-4 overflow-x-clip px-4 py-6 sm:px-6">
      <div>
        <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Ambiente de Desenvolvimento Colaborativo</h1>
        <Button type="button" variant="ghost" size="sm" className="shrink-0 gap-1 text-xs" title="Recolher tudo" aria-label="Recolher tudo" onClick={() => { setOpen(new Set()); setCollapsedCategories(new Set(Object.keys(PARENTS))); setExpandedWhere(new Set()); setExpandedHistory(new Set()); setCollapseKey((k) => k + 1); }}><ChevronsDownUp className="h-4 w-4" />Recolher tudo</Button>
        </div>
        <p className="text-sm text-muted-foreground">Modelos de UI/UX utilizados em todos os apps, agrupados por tipo. Crie e exclua modelos e selecione os que devem ser utilizados como padrão.</p>
      </div>
      <CdeSortableList className="space-y-0" ids={cdeOrder.cats} labelOf={catLabel} onMove={(cats) => saveCdeOrder({ ...cdeOrder, cats })}>
        {(cat, ci, handle) => {
          const n = String(ci + 1);
          if (cat.startsWith("p:")) {
            const pk = cat.slice(2);
            const subs = cdeOrder.subs[pk] ?? [];
            return (
              <div>
                <CdeCategoryHeader handle={handle} number={n} title={PARENTS[pk]} open={!collapsedCategories.has(pk)} onToggle={() => setCollapsedCategories((s) => { const next = new Set(s); if (next.has(pk)) next.delete(pk); else next.add(pk); return next; })} />
                {!collapsedCategories.has(pk) ? (
                  <CdeSortableList className="space-y-0 py-2 pl-4 sm:pl-8" ids={subs} labelOf={(k) => baseTitle(GROUPS.find((x) => x.key === k)?.title ?? k)} onMove={(ids) => saveCdeOrder({ ...cdeOrder, subs: { ...cdeOrder.subs, [pk]: ids } })}>
                    {(key, si, subHandle) => renderGroup(GROUPS.find((x) => x.key === key)!, `${n}.${si + 1}`, n, subHandle)}
                  </CdeSortableList>
                ) : null}
              </div>
            );
          }
          if (cat === "icons") return <CdeAppIcons key={`CdeAppIcons-${collapseKey}`} number={ci + 1} handle={handle} />;
          if (cat === "nav") return <CdeNavigation key={`CdeNavigation-${collapseKey}`} number={ci + 1} handle={handle} />;
          if (cat === "menu") return <CdeMainMenu key={`CdeMainMenu-${collapseKey}`} number={ci + 1} handle={handle} />;
          if (cat === "apps") return <CdeAppOrder key={`CdeAppOrder-${collapseKey}`} number={ci + 1} handle={handle} />;
          if (cat === "button_library") return <CdeButtonLibrary key={`CdeButtonLibrary-${collapseKey}`} number={ci + 1} handle={handle} onEdit={(button, group, ids, modelKey) => {
            if (!group) { toast.info("Este botão ainda não possui um padrão CDE vinculado. A edição visual precisa desse vínculo para ser aplicada no app."); return; }
            const rows = (data?.selected ?? []).filter(s => s.group_key === group);
            const selection = rows.find(s => !s.is_primary && s.screens.includes(button.file)) ?? rows.find(s => s.is_primary);
            const model = groupModels(group).find(v => v.key === (modelKey || selection?.variant_key)) ?? groupModels("action_standard")[0];
            if (!model) return;
            setLibraryEdit({ ids: ids ?? [button.id], label: button.label, dynamic: button.dynamic });
            setEditing(model);
            setDraft({ name: modelKey ? model.name ?? button.label.slice(0, 60) : button.label.slice(0, 60), tag: "Button", variant: modelKey ? model.variant : button.variant || model.variant, size: modelKey ? model.size : button.size || model.size, className: modelKey ? model.className : button.className || model.className, icon: modelKey ? model.icon : button.icon || model.icon, iconClass: model.iconClass, label: modelKey ? model.label : button.dynamic || button.label === button.icon ? "" : button.label, style: { ...model.style, actionSpecific: true } });
            setCreating(group);
          }} />;
          if (cat === "deadline_alerts") return <CdeDeadlineAlerts key={`CdeDeadlineAlerts-${collapseKey}`} number={ci + 1} handle={handle} />;
          return renderGroup(GROUPS.find((x) => x.key === cat)!, n, null, handle);
        }}
      </CdeSortableList>

      <Dialog open={!!creating} onOpenChange={(o) => { if (!o) { setCreating(null); setEditing(null); setLibraryEdit(null); } }}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0 pr-8"><DialogTitle>{editing ? "Editar modelo" : "Criar modelo"} · {creating ? groupTitle(creating) : ""}</DialogTitle><div className="flex min-h-12 min-w-24 items-center justify-center px-3 py-2"><Preview v={draft} /></div></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2 [&_:is(input,textarea,button[role=combobox])]:!rounded-none [&_:is(input,textarea,button[role=combobox])]:!border-0 [&_:is(input,textarea,button[role=combobox])]:!border-b [&_:is(input,textarea,button[role=combobox])]:!border-myio-green [&_:is(input,textarea,button[role=combobox])]:!bg-transparent [&_:is(input,textarea,button[role=combobox])]:!px-0 [&_:is(input,textarea,button[role=combobox])]:!shadow-none [&_:is(input,textarea,button[role=combobox])]:!ring-0 [&_textarea]:!border-solid">
            <div className="space-y-1 sm:col-span-2"><Label>Nome do modelo</Label><Input value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Campo de busca" /></div>
            <div className="space-y-1"><Label>Tipo</Label>
              <Select value={draft.tag} onValueChange={(tag) => setDraft({ ...draft, tag })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(creating && FIELD_TAGS[creating] ? FIELD_TAGS[creating] : (creating && NUMBER_MODELS[creating] ? ["span"] : (creating === "box" || creating === "confirm_dialog") ? ["div"] : ["Button", "button"])).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            {!(creating && (FIELD_TAGS[creating] || NUMBER_MODELS[creating])) ? <>
              <div className="space-y-1"><Label>Estilo</Label>
                <Select value={draft.variant || "none"} onValueChange={(v) => setDraft({ ...draft, variant: v === "none" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VARIANTS.map((v) => <SelectItem key={v || "none"} value={v || "none"}>{v || "Padrão"}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Tamanho</Label>
                <Select value={draft.size || "none"} onValueChange={(v) => setDraft({ ...draft, size: v === "none" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SIZES.map((v) => <SelectItem key={v || "none"} value={v || "none"}>{v || "Padrão"}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Ícone</Label>
                <Select value={draft.icon || "none"} onValueChange={(v) => setDraft({ ...draft, icon: v === "none" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Sem ícone</SelectItem>{Object.keys(ICONS).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Texto</Label><Input value={draft.label} maxLength={40} onChange={(e) => setDraft({ ...draft, label: e.target.value })} /></div>
              <div className="space-y-1"><Label>Classes do ícone</Label><Input value={draft.iconClass} onChange={(e) => setDraft({ ...draft, iconClass: e.target.value })} placeholder="h-4 w-4" /></div>
            </> : null}
            {creating && COMMON_ACTION_GROUPS.has(creating) && creating !== "action_standard" ? <div className="space-y-1 sm:col-span-2"><Label>Classificação visual</Label><Select value={draft.style.actionSpecific || (creating === "confirm" && draft.style.actionSpecific !== false) ? "specific" : "standard"} onValueChange={v => setDraft({ ...draft, style: { ...draft.style, actionSpecific: v === "specific" } })}><SelectTrigger aria-label="Classificação visual"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="standard">Padrão visual comum</SelectItem><SelectItem value="specific">Botão de função específica</SelectItem></SelectContent></Select></div> : null}
            <div className="space-y-1"><Label>Forma</Label>
              <Select value={draft.style.shape || "none"} onValueChange={(v) => setDraft({ ...draft, style: { ...draft.style, shape: v === "none" ? "" : v } })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FORMS.map((f) => <SelectItem key={f.key || "none"} value={f.key || "none"}>{f.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Espessura da borda</Label>
              <Select value={draft.style.borderWidth || "none"} onValueChange={(v) => setDraft({ ...draft, style: { ...draft.style, borderWidth: v === "none" ? "" : v } })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WIDTHS.map((f) => <SelectItem key={f.key || "none"} value={f.key || "none"}>{f.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>{creating === "fields_select" ? "Fonte do campo e das opções" : "Tamanho da fonte"}</Label>
              <Select value={draft.style.fontSize || "none"} onValueChange={(v) => setDraft({ ...draft, style: { ...draft.style, fontSize: v === "none" ? "" : v } })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Padrão</SelectItem>{FONT_SIZES.map((f) => <SelectItem key={f} value={f}>{f.replace("px", " px")}</SelectItem>)}</SelectContent></Select></div>
            <div className="sm:col-span-2"><FormatColorOptions label="Fundo" value={draft.style.fill ?? "none"} options={FILLS} showCode onChange={(fill) => setDraft({ ...draft, style: { ...draft.style, fill } })} /></div>
            <div className="sm:col-span-2"><FormatColorOptions label="Borda" value={draft.style.border ?? ""} options={[{ key: "none", label: "Sem borda", color: "transparent" }, ...BORDERS] as typeof BORDERS} showCode onChange={(border) => setDraft({ ...draft, style: { ...draft.style, border } })} border /></div>
            <div className="sm:col-span-2"><FormatColorOptions label="Cor do texto e ícone" value={draft.style.text ?? "default"} options={TEXTS} onChange={(text) => setDraft({ ...draft, style: { ...draft.style, text } })} /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Descrição do desenvolvedor</Label><Textarea value={draft.style.description ?? ""} maxLength={1000} rows={3} onChange={(e) => setDraft({ ...draft, style: { ...draft.style, description: e.target.value } })} placeholder="Descreva como deseja o botão ou forma: uso, comportamento, cores, tamanho..." /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Classes (opcional)</Label><Input value={draft.className} onChange={(e) => setDraft({ ...draft, className: e.target.value })} placeholder="h-8 text-sm" /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="action" onClick={() => { setCreating(null); setEditing(null); setLibraryEdit(null); }}>Cancelar</Button>
            <Button type="button" variant="action" disabled={create.isPending} onClick={() => creating && create.mutate(creating)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Excluir {deleting?.label}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">As telas que usam este modelo passarão a usar o padrão escolhido.</p>
          {deleting ? (() => {
            const list = groupModels(deleting.group);
            const options = standardsOf(deleting.group);
            return (
              <div className="space-y-1"><Label>Substituir por</Label>
                <Select value={replacement} onValueChange={setReplacement}><SelectTrigger><SelectValue placeholder="Escolha o padrão" /></SelectTrigger>
                  <SelectContent>{options.map((k) => { const i = list.findIndex((v) => v.key === k); return <SelectItem key={k} value={k}>{i < 0 ? k : list[i].name ?? `Modelo ${i + 1}`}</SelectItem>; })}</SelectContent></Select></div>
            );
          })() : null}
          <DialogFooter>
            <Button type="button" variant="action" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button type="button" variant="action" disabled={!replacement || remove.isPending} onClick={() => remove.mutate()}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!secondary} onOpenChange={(o) => !o && setSecondary(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Padrão secundário: {secondary?.label}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Escolha as telas que usarão este modelo para contraste ou diferenciação. As demais telas continuam no padrão principal.</p>
          <Input value={screenSearch} onChange={(e) => setScreenSearch(e.target.value)} placeholder="Buscar tela ou app..." />
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-border p-2">
            {SCREENS.filter((f) => `${screenApp(f)} ${f}`.toLowerCase().includes(screenSearch.toLowerCase())).map((f) => {
              const on = secondary?.screens.includes(f) ?? false;
              return (
                <label key={f} className={cn("flex cursor-pointer items-start gap-2 rounded px-2 py-1 text-xs hover:bg-accent", on && "bg-accent")}>
                  <input type="checkbox" className="mt-0.5 accent-[var(--myio-green)]" checked={on} onChange={() => secondary && setSecondary({ ...secondary, screens: on ? secondary.screens.filter((x) => x !== f) : [...secondary.screens, f] })} />
                  <span><b>{screenApp(f)}</b> <span className="text-muted-foreground">· {f}</span></span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{secondary?.screens.length ?? 0} tela(s) selecionada(s). Sem telas, o modelo deixa de ser secundário.</p>
          <DialogFooter>
            <Button type="button" variant="action" onClick={() => setSecondary(null)}>Cancelar</Button>
            <Button type="button" variant="action" disabled={saveSecondary.isPending} onClick={() => saveSecondary.mutate()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
