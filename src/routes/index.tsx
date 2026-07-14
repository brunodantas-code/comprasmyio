import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Package, ClipboardList, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <Package className="h-5 w-5 text-primary" />
            <span>ComprAqui</span>
          </div>
          <Link to={signedIn ? "/dashboard" : "/auth"}>
            <Button size="sm">{signedIn ? "Abrir painel" : "Entrar"}</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">
          Pedidos de compra
        </p>
        <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">
          Compras de material sem planilha, sem mensagem perdida.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Solicitantes abrem pedidos por projeto, compradores acompanham status e observações,
          e o admin vê tudo — inclusive o histórico completo.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to={signedIn ? "/dashboard" : "/auth"}>
            <Button size="lg">{signedIn ? "Ir para o painel" : "Começar agora"}</Button>
          </Link>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-3">
          {[
            { icon: ClipboardList, title: "Solicitante", body: "Cria pedidos com projeto, item, link e ponto de entrega." },
            { icon: Package, title: "Comprador", body: "Recebe fila de pedidos, muda status e escreve observações (ex.: senha de entrega)." },
            { icon: ShieldCheck, title: "Admin", body: "Gerencia projetos, papéis e vê os logs de tudo que acontece." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-lg border border-border bg-card p-6">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
