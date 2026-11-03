import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { splitCount } from "@/lib/mytosis-split";
import type { MytosisNode } from "@/lib/mytosis";

export function SplitDialog({ node, onClose, onCreated }: { node: MytosisNode | null; onClose: () => void; onCreated: (id: string) => void }) {
  const [count, setCount] = useState("3");
  const client = useQueryClient();
  useEffect(() => { if (node) setCount("3"); }, [node?.id]);
  const create = useMutation({
    mutationFn: async () => {
      if (!node) throw new Error("Box não encontrado.");
      const { data, error } = await supabase.rpc("split_mytosis_node", { _node_id: node.id, _count: splitCount(count) });
      if (error) throw error;
      return data;
    },
    onSuccess: async (ids) => {
      await client.invalidateQueries({ queryKey: ["mytosis"] });
      if (node) onCreated(node.id);
      toast.success(`${ids.length} etapas criadas.`);
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return <Dialog open={!!node} onOpenChange={(open) => { if (!open && !create.isPending) onClose(); }}>
    <DialogContent className="sm:max-w-sm">
      <DialogHeader><DialogTitle className="pr-6 font-normal">Dividir próxima etapa</DialogTitle><DialogDescription>{node?.title}</DialogDescription></DialogHeader>
      <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); if (!create.isPending) create.mutate(); }}>
        <div className="grid gap-2"><Label htmlFor="split-count">Quantas etapas devem ser criadas?</Label><Input id="split-count" type="number" min={1} max={100} step={1} value={count} onChange={(event) => setCount(event.target.value)} autoFocus disabled={create.isPending} /></div>
        <DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={onClose} disabled={create.isPending}>Cancelar</Button><Button type="submit" variant="outline" disabled={create.isPending}>{create.isPending ? "Criando…" : "Confirmar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}