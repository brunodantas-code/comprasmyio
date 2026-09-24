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

const signInSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});
const signUpSchema = signInSchema.extend({
  full_name: z.string().trim().min(2, "Informe seu nome").max(100),
});

function AuthPage() {
  return <Landing />;
}