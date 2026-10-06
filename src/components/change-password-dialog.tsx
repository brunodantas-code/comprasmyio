import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  function close(value: boolean) {
    if (!value) { setCurrent(""); setNext(""); setConfirm(""); }
    onOpenChange(value);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (next.length < 8) return toast.error("A nova senha deve ter pelo menos 8 caracteres.");
    if (next !== confirm) return toast.error("A confirmação não confere com a nova senha.");
    if (next === current) return toast.error("A nova senha deve ser diferente da atual.");
    setSaving(true);
    try {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (!email) throw new Error("Sessão não encontrada.");
      const { error: checkError } = await supabase.auth.signInWithPassword({ email, password: current });
      if (checkError) throw new Error("Senha atual incorreta.");
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      toast.success("Senha alterada com sucesso.");
      close(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar a senha.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Alterar senha</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="pw-current">Senha atual</Label><Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></div>
          <div className="space-y-1.5"><Label htmlFor="pw-next">Nova senha</Label><Input id="pw-next" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} /></div>
          <div className="space-y-1.5"><Label htmlFor="pw-confirm">Confirmar nova senha</Label><Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button type="button" variant="action" onClick={() => close(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="action" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
