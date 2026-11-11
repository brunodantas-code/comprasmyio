import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
let cache: string[] | null = null;

/** Value format: "Cidade - UF" (official IBGE list). Legacy free-text values are shown until replaced. */
export function BrCityPicker({ id, value, onChange }: { id?: string; value: string; onChange: (value: string) => void }) {
  const [cities, setCities] = useState<string[]>(cache ?? []);
  const currentUf = value.match(/ - ([A-Z]{2})$/)?.[1] ?? "";
  const [uf, setUf] = useState(currentUf);
  useEffect(() => { if (currentUf) setUf(currentUf); }, [currentUf]);
  useEffect(() => {
    if (cache) return;
    void import("@/data/br-cities.json").then((module) => { cache = module.default as string[]; setCities(cache); });
  }, []);
  const options = useMemo(() => {
    const pool = uf ? cities.filter((city) => city.endsWith(` - ${uf}`)) : cities;
    const choices = pool.map((city) => ({ value: city, label: city }));
    if (value && !pool.includes(value)) choices.unshift({ value, label: `${value} (fora da lista)` });
    return choices;
  }, [cities, uf, value]);

  return (
    <div className="flex items-end gap-2">
      <Select value={uf || "all"} onValueChange={(next) => { const nextUf = next === "all" ? "" : next; setUf(nextUf); if (nextUf && value && !value.endsWith(` - ${nextUf}`)) onChange(""); }}>
        <SelectTrigger className="w-20 shrink-0" aria-label="UF"><SelectValue placeholder="UF" /></SelectTrigger>
        <SelectContent><SelectItem value="all">UF</SelectItem>{UFS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
      </Select>
      <div className="min-w-0 flex-1" id={id}>
        <SearchableSelect aria-label="Cidade" value={value} onChange={(city) => { onChange(city); setUf(city.slice(-2)); }} options={options} placeholder="Digite a cidade" clearable={false} emptyText={cities.length ? "Nenhuma cidade encontrada." : "Carregando cidades..."} optionFilter={(items, query) => {
          const q = normalize(query);
          return items.filter((item) => normalize(item.label).includes(q)).sort((a, b) => Number(!normalize(a.label).startsWith(q)) - Number(!normalize(b.label).startsWith(q))).slice(0, 60);
        }} />
      </div>
    </div>
  );
}
