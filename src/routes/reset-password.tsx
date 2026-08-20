import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Package } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Redefinir senha | ComprAqui" },
      { name: "description", content: "Defina uma nova senha para sua conta ComprAqui." },
      { property: "og:title", content: "Redefinir senha | ComprAqui" },
      { property: "og:description", content: "Defina uma nova senha para sua conta ComprAqui." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (password.length < 6) return toast.error("A senha deve ter ao menos 6 caracteres");
    if (password !== confirm) return toast.error("As senhas não coincidem");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Senha alterada com sucesso!");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4 text-primary" /> ComprAqui
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Definir nova senha</CardTitle>
            <CardDescription>
              {ready
                ? "Escolha uma nova senha para sua conta."
                : "Abra esta página pelo link enviado ao seu e-mail."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input id="password" name="password" type="password" required disabled={!ready} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar nova senha</Label>
                <Input id="confirm" name="confirm" type="password" required disabled={!ready} />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !ready}>
                {loading ? "Salvando..." : "Salvar nova senha"}
              </Button>
              <Link to="/auth" className="block text-center text-sm text-muted-foreground hover:underline">
                Voltar ao login
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
