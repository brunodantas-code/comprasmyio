import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, PackagePlus, Percent, Plus, Search, Settings, Trash2 } from "lucide-react";

type Material = { id: string; name: string; location: string; is_product: boolean };
type Bom = { id: string; product_material_id: string; component_material_id: string; quantity: number };

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

function useMaterialsAll() {
  return useQuery({
    queryKey: ["materials", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, name, location, is_product")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Material[];
    },
  });
}

function useBoms() {
  return useQuery({
    queryKey: ["product-boms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_boms")
        .select("id, product_material_id, component_material_id, quantity");
      if (error) throw error;
      return (data ?? []) as Bom[];
    },
  });
}

function QtyCell({ bom, onSave, saving }: { bom: Bom; onSave: (q: number) => void; saving: boolean }) {
  const [value, setValue] = useState(String(bom.quantity));
  const [synced, setSynced] = useState(String(bom.quantity));
  if (synced !== String(bom.quantity)) {
    setSynced(String(bom.quantity));
    setValue(String(bom.quantity));
  }
  const dirty = Number(value) !== Number(bom.quantity);
  return (
    <div className="flex items-center justify-end gap-1">
      <Input
        type="number"
        step="0.001"
        min="0.001"
        className="w-28 text-right"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {dirty && (
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => {
            const q = Number(value);
            if (!(q > 0)) return toast.error("Quantidade inválida");
            onSave(q);
          }}
          title="Salvar quantidade"
        >
          <Check className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function BomSettingsDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [newComponent, setNewComponent] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [newProductName, setNewProductName] = useState("");
  const [loss, setLoss] = useState("");

  const { data: materials } = useMaterialsAll();
  const { data: boms } = useBoms();

  const products = useMemo(
    () =>
      (materials ?? [])
        .filter((m) => m.is_product)
        .filter((m, i, arr) => arr.findIndex((x) => normalize(x.name) === normalize(m.name)) === i),
    [materials],
  );
  const components = useMemo(
    () => (materials ?? []).filter((m) => m.location === "fabrica"),
    [materials],
  );
  const nameOf = (id: string) => (materials ?? []).find((m) => m.id === id)?.name ?? "Material";

  const selected = productId || products[0]?.id || "";
  const rows = (boms ?? [])
    .filter((b) => b.product_material_id === selected)
    .filter((b) => nameOf(b.component_material_id).toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => nameOf(a.component_material_id).localeCompare(nameOf(b.component_material_id)));

  const invalidate = () => qc.invalidateQueries({ queryKey: ["product-boms"] });

  const createProduct = useMutation({
    mutationFn: async () => {
      const name = newProductName.trim();
      if (!name) throw new Error("Informe o nome do produto");
      const existing = (materials ?? []).find((m) => normalize(m.name) === normalize(name));
      if (existing) {
        if (existing.is_product && existing.location === "almoxarifado") return existing.id;
        const { error } = await supabase
          .from("materials")
          .update({ is_product: true, location: "almoxarifado" })
          .eq("id", existing.id);
        if (error) throw error;
        return existing.id;
      }
      const { data, error } = await supabase
        .from("materials")
        .insert({ name, location: "almoxarifado", is_product: true })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Produto criado");
      setNewProductName("");
      setProductId(id);
      qc.invalidateQueries({ queryKey: ["materials"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (v: { id: string; quantity: number }) => {
      const { error } = await supabase.from("product_boms").update({ quantity: v.quantity }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Quantidade atualizada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_boms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Componente removido da regra");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const add = useMutation({
    mutationFn: async () => {
      const quantity = Number(newQty);
      if (!selected) throw new Error("Selecione um produto");
      if (!newComponent) throw new Error("Selecione um componente");
      if (!(quantity > 0)) throw new Error("Quantidade inválida");
      const { error } = await supabase
        .from("product_boms")
        .insert({ product_material_id: selected, component_material_id: newComponent, quantity });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Componente adicionado");
      setNewComponent("");
      setNewQty("1");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const available = components.filter((c) => !rows.some((r) => r.component_material_id === c.id));

  const applyLoss = useMutation({
    mutationFn: async () => {
      const pct = Number(loss.replace(",", "."));
      if (!Number.isFinite(pct) || pct <= 0) throw new Error("Informe uma porcentagem de perda válida");
      const target = (boms ?? []).filter((b) => b.product_material_id === selected);
      if (!target.length) throw new Error("Nenhum componente para atualizar");
      for (const b of target) {
        const q = Math.round(Number(b.quantity) * (1 + pct / 100) * 1000) / 1000;
        const { error } = await supabase.from("product_boms").update({ quantity: q }).eq("id", b.id);
        if (error) throw error;
      }
      return target.length;
    },
    onSuccess: (n) => {
      toast.success(`Perda aplicada em ${n} componentes`);
      setLoss("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" title="Regras de componentes por produto">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Regras de componentes por produto</DialogTitle>
          <DialogDescription>
            Defina quais componentes (e quanto de cada) saem do estoque quando um produto montado é liberado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={selected} onValueChange={setProductId}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar componente"
              className="w-[200px] pl-8"
            />
          </div>
          <Badge variant="outline">{rows.length} componentes</Badge>
        </div>

        <div className="space-y-2 rounded border p-3">
          <Label>Perda (%)</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              step="0.1"
              min="0"
              value={loss}
              onChange={(e) => setLoss(e.target.value)}
              placeholder="Ex.: 20"
              className="w-32"
            />
            <Button size="sm" variant="outline" disabled={applyLoss.isPending} onClick={() => applyLoss.mutate()}>
              <Percent className="mr-1 h-4 w-4" /> Aplicar perda
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Acresce a porcentagem informada em todas as quantidades por unidade deste produto. Você pode ajustar cada
            item manualmente depois.
          </p>
        </div>

        <div className="space-y-2 rounded border p-3">
          <Label>Criar novo produto</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              placeholder="Nome do novo produto"
              className="w-[280px]"
            />
            <Button size="sm" disabled={createProduct.isPending} onClick={() => createProduct.mutate()}>
              <PackagePlus className="mr-1 h-4 w-4" /> Criar produto
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            O produto entra na lista de "Liberar produto montado" e segue o fluxo normal de homologação e estoque.
          </p>
        </div>

        <div className="rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Componente</TableHead>
                <TableHead className="text-right">Qtd. por unidade</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">
                    Nenhum componente cadastrado para este produto.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{nameOf(b.component_material_id)}</TableCell>
                    <TableCell className="text-right">
                      <QtyCell
                        bom={b}
                        saving={update.isPending}
                        onSave={(q) => update.mutate({ id: b.id, quantity: q })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(b.id)}
                        title="Remover"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-2 rounded border p-3">
          <Label>Adicionar componente à regra</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={newComponent} onValueChange={setNewComponent}>
              <SelectTrigger className="w-[280px]"><SelectValue placeholder="Componente do estoque da fábrica" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {available.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              step="0.001"
              min="0.001"
              className="w-28"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
            />
            <Button size="sm" disabled={add.isPending} onClick={() => add.mutate()}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Componentes novos devem ser criados antes em Estoque — Fábrica.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
