import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MyioLogo } from "@/components/myio-logo";
import {
  Package,
  ClipboardList,
  ShieldCheck,
  QrCode,
  Truck,
  Factory,
  Boxes,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Myio Supply — Solicitações, Estoque e Expedição" },
      {
        name: "description",
        content:
          "Plataforma Myio Supply para solicitações de compra, controle de estoque, homologação por QR code e expedição de produtos.",
      },
      { property: "og:title", content: "Myio Supply — Solicitações, Estoque e Expedição" },
      {
        property: "og:description",
        content:
          "Plataforma Myio Supply para solicitações de compra, controle de estoque, homologação por QR code e expedição de produtos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Solicitações de compra",
    body: "Peça material por projeto, com quantidade, prazo, anexos e destinatário.",
  },
  {
    icon: Package,
    title: "Fila de compras",
    body: "O comprador acompanha status, palavra passe, previsão de entrega e observações.",
  },
  {
    icon: Factory,
    title: "Fábrica e produção",
    body: "Simulador de capacidade, componentes gargalo e liberação de produtos montados.",
  },
  {
    icon: QrCode,
    title: "Homologação por QR code",
    body: "Etiquetagem unitária ou por caixa, com foto e rastreio completo do item.",
  },
  {
    icon: Boxes,
    title: "Armazém",
    body: "Estoque Myio e terceiros, técnicos, perdidos e movimentações auditadas.",
  },
  {
    icon: Truck,
    title: "Expedição e transporte",
    body: "Ordens de expedição, envio ao cliente e confirmação de entrega na unidade.",
  },
];

function Landing() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  const cta = signedIn ? "Abrir painel" : "Entrar";

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero escuro no estilo Myio */}
      <div className="relative overflow-hidden bg-[oklch(0.18_0.09_300)]">
        <div className="pointer-events-none absolute -right-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-[var(--myio-purple)] opacity-70 blur-[2px]" />
        <div className="pointer-events-none absolute -left-40 bottom-[-12rem] h-[24rem] w-[24rem] rounded-full bg-[oklch(0.26_0.13_300)]" />

        <header className="relative z-10">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-6">
            <MyioLogo tone="light" className="text-3xl" />
            <nav className="hidden items-center gap-7 text-sm font-semibold text-white/80 md:flex">
              <a href="#recursos" className="transition-colors hover:text-white">
                Recursos
              </a>
              <a href="#fluxo" className="transition-colors hover:text-white">
                Fluxo
              </a>
              <a href="#perfis" className="transition-colors hover:text-white">
                Perfis
              </a>
            </nav>
            <Link to={signedIn ? "/dashboard" : "/auth"}>
              <Button
                size="sm"
                className="rounded-full bg-[var(--myio-purple)] px-6 font-bold text-white hover:opacity-90"
              >
                {signedIn ? "Painel" : "Login"}
              </Button>
            </Link>
          </div>
        </header>

        <section className="relative z-10 mx-auto max-w-6xl px-5 pb-24 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
          <h1 className="max-w-3xl text-4xl font-light leading-tight text-white sm:text-6xl">
            Compras e materiais
            <br />
            <span className="font-extrabold">sob controle total</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/75">
            Do pedido ao cliente: solicitação, compra, produção, homologação e{" "}
            <span className="font-bold text-white">expedição rastreada</span>.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to={signedIn ? "/dashboard" : "/auth"}>
              <Button
                size="lg"
                className="rounded-full bg-[var(--myio-green)] px-8 font-bold text-[oklch(0.18_0.09_300)] hover:opacity-90"
              >
                {cta} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <a href="#recursos">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white/30 bg-transparent px-8 font-bold text-white hover:bg-white/10 hover:text-white"
              >
                Ver recursos
              </Button>
            </a>
          </div>
        </section>

        <div className="relative z-10 h-12 w-full bg-background [clip-path:polygon(0_45%,100%_0,100%_100%,0_100%)]" />
      </div>

      {/* Recursos */}
      <section id="recursos" className="mx-auto max-w-6xl px-5 py-20 sm:px-6">
        <p className="text-sm font-extrabold uppercase tracking-widest text-[var(--myio-purple)]">
          Recursos
        </p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Uma plataforma para toda a cadeia
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--myio-purple)]/10">
                <Icon className="h-5 w-5 text-[var(--myio-purple)]" />
              </span>
              <h3 className="mt-4 text-lg font-extrabold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fluxo */}
      <section id="fluxo" className="bg-secondary/60 py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Do pedido à entrega
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["01", "Solicitação", "O time pede material por projeto, com prazo e anexos."],
              ["02", "Compra", "Comprador atualiza status, palavra passe e previsão."],
              ["03", "Armazém", "Entrada, homologação por QR code e controle por setor."],
              ["04", "Expedição", "Ordem de expedição, transporte e entrega ao cliente."],
            ].map(([n, title, body]) => (
              <div key={n} className="rounded-2xl bg-card p-6 shadow-sm">
                <span className="text-3xl font-extrabold text-[var(--myio-green)]">{n}</span>
                <h3 className="mt-3 font-extrabold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perfis */}
      <section id="perfis" className="mx-auto max-w-6xl px-5 py-20 sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Perfis de acesso</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {[
            { icon: ClipboardList, title: "Solicitante", body: "Cria e edita solicitações, acompanha status e confirma recebimento." },
            { icon: Package, title: "Comprador", body: "Gerencia a fila de compras, observações e prazos de entrega." },
            { icon: ShieldCheck, title: "Admin", body: "Clientes, projetos, ordens de expedição, estoque e logs completos." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border p-6">
              <Icon className="h-5 w-5 text-[var(--myio-green)]" />
              <h3 className="mt-4 font-extrabold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-[oklch(0.18_0.09_300)] py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
              Pronto para organizar suas compras?
            </h2>
            <p className="mt-2 text-white/70">Acesse o painel e comece agora.</p>
          </div>
          <Link to={signedIn ? "/dashboard" : "/auth"}>
            <Button
              size="lg"
              className="rounded-full bg-[var(--myio-green)] px-8 font-bold text-[oklch(0.18_0.09_300)] hover:opacity-90"
            >
              {cta}
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <MyioLogo className="text-xl" />
          <span>© {new Date().getFullYear()} Myio — Gestão de Compras e Materiais</span>
        </div>
      </footer>
    </main>
  );
}
