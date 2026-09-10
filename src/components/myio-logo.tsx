import { cn } from "@/lib/utils";
import logoLight from "@/assets/myio-supply-light.png.asset.json";
import logoDark from "@/assets/myio-supply-dark.png.asset.json";

type Props = {
  className?: string;
  /** "light" = versão clara (fundo escuro), "dark" = versão escura (fundo claro) */
  tone?: "light" | "dark";
};

/** Logotipo oficial myio Supply (Manual da Marca). */
export function MyioLogo({ className, tone = "dark" }: Props) {
  return (
    <img
      src={tone === "light" ? logoLight.url : logoDark.url}
      alt="myio Supply"
      className={cn("w-auto select-none", className)}
      style={{ height: "1.4em" }}
      draggable={false}
    />
  );
}
