import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { loadSpendCities, spendCitiesUrl } from "./cities";

export function SpendCityField({ id, uf, value, onChange }: { id: string; uf: string; value: string; onChange: (city: string) => void }) {
  const cities = useQuery({
    queryKey: ["spend-cities", uf],
    enabled: Boolean(spendCitiesUrl(uf)),
    staleTime: 86400000,
    queryFn: ({ signal }) => loadSpendCities(uf, signal),
  });
  return <>
    <Input id={id} aria-label="Cidade do comprovante" value={value} maxLength={120} list={`${id}-options`} autoComplete="off" onChange={event => onChange(event.target.value)} />
    <datalist id={`${id}-options`}>{cities.data?.map(city => <option key={city} value={city} />)}</datalist>
    {cities.isError ? <span role="status" className="text-xs text-muted-foreground">Lista de cidades indisponível; preenchimento manual mantido.</span> : null}
  </>;
}