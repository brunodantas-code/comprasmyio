import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, Building2, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardCheck, Filter, PackagePlus, Pencil, Percent, Plus, Save, Settings2, Trash2, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import inventory from "./inventory.json";

type Variant = { tag: string; variant: string; size: string; className: string; icon: string; iconClass: string; label: string; count: number; files: string[] };

const ICONS: Record<string, LucideIcon> = { ArrowDown, ArrowUp, ArrowUpDown, Building2, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardCheck, Filter, PackagePlus, Pencil, Percent, Plus, Save, Settings2, Trash2, X };

const GROUPS: { key: keyof typeof inventory; title: string; hint: string }[] = [
  { key: "fields", title: "1. Campos para preenchimento", hint: "Caixas de texto, seletores e áreas de texto" },
  { key: "filter", title: "2. Filtros", hint: "Botões de funil" },
  { key: "sort", title: "3. Ordenação", hint: "Setas de ordenar e mover" },
  { key: "toggle", title: "4. Exibir/Recolher", hint: "Setas de expandir e recolher" },
  { key: "plus", title: "5.1 Botões +", hint: "Adicionar com símbolo +" },
  { key: "add", title: "5.2 Adicionar / Novo (texto)", hint: "Botões com texto de inclusão" },
  { key: "save", title: "5.3 Salvar", hint: "" },
  { key: "cancel", title: "5.4 Cancelar", hint: "" },
  { key: "confirm", title: "5.5 Confirmar / Concluir", hint: "" },
  { key: "close", title: "5.6 Fechar", hint: "" },
  { key: "pencil", title: "5.7 Lápis (editar)", hint: "" },
  { key: "trash", title: "5.8 Lixeira (excluir)", hint: "" },
];

const variantKey = (v: Variant) => [v.tag, v.variant, v.size, v.className, v.icon, v.iconClass].join("|");

function Preview({ v, groupKey }: { v: Variant; groupKey: string }) {
  if (groupKey === "fields") {
    if (v.tag === "Textarea") return <Textarea className={cn("w-56", v.className)} placeholder="Texto" readOnly />;
    return <Input className={cn("w-56", v.className)} placeholder={v.tag === "SelectTrigger" ? "Selecione…" : "Texto"} readOnly />;
  }
  const Icon = ICONS[v.icon];
  const content = <>{Icon ? <Icon className={v.iconClass} /> : null}{v.label && !/[=()]/.test(v.label) ? v.label : null}</>;
  if (v.tag === "button") return <button type="button" className={v.className}>{content}</button>;
  return (
    <Button type="button" variant={(v.variant || undefined) as never} size={(v.size || undefined) as never} className={v.className}>
      {content}
    </Button>
  );
}

export function CdeWorkspace() {
  const qc = useQueryClient();
  const [open, setOpen] = useState<Set<string>>(new Set(["plus"]));
  const { data: chosen = {} } = useQuery({
    queryKey: ["cde-standards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cde_standards").select("group_key,variant_key");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r) => [r.group_key, r.variant_key])) as Record<string, string>;
    },
  });
  const choose = useMutation({
    mutationFn: async ({ group, key }: { group: string; key: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("cde_standards").upsert({ group_key: group, variant_key: key, chosen_by: auth.user!.id, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cde-standards"] }); toast.success("Padrão escolhido"); },
    onError: () => toast.error("Não foi possível salvar o padrão."),
  });

  return (
    <main className="app-workspace mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold">Ambiente de Desenvolvimento Colaborativo</h1>
        <p className="text-sm text-muted-foreground">Inventário dos modelos usados hoje em todos os apps, agrupados por tipo. Escolha o modelo padrão de cada grupo.</p>
      </div>
      {GROUPS.map((g) => {
        const list = (inventory[g.key] ?? []) as Variant[];
        const isOpen = open.has(g.key);
        return (
          <section key={g.key} className="overflow-hidden rounded-xl border border-border bg-card">
            <button type="button" onClick={() => setOpen((s) => { const n = new Set(s); n.has(g.key) ? n.delete(g.key) : n.add(g.key); return n; })} className="flex w-full items-center justify-between gap-3 bg-accent px-4 py-2.5 text-left">
              <span className="font-semibold">{g.title} <span className="font-normal text-muted-foreground">· {list.length} modelos{g.hint ? ` · ${g.hint}` : ""}</span></span>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {isOpen ? (
              <div className="flex gap-3 overflow-x-auto p-4">
                {list.map((v, i) => {
                  const k = variantKey(v);
                  const selected = chosen[g.key] === k;
                  return (
                    <div key={k} className={cn("flex w-64 shrink-0 flex-col gap-2 rounded-lg border p-3", selected ? "border-primary bg-accent" : "border-border")}>
                      <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Modelo {i + 1}</span><span>{v.count} uso{v.count > 1 ? "s" : ""}</span></div>
                      <div className="flex min-h-14 items-center justify-center rounded-md bg-background p-2"><Preview v={v} groupKey={g.key} /></div>
                      <dl className="space-y-0.5 text-[0.7rem] leading-4 text-muted-foreground">
                        <div><b>Tipo:</b> {v.tag}{v.variant ? ` · ${v.variant}` : ""}{v.size ? ` · ${v.size}` : ""}</div>
                        {v.className ? <div className="break-all"><b>Classes:</b> {v.className}</div> : null}
                        {v.icon ? <div className="break-all"><b>Ícone:</b> {v.icon} {v.iconClass}</div> : null}
                        <div className="break-all"><b>Onde:</b> {v.files.join(", ")}</div>
                      </dl>
                      <Button type="button" variant="action" size="sm" className="mt-auto" disabled={selected || choose.isPending} onClick={() => choose.mutate({ group: g.key, key: k })}>
                        {selected ? <><Check className="h-4 w-4" />Padrão</> : "Escolher como padrão"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </main>
  );
}
