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
import { Camera, ImageUp, PackageCheck, Search } from "lucide-react";
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

      // Baixa automática dos componentes conforme a ficha técnica (BOM)
      const { data: boms, error: bomErr } = await supabase
        .from("product_boms")
        .select("product_material_id, component_material_id, quantity")
        .in("product_material_id", items.map((i) => i.material_id));
      if (bomErr) throw bomErr;

      const consumption = new Map<string, number>();
      for (const b of boms ?? []) {
        const produced = items.find((i) => i.material_id === b.product_material_id)?.quantity ?? 0;
        const total = Number(b.quantity) * produced;
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
                placeholder="Buscar produto do almoxarifado"
                className="pl-8"
              />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded border p-2">
              {!filtered.length ? (
                <p className="p-2 text-sm text-muted-foreground">Nenhum produto encontrado no almoxarifado.</p>
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

export function AssemblyReleasesCard({
  materialNames,
  title = "Produtos montados liberados",
  description = "Histórico de liberações da fábrica.",
  userId,
  homologable = false,
}: {
  materialNames: Record<string, string>;
  title?: string;
  description?: string;
  userId?: string;
  homologable?: boolean;
}) {
  const { data: releases } = useAssemblyReleases();
  const { data: profiles } = useProfilesList();
  const { data: homologations } = useHomologations();
  const homologatedFor = (releaseId: string, materialId: string) =>
    (homologations ?? [])
      .filter((h) => h.release_id === releaseId && h.material_id === materialId)
      .reduce((a, h) => a + (h.homologation_units?.length ?? 0), 0);
  const nameOf = (id: string) => {
    const p = (profiles ?? []).find((x) => x.id === id);
    return p?.full_name || p?.email || "Usuário";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {!releases?.length ? (
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {releases.map((r) => (
                <TableRow key={r.id}>
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
                  </TableCell>
                  <TableCell className="text-sm">{(r.responsibles ?? []).map(nameOf).join(", ")}</TableCell>
                  <TableCell><PhotoCell path={r.photo_url} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.notes ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
