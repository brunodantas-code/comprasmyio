import { useState } from "react";
import {
  BookOpen, Boxes, Briefcase, Building2, Bell, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, ClipboardList, CodeXml,
  DatabaseBackup, DollarSign, FileSignature, FileText, Files, FolderKanban, Gauge, History, Landmark, Layers3, ListTree, Package, Phone,
  Plus, ReceiptText, ScrollText, Search, Settings, ShieldCheck, ShoppingCart, Tag, Target, Users, UsersRound, WalletCards, Workflow,
  Home, Menu, ArrowLeft, KeyRound, LogOut, type LucideIcon,
} from "lucide-react";
import { CrmFunnelIcon } from "@/components/crm-funnel-icon";
import { MytosisIcon } from "@/components/mytosis-icon";
import { CdeIcon } from "@/components/cde-icon";

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

const SHARED: Item[] = [i("Início (casa)", Home, "Home"), i("Menu", Menu, "Menu"), i("Voltar", ArrowLeft, "ArrowLeft"), i("Alterar senha", KeyRound, "KeyRound"), i("Sair", LogOut, "LogOut")];

function Tile({ it }: { it: Item }) {
  const Icon = it.icon;
  return <div className="flex w-24 flex-col items-center gap-1 text-center">
    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background"><Icon className="h-5 w-5" /></span>
    <span className="text-[0.7rem] leading-tight">{it.label}</span>
    <span className="text-[0.6rem] leading-3 text-muted-foreground/70">{it.name}</span>
  </div>;
}

export function CdeAppIcons({ number }: { number: number }) {
  const [open, setOpen] = useState(false);
  return <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
    <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-4 bg-accent px-5 py-2 text-left">
      <span className="flex h-8 min-w-8 items-center justify-center rounded-md bg-primary px-1.5 text-base font-bold">{number}</span>
      <span className="min-w-0 flex-1"><span className="block border-b border-border pb-1 font-semibold">Ícones dos Apps e menus</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{APPS.length} apps · ícone do portal, barra inferior, submenus e ações para comparar padrões</span></span>
      {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
    {open ? <div className="space-y-4 p-4">
      <div className="rounded-lg border border-border p-3"><div className="mb-2 text-sm font-semibold">Menu superior comum a todos os apps</div><div className="flex flex-wrap gap-3">{SHARED.map((it) => <Tile key={it.label} it={it} />)}</div></div>
      {APPS.map((a) => { const AppIcon = a.icon; return <div key={a.name} className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row">
        <div className="flex w-28 shrink-0 flex-col items-center gap-1 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary"><AppIcon className="h-6 w-6" /></span>
          <span className="text-sm font-semibold">{a.name}</span><span className="text-[0.6rem] text-muted-foreground/70">{a.iconName}</span>
        </div>
        <div className="min-w-0 flex-1 space-y-2">{a.groups.map((g) => <div key={g.title}><div className="mb-1 text-xs text-muted-foreground">{g.title}{g.title === "Barra inferior" ? " · sem botão flutuante" : ""}</div>
          <div className="flex flex-wrap gap-3">{g.items.length ? g.items.map((it) => <Tile key={it.label} it={it} />) : <span className="text-xs text-muted-foreground">—</span>}</div></div>)}</div>
      </div>; })}
    </div> : null}
  </section>;
}
