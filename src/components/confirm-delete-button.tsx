import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ConfirmDeleteButton({ title, description, onConfirm, pending = false, ariaLabel = "Excluir", confirmLabel = "Excluir definitivamente", pendingLabel = "Excluindo...", equalActions = false, trigger }: {
  title: string;
  description: ReactNode;
  onConfirm: () => void;
  pending?: boolean;
  ariaLabel?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  equalActions?: boolean;
  trigger?: ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button type="button" size="compactIcon" variant="ghost" className="text-destructive hover:text-destructive" title={ariaLabel} aria-label={ariaLabel}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={equalActions ? "grid grid-cols-2 gap-3 space-x-0" : undefined}>
          <AlertDialogCancel className={equalActions ? "mt-0 w-full" : undefined}>Cancelar</AlertDialogCancel>
          <AlertDialogAction className={equalActions ? "w-full" : undefined} disabled={pending} onClick={onConfirm}>
            {pending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}