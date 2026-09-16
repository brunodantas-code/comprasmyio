import { cn } from "@/lib/utils";
import logoDark from "@/assets/myio-logo-dark.png.asset.json";
import logoLightSrc from "@/assets/myio-logo-light.svg";

type Props = {
  className?: string;
  /** "light" = versão clara para fundo escuro, "dark" = versão escura para fundo claro */
  tone?: "light" | "dark" | "auto";
};

/** Logotipo oficial myio (Manual da Marca) + wordmark "supply". */
export function MyioLogo({ className, tone = "auto" }: Props) {
  return (
    <span className={cn("inline-flex items-end gap-[0.35em]", className)}>
      {tone === "auto" ? <>
        <img src={logoLightSrc} alt="myio" className="h-auto w-auto select-none dark:hidden" style={{ height: "1.5em" }} draggable={false} />
        <img src={logoDark.url} alt="myio" className="hidden h-auto w-auto select-none dark:block" style={{ height: "1.5em" }} draggable={false} />
      </> : <img src={tone === "light" ? logoDark.url : logoLightSrc} alt="myio" className="h-auto w-auto select-none" style={{ height: "1.5em" }} draggable={false} />}
      <span
        className={cn(
          "select-none font-light leading-none tracking-tight",
          tone === "light" ? "text-white" : tone === "auto" ? "text-foreground" : "text-[var(--myio-dark)]",
        )}
        style={{ fontSize: "1.5em", transform: "translateY(-0.155em)" }}
      >
        supply
      </span>
    </span>
  );
}
