import { useMenuDisplayName } from "@/components/cde/use-menu-names";
import { useEffect, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { DeviceMenus } from "@/components/cde/menu-layout";

export type AppNavSubmenuItem = { value: string; label: string; icon?: React.ComponentType<{ className?: string }> };

/**
 * O submenu precisa seguir o menu que está na tela: no celular vale a escolha
 * Mobile e no computador a escolha Desktop. Por isso o lado é resolvido pelo
 * próprio componente, e não apenas pela configuração de desktop.
 */
function useActiveMenu(menus: DeviceMenus): { side: "left" | "right" | null; drop: "top" | "bottom" | "left" | "right" } {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const type = isDesktop ? menus.desktop : menus.mobile;
  const side = type === "left" || type === "right" ? type : null;
  const drop = side === "left" ? "right" : side === "right" ? "left" : type === "top_tabs" ? "bottom" : "top";
  return { side, drop };
}

/**
 * Submenu de navegação do app.
 *
 * Nos menus laterais (esquerda/direita) o submenu abre abaixo do próprio item,
 * dentro do painel lateral — nunca para fora dele. Nos demais formatos (barra
 * inferior, superior, flutuante) continua como caixa suspensa.
 */
export function AppNavSubmenu({
  app,
  menus,
  label,
  item,
  className,
  active,
  items,
  isSubActive,
  onSelectSub,
  contentClassName,
}: {
  app?: string;
  menus: DeviceMenus;
  label: string;
  item: ReactNode;
  className?: string;
  active?: boolean;
  onSelectMain: () => void;
  items: AppNavSubmenuItem[];
  isSubActive: (value: string) => boolean;
  onSelectSub: (value: string) => void;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const layout = useActiveMenu(menus);
  const menuName = useMenuDisplayName(app ?? "", "Submenus");

  if (layout.side) {
    return (
      <div className="app-nav-group">
        <Button
          type="button"
          variant="ghost"
          aria-expanded={open}
          aria-current={active ? "page" : undefined}
          className={cn(className, "app-nav-group-trigger")}
          onClick={() => {
            setOpen((value) => !value);
          }}
        >
          {item}
          <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
        </Button>
        {open ? (
          <div className="app-nav-sub">
            {items.map(({ value, label: subLabel, icon: SubIcon }) => (
              <Button
                key={value}
                type="button"
                variant="ghost"
                aria-current={active && isSubActive(value) ? "page" : undefined}
                className={className}
                onClick={() => {
                  onSelectSub(value);
                  setOpen(false);
                }}
              >
                <span className="flex min-h-10 min-w-0 flex-1 flex-row items-center gap-2 px-1">
                  {SubIcon ? <span className="menu-icon"><SubIcon className="h-4 w-4 shrink-0" /></span> : null}
                  <span className="min-w-0 flex-1 truncate">{menuName(subLabel)}</span>
                  {active && isSubActive(value) ? <Check className="size-4 shrink-0" /> : null}
                </span>
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className={className} aria-current={active ? "page" : undefined}>
          {item}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={layout.drop} align="center" sideOffset={10} className={cn("max-h-[70vh] w-64 overflow-y-auto rounded-lg p-1.5 shadow-xl", contentClassName)}>
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map(({ value, label: subLabel, icon: SubIcon }) => (
          <DropdownMenuItem key={value} className="min-h-11 rounded-md" onSelect={() => onSelectSub(value)}>
            {SubIcon ? <SubIcon className="h-4 w-4" /> : null}
            <span className="flex-1">{menuName(subLabel)}</span>
            {active && isSubActive(value) ? <Check className="h-4 w-4 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
