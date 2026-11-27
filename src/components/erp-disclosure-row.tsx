import { useState, type ReactNode } from "react";
import { CdeDisclosureIcon } from "@/components/cde/cde-button";
import { Button } from "@/components/ui/button";
import { AccessUserRow } from "@/components/access/access-user-row";

/** Linha com nome à esquerda e seta de Exibir/Recolher à direita, no padrão dos Acessos. */
export function ErpDisclosureRow({
  name,
  meta,
  badge,
  actions,
  label,
  screen,
  defaultOpen = false,
  open,
  onOpenChange,
  children,
}: {
  name: string;
  meta?: string | null;
  badge?: ReactNode;
  actions?: ReactNode;
  label: string;
  screen: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const [internal, setInternal] = useState(defaultOpen);
  const isOpen = open ?? internal;
  const toggle = () => (onOpenChange ?? setInternal)(!isOpen);
  return (
    <AccessUserRow
      name={name}
      email={meta}
      badges={badge}
      controls={
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          <Button
            type="button"
            size="compactIcon"
            variant="ghost"
            className="shrink-0"
            aria-label={`${isOpen ? "Recolher" : "Exibir"} ${label}`}
            aria-expanded={isOpen}
            onClick={toggle}
          >
            <CdeDisclosureIcon open={isOpen} screen={screen} />
          </Button>
        </div>
      }
      details={isOpen ? <div className="space-y-3">{children}</div> : null}
    />
  );
}
