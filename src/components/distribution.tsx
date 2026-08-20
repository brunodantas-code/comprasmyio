import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ItemDeliveriesDialog } from "@/components/myio-delivery-qr";
import { CheckCircle2, Loader2, Truck } from "lucide-react";
import { toast } from "sonner";

type DistOrder = {
  id: string;
  title: string;
  client_name: string;
  delivery_date: string;
  status: string;
  notes: string | null;
  is_replacement: boolean | null;
  projects: { name: string } | null;
  myio_order_items: { id: string; product: string; quantity: number }[];
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

export function DistributionCard() {
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["myio-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("myio_orders")
        .select(
          "id, title, client_name, delivery_date, status, notes, is_replacement, projects(name), myio_order_items(id, product, quantity)",
        )
        .eq("status", "pronto_entrega")
        .order("delivery_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as DistOrder[];
    },
  });

  const deliver = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("myio_orders")
        .update({ status: "entregue_cliente" })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido entregue ao cliente.");
      queryClient.invalidateQueries({ queryKey: ["myio-distribution"] });
      queryClient.invalidateQueries({ queryKey: ["myio-orders"] });
      queryClient.invalidateQueries({ queryKey: ["myio-demand"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao concluir entrega"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Distribuição
        </CardTitle>
        <CardDescription>
          Pedidos com todos os produtos separados e prontos para entrega. Confirme a saída para o cliente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !orders?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum pedido pronto para distribuição.</p>
        ) : (
          orders.map((o) => (
            <div key={o.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{o.projects?.name || o.title}</span>
                <Badge variant="outline">{o.client_name}</Badge>
                <Badge variant="outline">Entrega {formatDate(o.delivery_date)}</Badge>
                <Badge variant="outline" className="border-blue-300 bg-blue-100 text-blue-800">
                  Pronto para entrega
                </Badge>
                {o.is_replacement && (
                  <Badge variant="outline" className="border-orange-300 bg-orange-100 text-orange-800">
                    Reposição
                  </Badge>
                )}
                <Button
                  size="sm"
                  className="ml-auto"
                  disabled={deliver.isPending}
                  onClick={() => deliver.mutate(o.id)}
                >
                  {deliver.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Entregue ao cliente
                </Button>
              </div>
              {o.notes && <p className="text-xs text-muted-foreground">{o.notes}</p>}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-28">Quantidade</TableHead>
                    <TableHead className="w-40">Baixa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {o.myio_order_items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.product}</TableCell>
                      <TableCell className="font-medium">{i.quantity}</TableCell>
                      <TableCell>
                        <ItemDeliveriesDialog
                          orderItemId={i.id}
                          product={i.product}
                          trigger={
                            <Badge
                              variant="outline"
                              className="cursor-pointer border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            >
                              Ver baixa
                            </Badge>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
