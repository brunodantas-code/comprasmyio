import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useCdeStandards } from "@/components/cde/cde-button";
import { CdeCategoryHeader } from "@/components/cde/cde-category-header";
import { categories, type CategorySetting } from "./rules";
import { categoryIcons } from "./icons";
export function SpendCategoryConfig({ number, handle }: { number: number; handle?: ReactNode }) {
  const { data } = useCdeStandards(); const qc = useQueryClient(); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const row = data?.selected.find(r => r.group_key === "spend_categories" && r.is_primary);
  const read = (): Record<string, CategorySetting> => { try { return JSON.parse(row?.variant_key ?? "{}"); } catch { return {}; } };
  const [draft, setDraft] = useState<Record<string, CategorySetting>>({});
  const lookups = useQuery({ queryKey: ["spend-category-lookups"], enabled: open, queryFn: async () => {
    const [a, c] = await Promise.all([supabase.from("cash_flow_accounts").select("id,code,name,active,accepts_entries,parent_id"), supabase.from("cost_centers").select("id,name").eq("active", true)]);
    if (a.error) throw a.error; if (c.error) throw c.error;
    return { accounts: a.data.filter(x => x.active && x.accepts_entries && !a.data.some(y => y.active && y.parent_id === x.id)).map(x => ({ value: x.id, label: `${x.code} · ${x.name}` })), centers: c.data.map(x => ({ value: x.id, label: x.name })) };
  } });
  function setting(key: string, name: string, icon: string): CategorySetting { return draft[key] ?? { name, icon, active: true, account_id: "", cost_center_id: "" }; }
  async function save() {
    setBusy(true); try { const u = (await supabase.auth.getUser()).data.user; if (!u) throw new Error("Sessão não encontrada");
      const value = JSON.stringify(draft); const r = row ? await supabase.from("cde_selected").update({ variant_key: value, chosen_by: u.id }).eq("group_key", "spend_categories").eq("is_primary", true).select("group_key").single() : await supabase.from("cde_selected").insert({ group_key: "spend_categories", variant_key: value, is_primary: true, chosen_by: u.id }).select("group_key").single();
      if (r.error) throw r.error; await Promise.all([qc.invalidateQueries({ queryKey: ["cde-standards"] }), qc.invalidateQueries({ queryKey: ["spend"] })]); toast.success("Categorias do Spend atualizadas");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar"); } finally { setBusy(false); }
  }
  return <section><CdeCategoryHeader number={number} {...(handle ? { handle } : {})} title="Spend — categorias de despesas" open={open} onToggle={() => { setDraft(read()); setOpen(!open); }} action={open ? <Button variant="ghost" size="icon" title="Salvar categorias do Spend" aria-label="Salvar categorias do Spend" disabled={busy} onClick={save}><Save /></Button> : null} />
    {open && <div className="space-y-5 px-4 py-4">{categories.map(cat => { const s = setting(cat.key, cat.name, cat.icon); const update = (change: Partial<CategorySetting>) => setDraft(prev => ({ ...prev, [cat.key]: { ...s, ...change } })); return <div key={cat.key} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><label className="flex items-center gap-2 text-sm"><Switch checked={s.active} onCheckedChange={active => update({ active })} />{cat.name}</label><Input aria-label={`Nome de ${cat.name}`} value={s.name} onChange={e => update({ name: e.target.value })} /><SearchableSelect aria-label={`Ícone de ${cat.name}`} value={s.icon} onChange={icon => update({ icon })} options={Object.keys(categoryIcons).map(k => ({ value: k, label: k }))} /><SearchableSelect aria-label={`Conta de ${cat.name}`} value={s.account_id} onChange={account_id => update({ account_id })} placeholder={cat.account} options={lookups.data?.accounts ?? []} /><SearchableSelect aria-label={`Centro de custo de ${cat.name}`} value={s.cost_center_id} onChange={cost_center_id => update({ cost_center_id })} placeholder="Centro de Custo padrão" options={lookups.data?.centers ?? []} /></div>; })}</div>}
  </section>;
}