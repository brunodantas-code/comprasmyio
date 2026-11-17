import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCdeSwatchStyle } from "./cde-button";
import { CorporateMessageBox } from "@/components/corporate/corporate-banner";
import { MESSAGE_COLORS, MESSAGE_STYLE_DEFAULT, MESSAGE_STYLE_GROUP, messageColor, useMessageStyle, type MessageColorKind, type MessageStyle } from "@/components/corporate/message-style";

const FIELDS: [MessageColorKind, string][] = [["fill", "Fundo da mensagem"], ["border", "Borda da mensagem"], ["symbol", "Símbolo (megafone)"], ["text", "Texto da mensagem"]];

function Pick({ kind, label, value, onChange }: { kind: MessageColorKind; label: string; value: string; onChange: (v: string) => void }) {
  const swatch = useCdeSwatchStyle();
  const dot = (color: string) => <span aria-hidden="true" style={{ background: color, ...swatch.css }} className={`block h-4 w-4 shrink-0 rounded-full border border-border ${swatch.cls}`} />;
  const current = messageColor(kind, value);
  return <div className="min-w-0 space-y-1"><Label className="flex min-h-10 items-end pb-1">{label}</Label>
    <Select value={current.key} onValueChange={onChange}><SelectTrigger className="h-9" aria-label={label}><span style={{ display: "inline-flex", alignItems: "center", gap: 10, lineHeight: 1 }} className="min-w-0">{dot(current.value)}<span className="truncate" style={{ lineHeight: "16px" }}>{current.label}</span></span></SelectTrigger>
      <SelectContent>{MESSAGE_COLORS[kind].map((o) => <SelectItem key={o.key} value={o.key}><span style={{ display: "inline-flex", alignItems: "center", gap: 10, lineHeight: "16px" }}>{dot(o.value)}<span>{o.label}</span></span></SelectItem>)}</SelectContent></Select></div>;
}

/** Look of corporate messages (background, border, symbol, text) with live preview; saved in cde_selected message_style. */
export function MessageStyleEditor() {
  const qc = useQueryClient();
  const { data: saved = MESSAGE_STYLE_DEFAULT } = useMessageStyle();
  const [draft, setDraft] = useState<MessageStyle | null>(null);
  const [saving, setSaving] = useState(false);
  const style = draft ?? saved;
  async function save() {
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão não encontrada");
      const existing = await supabase.from("cde_selected").select("variant_key").eq("group_key", MESSAGE_STYLE_GROUP).eq("is_primary", true).maybeSingle();
      if (existing.error) throw existing.error;
      const row = { variant_key: JSON.stringify(style), chosen_by: user.id };
      const r = existing.data ? await supabase.from("cde_selected").update(row).eq("group_key", MESSAGE_STYLE_GROUP).eq("variant_key", existing.data.variant_key).select("group_key") : await supabase.from("cde_selected").insert({ ...row, group_key: MESSAGE_STYLE_GROUP }).select("group_key");
      if (r.error || !r.data?.length) throw r.error ?? new Error("sem permissão");
      await qc.invalidateQueries({ queryKey: ["cde-message-style"] });
      setDraft(null); toast.success("Aparência das mensagens atualizada");
    } catch { toast.error("Não foi possível salvar a aparência."); } finally { setSaving(false); }
  }
  return <div className="max-w-5xl space-y-3">
    <div className="flex items-center gap-1"><p className="text-sm font-medium">Aparência das mensagens</p>
      {draft && <><Button variant="ghost" size="icon" aria-label="Salvar" title="Salvar aparência" onClick={save} disabled={saving}><Save /></Button><Button variant="ghost" size="icon" aria-label="Cancelar" title="Cancelar" onClick={() => setDraft(null)}><X /></Button></>}</div>
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">{FIELDS.map(([k, l]) => <Pick key={k} kind={k} label={l} value={style[k]} onChange={(v) => setDraft({ ...style, [k]: v })} />)}</div>
    <div className="space-y-1"><p className="text-xs text-muted-foreground">Prévia</p><CorporateMessageBox text="Novembro é o mês de fecharmos o orçamento de 2027. Todos devem atualizar seus KPIs e OKRs!" style={style} /></div>
  </div>;
}
