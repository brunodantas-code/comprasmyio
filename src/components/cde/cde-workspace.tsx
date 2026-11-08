import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, Building2, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardCheck, Filter, PackagePlus, Pencil, Percent, Plus, RotateCcw, Save, Settings2, Trash2, X, type LucideIcon } from "lucide-react";
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
import { FormatColorOptions } from "@/components/mytosis/format-color-options";

type CdeStyle = { shape?: string; fill?: string; border?: string; borderWidth?: string; text?: string; description?: string };
const FORMS = [
  { key: "", label: "Padrão" }, { key: "square", label: "Quadrado", radius: "0" }, { key: "soft", label: "Arredondado", radius: "0.375rem" },
  { key: "round", label: "Bem arredondado", radius: "0.75rem" }, { key: "pill", label: "Pílula", radius: "9999px" },
] as const;
const WIDTHS = [{ key: "", label: "Padrão" }, { key: "0", label: "Sem borda" }, { key: "1px", label: "Fina" }, { key: "2px", label: "Média" }, { key: "3px", label: "Grossa" }];
const TEXTS = [{ key: "default", label: "Padrão", color: "currentColor" }, { key: "dark", label: "Escuro myio", color: "var(--myio-dark)" }, { key: "green", label: "Verde myio", color: "var(--myio-green)" }, { key: "white", label: "Branco", color: "var(--card)" }];
/** Variáveis CSS + classes fixas com prioridade, para vencer os estilos !important dos botões. */
function styleOf(st?: CdeStyle): { css: React.CSSProperties; cls: string } {
  const css: Record<string, string> = {}; const cls: string[] = [];
  if (!st) return { css, cls: "" };
  const form = FORMS.find((f) => f.key === st.shape);
  if (form && "radius" in form) { css["--cde-r"] = form.radius; cls.push("!rounded-[var(--cde-r)]"); }
  if (st.fill && st.fill !== "none") { css["--cde-bg"] = FILLS.find((f) => f.key === st.fill)?.color ?? ""; cls.push("!bg-[var(--cde-bg)]"); }
  if (st.border) { css["--cde-bd"] = BORDERS.find((b) => b.key === st.border)?.color ?? ""; cls.push("!border-[var(--cde-bd)] !border-solid"); }
  if (st.borderWidth) { css["--cde-bw"] = st.borderWidth; cls.push("!border-[length:var(--cde-bw)] !border-solid"); }
  if (st.text && st.text !== "default") { css["--cde-tx"] = TEXTS.find((t) => t.key === st.text)?.color ?? ""; cls.push("!text-[var(--cde-tx)]"); }
  return { css: css as React.CSSProperties, cls: cls.join(" ") };
}

type Variant = { key: string; name?: string; custom?: boolean; tag: string; variant: string; size: string; className: string; icon: string; iconClass: string; label: string; count: number; files: string[]; style?: CdeStyle };

const ICONS: Record<string, LucideIcon> = { ArrowDown, ArrowUp, ArrowUpDown, Building2, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardCheck, Filter, PackagePlus, Pencil, Percent, Plus, Save, Settings2, Trash2, X };
const VARIANTS = ["", "default", "outline", "ghost", "action", "secondary", "destructive", "link"];
const SIZES = ["", "default", "sm", "lg", "icon", "compactIcon"];

type GroupKey = keyof typeof inventory;
/** multi: grupos que admitem mais de um padrão (ex.: campos têm usos diferentes). */
const GROUPS: { key: GroupKey; title: string; hint: string; multi?: boolean }[] = [
  { key: "fields", title: "1. Campos para preenchimento", hint: "Caixas de texto, seletores e áreas de texto · admite vários padrões", multi: true },
  { key: "filter", title: "2. Filtros", hint: "Botões de funil · padrão único" },
  { key: "sort", title: "3. Ordenação", hint: "Setas de ordenar e mover · padrão único" },
  { key: "toggle", title: "4. Exibir/Recolher", hint: "Setas de expandir e recolher · padrão único" },
  { key: "plus", title: "5.1 Botões +", hint: "Padrão único" },
  { key: "add", title: "5.2 Adicionar / Novo (texto)", hint: "Padrão único" },
  { key: "save", title: "5.3 Salvar", hint: "Padrão único" },
  { key: "cancel", title: "5.4 Cancelar", hint: "Padrão único" },
  { key: "confirm", title: "5.5 Confirmar / Concluir", hint: "Padrão único" },
  { key: "close", title: "5.6 Fechar", hint: "Padrão único" },
  { key: "pencil", title: "5.7 Lápis (editar)", hint: "Padrão único" },
  { key: "trash", title: "5.8 Lixeira (excluir)", hint: "Padrão único" },
];

const inventoryKey = (v: Omit<Variant, "key">) => [v.tag, v.variant, v.size, v.className, v.icon, v.iconClass].join("|");

function Preview({ v }: { v: Pick<Variant, "tag" | "variant" | "size" | "className" | "icon" | "iconClass" | "label" | "style"> }) {
  const { css, cls } = styleOf(v.style);
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

  const { data } = useQuery({
    queryKey: ["cde-data"],
    queryFn: async () => {
      const [sel, models, removed] = await Promise.all([
        supabase.from("cde_selected").select("group_key,variant_key"),
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
    const base = ((inventory[g] ?? []) as Omit<Variant, "key">[]).map((v) => ({ ...v, key: inventoryKey(v) }));
    const custom = (data?.models ?? []).filter((m) => m.group_key === g).map((m) => ({ key: `custom:${m.id}`, name: m.name, custom: true, tag: m.tag, variant: m.variant, size: m.size, className: m.class_name, icon: m.icon, iconClass: m.icon_class, label: m.label, style: (m.style ?? {}) as CdeStyle, count: 0, files: [] }));
    return [...base, ...custom].filter((v) => !removed.has(v.key));
  };
  const standardsOf = (g: GroupKey) => (data?.selected ?? []).filter((s) => s.group_key === g).map((s) => s.variant_key);

  const toggleStandard = useMutation({
    mutationFn: async ({ group, key, multi }: { group: GroupKey; key: string; multi?: boolean }) => {
      const current = standardsOf(group);
      if (current.includes(key)) {
        const { error } = await supabase.from("cde_selected").delete().eq("group_key", group).eq("variant_key", key);
        if (error) throw error;
        return;
      }
      if (!multi && current.length) {
        const { error } = await supabase.from("cde_selected").delete().eq("group_key", group);
        if (error) throw error;
      }
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
      {GROUPS.map((g) => {
        const list = groupModels(g.key);
        const standards = standardsOf(g.key);
        const nameOf = (key: string) => { const i = list.findIndex((v) => v.key === key); return i < 0 ? "Modelo excluído" : list[i].name ?? `Modelo ${i + 1}`; };
        const removed = (data?.removed ?? []).filter((r) => r.group_key === g.key);
        const isOpen = open.has(g.key);
        return (
          <section key={g.key} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 bg-accent px-4 py-2.5">
              <button type="button" onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(g.key)) n.delete(g.key); else n.add(g.key); return n; })} className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                <span className="font-semibold">{g.title} <span className="font-normal text-muted-foreground">· {list.length} modelos · {g.hint}</span></span>
                {isOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
              </button>
              <Button type="button" variant="outline" size="compactIcon" title="Criar modelo" aria-label={`Criar modelo em ${g.title}`} onClick={() => { setDraft({ ...emptyDraft, tag: g.key === "fields" ? "Input" : "Button" }); setCreating(g.key); }}><Plus /></Button>
            </div>
            {isOpen ? (
              <>
                <div className="flex gap-3 overflow-x-auto p-4">
                  {list.map((v, i) => {
                    const selected = standards.includes(v.key);
                    return (
                      <div key={v.key} className={cn("flex w-64 shrink-0 flex-col gap-2 rounded-lg border p-3", selected ? "border-primary bg-accent" : "border-border")}>
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="truncate" title={v.style?.description || undefined}>{v.name ?? `Modelo ${i + 1}`}{v.custom ? " · criado no CDE" : ""}</span>
                          <span className="flex items-center gap-1">{v.custom ? "novo" : `${v.count} uso${v.count > 1 ? "s" : ""}`}
                            <Button type="button" variant="outline" size="compactIcon" title={selected ? "Remova o padrão antes de excluir" : "Excluir modelo"} aria-label={`Excluir ${v.name ?? `Modelo ${i + 1}`}`} disabled={selected}
                              onClick={() => { if (!standards.length) return toast.error("Escolha primeiro um padrão para substituir este modelo."); setReplacement(standards.length === 1 ? standards[0] : ""); setDeleting({ group: g.key, model: v, label: v.name ?? `Modelo ${i + 1}` }); }}><Trash2 /></Button>
                          </span>
                        </div>
                        <div className="flex min-h-14 items-center justify-center rounded-md bg-background p-2"><Preview v={v} /></div>
                        <dl className="space-y-0.5 text-[0.7rem] leading-4 text-muted-foreground">
                          <div><b>Tipo:</b> {v.tag}{v.variant ? ` · ${v.variant}` : ""}{v.size ? ` · ${v.size}` : ""}</div>
                          {v.style?.description ? <div className="whitespace-pre-wrap break-words"><b>Descrição:</b> {v.style.description}</div> : null}
                          {v.className ? <div className="break-all"><b>Classes:</b> {v.className}</div> : null}
                          {v.icon ? <div className="break-all"><b>Ícone:</b> {v.icon} {v.iconClass}</div> : null}
                          {v.files.length ? <div className="break-all"><b>Onde:</b> {v.files.join(", ")}</div> : null}
                        </dl>
                        <Button type="button" variant="action" size="sm" style={{ "--wa-bg": "var(--myio-green)", "--wa-bd": "color-mix(in oklab, var(--myio-green) 45%, var(--card))", "--wa-tx": "var(--card)" } as React.CSSProperties} className="mt-auto !rounded-full !border-2 !border-solid !border-[var(--wa-bd)] !bg-[var(--wa-bg)] !text-[var(--wa-tx)] hover:!brightness-110" disabled={toggleStandard.isPending || (selected && !g.multi)} onClick={() => toggleStandard.mutate({ group: g.key, key: v.key, multi: g.multi })}>
                          {selected ? <><Check className="h-4 w-4" />Padrão{g.multi ? " (remover)" : ""}</> : g.multi ? "Adicionar como padrão" : "Escolher como padrão"}
                        </Button>
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
        );
      })}

      <Dialog open={!!creating} onOpenChange={(o) => !o && setCreating(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Criar modelo · {GROUPS.find((g) => g.key === creating)?.title}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2"><Label>Nome do modelo</Label><Input value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Campo de busca" /></div>
            <div className="space-y-1"><Label>Tipo</Label>
              <Select value={draft.tag} onValueChange={(tag) => setDraft({ ...draft, tag })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(creating === "fields" ? ["Input", "Textarea", "SelectTrigger"] : ["Button", "button"]).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            {creating !== "fields" ? <>
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
            <div className="sm:col-span-2"><FormatColorOptions label="Fundo" value={draft.style.fill ?? "none"} options={FILLS} onChange={(fill) => setDraft({ ...draft, style: { ...draft.style, fill } })} /></div>
            <div className="sm:col-span-2"><FormatColorOptions label="Borda" value={draft.style.border ?? ""} options={BORDERS} onChange={(border) => setDraft({ ...draft, style: { ...draft.style, border } })} border /></div>
            <div className="sm:col-span-2"><FormatColorOptions label="Cor do texto e ícone" value={draft.style.text ?? "default"} options={TEXTS} onChange={(text) => setDraft({ ...draft, style: { ...draft.style, text } })} /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Descrição do desenvolvedor</Label><Textarea value={draft.style.description ?? ""} maxLength={1000} rows={3} onChange={(e) => setDraft({ ...draft, style: { ...draft.style, description: e.target.value } })} placeholder="Descreva como deseja o botão ou forma: uso, comportamento, cores, tamanho..." /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Classes (opcional)</Label><Input value={draft.className} onChange={(e) => setDraft({ ...draft, className: e.target.value })} placeholder="h-8 text-sm" /></div>
          </div>
          <div className="flex min-h-16 items-center justify-center rounded-md border border-border bg-background p-3"><Preview v={draft} /></div>
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
    </main>
  );
}
