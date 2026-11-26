import { fontFormatCss } from "@/components/cde/font-format";
import { cn } from "@/lib/utils";
import logoDark from "@/assets/myio-logo-dark.png.asset.json";
import logoLightSrc from "@/assets/myio-logo-light.svg";
import { APP_TILE_DEFAULT, appDisplay, appLogoPx, appKeyForName, homeHeaderLogoTone, useAppTile, type AppDisplay } from "@/components/cde/app-order-config";

type Props = {
  appName: string;
  className?: string;
  tone?: "light" | "dark" | "auto";
  display?: AppDisplay;
  logoPx?: number;
};

/** Official myio logo, separator and configurable app name shared by every app header. */
export function MyioAppLogo({ appName, className, tone: requestedTone, display, logoPx }: Props) {
  const saved = useAppTile().data ?? APP_TILE_DEFAULT;
  const tone = requestedTone ?? homeHeaderLogoTone(saved);
  const current = display ?? appDisplay(saved, appKeyForName(appName, saved), 16, appName);
  const px = logoPx ?? appLogoPx(saved);
  const imgStyle = { height: `${px}px` };
  const toneClass = tone === "light" ? "text-[var(--myio-white)]" : tone === "auto" ? "text-foreground" : "text-[var(--myio-dark)]";
  return (
    <span className={cn("inline-flex max-w-full items-center gap-3", className)}>
      {tone === "auto" ? <>
        <img data-myio-logo-tone="dark" src={logoLightSrc} alt="myio" className="w-auto shrink-0 select-none dark:hidden" style={imgStyle} draggable={false} />
        <img data-myio-logo-tone="light" src={logoDark.url} alt="myio" className="hidden w-auto shrink-0 select-none dark:block" style={imgStyle} draggable={false} />
      </> : <img data-myio-logo-tone={tone} src={tone === "light" ? logoDark.url : logoLightSrc} alt="myio" className="w-auto shrink-0 select-none" style={imgStyle} draggable={false} />}
      <span aria-hidden="true" className="h-6 w-px shrink-0 bg-current opacity-30 sm:h-7" />
      <span
        className={cn("min-w-0 select-none break-words font-normal leading-tight tracking-normal", toneClass)}
        style={{ ...fontFormatCss(current.format), fontSize: `${current.labelPx}px`, ...(current.color ? { color: current.color } : {}) }}
      >
        {current.name}
      </span>
    </span>
  );
}
