import { cn } from "@/lib/utils";
import logoLightSrc from "@/assets/myio-logo-light.svg";
import logoDark from "@/assets/myio-logo-dark.png.asset.json";

type Props = {
  className?: string;
  tone?: "light" | "dark" | "auto";
};

export function MyioPlatformLogo({ className, tone = "auto" }: Props) {
  if (tone === "auto") {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <img src={logoLightSrc} alt="myio" className="h-full w-auto select-none dark:hidden" draggable={false} />
        <img src={logoDark.url} alt="myio" className="hidden h-full w-auto select-none dark:block" draggable={false} />
      </span>
    );
  }
  return (
    <img
      src={tone === "light" ? logoDark.url : logoLightSrc}
      alt="myio"
      className={cn("h-auto w-auto select-none", className)}
      draggable={false}
    />
  );
}