import { useState } from "react";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CrmRecordDialog, nn, type FieldSpec } from "./crm-record-dialog";
import { configNumber } from "./config-logic";

export const crmConfigOptions = () => queryOptions({ queryKey: ["crm-config"], queryFn: async () => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Sessão expirada.");
  const [admin, fases, etapas, papeis, propostas, mensagens] = await Promise.all([
    supabase.from("erp_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("crm_fases_funil").select("*").order("ordem"), supabase.from("crm_etapas_lead").select("*").order("ordem"),
    supabase.from("crm_papeis_contato").select("*").order("ordem"), supabase.from("crm_templates_proposta").select("*").order("nome"),
    supabase.from("crm_templates_mensagem").select("*").order("nome"),
  ]);
  for (const result of [admin, fases, etapas, papeis, propostas, mensagens]) if (result.error) throw result.error;
  return { admin: !!admin.data, fases: fases.data ?? [], etapas: etapas.data ?? [], papeis: papeis.data ?? [], propostas: propostas.data ?? [], mensagens: mensagens.data ?? [] };
} });
type Kind = "fases" | "etapas" | "papeis" | "propostas" | "mensagens";
const labels: Record<Kind, string> = { fases: "Fases do funil", etapas: "Etapas dos leads", papeis: "Papéis de contato", propostas: "Modelos de proposta", mensagens: "Modelos de mensagem" };
const options = (values: string[]) => values.map((value) => ({ value, label: value }));
const activeField: FieldSpec = { key: "ativo", label: "Ativo", type: "select", required: true, options: [{ value: "true", label: "Sim" }, { value: "false", label: "Não" }] };

export function CrmConfig() {
  const { data: d } = useSuspenseQuery(crmConfigOptions()); const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>("fases"); const [editing, setEditing] = useState<Record<string, string> | null>(null);
  const refresh = async () => { await Promise.all(["crm-config", "crm", "crm-propostas"].map((key) => qc.invalidateQueries({ queryKey: [key] }))); };
  const fields: FieldSpec[] = [{ key: "nome", label: "Nome", required: true }];
  if (kind === "etapas" || kind === "papeis" || kind === "propostas") fields.push({ key: "codigo", label: "Código", required: true });
  if (kind === "fases" || kind === "etapas" || kind === "papeis") fields.push({ key: "ordem", label: "Ordem", type: "number", required: true });
  if (kind === "fases" || kind === "etapas") fields.push({ key: "tipo", label: "Tipo", type: "select", required: true, options: options(kind === "fases" ? ["aberta", "ganho", "perdido", "desqualificado"] : ["aberta", "convertido", "descartado"]) });
  if (kind === "fases") fields.push({ key: "probabilidade", label: "Probabilidade (%)", type: "number", required: true }, { key: "tempo_max_dias", label: "Prazo máximo (dias)", type: "number" }, { key: "checklist_saida", label: "Checklist de saída (um item por linha)", type: "textarea" });
  if (kind === "papeis") fields.push({ key: "decisor_padrao", label: "Decisor padrão", type: "select", options: activeField.options });
  if (kind === "propostas") fields.push({ key: "introducao", label: "Introdução", type: "textarea" }, { key: "escopo", label: "Escopo", type: "textarea" }, ...["contrato_meses", "parcelas_setup", "validade_dias"].map((key) => ({ key, label: ({ contrato_meses: "Contrato (meses)", parcelas_setup: "Parcelas do setup", validade_dias: "Validade (dias)" } as Record<string, string>)[key], type: "number" as const, required: true })));
  if (kind === "mensagens") fields.push({ key: "canal", label: "Canal", type: "select", required: true, options: options(["whatsapp", "email"]) }, { key: "fase_id", label: "Fase do funil", type: "select", options: d.fases.map((f) => ({ value: f.id, label: f.nome })) }, { key: "etapa_lead", label: "Etapa do lead", type: "select", options: d.etapas.map((f) => ({ value: f.codigo, label: f.nome })) }, { key: "assunto", label: "Assunto" }, { key: "corpo", label: "Mensagem", type: "textarea", required: true });
  fields.push(activeField);
  const rows = d[kind].map((r) => ({ ...r, ativo: "ativa" in r ? r.ativa : "ativo" in r ? r.ativo : true }));
  function edit(row?: typeof rows[number]) {
    if (!row) { setEditing({ nome: "", ordem: String(rows.length + 1), tipo: "aberta", ativo: "true", probabilidade: "0", decisor_padrao: "false", contrato_meses: "36", parcelas_setup: "3", validade_dias: "30", canal: "whatsapp" }); return; }
    const values = Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v == null ? "" : String(v)]));
    if ("condicoes_padrao" in row && row.condicoes_padrao && typeof row.condicoes_padrao === "object" && !Array.isArray(row.condicoes_padrao)) for (const [k, v] of Object.entries(row.condicoes_padrao)) values[k] = String(v);
    if ("checklist_saida" in row && Array.isArray(row.checklist_saida)) values.checklist_saida = row.checklist_saida.map((x) => typeof x === "string" ? x : JSON.stringify(x)).join("\n");
    setEditing(values);
  }
  async function persist(v: Record<string, string>, remove = false) {
    if (!d.admin) throw new Error("Somente Admin pode alterar configurações.");
    const id = editing?.id; const codigo = editing?.codigo; const ativo = v.ativo === "true";
    let result;
    if (kind === "fases") {
      const row = { nome: v.nome.trim(), ordem: configNumber(v.ordem), tipo: v.tipo, probabilidade: configNumber(v.probabilidade, 0, 100), tempo_max_dias: v.tempo_max_dias ? configNumber(v.tempo_max_dias) : null, checklist_saida: (v.checklist_saida ?? "").split("\n").map((x) => x.trim()).filter(Boolean), ativa: ativo };
      result = remove && id ? await supabase.from("crm_fases_funil").delete().eq("id", id).select("id") : id ? await supabase.from("crm_fases_funil").update(row).eq("id", id).select("id") : await supabase.from("crm_fases_funil").insert(row).select("id");
    } else if (kind === "etapas") {
      const row = { nome: v.nome.trim(), codigo: v.codigo.trim(), ordem: configNumber(v.ordem), tipo: v.tipo, ativa: ativo };
      result = remove && id ? await supabase.from("crm_etapas_lead").delete().eq("id", id).select("id") : id ? await supabase.from("crm_etapas_lead").update(row).eq("id", id).select("id") : await supabase.from("crm_etapas_lead").insert(row).select("id");
    } else if (kind === "papeis") {
      const row = { nome: v.nome.trim(), codigo: v.codigo.trim(), ordem: configNumber(v.ordem), decisor_padrao: v.decisor_padrao === "true", ativo };
      result = remove && codigo ? await supabase.from("crm_papeis_contato").delete().eq("codigo", codigo).select("codigo") : codigo ? await supabase.from("crm_papeis_contato").update(row).eq("codigo", codigo).select("codigo") : await supabase.from("crm_papeis_contato").insert(row).select("codigo");
    } else if (kind === "propostas") {
      const row = { nome: v.nome.trim(), codigo: v.codigo.trim(), introducao: nn(v.introducao), escopo: nn(v.escopo), ativo, condicoes_padrao: { contrato_meses: configNumber(v.contrato_meses, 1), parcelas_setup: configNumber(v.parcelas_setup, 1), validade_dias: configNumber(v.validade_dias, 1) } };
      result = remove && id ? await supabase.from("crm_templates_proposta").delete().eq("id", id).select("id") : id ? await supabase.from("crm_templates_proposta").update(row).eq("id", id).select("id") : await supabase.from("crm_templates_proposta").insert(row).select("id");
    } else {
      const row = { nome: v.nome.trim(), canal: v.canal, fase_id: nn(v.fase_id), etapa_lead: nn(v.etapa_lead), assunto: nn(v.assunto), corpo: v.corpo.trim(), ativo };
      result = remove && id ? await supabase.from("crm_templates_mensagem").delete().eq("id", id).select("id") : id ? await supabase.from("crm_templates_mensagem").update(row).eq("id", id).select("id") : await supabase.from("crm_templates_mensagem").insert(row).select("id");
    }
    if (result.error) throw new Error(result.error.message);
    if (!result.data?.length) throw new Error("Sem permissão para alterar este cadastro.");
    await refresh(); toast.success(remove ? "Cadastro excluído" : "Configuração salva");
  }
  return <div className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><h1 className="text-xl font-semibold">Configurações do CRM</h1><div className="flex flex-wrap items-end gap-2"><Select value={kind} onValueChange={(k) => setKind(k as Kind)}><SelectTrigger aria-label="Grupo de configuração" className="w-56"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(labels).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}</SelectContent></Select>{d.admin && <Button variant="ghost" onClick={() => edit()}><Plus className="h-4 w-4" />Novo cadastro</Button>}</div></div>
    <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Código / Tipo</TableHead><TableHead>Ordem / Canal</TableHead><TableHead>Ativo</TableHead>{d.admin && <TableHead>Ações</TableHead>}</TableRow></TableHeader><TableBody>{rows.map((r) => <TableRow key={"id" in r ? r.id : r.codigo}><TableCell>{r.nome}</TableCell><TableCell>{"codigo" in r ? r.codigo : "tipo" in r ? r.tipo : "—"}</TableCell><TableCell>{"ordem" in r ? r.ordem : "canal" in r ? r.canal : "—"}</TableCell><TableCell>{r.ativo ? "Sim" : "Não"}</TableCell>{d.admin && <TableCell><Button variant="ghost" size="icon" aria-label={`Editar ${r.nome}`} title={`Editar ${r.nome}`} onClick={() => edit(r)}><Pencil className="h-4 w-4" /></Button></TableCell>}</TableRow>)}{!rows.length && <TableRow><TableCell colSpan={5}>Nenhum cadastro.</TableCell></TableRow>}</TableBody></Table>
    <CrmRecordDialog open={!!editing} title={labels[kind]} fields={fields} initial={editing ?? {}} onClose={() => setEditing(null)} onSave={(v) => persist(v)} onDelete={editing?.id || (kind === "papeis" && editing?.codigo) ? () => persist(editing ?? {}, true) : undefined} deleteTitle="Excluir configuração?" />
  </div>;
}