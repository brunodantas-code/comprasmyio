import { cn } from "@/lib/utils";
import logoDark from "@/assets/myio-logo-dark.png.asset.json";
import logoLightSrc from "@/assets/myio-logo-light.svg";
import { APP_TILE_DEFAULT, appDisplay, appKeyForName, useAppTile, type AppDisplay } from "@/components/cde/app-order-config";

type Props = {
  appName: string;
  className?: string;
  tone?: "light" | "dark" | "auto";
  display?: AppDisplay;
};

/** Official myio logo, separator and configurable app name shared by every app header. */
export function MyioAppLogo({ appName, className, tone = "auto", display }: Props) {
  const saved = useAppTile().data ?? APP_TILE_DEFAULT;
  const current = display ?? appDisplay(saved, appKeyForName(appName), 16, appName);
  const toneClass = tone === "light" ? "text-[var(--myio-white)]" : tone === "auto" ? "text-foreground" : "text-[var(--myio-dark)]";
  return (
    <span className={cn("inline-flex max-w-full items-center gap-3", className)}>
      {tone === "auto" ? <>
        <img src={logoLightSrc} alt="myio" className="h-10 w-auto shrink-0 select-none dark:hidden sm:h-12" draggable={false} />
        <img src={logoDark.url} alt="myio" className="hidden h-10 w-auto shrink-0 select-none dark:block sm:h-12" draggable={false} />
      </> : <img src={tone === "light" ? logoDark.url : logoLightSrc} alt="myio" className="h-10 w-auto shrink-0 select-none sm:h-12" draggable={false} />}
      <span aria-hidden="true" className="h-6 w-px shrink-0 bg-current opacity-30 sm:h-7" />
      <span
        className={cn("min-w-0 select-none break-words font-normal leading-tight tracking-normal", toneClass)}
        style={{ fontSize: `${current.labelPx}px`, ...(current.color ? { color: current.color } : {}) }}
      >
        {current.name}
      </span>
    </span>
  );
}
