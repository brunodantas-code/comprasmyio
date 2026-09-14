import { cn } from "@/lib/utils";
import logoLightSrc from "@/assets/myio-logo-light.svg";
import logoDark from "@/assets/myio-logo-dark.png.asset.json";

type Props = {
  className?: string;
  tone?: "light" | "dark";
};

export function MyioPlatformLogo({ className, tone = "dark" }: Props) {
  return (
    <img
      src={tone === "light" ? logoDark.url : logoLightSrc}
      alt="myio"
      className={cn("h-auto w-auto select-none", className)}
      draggable={false}
    />
  );
}