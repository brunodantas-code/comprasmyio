import { cn } from "@/lib/utils";
import logoDark from "@/assets/myio-logo-dark.png.asset.json";
import logoLightSrc from "@/assets/myio-logo-light.svg";

type Props = {
  className?: string;
  /** "light" = versão clara para fundo escuro, "dark" = versão escura para fundo claro */
  tone?: "light" | "dark";
};

/** Logotipo oficial myio (Manual da Marca). */
export function MyioLogo({ className, tone = "dark" }: Props) {
  return (
    <img
      src={tone === "light" ? logoDark.url : logoLightSrc}
      alt="myio"
      className={cn("h-auto w-auto select-none", className)}
      style={{ height: "1em" }}
      draggable={false}
    />
  );
}
