import { cn } from "@/lib/utils";
import logoDark from "@/assets/myio-logo-dark.png.asset.json";
import logoLightSrc from "@/assets/myio-logo-light.svg";

type Props = {
  className?: string;
  /** "light" = versão clara para fundo escuro, "dark" = versão escura para fundo claro */
  tone?: "light" | "dark";
};

/** Logotipo oficial myio (Manual da Marca) + wordmark "supply". */
export function MyioLogo({ className, tone = "dark" }: Props) {
  return (
    <span className={cn("inline-flex items-end gap-[0.35em]", className)}>
      <img
        src={tone === "light" ? logoDark.url : logoLightSrc}
        alt="myio"
        className="h-auto w-auto select-none"
        style={{ height: "1.5em", marginBottom: tone === "dark" ? "0.3em" : "0em" }}
        draggable={false}
      />
      <span
        className={cn(
          "select-none font-light leading-none tracking-tight",
          tone === "light" ? "text-white" : "text-[var(--myio-dark)]",
        )}
        style={{ fontSize: "1.5em" }}
      >
        supply
      </span>
    </span>
  );
}
