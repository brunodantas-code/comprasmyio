import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { BORDERS, LINK_STYLES, ConnectorGlyph } from "./shapes";
import { cn } from "@/lib/utils";
import type { MytosisLink } from "@/lib/mytosis";

export function ConnectorDialog({ link, onClose, label }: { link: MytosisLink | null; onClose: () => void; label: string }) {
  const client = useQueryClient();
  const [style, setStyle] = useState("arrow");
  const [color, setColor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { setStyle(link?.style ?? "arrow"); setColor(link?.color ?? null); setConfirm(false); }, [link]);
  const save = useMutation({ mutationFn: async (remove: boolean) => {
    if (!link) return;
    const operation = remove ? supabase.from("mytosis_links").delete() : supabase.from("mytosis_links").update({ style, color });
    const { error } = await operation.eq("predecessor_id", link.predecessor_id).eq("successor_id", link.successor_id);
    if (error) throw error;
  }, onSuccess: async () => { await client.invalidateQueries({ queryKey: ["mytosis"] }); onClose(); }, onError: (e: Error) => toast.error(e.message) });
  return <Dialog open={!!link} onOpenChange={(open) => !open && onClose()}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{confirm ? "Excluir conexão?" : "Conector"}</DialogTitle><DialogDescription>{label}</DialogDescription></DialogHeader>
    {confirm ? <p className="text-sm">Esta dependência será removida. Os boxes serão mantidos.</p> : <div className="space-y-4"><div className="space-y-2"><p className="text-sm text-muted-foreground">Tipo</p><div className="flex flex-wrap gap-2">{LINK_STYLES.map((option) => <Button key={option.key} variant="outline" aria-pressed={style === option.key} className={cn(style === option.key && "!bg-primary !text-primary-foreground")} onClick={() => setStyle(option.key)}><ConnectorGlyph style={option.key} color="currentColor" />{option.label}</Button>)}</div></div><div className="space-y-2"><p className="text-sm text-muted-foreground">Cor</p><div className="flex flex-wrap gap-2">{BORDERS.map((option) => <Button key={option.key} variant="outline" size="icon" title={option.label} aria-label={option.label} aria-pressed={color === option.key} className={cn(color === option.key && "ring-2 ring-primary ring-offset-2")} onClick={() => setColor(option.key)}><svg width="24" height="24" aria-hidden><circle cx="12" cy="12" r="9" fill={option.color} /></svg></Button>)}</div></div></div>}
    <DialogFooter className="gap-2">{confirm ? <><Button variant="outline" onClick={() => setConfirm(false)}>Cancelar</Button><Button variant="outline" disabled={save.isPending} onClick={() => save.mutate(true)}>Confirmar exclusão</Button></> : <><Button variant="outline" onClick={() => setConfirm(true)}>Excluir</Button><Button variant="outline" onClick={onClose}>Cancelar</Button><Button variant="outline" disabled={save.isPending} onClick={() => save.mutate(false)}>Salvar</Button></>}</DialogFooter>
  </DialogContent></Dialog>;
}