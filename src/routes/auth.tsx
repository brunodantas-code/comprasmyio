import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "./index";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Entrar | myio ERP" },
      { name: "description", content: "Acesse a plataforma myio ERP e seus aplicativos." },
      { property: "og:title", content: "Entrar | myio ERP" },
      { property: "og:description", content: "Acesse a plataforma myio ERP e seus aplicativos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AuthPage() {
  return <Landing />;
}