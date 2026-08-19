import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList } from "lucide-react";

type DemandOrder = {
  id: string;
  delivery_date: string;
  status: string;
  notes: string | null;
  is_replacement: boolean | null;
  projects: { name: string } | null;
  myio_order_items: { id: string; product: string; quantity: number }[];
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  produzindo: "Produzindo",
  pronto_entrega: "Pronto para entrega",
  entregue_cliente: "Entregue para o cliente",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

export function MyioDemandCard({ balances }: { balances: Record<string, number> }) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["myio-demand"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("myio_orders")
        .select("id, delivery_date, status, notes, is_replacement, projects(name), myio_order_items(id, product, quantity)")
        .neq("status", "entregue_cliente")
        .order("delivery_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as DemandOrder[];
    },
  });

  const list = (orders ?? []).filter((o) => o.myio_order_items.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Demanda dos pedidos Myio
        </CardTitle>
        <CardDescription>
          Materiais exigidos por projeto, em ordem de data de entrega. Dê baixa no estoque conforme separar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma demanda pendente.</p>
        ) : (
          list.map((o) => (
            <div key={o.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{o.projects?.name || "Sem projeto"}</span>
                <Badge variant="outline">Entrega {formatDate(o.delivery_date)}</Badge>
                <Badge variant="secondary">{STATUS_LABELS[o.status] ?? o.status}</Badge>
                {o.is_replacement && (
                  <Badge variant="outline" className="border-orange-300 bg-orange-100 text-orange-800">Reposição</Badge>
                )}
              </div>
              {o.notes && <p className="text-xs text-muted-foreground">{o.notes}</p>}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-28">Exigido</TableHead>
                    <TableHead className="w-32">Em estoque</TableHead>
                    <TableHead className="w-32">Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {o.myio_order_items.map((i) => {
                    const bal = balances[i.product.trim().toLowerCase()] ?? 0;
                    const ok = bal >= i.quantity;
                    return (
                      <TableRow key={i.id}>
                        <TableCell>{i.product}</TableCell>
                        <TableCell className="font-medium">{i.quantity}</TableCell>
                        <TableCell>{bal}</TableCell>
                        <TableCell>
                          {ok ? (
                            <Badge variant="outline" className="border-green-300 bg-green-100 text-green-800">Disponível</Badge>
                          ) : (
                            <Badge variant="outline" className="border-red-300 bg-red-100 text-red-800">
                              Faltam {i.quantity - bal}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
