import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MyioPlatformLogo } from "@/components/myio-platform-logo";
import { toast } from "sonner";
import { z } from "zod";
import {
  ArrowRight,
  BadgeDollarSign,
  BriefcaseBusiness,
  Code2,
  FileSignature,
  PackageCheck,
  UsersRound,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "myio ERP — Gestão integrada do negócio" },
      {
        name: "description",
        content:
          "Plataforma myio ERP para gestão integrada de solicitações, estoque, finanças, desenvolvimento e demais áreas do negócio.",
      },
      { property: "og:title", content: "myio ERP — Gestão integrada do negócio" },
      {
        property: "og:description",
        content:
          "Plataforma myio ERP para gestão integrada de solicitações, estoque, finanças, desenvolvimento e demais áreas do negócio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const MODULES = [
  {
    icon: PackageCheck,
    title: "Supply",
    body: "Solicitações e Estoque",
    available: true,
  },
  {
    icon: BadgeDollarSign,
    title: "Cash Flow",
    body: "Gestão financeira",
    available: true,
  },
  {
    icon: Code2,
    title: "Code",
    body: "Tickets e melhorias",
    available: true,
  },
  {
    icon: BriefcaseBusiness,
    title: "CRM",
    body: "Vendas e relacionamento",
    available: false,
  },
  {
    icon: FileSignature,
    title: "Legal",
    body: "Contratos e jurídico",
    available: false,
  },
  {
    icon: UsersRound,
    title: "RH",
    body: "Pessoas e cultura",
    available: false,
  },
];

const signInSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

function Landing() {
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = signInSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/portal" });
  }

  return (
    <main className="relative flex min-h-screen w-full items-center overflow-hidden bg-erp-landing px-5 py-10 text-erp-landing-foreground sm:px-10 lg:px-12">
      <div className="pointer-events-none absolute -left-28 -top-36 h-96 w-96 rounded-full bg-erp-landing-soft/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-44 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -left-36 h-80 w-80 rounded-full bg-myio-purple/50 sm:-bottom-48 sm:-left-48 sm:h-[28rem] sm:w-[28rem]" />

      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] overflow-hidden lg:block" aria-hidden="true">
        <svg className="absolute right-[-18%] top-1/2 h-[115%] w-[112%] -translate-y-1/2 text-erp-mesh opacity-70" viewBox="0 0 700 700" fill="none">
          <g stroke="currentColor" strokeWidth="1.2">
            <path d="M395 44 594 145 654 346 553 602 321 647 124 509 84 283 221 104 395 44Z" />
            <path d="m395 44-68 177 267-76-116 231 176-30M327 221 84 283m243-62 151 155M84 283l226 156m168-63 75 226M310 439l11 208m-11-208 243 163M124 509l186-70" />
          </g>
          <g className="fill-erp-mesh-node">
            <circle cx="395" cy="44" r="5" />
            <circle cx="594" cy="145" r="4" />
            <circle cx="654" cy="346" r="5" />
            <circle cx="553" cy="602" r="4" />
            <circle cx="321" cy="647" r="5" />
            <circle cx="124" cy="509" r="4" />
            <circle cx="84" cy="283" r="5" />
            <circle cx="221" cy="104" r="4" />
            <circle cx="327" cy="221" r="7" className="animate-pulse" />
            <circle cx="478" cy="376" r="6" />
            <circle cx="310" cy="439" r="7" className="animate-pulse" />
          </g>
        </svg>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-12 lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-12">
        <section className="w-full">
          <MyioPlatformLogo tone="light" className="mb-8 h-12 sm:mb-9 sm:h-14" />

          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.02] text-erp-landing-foreground sm:text-6xl">
            Gestão inteligente
            <br />
            <span className="font-light text-erp-landing-muted">em um só ecossistema</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-snug text-erp-landing-muted sm:text-xl">
            A plataforma ERP completa para escalar o negócio.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {MODULES.map(({ icon: Icon, title, body, available }) => (
              <div
                key={title}
                className={`flex h-28 items-center gap-3 rounded-lg border border-erp-landing-border bg-erp-landing-panel p-3 transition-colors hover:border-primary/50 sm:h-24 ${available ? "" : "opacity-60"}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${available ? "bg-primary text-primary-foreground" : "bg-erp-landing-border text-erp-landing-muted"}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <strong className="block text-sm text-erp-landing-foreground">{title}</strong>
                  <span className="block text-xs leading-snug text-erp-landing-muted">{body}</span>
                  {!available && (
                    <span className="mt-1 block text-xs leading-snug text-erp-landing-muted">Em desenvolvimento</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="w-full lg:w-[21rem]" aria-labelledby="access-title">
          <div className="rounded-2xl border border-erp-access-border bg-erp-access p-7 text-erp-landing-foreground shadow-2xl backdrop-blur-2xl sm:p-10">
            <div className="mb-7">
              <h2 id="access-title" className="text-2xl font-extrabold text-erp-landing-foreground">Acesse sua conta</h2>
              <p className="mt-1 text-erp-landing-muted">Identifique-se para acessar seus aplicativos.</p>
            </div>

            {signedIn ? (
              <Button asChild size="lg" className="h-12 w-full">
                <Link to="/portal">
                  Entrar na plataforma <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="landing-email" className="text-erp-landing-foreground">E-mail</Label>
                  <Input id="landing-email" name="email" type="email" autoComplete="email" placeholder="seu@email.com" required className="h-12 border-erp-access-border bg-erp-access-field text-erp-landing-foreground placeholder:text-erp-landing-muted focus-visible:ring-primary" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="landing-password" className="text-erp-landing-foreground">Senha</Label>
                    <Link to="/auth" className="text-xs font-bold text-erp-landing-foreground hover:text-primary">
                      Esqueci a senha
                    </Link>
                  </div>
                  <Input id="landing-password" name="password" type="password" autoComplete="current-password" required className="h-12 border-erp-access-border bg-erp-access-field text-erp-landing-foreground focus-visible:ring-primary" />
                </div>
                <Button type="submit" size="lg" className="h-12 w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar na plataforma"}
                  {!loading && <ArrowRight className="h-5 w-5" />}
                </Button>
              </form>
            )}

            {!signedIn && (
              <div className="mt-7 border-t border-erp-access-border pt-6 text-center">
                <p className="text-sm text-erp-landing-muted">Ainda não possui acesso?</p>
                <Link to="/auth" className="mt-2 inline-block text-sm font-bold text-erp-landing-foreground hover:text-primary">
                  Criar conta
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
