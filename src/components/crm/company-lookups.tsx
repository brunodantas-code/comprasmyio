import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { lookupCnpj, lookupMunicipios } from "./crm-lookups.functions";
import { UFS } from "./config-logic";
type Props = { values: Record<string, string>; change: (v: Record<string, string>) => void };
export function CnpjField({ values, change }: Props) {
  const lookup = useServerFn(lookupCnpj); const [busy, setBusy] = useState(false);
  return <div className="flex items-end gap-2"><Input id="crm-cnpj" value={values.cnpj ?? ""} onChange={(e) => change({ ...values, cnpj: e.target.value })} />
    <Button variant="ghost" size="icon" aria-label="Consultar CNPJ" title="Consultar CNPJ" disabled={busy} onClick={async () => { setBusy(true); try { const result = await lookup({ data: { cnpj: values.cnpj ?? "" } }); if (result.values) change({ ...values, ...result.values }); else toast.error(result.error); } catch (e) { toast.error(e instanceof Error ? e.message : "Falha na consulta."); } finally { setBusy(false); } }}><Search className="h-4 w-4" /></Button></div>;
}
export function UfField({ values, change }: Props) {
  return <Select value={values.uf || "__none"} onValueChange={(uf) => change({ ...values, uf: uf === "__none" ? "" : uf, cidade: "" })}><SelectTrigger id="crm-uf" aria-label="UF"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none">—</SelectItem>{UFS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent></Select>;
}
export function CidadeField({ values, change }: Props) {
  const lookup = useServerFn(lookupMunicipios);
  const query = useQuery({ queryKey: ["crm-ibge", values.uf], enabled: UFS.includes(values.uf), staleTime: 86400000, queryFn: () => lookup({ data: { uf: values.uf } }) });
  return <><Input id="crm-cidade" list="crm-municipios" value={values.cidade ?? ""} onChange={(e) => change({ ...values, cidade: e.target.value })} /><datalist id="crm-municipios">{query.data?.rows.map((r) => <option key={r.id} value={r.nome} />)}</datalist>{query.data?.error && <p className="text-xs text-muted-foreground">{query.data.error}</p>}</>;
}