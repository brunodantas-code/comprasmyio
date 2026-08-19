import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FlaskConical, Search, ListTree } from "lucide-react";

type Material = { id: string; name: string; location: string; is_product: boolean; loss_percent?: number | null };
type Bom = { id: string; product_material_id: string; component_material_id: string; quantity: number };

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function StockSimulatorDialog({ userId }: { userId?: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [qtys, setQtys] = useState<Record<string, string>>({});

  const { data: materials } = useQuery({
    queryKey: ["materials", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, name, location, is_product, loss_percent")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Material[];
    },
  });

  const { data: boms } = useQuery({
    queryKey: ["product-boms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_boms")
        .select("id, product_material_id, component_material_id, quantity");
      if (error) throw error;
      return (data ?? []) as Bom[];
    },
  });

  const products = useMemo(
    () =>
      (materials ?? [])
        .filter((m) => m.is_product)
        .filter((m, i, arr) => arr.findIndex((x) => normalize(x.name) === normalize(m.name)) === i),
    [materials],
  );

  const visibleProducts = useMemo(() => {
    const q = normalize(search);
    return q ? products.filter((p) => normalize(p.name).includes(q)) : products;
  }, [products, search]);

  const nameOf = (id: string) => (materials ?? []).find((m) => m.id === id)?.name ?? "Material";

  // Componentes necessários = soma(qtd produto x qtd BOM x (1 + perda%))
  const needed = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const q = Number(qtys[p.id] ?? "");
      if (!(q > 0)) continue;
      const factor = 1 + Number(p.loss_percent ?? 0) / 100;
      for (const b of boms ?? []) {
        if (b.product_material_id !== p.id) continue;
        const add = q * Number(b.quantity) * factor;
        map.set(b.component_material_id, (map.get(b.component_material_id) ?? 0) + add);
      }
    }
    return [...map.entries()]
      .map(([id, qty]) => ({ id, name: nameOf(id), qty: Math.ceil(qty * 1000) / 1000 }))
      .sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, boms, qtys, materials]);

  const totalProducts = products.reduce((s, p) => s + (Number(qtys[p.id] ?? "") || 0), 0);

  const run = useMutation({
    mutationFn: async () => {
      if (needed.length === 0) throw new Error("Informe a quantidade de ao menos um produto com regras cadastradas.");
      const rows = needed.map((n) => ({
        material_id: n.id,
        quantity: n.qty,
        type: "entrada" as const,
        reason: "Simulação de estoque (regras de componentes)",
        created_by: userId ?? null,
      }));
      const { error } = await supabase.from("stock_movements").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      toast.success(`Estoque simulado: ${n} componentes abastecidos.`);
      setQtys({});
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="Simulador de estoque">
          <FlaskConical className="mr-2 h-4 w-4" />
          Simulador
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Simulador de estoque por produto</DialogTitle>
          <DialogDescription>
            Informe quantos produtos você quer simular. O sistema calcula os componentes pelas regras (incluindo
            perda) e dá entrada automática no estoque da fábrica.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar produto"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="w-32 text-right">Quantidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.name}
                    {Number(p.loss_percent ?? 0) > 0 && (
                      <Badge variant="outline" className="ml-2">perda {Number(p.loss_percent)}%</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min="0"
                      className="w-24 text-right"
                      value={qtys[p.id] ?? ""}
                      placeholder="0"
                      onChange={(e) => setQtys((s) => ({ ...s, [p.id]: e.target.value }))}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {visibleProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-sm text-muted-foreground">
                    Nenhum produto encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {needed.length > 0 && (
          <div className="rounded-md border">
            <div className="border-b px-3 py-2 text-sm font-medium">
              Prévia — {needed.length} componentes para {totalProducts} produto(s)
            </div>
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Componente</TableHead>
                    <TableHead className="text-right">Entrada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {needed.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell>{n.name}</TableCell>
                      <TableCell className="text-right">+{n.qty}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setQtys({})}>Limpar</Button>
          <Button onClick={() => run.mutate()} disabled={run.isPending || needed.length === 0}>
            Abastecer estoque
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProductionCapacityCard() {
  const [search, setSearch] = useState("");
  const [limitDialog, setLimitDialog] = useState<{ name: string; items: { name: string; can: number; per: number; balance: number }[] } | null>(null);

  const { data: materials } = useQuery({
    queryKey: ["materials", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, name, location, is_product, loss_percent")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Material[];
    },
  });

  const { data: boms } = useQuery({
    queryKey: ["product-boms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_boms")
        .select("id, product_material_id, component_material_id, quantity");
      if (error) throw error;
      return (data ?? []) as Bom[];
    },
  });

  const { data: stock } = useQuery({
    queryKey: ["material-stock"],
    queryFn: async () => {
      const { data, error } = await supabase.from("material_stock").select("material_id, name, balance");
      if (error) throw error;
      return (data ?? []) as { material_id: string; name: string; balance: number }[];
    },
  });

  const balanceOf = (id: string) => Number((stock ?? []).find((s) => s.material_id === id)?.balance ?? 0);

  const rows = useMemo(() => {
    const products = (materials ?? [])
      .filter((m) => m.is_product)
      .filter((m, i, arr) => arr.findIndex((x) => normalize(x.name) === normalize(m.name)) === i);

    return products
      .map((p) => {
        const factor = 1 + Number(p.loss_percent ?? 0) / 100;
        const items = (boms ?? []).filter((b) => b.product_material_id === p.id);
        if (items.length === 0)
          return {
            id: p.id,
            name: p.name,
            possible: null as number | null,
            limiter: null as string | null,
            missing: 0,
            allLimiters: [] as { name: string; can: number; per: number; balance: number }[],
          };
        let possible = Infinity;
        let limiter: string | null = null;
        let missing = 0;
        const allLimiters: { name: string; can: number; per: number; balance: number }[] = [];
        for (const b of items) {
          const per = Number(b.quantity) * factor;
          if (!(per > 0)) continue;
          const bal = balanceOf(b.component_material_id);
          const can = Math.floor(bal / per);
          if (bal <= 0) missing += 1;
          const cname = (materials ?? []).find((m) => m.id === b.component_material_id)?.name ?? "Material";
          allLimiters.push({ name: cname, can, per, balance: bal });
          if (can < possible) {
            possible = can;
            limiter = cname;
          }
        }
        allLimiters.sort((a, b) => a.can - b.can);
        return {
          id: p.id,
          name: p.name,
          possible: Number.isFinite(possible) ? possible : null,
          limiter,
          missing,
          allLimiters,
        };
      })
      .sort((a, b) => (b.possible ?? -1) - (a.possible ?? -1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materials, boms, stock]);

  const visible = useMemo(() => {
    const q = normalize(search);
    return q ? rows.filter((r) => normalize(r.name).includes(q)) : rows;
  }, [rows, search]);

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Capacidade de produção</CardTitle>
          <CardDescription>
            Com o estoque atual de componentes, quantas unidades de cada produto é possível montar (regras de
            componentes + perda).
          </CardDescription>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="w-full pl-8 sm:w-64"
            placeholder="Buscar produto"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Pode produzir</TableHead>
              <TableHead>Componente limitante</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-right">
                  {r.possible === null ? (
                    <span className="text-sm text-muted-foreground">sem regras</span>
                  ) : (
                    <Badge
                      variant="outline"
                      className={
                        r.possible > 0
                          ? "border-green-300 bg-green-100 text-green-800"
                          : "border-red-300 bg-red-100 text-red-800"
                      }
                    >
                      {r.possible} un.
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.allLimiters.length === 0 ? (
                    <span>—</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>
                        {r.limiter}
                        {r.missing > 0 && (
                          <span className="ml-2 text-amber-700">({r.missing} componente(s) zerado(s))</span>
                        )}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setLimitDialog({ name: r.name, items: r.allLimiters })}
                        title="Ver todos os componentes"
                      >
                        <ListTree className="h-4 w-4" />
                        <span className="ml-1 text-xs">{r.allLimiters.length}</span>
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
