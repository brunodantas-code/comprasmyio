import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AlertTriangle, Camera, ImageUp, PackageCheck, Pencil, Search, Trash2 } from "lucide-react";
import { HomologateDialog, useHomologations } from "@/components/homologation";
const BUCKET = "assembly-photos";

type MaterialRow = { id: string; name: string };

function useAlmoxarifadoMaterials() {
  return useQuery({
    queryKey: ["materials", "almoxarifado", "products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, name")
        .eq("location", "almoxarifado")
        .eq("is_product", true)
        .neq("is_manufactured", false)
        .order("name");
      if (error) throw error;
      return (data ?? []) as MaterialRow[];
    },
  });
}

function useProfilesList() {
  return useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email").order("full_name");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string | null; email: string | null }[];
    },
  });
}

export function useAssemblyReleases() {
  return useQuery({
    queryKey: ["assembly-releases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assembly_releases")
        .select("id, photo_url, responsibles, notes, created_by, created_at, assembly_release_items(id, quantity, material_id)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ---------------- Divergências de quantidade ---------------- */

export type ReleaseIssue = {
  id: string;
  release_id: string;
  item_id: string | null;
  material_id: string | null;
  reported_quantity: number | null;
  message: string;
  status: string;
  resolution_note: string | null;
  reported_by: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

export function useReleaseIssues() {
  return useQuery({
    queryKey: ["assembly-release-issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assembly_release_issues")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReleaseIssue[];
    },
  });
}

type ReleaseItem = { id: string; quantity: number; material_id: string };

function ReportIssueDialog({
  release,
  materialNames,
  userId,
}: {
  release: { id: string; assembly_release_items?: ReleaseItem[] | null };
  materialNames: Record<string, string>;
  userId: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const items = release.assembly_release_items ?? [];
  const [itemId, setItemId] = useState<string>("");
  const [qtyValue, setQtyValue] = useState("");
  const [message, setMessage] = useState("");

  const report = useMutation({
    mutationFn: async () => {
      if (!message.trim()) throw new Error("Descreva a divergência encontrada");
      const item = items.find((i) => i.id === itemId) ?? null;
      const qty = qtyValue.trim() === "" ? null : Number(qtyValue);
      if (qty !== null && (!Number.isInteger(qty) || qty < 0)) throw new Error("Quantidade correta inválida");
      const { error } = await supabase.from("assembly_release_issues").insert({
        release_id: release.id,
        item_id: item?.id ?? null,
        material_id: item?.material_id ?? null,
        reported_quantity: qty,
        message: message.trim(),
        reported_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Divergência sinalizada para a fábrica");
      qc.invalidateQueries({ queryKey: ["assembly-release-issues"] });
      setOpen(false);
      setItemId("");
      setQtyValue("");
      setMessage("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Sinalizar divergência" className="h-8 w-8 p-0">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sinalizar divergência</DialogTitle>
          <DialogDescription>
            Avise a fábrica quando a quantidade recebida não bater com a liberada. A fábrica corrige e o estoque é
            ajustado automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Produto (opcional)</Label>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
            >
              <option value="">Toda a liberação</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {materialNames[i.material_id] ?? "Produto"} — liberado {i.quantity}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="issue-qty">Quantidade correta (opcional)</Label>
            <Input
              id="issue-qty"
              type="number"
              min={0}
              value={qtyValue}
              onChange={(e) => setQtyValue(e.target.value)}
              placeholder="Ex.: 8"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issue-msg">O que foi encontrado</Label>
            <Textarea
              id="issue-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex.: chegaram 8 unidades, mas foram liberadas 10"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={report.isPending} onClick={() => report.mutate()}>
            {report.isPending ? "Enviando..." : "Sinalizar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CorrectReleaseDialog({
  release,
  materialNames,
  issues,
  userId,
  minQuantities,
}: {
  release: { id: string; assembly_release_items?: ReleaseItem[] | null };
  materialNames: Record<string, string>;
  issues: ReleaseIssue[];
  userId: string;
  minQuantities: Record<string, number>;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const items = release.assembly_release_items ?? [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");

  const openIssues = issues.filter((i) => i.status === "aberta");

  function start(o: boolean) {
    setOpen(o);
    if (o) {
      setValues(Object.fromEntries(items.map((i) => [i.id, String(i.quantity)])));
      setNote("");
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      const changes = items
        .map((i) => ({ item: i, next: Number(values[i.id] ?? i.quantity) }))
        .filter((c) => Number.isInteger(c.next) && c.next !== c.item.quantity);
      if (!changes.length && !openIssues.length) throw new Error("Nenhuma alteração informada");

      for (const c of changes) {
        if (c.next < 1) throw new Error("A quantidade corrigida deve ser no mínimo 1");
        const min = minQuantities[c.item.id] ?? 0;
        if (c.next < min)
          throw new Error(
            `${materialNames[c.item.material_id] ?? "Produto"}: já foram homologadas ${min} unidades, não é possível reduzir abaixo disso`,
          );
      }

      if (changes.length) {
        // ajusta o consumo de componentes conforme a diferença
        const productIds = changes.map((c) => c.item.material_id);
        const { data: boms, error: bomErr } = await supabase
          .from("product_boms")
          .select("product_material_id, component_material_id, quantity")
          .in("product_material_id", productIds);
        if (bomErr) throw bomErr;
        const { data: lossRows } = await supabase
          .from("materials")
          .select("id, loss_percent")
          .in("id", productIds);
        const lossOf = (id: string) => Number(lossRows?.find((l) => l.id === id)?.loss_percent ?? 0);

        const delta = new Map<string, number>();
        for (const b of boms ?? []) {
          const change = changes.find((c) => c.item.material_id === b.product_material_id);
          if (!change) continue;
          const diff = change.next - change.item.quantity;
          const total = Number(b.quantity) * diff * (1 + lossOf(b.product_material_id) / 100);
          if (total !== 0) {
            delta.set(b.component_material_id, (delta.get(b.component_material_id) ?? 0) + total);
          }
        }

        const movements = [...delta.entries()]
          .map(([material_id, q]) => ({ material_id, q: Math.round(q * 1000) / 1000 }))
          .filter((m) => m.q !== 0)
          .map((m) => ({
            material_id: m.material_id,
            quantity: Math.abs(m.q),
            type: (m.q > 0 ? "saida" : "entrada") as "saida" | "entrada",
            reason: "Correção de liberação de montagem",
            created_by: userId,
          }));
        if (movements.length) {
          const { error: movErr } = await supabase.from("stock_movements").insert(movements);
          if (movErr) throw movErr;
        }

        for (const c of changes) {
          const { error } = await supabase
            .from("assembly_release_items")
            .update({ quantity: c.next })
            .eq("id", c.item.id);
          if (error) throw error;
        }
      }

      if (openIssues.length) {
        const { error } = await supabase
          .from("assembly_release_issues")
          .update({
            status: "resolvida",
            resolution_note: note.trim() || null,
            resolved_by: userId,
            resolved_at: new Date().toISOString(),
          })
          .in("id", openIssues.map((i) => i.id));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Liberação corrigida");
      qc.invalidateQueries({ queryKey: ["assembly-releases"] });
      qc.invalidateQueries({ queryKey: ["assembly-release-issues"] });
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={start}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Corrigir quantidades" className="h-8 w-8 p-0">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Corrigir quantidades liberadas</DialogTitle>
          <DialogDescription>
            O consumo de componentes da fábrica é ajustado automaticamente pela diferença.
          </DialogDescription>
        </DialogHeader>

        {openIssues.length > 0 && (
          <div className="space-y-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
            <p className="font-medium text-amber-800">Divergências sinalizadas pelo estoque</p>
            {openIssues.map((i) => (
              <p key={i.id} className="text-amber-900">
                {i.material_id ? `${materialNames[i.material_id] ?? "Produto"}: ` : ""}
                {i.message}
                {i.reported_quantity !== null ? ` (quantidade correta: ${i.reported_quantity})` : ""}
              </p>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3 rounded border px-3 py-2">
              <span className="text-sm">{materialNames[i.material_id] ?? "Produto"}</span>
              <Input
                type="number"
                min={Math.max(minQuantities[i.id] ?? 1, 1)}
                className="w-24"
                value={values[i.id] ?? ""}
                onChange={(e) => setValues((p) => ({ ...p, [i.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="correction-note">Observação da correção</Label>
          <Textarea
            id="correction-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: contagem conferida, quantidade ajustada para 8"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Salvando..." : "Salvar correção"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReleaseAssembledDialog({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [qty, setQty] = useState<Record<string, string>>({});
  const [people, setPeople] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const { data: materials } = useAlmoxarifadoMaterials();
  const { data: profiles } = useProfilesList();

  const filtered = useMemo(
    () =>
      (materials ?? [])
        .filter((m) => m.name.toLowerCase().includes(search.trim().toLowerCase())),
    [materials, search],
  );

  function reset() {
    setQty({});
    setPeople([]);
    setFile(null);
    setNotes("");
    setSearch("");
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  const save = useMutation({
    mutationFn: async () => {
      const items = Object.entries(qty)
        .map(([material_id, v]) => ({ material_id, quantity: Number(v) }))
        .filter((i) => Number.isInteger(i.quantity) && i.quantity > 0);
      if (!items.length) throw new Error("Selecione ao menos um produto com quantidade");
      if (!people.length) throw new Error("Selecione ao menos um responsável pela montagem");
      if (!file) throw new Error("Anexe a foto dos produtos montados");

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) throw upErr;

      const { data: release, error } = await supabase
        .from("assembly_releases")
        .insert({ photo_url: path, responsibles: people, notes: notes.trim() || null, created_by: userId })
        .select("id")
        .single();
      if (error) throw error;

      const { error: itemsErr } = await supabase
        .from("assembly_release_items")
        .insert(items.map((i) => ({ ...i, release_id: release.id })));
      if (itemsErr) throw itemsErr;

      // Abate a fila de produção conforme o que foi liberado (FIFO por produto)
      for (const it of items) {
        const name = (materials ?? []).find((m) => m.id === it.material_id)?.name;
        if (!name) continue;
        const { data: demands, error: dErr } = await supabase
          .from("production_demands")
          .select("id, product, quantity")
          .eq("status", "pendente")
          .ilike("product", name.trim())
          .order("created_at", { ascending: true });
        if (dErr) throw dErr;
        let remaining = it.quantity;
        for (const d of demands ?? []) {
          if (remaining <= 0) break;
          if (d.quantity <= remaining) {
            remaining -= d.quantity;
            const { error } = await supabase
              .from("production_demands")
              .update({ status: "concluido" })
              .eq("id", d.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("production_demands")
              .update({ quantity: d.quantity - remaining })
              .eq("id", d.id);
            if (error) throw error;
            remaining = 0;
          }
        }
      }

      // Baixa automática dos componentes conforme a ficha técnica (BOM)
      const { data: boms, error: bomErr } = await supabase
        .from("product_boms")
        .select("product_material_id, component_material_id, quantity")
        .in("product_material_id", items.map((i) => i.material_id));
      if (bomErr) throw bomErr;

      const consumption = new Map<string, number>();
      const { data: lossRows } = await supabase
        .from("materials")
        .select("id, loss_percent")
        .in("id", items.map((i) => i.material_id));
      const lossOf = (id: string) => Number(lossRows?.find((l) => l.id === id)?.loss_percent ?? 0);
      for (const b of boms ?? []) {
        const produced = items.find((i) => i.material_id === b.product_material_id)?.quantity ?? 0;
        const total = Number(b.quantity) * produced * (1 + lossOf(b.product_material_id) / 100);
        if (total > 0) {
          consumption.set(
            b.component_material_id,
            (consumption.get(b.component_material_id) ?? 0) + total,
          );
        }
      }

      if (consumption.size) {
        const { error: movErr } = await supabase.from("stock_movements").insert(
          [...consumption.entries()].map(([material_id, quantity]) => ({
            material_id,
            quantity: Math.round(quantity * 1000) / 1000,
            type: "saida" as const,
            reason: "Consumo de montagem",
            created_by: userId,
          })),
        );
        if (movErr) throw movErr;
      }
    },
    onSuccess: () => {
      toast.success("Produto montado liberado");
      qc.invalidateQueries({ queryKey: ["assembly-releases"] });
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["production-demands"] });
      qc.invalidateQueries({ queryKey: ["demand-resolved-items"] });
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
          <PackageCheck className="mr-1 h-4 w-4" /> Liberar Produto Montado
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Liberar produto montado</DialogTitle>
          <DialogDescription>Todos os campos são obrigatórios.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label>Produtos e quantidades</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto do estoque"
                className="pl-8"
              />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded border p-2">
              {!filtered.length ? (
                <p className="p-2 text-sm text-muted-foreground">Nenhum produto encontrado no estoque.</p>
              ) : (
                filtered.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded px-2 py-1 hover:bg-muted/50">
                    <span className="text-sm">{m.name}</span>
                    <Input
                      type="number"
                      min={0}
                      className="w-24"
                      value={qty[m.id] ?? ""}
                      onChange={(e) => setQty((p) => ({ ...p, [m.id]: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Responsáveis pela montagem</Label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded border p-2">
              {(profiles ?? []).map((p) => {
                const checked = people.includes(p.id);
                return (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted/50">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) =>
                        setPeople((prev) => (v ? [...prev, p.id] : prev.filter((id) => id !== p.id)))
                      }
                    />
                    <span className="text-sm">{p.full_name || p.email || p.id}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Foto dos produtos montados</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => cameraRef.current?.click()}>
                <Camera className="mr-1 h-4 w-4" /> Tirar foto
              </Button>
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <ImageUp className="mr-1 h-4 w-4" /> Escolher da galeria
              </Button>
            </div>
            {file ? (
              <div className="flex items-center gap-3 rounded border p-2">
                <img
                  src={URL.createObjectURL(file)}
                  alt="Pré-visualização"
                  className="h-16 w-16 rounded border object-cover"
                />
                <span className="truncate text-sm text-muted-foreground">{file.name}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => {
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                    if (cameraRef.current) cameraRef.current.value = "";
                  }}
                >
                  Remover
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma foto selecionada.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="assembly-notes">Observações</Label>
            <Textarea
              id="assembly-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes da montagem"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={save.isPending} className="bg-blue-600 text-white hover:bg-blue-700">
              {save.isPending ? "Liberando..." : "Liberar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PhotoCell({ path }: { path: string }) {
  const { data: url } = useQuery({
    queryKey: ["assembly-photo", path],
    queryFn: async () => {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
      return data?.signedUrl ?? null;
    },
  });
  const [open, setOpen] = useState(false);
  if (!url) return <span className="text-muted-foreground">—</span>;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <img src={url} alt="Produtos montados" className="h-12 w-12 cursor-pointer rounded border object-cover" />
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Produtos montados</DialogTitle>
        </DialogHeader>
        <img src={url} alt="Produtos montados" className="max-h-[70vh] w-full rounded object-contain" />
      </DialogContent>
    </Dialog>
  );
}

function DeleteReleaseDialog({ release }: { release: { id: string; photo_url: string; created_at: string } }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);

  const remove = useMutation({
    mutationFn: async () => {
      if (text.trim().toLowerCase() !== "excluir") throw new Error('Digite "excluir" para confirmar');
      setPending(true);
      // Remove homologações associadas (a tabela tem ON DELETE CASCADE, mas garantimos)
      await supabase.from("homologations").delete().eq("release_id", release.id);
      // Itens da liberação (cascade, mas explícito por segurança)
      await supabase.from("assembly_release_items").delete().eq("release_id", release.id);
      // Registro principal
      const { error } = await supabase.from("assembly_releases").delete().eq("id", release.id);
      if (error) throw error;
      // Foto do storage (best-effort)
      await supabase.storage.from(BUCKET).remove([release.photo_url]);
    },
    onSuccess: () => {
      toast.success("Liberação excluída");
      qc.invalidateQueries({ queryKey: ["assembly-releases"] });
      qc.invalidateQueries({ queryKey: ["material-stock"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["homologations"] });
      setOpen(false);
      setText("");
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setPending(false),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setText(""); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Excluir liberação" className="h-8 w-8 p-0">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir liberação</DialogTitle>
          <DialogDescription>
            A liberação de {new Date(release.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            {" "}será removida junto com seus itens e homologações associadas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="delete-confirm">Digite "excluir" para confirmar</Label>
          <Input
            id="delete-confirm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="excluir"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={pending || text.trim().toLowerCase() !== "excluir"}
            onClick={() => remove.mutate()}
          >
            {pending ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AssemblyReleasesCard({
  materialNames,
  title = "Produtos montados liberados",
  description = "Histórico de liberações da fábrica.",
  userId,
  homologable = false,
  canDelete = false,
  canReportIssue = false,
  canCorrect = false,
}: {
  materialNames: Record<string, string>;
  title?: string;
  description?: string;
  userId?: string;
  homologable?: boolean;
  canDelete?: boolean;
  canReportIssue?: boolean;
  canCorrect?: boolean;
}) {
  const { data: releases } = useAssemblyReleases();
  const { data: profiles } = useProfilesList();
  const { data: homologations } = useHomologations();
  const { data: issues } = useReleaseIssues();
  const issuesFor = (releaseId: string) => (issues ?? []).filter((i) => i.release_id === releaseId);
  const homologatedFor = (releaseId: string, materialId: string) =>
    (homologations ?? [])
      .filter((h) => h.release_id === releaseId && h.material_id === materialId)
      .reduce((a, h) => a + (h.homologation_units?.length ?? 0), 0);
  const nameOf = (id: string) => {
    const p = (profiles ?? []).find((x) => x.id === id);
    return p?.full_name || p?.email || "Usuário";
  };

  // Na aba de homologação, omite liberações já totalmente homologadas para manter a lista limpa
  const visibleReleases = (releases ?? []).filter((r) => {
    if (!homologable) return true;
    const items = r.assembly_release_items ?? [];
    if (!items.length) return true;
    return items.some((i) => Math.max(i.quantity - homologatedFor(r.id, i.material_id), 0) > 0);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {!visibleReleases.length ? (
          <p className="text-sm text-muted-foreground">Nenhum produto liberado até o momento.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Responsáveis</TableHead>
                <TableHead>Foto</TableHead>
                <TableHead>Observações</TableHead>
                {(canDelete || canReportIssue || canCorrect) && <TableHead className="w-28">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleReleases.map((r) => {
                const relIssues = issuesFor(r.id);
                const openIssues = relIssues.filter((i) => i.status === "aberta");
                return (
                <TableRow key={r.id} className={openIssues.length ? "bg-amber-50/70" : undefined}>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(r.assembly_release_items ?? []).map((i) => {
                        const remaining = Math.max(i.quantity - homologatedFor(r.id, i.material_id), 0);
                        const label = homologable
                          ? `${materialNames[i.material_id] ?? "Produto"} × ${remaining}`
                          : `${materialNames[i.material_id] ?? "Produto"} × ${i.quantity}`;
                        if (!homologable || !userId || remaining <= 0) {
                          return (
                            <Badge key={i.id} variant="outline" className={homologable && remaining <= 0 ? "opacity-50 line-through" : undefined}>
                              {homologable && remaining <= 0 ? `${materialNames[i.material_id] ?? "Produto"} · homologado` : label}
                            </Badge>
                          );
                        }
                        return (
                          <HomologateDialog
                            key={i.id}
                            releaseId={r.id}
                            materialId={i.material_id}
                            materialName={materialNames[i.material_id] ?? "Produto"}
                            quantity={i.quantity}
                            userId={userId}
                            trigger={
                              <button type="button" title="Homologar produto">
                                <Badge
                                  variant="outline"
                                  className="cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                                >
                                  {label}
                                </Badge>
                              </button>
                            }
                          />
                        );
                      })}
                    </div>
                    {openIssues.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {openIssues.map((i) => (
                          <p key={i.id} className="flex items-start gap-1 text-xs text-amber-700">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>
                              {i.message}
                              {i.reported_quantity !== null ? ` — correto: ${i.reported_quantity}` : ""}
                            </span>
                          </p>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{(r.responsibles ?? []).map(nameOf).join(", ")}</TableCell>
                  <TableCell><PhotoCell path={r.photo_url} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.notes ?? "—"}</TableCell>
                  {(canDelete || canReportIssue || canCorrect) && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canReportIssue && userId && (
                          <ReportIssueDialog release={r} materialNames={materialNames} userId={userId} />
                        )}
                        {canCorrect && userId && (
                          <CorrectReleaseDialog
                            release={r}
                            materialNames={materialNames}
                            issues={relIssues}
                            userId={userId}
                            minQuantities={Object.fromEntries(
                              (r.assembly_release_items ?? []).map((i) => [
                                i.id,
                                homologatedFor(r.id, i.material_id),
                              ]),
                            )}
                          />
                        )}
                        {canDelete && <DeleteReleaseDialog release={r} />}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
