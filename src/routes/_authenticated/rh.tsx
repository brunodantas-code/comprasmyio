import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, Mail, Minus, Phone, Plus, Search, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MyioAppLogo } from "@/components/myio-app-logo";

export const Route = createFileRoute("/_authenticated/rh")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("user_app_access").select("app_key").eq("user_id", context.user.id).eq("app_key", "rh").maybeSingle();
    if (!data) throw redirect({ to: "/portal" });
  },
  component: RhPage,
  head: () => ({
    meta: [
      { title: "Técnicos | myio RH" },
      { name: "description", content: "Cadastro dos técnicos e dados de contato na plataforma myio ERP." },
      { property: "og:title", content: "Técnicos | myio RH" },
      { property: "og:description", content: "Cadastro dos técnicos e dados de contato na plataforma myio ERP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function RhPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ["rh-supply-technicians"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_site_survey_users");
      if (error) throw error;
      return data ?? [];
    },
  });
  const filtered = technicians.filter((technician) => [technician.full_name, technician.email, technician.mobile_phone].join(" ").toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/portal"><MyioAppLogo appName="RH" className="text-xl sm:text-2xl" /></Link>
          <div className="flex items-center gap-1"><Button asChild variant="outline" size="icon" title="Início"><Link to="/portal" aria-label="Início"><Home className="h-4 w-4" /></Link></Button></div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
          <div className="min-w-0"><h1 className="text-2xl font-bold">Técnicos</h1><p className="mt-1 text-sm text-muted-foreground">Ficha básica dos técnicos cadastrados no Supply.</p></div>
          <Badge variant="outline" className="shrink-0">{technicians.length} técnicos</Badge>
        </div>
        <div className="relative mb-4 max-w-lg"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar técnico" className="pl-9" /></div>
        <section className="overflow-hidden rounded-md border border-border bg-card shadow-sm" aria-label="Cadastro de técnicos">
          {isLoading ? <p className="p-6 text-sm text-muted-foreground">Carregando técnicos...</p> : filtered.map((technician) => <TechnicianRecord key={technician.id} technician={technician} expanded={expandedId === technician.id} onToggle={() => setExpandedId((current) => current === technician.id ? null : technician.id)} onSaved={() => void queryClient.invalidateQueries({ queryKey: ["rh-supply-technicians"] })} />)}
          {!isLoading && filtered.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Nenhum técnico encontrado.</p> : null}
        </section>
      </main>
    </div>
  );
}

type Technician = { id: string; full_name: string; email: string | null; mobile_phone: string | null };

function formatMobilePhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function TechnicianRecord({ technician, expanded, onToggle, onSaved }: { technician: Technician; expanded: boolean; onToggle: () => void; onSaved: () => void }) {
  const [mobilePhone, setMobilePhone] = useState(() => formatMobilePhone(technician.mobile_phone ?? ""));
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("set_technician_mobile_phone", { _technician_id: technician.id, _mobile_phone: mobilePhone });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ficha do técnico atualizada"); onSaved(); },
    onError: (error: Error) => toast.error(error.message),
  });
  return <article className="border-b border-border last:border-0">
    <Button type="button" variant="ghost" className="grid h-auto w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-none px-4 py-3 text-left !bg-card hover:!bg-muted/40" onClick={onToggle} aria-expanded={expanded}>
      <span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-myio-green/10 text-myio-green"><UserRound className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{technician.full_name}</span><span className="block truncate text-xs text-muted-foreground">{technician.mobile_phone || "Celular não cadastrado"}</span></span></span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground">{expanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</span>
    </Button>
    {expanded ? <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="grid gap-4 border-t border-border px-4 py-4 sm:grid-cols-[minmax(0,1fr)_280px_auto] sm:items-end">
      <div className="min-w-0 space-y-1.5"><Label>Nome e e-mail</Label><p className="truncate text-sm font-medium">{technician.full_name}</p><p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground"><Mail className="h-3.5 w-3.5 shrink-0" />{technician.email || "E-mail não informado"}</p></div>
      <div className="space-y-2"><Label htmlFor={`mobile-${technician.id}`}>Celular</Label><div className="relative"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id={`mobile-${technician.id}`} type="tel" inputMode="numeric" autoComplete="tel-national" value={mobilePhone} onChange={(event) => setMobilePhone(formatMobilePhone(event.target.value))} className="pl-9" placeholder="(DDD) 9XXXX-XXXX" pattern="\([0-9]{2}\) 9[0-9]{4}-[0-9]{4}" maxLength={15} required /></div></div>
      <Button type="submit" size="sm" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
    </form> : null}
  </article>;
}