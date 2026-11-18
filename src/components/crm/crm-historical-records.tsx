import { useQuery } from "@tanstack/react-query";
import { Download, History, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { readAllCrmPages } from "./crm-pagination";

function historyText(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return "—";
  return Object.entries(payload).map(([key, value]) => `${key.replaceAll("_", " ")}: ${typeof value === "object" && value !== null ? historyText(value) : String(value ?? "—")}`).join("\n");
}

export function CrmHistoricalRecords({ leadId, oportunidadeId, propostaId, numero, paths = [] }: { leadId?: string; oportunidadeId?: string; propostaId?: string; numero?: string; paths?: (string | null | undefined)[] }) {
  const data = useQuery({
    queryKey: ["crm-historical-record", leadId, oportunidadeId, propostaId],
    queryFn: async () => {
      const [docs, activities, surveys] = await Promise.all([
        supabase.from("crm_documentos_migrados").select("*"),
        leadId || oportunidadeId ? readAllCrmPages((from, to) => {
          const query = supabase.from("crm_atividades").select("*").order("data", { ascending: false }).order("id");
          return (leadId ? query.eq("lead_id", leadId) : query.eq("oportunidade_id", oportunidadeId ?? "")).range(from, to);
        }) : Promise.resolve([]),
        propostaId || oportunidadeId ? supabase.from("crm_levantamentos").select("id,arquivo_path,arquivo_nome,created_at,texto_fonte").eq(propostaId ? "proposta_id" : "oportunidade_id", propostaId ?? oportunidadeId ?? "") : Promise.resolve({ data: [], error: null }),
      ]);
      if (docs.error) throw docs.error;
      if (surveys.error) throw surveys.error;
      return { docs: docs.data ?? [], activities, surveys: surveys.data ?? [] };
    },
  });
  const selectedPaths = new Set([...paths.filter(Boolean), ...(data.data?.surveys ?? []).map((survey) => survey.arquivo_path).filter(Boolean)]);
  const docs = (data.data?.docs ?? []).filter((doc) => selectedPaths.has(doc.path) || Boolean(numero && (doc.path.startsWith(`legado/${numero}/`) || doc.path.startsWith(`geradas/${numero}-v`))));
  async function download(path: string, name: string) {
    const result = await supabase.storage.from("crm-historical-documents").createSignedUrl(path, 300, { download: name });
    if (result.error || !result.data) return toast.error("Não foi possível baixar o documento.");
    const a = document.createElement("a"); a.href = result.data.signedUrl; a.download = name; a.click();
  }
  return <div className="space-y-4 border-t border-border pt-4">
    <section className="space-y-2"><h3 className="flex items-center gap-2 text-sm font-medium"><Paperclip className="size-4" />Documentos originais ({docs.length})</h3>
      {docs.map((doc) => <div key={doc.path} className="flex min-w-0 items-center justify-between gap-2 text-sm"><span className="min-w-0 break-words">{doc.file_name}{doc.internal_only ? " · Memória interna" : ""}</span><Button variant="ghost" size="compactIcon" aria-label={`Baixar ${doc.file_name}`} title={`Baixar ${doc.file_name}`} onClick={() => download(doc.storage_path, doc.file_name)}><Download /></Button></div>)}
      {Array.from(selectedPaths).filter((path) => !data.data?.docs.some((doc) => doc.path === path)).map((path) => <p key={path} className="break-words text-xs text-muted-foreground">Arquivo original não recebido: {path}</p>)}
    </section>
    {(data.data?.surveys ?? []).map((survey) => <details key={survey.id} className="text-sm"><summary className="cursor-pointer font-medium">Levantamento · {survey.arquivo_nome ?? new Date(survey.created_at).toLocaleDateString("pt-BR")}</summary><p className="mt-2 whitespace-pre-wrap break-words">{survey.texto_fonte}</p></details>)}
    {leadId || oportunidadeId ? <section className="space-y-2"><h3 className="flex items-center gap-2 text-sm font-medium"><History className="size-4" />Histórico ({data.data?.activities.length ?? 0})</h3>{(data.data?.activities ?? []).map((entry) => <div key={entry.id} className="border-b border-border pb-2 text-sm"><p className="text-xs text-muted-foreground">{new Date(entry.data).toLocaleString("pt-BR")} · {entry.tipo.replaceAll("_", " ")}</p><p className="whitespace-pre-wrap break-words">{historyText(entry.payload)}</p></div>)}</section> : null}
    {data.isError ? <p className="text-sm text-destructive">Não foi possível carregar o histórico.</p> : null}
  </div>;
}