import { useState } from "react";
import {
  BookOpen, Boxes, Briefcase, Building2, Bell, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, ClipboardList, CodeXml,
  DatabaseBackup, DollarSign, FileSignature, FileText, Files, FolderKanban, Gauge, History, Landmark, Layers3, ListTree, Package, Phone,
  Plus, ReceiptText, ScrollText, Search, Settings, ShieldCheck, ShoppingCart, Tag, Target, Users, UsersRound, WalletCards, Workflow,
  LayoutGrid, Menu, ArrowLeft, KeyRound, LogOut, type LucideIcon,
} from "lucide-react";
import { CrmFunnelIcon } from "@/components/crm-funnel-icon";
import { MytosisIcon } from "@/components/mytosis-icon";
import { CdeIcon } from "@/components/cde-icon";
import { CdeCategoryHeader } from "./cde-category-header";
import { CdeSortableIcons } from "./cde-sortable-icons";
import { CdeMenuType } from "./cde-menu-type";
import { TopIconStyleEditor } from "./top-icon-style-editor";

type Item = { label: string; icon: LucideIcon | React.ComponentType<{ className?: string }>; name: string };
type Group = { title: string; items: Item[] };
type App = { name: string; icon: Item["icon"]; iconName: string; groups: Group[] };

const i = (label: string, icon: Item["icon"], name: string): Item => ({ label, icon, name });
const STD = "Sem barra inferior";

const APPS: App[] = [
  { name: "Supply", icon: Settings, iconName: "Settings", groups: [
    { title: "Barra inferior", items: [i("Solicitações", ClipboardList, "ClipboardList"), i("Approvals", ShoppingCart, "ShoppingCart"), i("Armazém", Boxes, "Boxes"), i("Cadastro", FolderKanban, "FolderKanban"), i("Usuários e logs", Users, "Users")] },
    { title: "Submenus", items: [i("Novas Solicitações", Plus, "Plus"), i("Approvals (todos)", ShoppingCart, "ShoppingCart"), i("Armazém (todos)", Boxes, "Boxes"), i("Clientes", Building2, "Building2"), i("Centro de Custo", Landmark, "Landmark"), i("Etiquetas", Tag, "Tag"), i("Cargos", Briefcase, "Briefcase"), i("Lembretes", Bell, "Bell"), i("Diversos", Layers3, "Layers3"), i("Perfis de acesso", ShieldCheck, "ShieldCheck"), i("Alçadas/Organograma", CheckCircle2, "CheckCircle2"), i("Logs", ScrollText, "ScrollText"), i("Backup", DatabaseBackup, "DatabaseBackup"), i("Manual do Usuário", BookOpen, "BookOpen")] },
  ] },
  { name: "Cash Flow", icon: DollarSign, iconName: "DollarSign", groups: [
    { title: "Barra inferior", items: [i("Contas a pagar", ReceiptText, "ReceiptText"), i("Plano de Contas", ListTree, "ListTree"), i("Caixa", WalletCards, "WalletCards")] },
  ] },
  { name: "Site Survey", icon: Search, iconName: "Search", groups: [
    { title: "Barra inferior", items: [i("Visitas", CalendarDays, "CalendarDays"), i("Checklists", ClipboardCheck, "ClipboardCheck"), i("Cadastro", Package, "Package"), i("Usuários", UsersRound, "UsersRound")] },
    { title: "Submenus", items: [i("Nova visita", Plus, "Plus"), i("Realizar Visita", CalendarDays, "CalendarDays"), i("Sanar Pendências", ClipboardCheck, "ClipboardCheck"), i("Histórico de Visitas", FileText, "FileText"), i("Perfis de acesso", ShieldCheck, "ShieldCheck"), i("Logs", History, "History")] },
  ] },
  { name: "OpDesk", icon: Phone, iconName: "Phone", groups: [{ title: STD, items: [i("Adicionar chamado (redondo)", Plus, "Plus")] }] },
  { name: "CRM", icon: CrmFunnelIcon, iconName: "CrmFunnelIcon", groups: [{ title: "Em breve", items: [] }] },
  { name: "Legal", icon: FileSignature, iconName: "FileSignature", groups: [
    { title: "Barra inferior", items: [i("Contratos", FileSignature, "FileSignature"), i("Atas de Reunião", Users, "Users"), i("Documentos Padrão", Files, "Files")] },
    { title: "Ações", items: [i("Novo", Plus, "Plus")] },
  ] },
  { name: "RH", icon: UsersRound, iconName: "UsersRound", groups: [{ title: STD, items: [] }] },
  { name: "Code", icon: CodeXml, iconName: "CodeXml", groups: [{ title: STD, items: [i("Tickets", CodeXml, "CodeXml"), i("Novo ticket", Plus, "Plus")] }] },
  { name: "Mytosis", icon: MytosisIcon, iconName: "MytosisIcon", groups: [
    { title: "Barra inferior", items: [i("OKRs", Target, "Target"), i("Fluxogramas", Workflow, "Workflow"), i("Processos", BookOpen, "BookOpen"), i("KPIs", Gauge, "Gauge"), i("Usuários", UsersRound, "UsersRound")] },
  ] },
  { name: "CDE", icon: CdeIcon, iconName: "CdeIcon", groups: [{ title: STD, items: [i("Criar modelo", Plus, "Plus")] }] },
];

const SHARED: Item[] = [i("Início (todos os apps)", LayoutGrid, "LayoutGrid"), i("Menu", Menu, "Menu"), i("Voltar", ArrowLeft, "ArrowLeft"), i("Alterar senha", KeyRound, "KeyRound"), i("Sair", LogOut, "LogOut")];

function Tile({ it }: { it: Item }) {
  const Icon = it.icon;
  return <div className="flex w-24 flex-col items-center gap-1 text-center">
    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background"><Icon className="h-5 w-5" /></span>
    <span className="text-[0.7rem] leading-tight">{it.label}</span>
    <span className="text-[0.6rem] leading-3 text-muted-foreground/70">{it.name}</span>
  </div>;
}

export function CdeAppIcons({ number, handle }: { number: number; handle?: import("react").ReactNode }) {
  const [open, setOpen] = useState(false);
  const [openApps, setOpenApps] = useState<Set<string>>(new Set());
  return <section className="space-y-4">
    <CdeCategoryHeader handle={handle} number={number} title="Ícones dos Apps e menus" hint={`${APPS.length} apps · ícone do portal, barra inferior, submenus e ações para comparar padrões`} open={open} onToggle={() => setOpen(!open)} />
    {open ? <div className="space-y-4 p-4">
      <div className="rounded-lg border border-border p-3"><div className="mb-3 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary"><Menu className="h-5 w-5" /></span><span className="text-sm font-semibold">Menu superior comum a todos os apps</span></div><TopIconStyleEditor items={SHARED.slice(0, 2)} /><div className="mt-3 mb-1 text-xs text-muted-foreground">Ações dentro do menu</div><div className="flex flex-wrap gap-3">{SHARED.slice(2).map((it) => <Tile key={it.label} it={it} />)}</div></div>
      {APPS.map((a) => { const AppIcon = a.icon; const isOpen = openApps.has(a.name); return <div key={a.name} className="space-y-2">
        <button type="button" aria-expanded={isOpen} onClick={() => setOpenApps((p) => { const n = new Set(p); if (n.has(a.name)) n.delete(a.name); else n.add(a.name); return n; })} className="flex w-full items-center gap-3 text-left">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary"><AppIcon className="h-5 w-5" /></span>
          <span className="text-sm font-semibold">{a.name}</span><span className="text-[0.6rem] text-muted-foreground/70">{a.iconName}</span>
          {isOpen ? <ChevronUp className="ml-auto h-4 w-4 text-primary" /> : <ChevronDown className="ml-auto h-4 w-4 text-primary" />}
        </button>
        {isOpen ? <div className="space-y-2 rounded-lg border border-border p-3">{a.groups.map((g) => <div key={g.title}><div className="mb-1 text-xs text-muted-foreground">{g.title === "Barra inferior" ? "Menu principal do app" : g.title}</div>{g.title === "Barra inferior" ? <div className="mb-2"><CdeMenuType app={a.name} items={g.items} /></div> : null}
          {g.items.length ? <CdeSortableIcons app={a.name} group={g.title} items={g.items} /> : <span className="text-xs text-muted-foreground">—</span>}</div>)}</div> : null}
      </div>; })}
    </div> : null}
  </section>;
}
