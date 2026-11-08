import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowDownUp, ArrowUp, ArrowUpDown, Building2, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardCheck, Filter, PackagePlus, Pencil, Percent, Plus, RotateCcw, Save, Settings2, Trash2, X, type LucideIcon } from "lucide-react";
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
import { BORDERS, FILLS } from "@/components/mytosis/shapes";
import { ColorCode } from "./color-code";
import { FORMS, ICONS, TEXTS, WIDTHS, styleOf, type CdeStyle } from "./cde-render";
import { CdeAppIcons } from "./cde-app-icons";
import { CdeNavigation } from "./cde-navigation";
import { FormatColorOptions } from "@/components/mytosis/format-color-options";

type Variant = { key: string; name?: string; custom?: boolean; tag: string; variant: string; size: string; className: string; icon: string; iconClass: string; label: string; count: number; files: string[]; style?: CdeStyle };


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
  { key: "toggle", title: "4. Exibir/Recolher", hint: "Setas de expandir e recolher · padrão único" },
  { key: "plus", title: "5.1 Botões +", hint: "Padrão único" },
  { key: "add", title: "5.2 Adicionar / Novo (texto)", hint: "Padrão único" },
  { key: "save", title: "5.3 Salvar", hint: "Padrão único" },
  { key: "cancel", title: "5.4 Cancelar", hint: "Padrão único" },
  { key: "confirm", title: "5.5 Confirmar / Concluir", hint: "Padrão único" },
  { key: "close", title: "5.6 Fechar", hint: "Padrão único" },
  { key: "pencil", title: "5.7 Lápis (editar)", hint: "Padrão único" },
  { key: "trash", title: "5.8 Lixeira (excluir)", hint: "Padrão único" },
  { key: "box", title: "6. Boxes (cartões)", hint: "Forma, borda, espessura e fundo dos cartões · padrão único, aplicado ao vivo" },
];

/** Telas conhecidas pelo levantamento, com o app deduzido pelo caminho do arquivo. */
const SCREENS = [...new Set(Object.values(inventory).flatMap((g) => (g as { files: string[] }[]).flatMap((v) => v.files)))].sort();
const APP_BY_DIR: Record<string, string> = { mytosis: "Mytosis", "cash-flow": "Cash Flow", legal: "Legal", cde: "CDE", "site-survey": "Site Survey", opdesk: "OpDesk", code: "Code" };
function screenApp(f: string) {
  const parts = f.split("/");
  if (parts[0] === "components" && parts.length > 2) return APP_BY_DIR[parts[1]] ?? parts[1];
  if (parts[0] === "routes") return parts[parts.length - 1].replace(/\.tsx$/, "").replace(/^_authenticated\./, "");
  return "Geral";
}

/** Categorias-mãe das subcategorias numeradas (ex.: 3 → 3.1, 3.2). */
const PARENTS: Record<string, string> = { "1": "Campos para preenchimento", "3": "Ordenação", "5": "Botões de ação" };

const inventoryKey = (v: Omit<Variant, "key">) => [v.tag, v.variant, v.size, v.className, v.icon, v.iconClass].join("|");

function Preview({ v }: { v: Pick<Variant, "tag" | "variant" | "size" | "className" | "icon" | "iconClass" | "label" | "style"> }) {
  const { css, cls } = styleOf(v.style);
  if (v.tag === "div") return <div style={css} className={cn("flex h-14 w-48 items-center justify-center text-xs", v.className || "rounded-xl border bg-card shadow", cls)}>Box</div>;
  if (v.tag === "Textarea") return <Textarea style={css} className={cn("w-56", v.className, cls)} placeholder="Texto" readOnly />;
  if (["Input", "SelectTrigger", "PasswordInput"].includes(v.tag)) return <Input style={css} className={cn("w-56", v.className, cls)} placeholder={v.tag === "SelectTrigger" ? "Selecione…" : "Texto"} readOnly />;
  const Icon = ICONS[v.icon];
  const content = <>{Icon ? <Icon className={v.iconClass} /> : null}{v.label && !/[=()]/.test(v.label) ? v.label : null}</>;
  if (v.tag === "button") return <button type="button" style={css} className={cn(v.className, cls)}>{content}</button>;
  return <Button type="button" variant={(v.variant || undefined) as never} size={(v.size || undefined) as never} style={css} className={cn(v.className, cls)}>{content}</Button>;
}

const emptyDraft = { name: "", tag: "Button", variant: "outline", size: "", className: "", icon: "", iconClass: "", label: "", style: {} as CdeStyle };

export function CdeWorkspace() {
  const qc = useQueryClient();
  const [open, setOpen] = useState<Set<string>>(new Set(["plus"]));
  const [creating, setCreating] = useState<GroupKey | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [deleting, setDeleting] = useState<{ group: GroupKey; model: Variant; label: string } | null>(null);
  const [replacement, setReplacement] = useState("");
  const [secondary, setSecondary] = useState<{ group: GroupKey; key: string; label: string; screens: string[] } | null>(null);
  const [screenSearch, setScreenSearch] = useState("");

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
  const refresh = () => qc.invalidateQueries({ queryKey: ["cde-data"] });
  const uid = async () => (await supabase.auth.getUser()).data.user!.id;

  const groupModels = (g: GroupKey): Variant[] => {
    const removed = new Set((data?.removed ?? []).filter((r) => r.group_key === g).map((r) => r.variant_key));
    const src = FIELD_TAGS[g] ? ((inventory.fields as Omit<Variant, "key">[]).filter((v) => FIELD_TAGS[g].includes(v.tag))) : ((inventory as Record<string, unknown>)[g] ?? []) as Omit<Variant, "key">[];
    const base = src.map((v) => ({ ...v, key: inventoryKey(v) }));
    const custom = (data?.models ?? []).filter((m) => m.group_key === g).map((m) => ({ key: `custom:${m.id}`, name: m.name, custom: true, tag: m.tag, variant: m.variant, size: m.size, className: m.class_name, icon: m.icon, iconClass: m.icon_class, label: m.label, style: (m.style ?? {}) as CdeStyle, count: 0, files: [] }));
    const all = [...base, ...custom];
    const kept = all.filter((v) => !removed.has(v.key));
    // Excluídos transferem seus usos ao padrão substituto (seguindo cadeias de substituição).
    const repl = new Map((data?.removed ?? []).filter((r) => r.group_key === g).map((r) => [r.variant_key, r.replaced_by] as const));
    const target = (k: string) => { let cur = k; for (let i = 0; i < 20 && repl.has(cur); i++) cur = repl.get(cur)!; return cur; };
    const extra = new Map<string, number>();
    all.filter((v) => removed.has(v.key)).forEach((v) => { const t = target(v.key); extra.set(t, (extra.get(t) ?? 0) + v.count); });
    let result = kept.map((v) => ({ ...v, count: v.count + (extra.get(v.key) ?? 0) }));
    // Grupos de padrão único: o padrão concentra todos os usos; os demais ficam com zero.
    // Secundários ficam com os usos das telas associadas; o principal com o restante.
    const std = primariesOf(g);
    const single = !GROUPS.find((x) => x.key === g)?.multi;
    if (single && std.length === 1 && result.some((v) => v.key === std[0])) {
      const total = result.reduce((s, v) => s + v.count, 0);
      const secs = secondariesOf(g);
      const secCount = new Map<string, number>();
      for (const sec of secs) {
        const scr = new Set(sec.screens);
        let n = 0;
        for (const v of all) if (v.files.length) n += v.count * v.files.filter((f) => scr.has(f)).length / v.files.length;
        secCount.set(sec.variant_key, Math.round(n));
      }
      const used = [...secCount.values()].reduce((a, b) => a + b, 0);
      result = result.map((v) => ({ ...v, count: v.key === std[0] ? Math.max(0, total - used) : secCount.get(v.key) ?? 0 }));
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
      const { error } = await supabase.from("cde_models").insert({ group_key: group, name: draft.name.trim(), tag: draft.tag, variant: draft.variant, size: draft.size, class_name: draft.className, icon: draft.icon, icon_class: draft.iconClass, label: draft.label, style: draft.style, created_by: await uid() });
      if (error) throw error;
    },
    onSuccess: () => { refresh(); setCreating(null); setDraft(emptyDraft); toast.success("Modelo criado"); },
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

  return (
    <main className="app-workspace mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold">Ambiente de Desenvolvimento Colaborativo</h1>
        <p className="text-sm text-muted-foreground">Modelos usados hoje em todos os apps, agrupados por tipo. Escolha o padrão, crie novos modelos e exclua os que devem ser substituídos pelo padrão.</p>
      </div>
      {GROUPS.map((g, gi) => {
        const num = g.title.split(" ")[0].replace(/\.$/, "");
        const parent = num.includes(".") ? num.split(".")[0] : null;
        const showParent = parent && GROUPS[gi - 1]?.title.split(" ")[0].replace(/\.$/, "").split(".")[0] !== parent;
        const parentHeader = showParent ? (
          <div key={`p-${parent}`} className="flex items-center gap-3 pt-2">
            <span className="flex h-8 min-w-8 items-center justify-center rounded-md bg-primary px-1.5 text-base font-bold">{parent}</span>
            <h2 className="flex-1 border-b border-border pb-1 text-lg font-semibold">{PARENTS[parent!]}</h2>
          </div>
        ) : null;
        const list = groupModels(g.key);
        const standards = standardsOf(g.key);
        const primaries = primariesOf(g.key);
        const secs = secondariesOf(g.key);
        const nameOf = (key: string) => { const i = list.findIndex((v) => v.key === key); return i < 0 ? "Modelo excluído" : list[i].name ?? `Modelo ${i + 1}`; };
        const removed = (data?.removed ?? []).filter((r) => r.group_key === g.key);
        const isOpen = open.has(g.key);
        return (
          <div key={g.key} className="space-y-4">{parentHeader}
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-3 bg-accent px-5 py-2">
              <button type="button" onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; })} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                <span className="flex flex-col">
                  <span className="flex h-8 min-w-8 items-center justify-center rounded-md bg-primary px-1.5 text-base font-bold">{g.title.split(" ")[0].replace(/\.$/, "")}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block border-b border-border pb-1 font-semibold">{g.title.split(" ").slice(1).join(" ")}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{list.length} modelos · {g.hint}</span>
                </span>
                <span>{isOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}</span>
              </button>
              <Button type="button" variant="outline" size="compactIcon" title="Criar modelo" aria-label={`Criar modelo em ${g.title}`} onClick={() => { setDraft({ ...emptyDraft, tag: FIELD_TAGS[g.key]?.[0] ?? (g.key === "box" ? "div" : "Button") }); setCreating(g.key); }}><Plus /></Button>
            </div>
            {isOpen ? (
              <>
                <div className="flex gap-3 overflow-x-auto p-4">
                  {list.map((v, i) => {
                    const selected = standards.includes(v.key);
                    const isPrimary = primaries.includes(v.key);
                    const sec = secs.find((s) => s.variant_key === v.key);
                    return (
                      <div key={v.key} className={cn("flex w-64 shrink-0 flex-col gap-2 rounded-lg border p-3", selected ? "border-primary bg-accent" : "border-border")}>
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="truncate" title={v.style?.description || undefined}>{v.name ?? `Modelo ${i + 1}`}{v.custom ? " · criado no CDE" : ""}</span>
                          <span className="flex items-center gap-1">{v.custom && !v.count ? "novo" : `${v.count} uso${v.count === 1 ? "" : "s"}`}
                            <Button type="button" variant="outline" size="compactIcon" title={selected ? "Remova o padrão antes de excluir" : "Excluir modelo"} aria-label={`Excluir ${v.name ?? `Modelo ${i + 1}`}`} disabled={selected}
                              onClick={() => { if (!standards.length) return toast.error("Escolha primeiro um padrão para substituir este modelo."); setReplacement(primaries.length === 1 ? primaries[0] : standards.length === 1 ? standards[0] : ""); setDeleting({ group: g.key, model: v, label: v.name ?? `Modelo ${i + 1}` }); }}><Trash2 /></Button>
                          </span>
                        </div>
                        <div className="flex min-h-14 items-center justify-center rounded-md bg-background p-2"><Preview v={v} /></div>
                        <dl className="space-y-0.5 text-[0.7rem] leading-4 text-muted-foreground">
                          <div><b>Tipo:</b> {v.tag}{v.variant ? ` · ${v.variant}` : ""}{v.size ? ` · ${v.size}` : ""}</div>
                          {v.style && (v.style.fill || v.style.border) ? <div className="flex flex-wrap gap-x-2">{v.style.fill && v.style.fill !== "none" ? <span>Fundo <ColorCode color={FILLS.find((f) => f.key === v.style!.fill)?.color} /></span> : null}{v.style.border && v.style.border !== "none" ? <span>Borda <ColorCode color={BORDERS.find((b) => b.key === v.style!.border)?.color} /></span> : null}</div> : null}
                          {v.style?.description ? <div className="whitespace-pre-wrap break-words"><b>Descrição:</b> {v.style.description}</div> : null}
                          {v.className ? <div className="break-all"><b>Classes:</b> {v.className}</div> : null}
                          {v.icon ? <div className="break-all"><b>Ícone:</b> {v.icon} {v.iconClass}</div> : null}
                          {v.files.length ? <div className="break-all"><b>Onde:</b> {v.files.join(", ")}</div> : null}
                        </dl>
                        <Button type="button" variant="action" size="sm" style={{ "--wa-bg": "var(--whatsapp-green)", "--wa-bd": "var(--whatsapp-border)", "--wa-tx": "var(--card)" } as React.CSSProperties} className="mt-auto !rounded-lg !border-2 !border-solid !border-[var(--wa-bd)] !bg-[var(--wa-bg)] !text-[var(--wa-tx)] hover:!brightness-110" disabled={toggleStandard.isPending || (isPrimary && !g.multi)} onClick={() => toggleStandard.mutate({ group: g.key, key: v.key, multi: g.multi })}>
                          {isPrimary ? <><Check className="h-4 w-4" />{g.multi ? "Padrão (remover)" : "Padrão principal"}</> : g.multi ? "Adicionar como padrão" : sec ? "Tornar principal" : "Escolher como padrão"}
                        </Button>
                        {!g.multi && !isPrimary && primaries.length ? (
                          <Button type="button" variant="outline" size="sm" onClick={() => { setScreenSearch(""); setSecondary({ group: g.key, key: v.key, label: v.name ?? `Modelo ${i + 1}`, screens: sec?.screens ?? [] }); }}>
                            {sec ? `Secundário · ${sec.screens.length} tela${sec.screens.length === 1 ? "" : "s"} (editar)` : "Padrão secundário por tela"}
                          </Button>
                        ) : null}
                        <div className="text-center"><ColorCode color="var(--whatsapp-green)" /> · <ColorCode color="var(--whatsapp-border)" /></div>
                      </div>
                    );
                  })}
                </div>
                {removed.length ? (
                  <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                    <b>Excluídos:</b> {removed.map((r) => (
                      <span key={r.variant_key} className="mr-3 inline-flex items-center gap-1">
                        {r.variant_key.startsWith("custom:") ? "Modelo criado" : r.variant_key.split("|").filter(Boolean).slice(0, 3).join(" · ")} → substituído por {nameOf(r.replaced_by)}
                        {!r.variant_key.startsWith("custom:") ? <Button type="button" variant="ghost" size="compactIcon" title="Restaurar" aria-label="Restaurar modelo" onClick={() => restore.mutate({ group: r.group_key, key: r.variant_key })}><RotateCcw /></Button> : null}
                      </span>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </section>
          </div>
        );
      })}
      <CdeAppIcons number={7} />
      <CdeNavigation number={8} />

      <Dialog open={!!creating} onOpenChange={(o) => !o && setCreating(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0 pr-8"><DialogTitle>Criar modelo · {GROUPS.find((g) => g.key === creating)?.title}</DialogTitle><div className="flex min-h-12 min-w-24 items-center justify-center rounded-md border border-border bg-background px-3 py-2"><Preview v={draft} /></div></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2 [&_:is(input,textarea,button[role=combobox])]:!rounded-none [&_:is(input,textarea,button[role=combobox])]:!border-0 [&_:is(input,textarea,button[role=combobox])]:!border-b [&_:is(input,textarea,button[role=combobox])]:!border-myio-green [&_:is(input,textarea,button[role=combobox])]:!bg-transparent [&_:is(input,textarea,button[role=combobox])]:!px-0 [&_:is(input,textarea,button[role=combobox])]:!shadow-none [&_:is(input,textarea,button[role=combobox])]:!ring-0 [&_textarea]:!border-solid">
            <div className="space-y-1 sm:col-span-2"><Label>Nome do modelo</Label><Input value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Campo de busca" /></div>
            <div className="space-y-1"><Label>Tipo</Label>
              <Select value={draft.tag} onValueChange={(tag) => setDraft({ ...draft, tag })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(creating && FIELD_TAGS[creating] ? FIELD_TAGS[creating] : (creating === "box" ? ["div"] : ["Button", "button"])).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            {!(creating && FIELD_TAGS[creating]) ? <>
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
            <div className="space-y-1"><Label>Forma</Label>
              <Select value={draft.style.shape || "none"} onValueChange={(v) => setDraft({ ...draft, style: { ...draft.style, shape: v === "none" ? "" : v } })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FORMS.map((f) => <SelectItem key={f.key || "none"} value={f.key || "none"}>{f.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Espessura da borda</Label>
              <Select value={draft.style.borderWidth || "none"} onValueChange={(v) => setDraft({ ...draft, style: { ...draft.style, borderWidth: v === "none" ? "" : v } })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WIDTHS.map((f) => <SelectItem key={f.key || "none"} value={f.key || "none"}>{f.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="sm:col-span-2"><FormatColorOptions label="Fundo" value={draft.style.fill ?? "none"} options={FILLS} showCode onChange={(fill) => setDraft({ ...draft, style: { ...draft.style, fill } })} /></div>
            <div className="sm:col-span-2"><FormatColorOptions label="Borda" value={draft.style.border ?? ""} options={[{ key: "none", label: "Sem borda", color: "transparent" }, ...BORDERS] as typeof BORDERS} showCode onChange={(border) => setDraft({ ...draft, style: { ...draft.style, border } })} border /></div>
            <div className="sm:col-span-2"><FormatColorOptions label="Cor do texto e ícone" value={draft.style.text ?? "default"} options={TEXTS} onChange={(text) => setDraft({ ...draft, style: { ...draft.style, text } })} /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Descrição do desenvolvedor</Label><Textarea value={draft.style.description ?? ""} maxLength={1000} rows={3} onChange={(e) => setDraft({ ...draft, style: { ...draft.style, description: e.target.value } })} placeholder="Descreva como deseja o botão ou forma: uso, comportamento, cores, tamanho..." /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Classes (opcional)</Label><Input value={draft.className} onChange={(e) => setDraft({ ...draft, className: e.target.value })} placeholder="h-8 text-sm" /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="action" onClick={() => setCreating(null)}>Cancelar</Button>
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
