import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/app-header";
import { MyioAppLogo } from "@/components/myio-app-logo";
import { WishlistWorkspace } from "@/components/wishlist/workspace";
import { wishlistOptions } from "@/components/wishlist/data";

export const Route = createFileRoute("/_authenticated/wishlist")({
  beforeLoad: async () => {
    const result = await supabase.rpc("wishlist_can_access");
    if (result.error || !result.data) throw redirect({ to: "/portal" });
  },
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(wishlistOptions(context.user.id)); },
  component: WishlistPage,
  errorComponent: WishlistError,
  notFoundComponent: () => <div className="p-6"><p>Desejo não encontrado.</p><Button asChild variant="ghost"><Link to="/wishlist">Wishlist</Link></Button></div>,
  head: () => ({ meta: [
    { title: "Wishlist | Ideias de inovação myio" },
    { name: "description", content: "Desejos e ideias de inovação compartilhados entre usuários myio, com idealizadores, conversas e roadmap para futuros projetos." },
    { property: "og:title", content: "Wishlist | Ideias de inovação myio" },
    { property: "og:description", content: "Registre ideias de inovação, contribua com perguntas e respostas e planeje futuros projetos da myio." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});
function WishlistPage() {
  const { user } = Route.useRouteContext();
  return <div className="min-h-screen bg-background"><AppHeader logo={<MyioAppLogo appName="Wishlist" className="text-xl sm:text-2xl" />} /><WishlistWorkspace userId={user.id} /></div>;
}
function WishlistError() {
  const router = useRouter();
  return <div className="space-y-4 p-6" role="alert"><p>Não foi possível carregar o Wishlist.</p><Button onClick={() => void router.invalidate()}>Tentar novamente</Button><Button asChild variant="ghost"><Link to="/portal">Todos os apps</Link></Button></div>;
}