import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CdeNumber } from "./cde-button";
import { CdeCategoryHeader } from "./cde-category-header";
import { standardsFirst } from "./model-order";

type Pattern = { key: string; label: string; detail: string; uses: string; sketch: "screen" | "popup" | "confirm" | "bottom" | "top" | "side" | "floating" | "popover" | "collapse" | "tabs" };
type Decision = { key: string; title: string; patterns: Pattern[] };

/** Levantamento atual da navegação (contagem por tipo de componente nos apps). */
const DECISIONS: Decision[] = [
  { key: "nav_edit", title: "Criar e editar cadastros", patterns: [
    { key: "popup", label: "Pop-up", detail: "Janela sobre a tela atual", uses: "137 usos em 67 telas", sketch: "popup" },
    { key: "screen", label: "Tela própria", detail: "Abre uma página inteira", uses: "Novas Solicitações, Site Survey (visita)", sketch: "screen" },
    { key: "side", label: "Painel lateral", detail: "Desliza pela direita", uses: "2 usos em 2 telas", sketch: "side" },
  ] },
  { key: "nav_confirm", title: "Confirmar exclusão ou cancelamento", patterns: [
    { key: "confirm", label: "Pop-up de confirmação", detail: "Pergunta antes de agir", uses: "25 usos em 13 telas", sketch: "confirm" },
  ] },
  { key: "nav_menu", title: "Menu principal dos apps", patterns: [
    { key: "bottom", label: "Barra inferior", detail: "Ícones na base da tela", uses: "Supply, Cash Flow, Site Survey, Legal, Mytosis", sketch: "bottom" },
    { key: "top", label: "Menu superior", detail: "Logo à esquerda, menus à direita", uses: "Todos os apps (Usuários, Logs, casa)", sketch: "top" },
    { key: "side", label: "Menu lateral", detail: "Coluna à esquerda", uses: "Nenhum app hoje", sketch: "side" },
  ] },
  { key: "nav_float", title: "Ações flutuantes e rápidas", patterns: [
    { key: "floating", label: "Botão flutuante", detail: "Botão fixo sobre o conteúdo", uses: "Nenhum app hoje (o + do OpDesk fica no cabeçalho)", sketch: "floating" },
    { key: "popover", label: "Caixa suspensa", detail: "Abre junto ao botão (filtros)", uses: "16 usos em 9 telas", sketch: "popover" },
  ] },
  { key: "nav_section", title: "Organizar conteúdo na tela", patterns: [
    { key: "collapse", label: "Exibir/Recolher", detail: "Seções com seta", uses: "15 usos em 14 telas", sketch: "collapse" },
    { key: "tabs", label: "Abas", detail: "Alterna conteúdos no topo", uses: "13 usos em 5 telas", sketch: "tabs" },
  ] },
];

function Sketch({ kind }: { kind: Pattern["sketch"] }) {
  const bar = "rounded-sm bg-primary";
  return (
    <div className="relative h-16 w-24 overflow-hidden rounded-md border border-border bg-background">
      {kind === "top" || kind === "bottom" || kind === "screen" ? <div className={cn("absolute inset-x-0 h-2", bar, kind === "bottom" ? "bottom-0" : "top-0")} /> : null}
      {kind === "screen" ? <div className="absolute inset-x-2 top-4 bottom-2 rounded-sm bg-muted" /> : null}
      {kind === "side" ? <div className={cn("absolute inset-y-0 right-0 w-8", bar)} /> : null}
      {kind === "popup" || kind === "confirm" ? <div className="absolute inset-0 bg-foreground/10"><div className={cn("absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-primary bg-card", kind === "confirm" ? "h-6 w-12" : "h-10 w-16")} /></div> : null}
      {kind === "floating" ? <div className="absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full bg-primary" /> : null}
      {kind === "popover" ? <><div className="absolute left-2 top-2 h-2 w-4 rounded-sm bg-primary" /><div className="absolute left-2 top-5 h-8 w-12 rounded-sm border border-primary bg-card" /></> : null}
      {kind === "collapse" ? <div className="absolute inset-2 space-y-1">{[0, 1, 2].map((n) => <div key={n} className="h-2.5 rounded-sm bg-accent" />)}</div> : null}
      {kind === "tabs" ? <div className="absolute inset-x-2 top-2 flex gap-1">{[0, 1, 2].map((n) => <div key={n} className={cn("h-2 flex-1 rounded-sm", n ? "bg-muted" : "bg-primary")} />)}</div> : null}
    </div>
  );
}

export function CdeNavigation({ number, handle }: { number: number; handle?: import("react").ReactNode }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { data: chosen } = useQuery({
    queryKey: ["cde-nav"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cde_selected").select("group_key,variant_key").like("group_key", "nav_%");
      if (error) throw error;
      return data;
    },
  });
  const choose = async (group: string, key: string) => {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return;
    await supabase.from("cde_selected").delete().eq("group_key", group);
    const { error } = await supabase.from("cde_selected").insert({ group_key: group, variant_key: key, chosen_by: uid });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["cde-nav"] });
    toast.success("Padrão de navegação registrado");
  };
  return (
    <section className="space-y-4">
      <CdeCategoryHeader handle={handle} number={number} title="Navegação (UI/UX)" hint="Tela x pop-up, menus superior, inferior e lateral, flutuantes e organização do conteúdo" open={open} onToggle={() => setOpen(!open)} />
      {open ? (
        <div className="space-y-4 p-4">
          {DECISIONS.map((d, di) => (
            <div key={d.key}>
              <div className="mb-2 flex items-center gap-3 text-sm font-semibold"><CdeNumber subcategory>{number}.{di + 1}</CdeNumber>{d.title}</div>
              <div className="flex flex-wrap gap-3">
                {standardsFirst(d.patterns, p => chosen?.some(c => c.group_key === d.key && c.variant_key === p.key) ?? false).map((p) => {
                  const sel = chosen?.some((c) => c.group_key === d.key && c.variant_key === p.key);
                  return (
                    <div key={p.key} className={cn("flex w-56 flex-col gap-2 rounded-lg border p-3", sel ? "border-primary bg-accent" : "border-border")}>
                      <div className="flex items-center gap-3"><Sketch kind={p.sketch} /><div className="min-w-0"><div className="text-sm font-semibold">{p.label}</div><div className="text-xs text-muted-foreground">{p.detail}</div></div></div>
                      <div className="text-[0.7rem] text-muted-foreground"><b>Onde:</b> {p.uses}</div>
                      <Button type="button" variant="action" size="sm" disabled={sel} onClick={() => choose(d.key, p.key)} className="mt-auto">{sel ? <><Check className="h-4 w-4" />Padrão</> : "Escolher como padrão"}</Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
