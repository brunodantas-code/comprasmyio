import { cn } from "@/lib/utils";
import logoDark from "@/assets/myio-logo-dark.png.asset.json";
import logoLightSrc from "@/assets/myio-logo-light.svg";
import { MyioAppLogo } from "@/components/myio-app-logo";

type Props = {
  className?: string;
  /** "light" = versão clara para fundo escuro, "dark" = versão escura para fundo claro */
  tone?: "light" | "dark" | "auto";
  /** Nome exibido após o logotipo; null oculta. */
  label?: string | null;
};

/** Logotipo oficial myio (Manual da Marca) + nome configurável do app. */
export function MyioLogo({ className, tone: requestedTone, label = "supply" }: Props) {
  if (label !== null) return <MyioAppLogo appName={label} className={className} {...(requestedTone ? { tone: requestedTone } : {})} />;
  const tone = requestedTone ?? "auto";
  return (
    <span className={cn("inline-flex items-end", className)}>
      {tone === "auto" ? <>
        <img data-myio-logo-tone="dark" src={logoLightSrc} alt="myio" className="h-auto w-auto select-none dark:hidden" style={{ height: "1.5em" }} draggable={false} />
        <img data-myio-logo-tone="light" src={logoDark.url} alt="myio" className="hidden h-auto w-auto select-none dark:block" style={{ height: "1.5em" }} draggable={false} />
      </> : <img data-myio-logo-tone={tone} src={tone === "light" ? logoDark.url : logoLightSrc} alt="myio" className="h-auto w-auto select-none" style={{ height: "1.5em" }} draggable={false} />}
    </span>
  );
}
