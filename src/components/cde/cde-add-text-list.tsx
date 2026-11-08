import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CdeButton, addTextKey, parseAddTextOverrides, useCdeStandards } from "./cde-button";
import addTextUsage from "./add-text-usage.json";

type Entry = { file: string; line: number; label: string; dynamic?: boolean };

/** CDE 4.2: current + buttons with text; admins edit each button's text in place. */
export function CdeAddTextList() {
  const qc = useQueryClient();
  const { data } = useCdeStandards();
  const row = data?.selected.find((s) => s.group_key === "add_text" && s.is_primary);
  const overrides = parseAddTextOverrides(row?.variant_key);
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(key: string, text: string | null) {
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const next = { ...overrides };
      if (text && text.trim()) next[key] = text.trim(); else delete next[key];
      const payload = { variant_key: JSON.stringify(next), chosen_by: user.id };
      const result = row
        ? await supabase.from("cde_selected").update(payload).eq("group_key", "add_text").eq("variant_key", row.variant_key)
        : await supabase.from("cde_selected").insert({ ...payload, group_key: "add_text" });
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["cde-standards"] });
      setEditing(null);
      toast.success("Texto do botão atualizado");
    } catch { toast.error("Não foi possível salvar o texto."); } finally { setSaving(false); }
  }

  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {(addTextUsage as Entry[]).map((e) => {
        const key = addTextKey(e.file, e.label);
        const edited = !!overrides[key];
        const id = `${e.file}:${e.line}`;
        return (
          <div key={id} className="flex min-w-0 flex-col gap-1 rounded-md border border-border p-2">
            {editing === id ? (
              <div className="flex flex-col gap-2">
                <Input autoFocus value={value} onChange={(ev) => setValue(ev.target.value)} aria-label={`Novo texto para ${e.label}`} className="h-8 text-xs" />
                <div className="flex gap-2">
                  <Button type="button" variant="action" size="sm" disabled={saving} onClick={() => save(key, value)}>Salvar</Button>
                  <Button type="button" variant="action" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <CdeButton group="plus" screen={e.file} type="button" tabIndex={-1}>{e.label}</CdeButton>
                {!e.dynamic ? (
                  <span className="flex gap-1">
                    {edited ? <Button type="button" variant="outline" size="compactIcon" title="Voltar ao texto original" aria-label={`Voltar ${e.label} ao texto original`} disabled={saving} onClick={() => save(key, null)}><RotateCcw /></Button> : null}
                    <Button type="button" variant="outline" size="compactIcon" title="Editar texto" aria-label={`Editar texto de ${e.label}`} onClick={() => { setValue(overrides[key] ?? e.label); setEditing(id); }}><Pencil /></Button>
                  </span>
                ) : null}
              </div>
            )}
            <span className="break-all">{e.file}{edited ? ` · original: ${e.label}` : ""}{e.dynamic ? " · texto definido pela tela" : ""}</span>
          </div>
        );
      })}
    </div>
  );
}
