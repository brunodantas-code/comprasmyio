import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
let cache: string[] | null = null;

/** Value format: "Cidade - UF" (official IBGE list). Legacy free-text values are shown until replaced. */
export function BrCityPicker({ id, value, onChange }: { id?: string; value: string; onChange: (value: string) => void }) {
  const [cities, setCities] = useState<string[]>(cache ?? []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const currentUf = value.match(/ - ([A-Z]{2})$/)?.[1] ?? "";
  const [uf, setUf] = useState(currentUf);
  useEffect(() => { if (currentUf) setUf(currentUf); }, [currentUf]);
  useEffect(() => {
    if (cache) return;
    void import("@/data/br-cities.json").then((module) => { cache = module.default as string[]; setCities(cache); });
  }, []);
  const results = useMemo(() => {
    const q = normalize(query);
    const pool = uf ? cities.filter((city) => city.endsWith(` - ${uf}`)) : cities;
    const matches = q ? pool.filter((city) => normalize(city).includes(q)) : pool;
    if (q) matches.sort((a, b) => Number(!normalize(a).startsWith(q)) - Number(!normalize(b).startsWith(q)));
    return matches.slice(0, 60);
  }, [cities, query, uf]);
  const isOfficial = !value || cities.length === 0 || cities.includes(value);

  return (
    <div className="flex gap-2">
      <Select value={uf || "all"} onValueChange={(next) => { const nextUf = next === "all" ? "" : next; setUf(nextUf); if (nextUf && value && !value.endsWith(` - ${nextUf}`)) onChange(""); }}>
        <SelectTrigger className="w-20 shrink-0" aria-label="UF"><SelectValue placeholder="UF" /></SelectTrigger>
        <SelectContent><SelectItem value="all">UF</SelectItem>{UFS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
      </Select>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} className="min-w-0 flex-1 justify-between font-normal !text-foreground">
            <span className={`truncate ${value ? "" : "text-muted-foreground"}`}>{value || "Digite a cidade"}{!isOfficial ? " (fora da lista)" : ""}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-64 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Ex.: Campos" value={query} onValueChange={setQuery} />
            <CommandList>
              <CommandEmpty>{cities.length ? "Nenhuma cidade encontrada." : "Carregando cidades..."}</CommandEmpty>
              <CommandGroup>
                {results.map((city) => (
                  <CommandItem key={city} value={city} onSelect={() => { onChange(city); setUf(city.slice(-2)); setOpen(false); setQuery(""); }}>
                    <Check className={`mr-2 h-4 w-4 ${value === city ? "opacity-100" : "opacity-0"}`} />{city}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
