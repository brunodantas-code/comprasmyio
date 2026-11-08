import { usePendingActions } from "@/hooks/use-pending-actions";
import { activeTheme, toggleAppTheme } from "@/components/theme-toggle";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, LayoutGrid, KeyRound, LogOut, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MENU_ITEMS, parseMenuConfig, useMainMenuConfig } from "@/components/cde/main-menu-config";

export function AppHeader({ logo, children, supplyManual = false }: { logo: ReactNode; children?: ReactNode; supplyManual?: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const { data: userName = "Usuário" } = useQuery({
    queryKey: ["app-header-user"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return "Usuário";
      const { data: profile } = await supabase.from("profiles").select("full_name,email").eq("id", auth.user.id).maybeSingle();
      return profile?.full_name || profile?.email || auth.user.email || "Usuário";
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const iconButton = "shrink-0 !bg-transparent !text-foreground shadow-none hover:!bg-muted hover:!text-foreground";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="app-header-workspace mx-auto max-w-7xl px-4 pb-4 pt-5 sm:flex sm:min-h-[73px] sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <Link to="/portal" className="flex min-w-0 items-center" title="Voltar aos aplicativos">{logo}</Link>
          <div className="flex shrink-0 items-center gap-1 sm:hidden">
            <MobileHeaderMenu supplyManual={supplyManual} userName={userName} onSignOut={signOut} onChangePassword={() => setPasswordOpen(true)} buttonClass={iconButton} />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:mt-0 sm:flex sm:min-w-0 sm:justify-end">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <p className="min-w-0 truncate text-sm font-semibold">{userName}</p>
            <Button asChild variant="ghost" size="icon" className="shrink-0 !bg-transparent !text-foreground shadow-none hover:!bg-transparent hover:!text-foreground" title="Início" aria-label="Voltar aos aplicativos">
              <Link to="/portal"><LayoutGrid className="h-4 w-4" /></Link>
            </Button>
          </div>
          {children}
          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            <DesktopHeaderMenu supplyManual={supplyManual} userName={userName} onSignOut={signOut} onChangePassword={() => setPasswordOpen(true)} buttonClass={iconButton} />
          </div>
        </div>
      </div>
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </header>
  );
}

type HeaderMenuProps = { userName: string; onSignOut: () => void; onChangePassword: () => void; buttonClass: string; supplyManual?: boolean };

function MainMenuEntries({ onSignOut, onChangePassword, supplyManual, itemClass }: Pick<HeaderMenuProps, "onSignOut" | "onChangePassword" | "supplyManual"> & { itemClass: string }) {
  const { data } = useMainMenuConfig();
  const config = data ?? parseMenuConfig();
  const pendingTotal = usePendingActions().data?.total ?? 0;
  return config.order.filter((id) => !config.hidden.includes(id) && (id !== "manual" || supplyManual)).map((id) => {
    const item = MENU_ITEMS.find((i) => i.id === id);
    if (!item) return null;
    const Icon = item.icon;
    if ("to" in item) return <Button key={id} asChild variant="ghost" className={itemClass}><Link to={item.to}><Icon className="h-5 w-5" />{item.label}{id === "pendentes" ? <CountBadge count={pendingTotal} className="ml-auto" /> : null}</Link></Button>;
    if (id === "manual") return <Button key={id} asChild variant="ghost" className={itemClass}><Link to="/supply-manual"><Icon className="h-5 w-5" />{item.label}</Link></Button>;
    if (id === "theme") return <ThemeEntry key={id} className={itemClass} />;
    return <Button key={id} variant="ghost" className={`${itemClass}`} onClick={id === "logout" ? onSignOut : id === "password" ? onChangePassword : () => window.history.back()}><Icon className="h-5 w-5" />{item.label}</Button>;
  });
}

function CountBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return <span className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground ${className}`}>{count > 99 ? "99+" : count}</span>;
}

/** Red total on the three-bar button, only when Minhas Pendências is visible in the CDE menu. */
function MenuTriggerBadge() {
  const config = useMainMenuConfig().data ?? parseMenuConfig();
  const total = usePendingActions().data?.total ?? 0;
  if (config.hidden.includes("pendentes")) return null;
  return <CountBadge count={total} className="absolute -right-1 -top-1" />;
}

function ThemeEntry({ className }: { className: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(activeTheme() === "dark"), []);
  const Icon = dark ? Sun : Moon;
  return <Button variant="ghost" className={className} onClick={() => setDark(toggleAppTheme() === "dark")}><Icon className="h-5 w-5" />{dark ? "Modo claro" : "Modo escuro"}</Button>;
}

function MobileHeaderMenu({ userName, onSignOut, onChangePassword, buttonClass, supplyManual }: HeaderMenuProps) {
  return (
    <Sheet>
      <SheetTrigger asChild><Button variant="ghost" size="icon" className={`relative ${buttonClass}`} aria-label="Abrir menu"><Menu className="!h-6 !w-6" /><MenuTriggerBadge /></Button></SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8">
        <SheetHeader><SheetTitle className="truncate text-left">{userName}</SheetTitle></SheetHeader>
        <nav className="mt-5 divide-y divide-border" aria-label="Menu do aplicativo">
          <MainMenuEntries supplyManual={supplyManual} onSignOut={onSignOut} onChangePassword={onChangePassword} itemClass="h-12 w-full justify-start rounded-none !bg-transparent !text-foreground hover:!bg-muted" />
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function DesktopHeaderMenu({ userName, onSignOut, onChangePassword, buttonClass, supplyManual }: HeaderMenuProps) {
  const itemClass = "h-10 w-full justify-start rounded-none px-4 !bg-transparent !text-foreground hover:!bg-muted hover:!text-foreground";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={`relative ${buttonClass}`} aria-label="Abrir menu">
          <Menu className="!h-6 !w-6" />
          <MenuTriggerBadge />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-72 overflow-hidden rounded-lg border-border bg-popover p-0 shadow-lg">
        <nav className="py-1" aria-label={`Menu de ${userName}`}>
          <MainMenuEntries supplyManual={supplyManual} onSignOut={onSignOut} onChangePassword={onChangePassword} itemClass={itemClass} />
        </nav>
      </PopoverContent>
    </Popover>
  );
}