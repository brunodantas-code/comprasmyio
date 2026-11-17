import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { crmConfigOptions } from "./crm-config";
import { renderTemplate } from "./proposta-logic";
export function CrmMessageModels({ fase, etapa, vars }: { fase?: string; etapa?: string; vars: Record<string, string> }) {
  const { data } = useSuspenseQuery(crmConfigOptions()); const [selected, setSelected] = useState("");
  const models = data.mensagens.filter((m) => m.ativo && (!m.fase_id || m.fase_id === fase) && (!m.etapa_lead || m.etapa_lead === etapa));
  const model = models.find((m) => m.id === selected);
  if (!models.length) return null;
  const body = model ? [renderTemplate(model.assunto, vars), renderTemplate(model.corpo, vars)].filter(Boolean).join("\n\n") : "";
  return <div className="space-y-2"><Select value={selected} onValueChange={setSelected}><SelectTrigger aria-label="Modelo de mensagem"><SelectValue placeholder="Modelo de mensagem" /></SelectTrigger><SelectContent>{models.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome} · {m.canal}</SelectItem>)}</SelectContent></Select>{model && <><Textarea aria-label="Prévia da mensagem" value={body} readOnly /><Button variant="ghost" title="Copiar mensagem" onClick={async () => { try { await navigator.clipboard.writeText(body); toast.success("Mensagem copiada"); } catch { toast.error("Não foi possível copiar a mensagem."); } }}><Copy className="h-4 w-4" />Copiar mensagem</Button></>}</div>;
}