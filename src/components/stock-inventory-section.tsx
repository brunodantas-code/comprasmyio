import { useMemo, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { StockInventoryPanel } from "@/components/stock-inventory-dialog";
import { useStock, useManufacturedMap, useTerceirosStock, type StockLocation, type StockPermissionKey } from "@/components/stock-tab";

type InventoryRow = { material_id: string; name: string; balance: number };

const AREA_META = {
  fabrica: { label: "Estoque de Componentes", subtitle: "Insumos para os dispositivos myio" },
  terceiros: { label: "Insumos de Instalação", subtitle: "Fio, fita isolante, material elétrico e hidráulico em geral" },
  almoxarifado: { label: "Estoque myio", subtitle: "Dispositivos myio prontos" },
  almoxarifado_geral: { label: "Almoxarifado", subtitle: "Ferramentas, uniformes" },
} as const;

/** Menu próprio do Inventário dentro de Armazém: escolhe a área e abre a contagem daquela área. */
export function StockInventorySection({
  canAccessSection = () => true,
  onlyLocation,
}: {
  canAccessSection?: (permission: StockPermissionKey) => boolean;
  onlyLocation?: StockLocation;
}) {
  const { data: stock, isLoading: stockLoading } = useStock();
  const { data: manufactured } = useManufacturedMap();
  const { data: terceirosStock, isLoading: terceirosLoading } = useTerceirosStock();
  const [area, setArea] = useState<string>();
  const [expanded, setExpanded] = useState(false);

  // Mesmas regras de acesso das telas de estoque: ninguém perde nem ganha acesso ao mudar de lugar.
  const areas = [
    { value: "fabrica", ...AREA_META.fabrica, allowed: (!onlyLocation || onlyLocation === "fabrica") && canAccessSection("armazem_fabrica") },
    { value: "terceiros", ...AREA_META.terceiros, allowed: (!onlyLocation || onlyLocation === "almoxarifado") && canAccessSection("armazem_estoque_myio") },
    { value: "almoxarifado", ...AREA_META.almoxarifado, allowed: (!onlyLocation || onlyLocation === "almoxarifado") && canAccessSection("armazem_estoque_myio") },
    { value: "almoxarifado_geral", ...AREA_META.almoxarifado_geral, allowed: !onlyLocation && canAccessSection("armazem_almoxarifado") },
  ].filter((item) => item.allowed);

  const activeArea = areas.find((item) => item.value === area)?.value ?? areas[0]?.value;
  const current = areas.find((item) => item.value === activeArea);

  const rows = useMemo<InventoryRow[]>(() => {
    const toRow = (row: { material_id: string; name: string; balance: number }): InventoryRow => ({
      material_id: row.material_id,
      name: row.name,
      balance: row.balance,
    });
    if (!activeArea) return [];
    if (activeArea === "terceiros") return (terceirosStock ?? []).map(toRow);
    const list = (stock ?? []).filter((row) => !/ — Caixa de \d+$/.test(row.name));
    if (activeArea === "fabrica")
      return list.filter((row) => (row.location ?? "fabrica") === "fabrica").filter((row) => !manufactured?.[row.material_id]).map(toRow);
    if (activeArea === "almoxarifado")
      return list.filter((row) => (row.location ?? "fabrica") === "almoxarifado").filter((row) => manufactured?.[row.material_id]).map(toRow);
    return list.filter((row) => (row.location ?? "fabrica") === "almoxarifado_geral").map(toRow);
  }, [activeArea, stock, manufactured, terceirosStock]);

  if (!activeArea) return null;
  const loading = activeArea === "terceiros" ? terceirosLoading : stockLoading;

  return (
    <Card className={expanded ? "fixed inset-0 z-50 max-h-dvh overflow-y-auto rounded-none border-0" : undefined}>
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <CardTitle>Inventário</CardTitle>
          <CardDescription>
            {current?.label} — {current?.subtitle}. Contagem física com inventariantes, divergências e assinaturas.
          </CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Select value={activeArea} onValueChange={setArea}>
            <SelectTrigger aria-label="Área do inventário" className="w-[min(15rem,58vw)]">
              <span className="truncate">{current?.label}</span>
            </SelectTrigger>
            <SelectContent className="max-w-[calc(100vw-1.25rem)]">
              {areas.map((item) => (
                <SelectItem key={item.value} value={item.value} textValue={item.label} className="flex flex-col items-start gap-0.5 py-2 whitespace-normal">
                  <span>{item.label}</span>
                  <span className="block max-w-full opacity-70">{item.subtitle}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-sm border-0 !bg-transparent opacity-70 shadow-none outline-none ring-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 hover:!bg-transparent hover:opacity-100"
            aria-label={expanded ? "Restaurar tamanho do inventário" : "Ampliar inventário"}
            title={expanded ? "Restaurar tamanho do inventário" : "Ampliar inventário"}
            aria-pressed={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando estoque…</p>
        ) : (
          <StockInventoryPanel key={activeArea} area={activeArea} rows={rows} />
        )}
      </CardContent>
    </Card>
  );
}
