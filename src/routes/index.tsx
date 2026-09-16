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

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-12 lg:flex-row lg:gap-16">
        <section className="w-full lg:w-3/5">
          <MyioPlatformLogo tone="light" className="mb-10 h-12 sm:mb-12 sm:h-14" />

          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-erp-landing-foreground sm:text-6xl">
            Gestão inteligente
            <br />
            <span className="font-light text-erp-landing-muted">em um só ecossistema</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-erp-landing-muted sm:text-xl">
            A plataforma ERP completa para escalar o negócio.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {MODULES.map(({ icon: Icon, title, body, available }) => (
              <div
                key={title}
                className={`flex min-h-20 items-center gap-3 rounded-lg border border-erp-landing-border bg-erp-landing-panel p-3 transition-colors hover:border-primary/50 ${available ? "" : "opacity-60"}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${available ? "bg-primary text-primary-foreground" : "bg-erp-landing-border text-erp-landing-muted"}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <strong className="block text-sm text-erp-landing-foreground">{title}</strong>
                  <span className="block text-xs leading-snug text-erp-landing-muted">
                    {available ? body : `${body} · Em desenvolvimento`}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="w-full lg:w-2/5" aria-labelledby="access-title">
          <div className="rounded-lg bg-card p-7 text-card-foreground shadow-2xl sm:p-10">
            <div className="mb-8">
              <h2 id="access-title" className="text-2xl font-extrabold">Acesse sua conta</h2>
              <p className="mt-2 text-muted-foreground">Identifique-se para acessar seus aplicativos.</p>
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
                  <Label htmlFor="landing-email">E-mail</Label>
                  <Input id="landing-email" name="email" type="email" autoComplete="email" placeholder="seu@email.com" required className="h-12" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="landing-password">Senha</Label>
                    <Link to="/auth" className="text-xs font-bold text-foreground hover:text-primary">
                      Esqueci a senha
                    </Link>
                  </div>
                  <Input id="landing-password" name="password" type="password" autoComplete="current-password" required className="h-12" />
                </div>
                <Button type="submit" size="lg" className="h-12 w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar na plataforma"}
                  {!loading && <ArrowRight className="h-5 w-5" />}
                </Button>
              </form>
            )}

            {!signedIn && (
              <div className="mt-7 border-t border-border pt-6 text-center">
                <p className="text-sm text-muted-foreground">Ainda não possui acesso?</p>
                <Link to="/auth" className="mt-2 inline-block text-sm font-bold text-foreground hover:text-primary">
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
