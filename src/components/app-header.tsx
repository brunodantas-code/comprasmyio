import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Home, LogOut, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function AppHeader({ logo, children }: { logo: ReactNode; children?: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
      <div className="mx-auto max-w-7xl px-4 pb-4 pt-5 sm:flex sm:min-h-[73px] sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <Link to="/portal" className="flex min-w-0 items-center" title="Voltar aos aplicativos">{logo}</Link>
          <div className="flex shrink-0 items-center gap-1 sm:hidden">
            <MobileHeaderMenu userName={userName} onSignOut={signOut} buttonClass={iconButton} />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:mt-0 sm:flex sm:min-w-0 sm:justify-end">
          <p className="min-w-0 truncate text-sm font-semibold">{userName}</p>
          {children}
          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            <DesktopHeaderMenu userName={userName} onSignOut={signOut} buttonClass={iconButton} />
          </div>
        </div>
      </div>
    </header>
  );
}

type HeaderMenuProps = { userName: string; onSignOut: () => void; buttonClass: string };

function MobileHeaderMenu({ userName, onSignOut, buttonClass }: HeaderMenuProps) {
  return (
    <Sheet>
      <SheetTrigger asChild><Button variant="ghost" size="icon" className={buttonClass} aria-label="Abrir menu"><Menu className="!h-6 !w-6" /></Button></SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8">
        <SheetHeader><SheetTitle className="truncate text-left">{userName}</SheetTitle></SheetHeader>
        <nav className="mt-5 divide-y divide-border" aria-label="Menu do aplicativo">
          <Button asChild variant="ghost" className="h-12 w-full justify-start rounded-none !bg-transparent !text-foreground hover:!bg-muted"><Link to="/portal"><Home className="h-5 w-5" />Início</Link></Button>
          <Button variant="ghost" className="h-12 w-full justify-start rounded-none !bg-transparent !text-foreground hover:!bg-muted" onClick={() => window.history.back()}><ArrowLeft className="h-5 w-5" />Voltar</Button>
          <Button variant="ghost" className="h-12 w-full justify-start rounded-none !bg-transparent !text-destructive hover:!bg-muted hover:!text-destructive" onClick={onSignOut}><LogOut className="h-5 w-5" />Sair</Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function DesktopHeaderMenu({ userName, onSignOut, buttonClass }: HeaderMenuProps) {
  const itemClass = "h-10 w-full justify-start rounded-none px-4 !bg-transparent !text-foreground hover:!bg-muted hover:!text-foreground";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={buttonClass} aria-label="Abrir menu">
          <Menu className="!h-6 !w-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-72 overflow-hidden rounded-lg border-border bg-popover p-0 shadow-lg">
        <div className="border-b border-border bg-muted/40 px-4 py-3">
          <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
        </div>
        <nav className="py-1" aria-label="Menu do aplicativo">
          <Button asChild variant="ghost" className={itemClass}>
            <Link to="/portal"><Home className="h-5 w-5" />Início</Link>
          </Button>
          <Button variant="ghost" className={itemClass} onClick={() => window.history.back()}>
            <ArrowLeft className="h-5 w-5" />Voltar
          </Button>
          <div className="my-1 border-t border-border" />
          <Button variant="ghost" className={`${itemClass} !text-destructive hover:!text-destructive`} onClick={onSignOut}>
            <LogOut className="h-5 w-5" />Sair
          </Button>
        </nav>
      </PopoverContent>
    </Popover>
  );
}