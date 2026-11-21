import { AlertMarker } from "@/components/cde/numeric-markers";
import { ListItemStyleVars } from "@/components/cde/list-item-style";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePendingActions } from "@/hooks/use-pending-actions";
import { activeTheme, toggleAppTheme } from "@/components/theme-toggle";
import { Palette, Check, ChevronDown, ChevronRight } from "lucide-react";
import { useAppAppearance, usePersonalAppearance, setPersonalAppearance } from "@/components/cde/app-appearance";
import { APP_APPEARANCES, type AppAppearance } from "@/components/cde/appearance-colors";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TopIconStyleVars } from "@/components/cde/top-icon-style";
import { ArrowLeft, BookOpen, LayoutGrid, KeyRound, LogOut, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { AppManualDialog } from "@/components/app-manual-dialog";
import { PersonalSignature } from "@/components/personal-signature";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MENU_ITEMS, menuOrderForContext, parseMenuConfig, useMainMenuConfig, userInfoLine } from "@/components/cde/main-menu-config";
import { accessManagementOptions } from "@/components/access/access-context";
import { canOpenAccessManagement } from "@/lib/access-management";

export function AppHeader({ logo, children, supplyManual = false, manualApp, menuActions }: { logo: ReactNode; children?: ReactNode; supplyManual?: boolean; manualApp?: string; menuActions?: MenuAction[] }) {
  const [manualOpen, setManualOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const { data: me } = useCurrentUser();
  const extra = { manualApp, menuActions, onOpenManual: () => setManualOpen(true), onOpenSignature: () => setSignatureOpen(true) };
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

  const iconButton = "top-icon shrink-0 !bg-transparent !text-foreground shadow-none hover:!bg-muted hover:!text-foreground";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <TopIconStyleVars /><ListItemStyleVars />
      <div className="app-header-workspace mx-auto max-w-7xl px-4 pb-4 pt-5 sm:flex sm:min-h-[73px] sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <Link to="/portal" className="flex min-w-0 items-center" title="Voltar aos aplicativos">{logo}</Link>
          <div className="flex shrink-0 items-center gap-1 sm:hidden">
            <HeaderMenu supplyManual={supplyManual} {...extra} userName={userName} onSignOut={signOut} onChangePassword={() => setPasswordOpen(true)} buttonClass={iconButton} />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:mt-0 sm:flex sm:min-w-0 sm:justify-end">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <UserNameBlock userName={userName} />
            <Button asChild variant="ghost" size="icon" className="top-icon shrink-0 !bg-transparent !text-foreground shadow-none hover:!bg-transparent hover:!text-foreground" title="Início" aria-label="Voltar aos aplicativos">
              <Link to="/portal"><LayoutGrid className="h-4 w-4" /></Link>
            </Button>
          </div>
          {children}
          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            <HeaderMenu supplyManual={supplyManual} {...extra} userName={userName} onSignOut={signOut} onChangePassword={() => setPasswordOpen(true)} buttonClass={iconButton} />
          </div>
        </div>
      </div>
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
      {manualApp ? <AppManualDialog app={manualApp} open={manualOpen} onOpenChange={setManualOpen} /> : null}
      <Dialog open={signatureOpen} onOpenChange={setSignatureOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Minha assinatura</DialogTitle></DialogHeader>{me?.id ? <PersonalSignature userId={me.id} initiallyOpen /> : null}</DialogContent></Dialog>
    </header>
  );
}

/** Name plus the CDE-chosen line (job title / access profile) shown in every app header. */
export function UserNameBlock({ userName }: { userName: string }) {
  const mode = useMainMenuConfig().data?.userInfo;
  const { data: me } = useCurrentUser();
  const line = userInfoLine(mode, me?.jobTitle?.name, me?.accessProfileName);
  return <div className="min-w-0 text-right"><p className="truncate text-sm font-semibold">{userName}</p>{line ? <p className="truncate text-xs text-muted-foreground">{line}</p> : null}</div>;
}

export function UserGreetingInfo() {
  const mode = useMainMenuConfig().data?.userInfo;
  const { data: me } = useCurrentUser();
  const line = userInfoLine(mode, me?.jobTitle?.name, me?.accessProfileName);
  return line ? <p className="mt-2 text-sm text-muted-foreground">{line}</p> : null;
}

type MenuAction = { label: string; icon: ReactNode; onClick: () => void };
type MenuExtras = { manualApp?: string; onOpenManual?: () => void; onOpenSignature?: () => void; menuActions?: MenuAction[] };
type HeaderMenuProps = MenuExtras & { userName: string; onSignOut: () => void; onChangePassword: () => void; buttonClass: string; supplyManual?: boolean; homePage?: boolean };

function MainMenuEntries({ onSignOut, onChangePassword, supplyManual, homePage, itemClass, manualApp, onOpenManual, onOpenSignature, menuActions }: MenuExtras & Pick<HeaderMenuProps, "onSignOut" | "onChangePassword" | "supplyManual" | "homePage"> & { itemClass: string }) {
  const { data } = useMainMenuConfig();
  const config = data ?? parseMenuConfig();
  const pendingTotal = usePendingActions().data?.total ?? 0;
  const { data: accessCapabilities } = useQuery(accessManagementOptions);
  return <>{menuActions?.map(action => <Button key={action.label} variant="ghost" className={itemClass} onClick={action.onClick}>{action.icon}{action.label}</Button>)}{menuOrderForContext(config, homePage).filter((id) => (id !== "manual" || supplyManual || !!manualApp) && (id !== "access" || accessCapabilities && canOpenAccessManagement(accessCapabilities))).map((id) => {
    const item = MENU_ITEMS.find((i) => i.id === id);
    if (!item) return null;
    const Icon = item.icon;
    if ("to" in item) return <Button key={id} asChild variant="ghost" className={itemClass}><Link to={item.to}><Icon className="h-5 w-5" />{item.label}{id === "pendentes" ? <CountBadge count={pendingTotal} className="ml-auto" /> : null}</Link></Button>;
    if (id === "manual" && supplyManual) return <Button key={id} asChild variant="ghost" className={itemClass}><Link to="/supply-manual"><Icon className="h-5 w-5" />{item.label}</Link></Button>;
    if (id === "manual") return <Button key={id} variant="ghost" className={itemClass} onClick={onOpenManual}><Icon className="h-5 w-5" />{item.label}</Button>;
    if (id === "signature") return <Button key={id} variant="ghost" className={itemClass} onClick={onOpenSignature}><Icon className="h-5 w-5" />{item.label}</Button>;
    if (id === "access") return <Button key={id} asChild variant="ghost" className={itemClass}><Link to="/acessos"><Icon className="h-5 w-5" />Acessos</Link></Button>;
    if (id === "theme") return <ThemeEntry key={id} className={itemClass} />;
    if (id === "favorites") return <Button key={id} variant="ghost" className={itemClass} onClick={() => window.dispatchEvent(new Event("open-mobile-favorites"))}><Icon className="h-5 w-5" />{item.label}</Button>;
    return <Button key={id} variant="ghost" className={`${itemClass}`} onClick={id === "logout" ? onSignOut : id === "password" ? onChangePassword : () => window.history.back()}><Icon className="h-5 w-5" />{item.label}</Button>;
  })}</>;
}

function CountBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return <AlertMarker count={count} className={className} />;
}

/** Red total on the three-bar button, only when Minhas Pendências is visible in the CDE menu. */
function MenuTriggerBadge() {
  const config = useMainMenuConfig().data ?? parseMenuConfig();
  const total = usePendingActions().data?.total ?? 0;
  if (config.hidden.includes("pendentes")) return null;
  return <CountBadge count={total} className="absolute -right-1 -top-1" />;
}

function ThemeEntry({ className }: { className: string }) {
  const [expanded, setExpanded] = useState(false);
  const personal = usePersonalAppearance();
  const cde = useAppAppearance().data;
  const current = personal ?? cde ?? "green";
  const choose = (value: AppAppearance) => {
    if (activeTheme() === "dark") toggleAppTheme();
    setPersonalAppearance(value);
    setExpanded(false);
  };
  return <div className="flex flex-col">
    <Button variant="ghost" className={className} aria-expanded={expanded} onClick={(event) => { event.stopPropagation(); setExpanded(value => !value); }}><Palette className="h-5 w-5" />Aparência{expanded ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}</Button>
    {expanded ? APP_APPEARANCES.map(option => <Button key={option.key} variant="ghost" className={className + " pl-10"} aria-pressed={current === option.key} onClick={() => choose(option.key)}>
      {current === option.key ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />}{option.label}
    </Button>) : null}
  </div>;
}

/** Shared CDE entries, with a bottom panel on mobile and a popover on desktop. */
export function HeaderMenu({ userName, onSignOut, onChangePassword, buttonClass, supplyManual, homePage, ...extra }: HeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => { setMobile(media.matches); setOpen(false); };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const itemClass = "!h-10 !w-full !min-w-0 !justify-start !rounded-none !border-0 px-4 !bg-transparent !text-foreground !shadow-none hover:!bg-muted hover:!text-foreground focus-visible:!bg-muted focus-visible:!text-foreground";
  const trigger = <Button variant="ghost" size="icon" className={`relative ${buttonClass}`} aria-label="Abrir menu"><Menu className="!h-6 !w-6" /><MenuTriggerBadge /></Button>;

  if (mobile) return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild>{trigger}</SheetTrigger>
    <SheetContent side="bottom" className="flex max-h-[85dvh] flex-col gap-0 rounded-t-3xl border-border bg-card px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 [&>button:first-child]:!absolute [&>button:first-child]:!right-5 [&>button:first-child]:!top-5 [&>button:first-child]:!m-0 [&>button:first-child]:!h-7 [&>button:first-child]:!w-7 [&>button:first-child]:!min-w-0 [&>button:first-child]:!bg-transparent">
      <SheetTitle className="shrink-0 pb-5 text-center text-xl font-medium">Menu</SheetTitle>
      <SheetDescription className="sr-only">Menu de {userName}</SheetDescription>
      <div className="min-h-0 overflow-y-auto">
        <nav aria-label={`Menu de ${userName}`} className="flex flex-col [&>a]:!w-full [&>button]:!w-full [&>*:not(:last-child)]:!border-b [&>*:not(:last-child)]:!border-border" onClick={() => setOpen(false)}>
          <MainMenuEntries {...extra} supplyManual={supplyManual} homePage={homePage} onSignOut={onSignOut} onChangePassword={onChangePassword} itemClass={`${itemClass} !h-auto !min-h-14 gap-3 !px-1 !py-4 !text-base whitespace-normal [&_svg]:!size-5`} />
        </nav>
        <div className="mt-5 rounded-2xl bg-muted px-4 py-3"><p className="break-words text-sm font-medium text-foreground">{userName}</p><p className="text-xs text-muted-foreground">Menu do usuário</p></div>
      </div>
    </SheetContent>
  </Sheet>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} collisionPadding={12} className="max-h-[var(--radix-popover-content-available-height)] w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-lg border-border bg-popover p-0 shadow-lg">
        <nav className="py-1" aria-label={`Menu de ${userName}`} onClick={() => setOpen(false)}>
          <MainMenuEntries {...extra} supplyManual={supplyManual} homePage={homePage} onSignOut={onSignOut} onChangePassword={onChangePassword} itemClass={itemClass} />
        </nav>
      </PopoverContent>
    </Popover>
  );
}