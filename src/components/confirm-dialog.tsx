import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Request = { message: string; title: string; confirmLabel: string; resolve: (ok: boolean) => void };
let push: ((r: Request) => void) | null = null;

/** Replaces window.confirm with the ERP confirmation dialog (CDE "Mensagens de confirmação"). */
export function confirmAction(message: string, opts: { title?: string; confirmLabel?: string } = {}): Promise<boolean> {
  const title = opts.title ?? (/^(excluir|remover)/i.test(message) ? "Confirmar exclusão" : "Confirmar");
  const confirmLabel = opts.confirmLabel ?? "Confirmar";
  if (!push) return Promise.resolve(typeof window !== "undefined" && window.confirm(message));
  return new Promise((resolve) => push!({ message, title, confirmLabel, resolve }));
}

/** Mounted once in the root layout. */
export function ConfirmDialogHost() {
  const [req, setReq] = useState<Request | null>(null);
  useEffect(() => { push = setReq; return () => { push = null; }; }, []);
  const close = (ok: boolean) => { req?.resolve(ok); setReq(null); };
  return (
    <AlertDialog open={!!req} onOpenChange={(o) => { if (!o) close(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{req?.title}</AlertDialogTitle>
          <AlertDialogDescription>{req?.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => close(true)}>{req?.confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
