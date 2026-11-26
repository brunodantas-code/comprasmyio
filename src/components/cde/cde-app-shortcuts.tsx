import { APP_SHORTCUTS } from "@/lib/app-shortcuts";
import { appDisplay, type AppTileConfig } from "./app-order-config";

/** Catalog of the actual assets used by route head and phone manifests. */
export function CdeAppShortcuts({ tile }: { tile: AppTileConfig }) {
  return <div className="mt-6 space-y-4 border-t border-border pt-4">
    <h3 className="text-sm font-medium">Favicons e ícones de atalhos</h3>
    <div role="group" aria-label="Favicons e ícones de atalhos" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <figure className="flex min-w-0 flex-col items-center gap-2 text-center">
        <img src="/apple-touch-icon.png" width={64} height={64} alt="Ícone da Home myio ERP" className="size-16 rounded-lg" />
        <figcaption className="text-sm">myio ERP<span className="block text-xs text-muted-foreground">Home Page</span></figcaption>
      </figure>
      {APP_SHORTCUTS.map(app => <figure key={app.key} className="flex min-w-0 flex-col items-center gap-2 text-center">
        <img src={`/app-icons/${app.key}/apple-touch-icon.png`} width={64} height={64} alt={`Ícone de atalho do ${app.name}`} className="size-16 rounded-lg" />
        <figcaption className="max-w-full break-words text-sm">{appDisplay(tile, app.key).name}<span className="block text-xs text-muted-foreground">{app.path}</span></figcaption>
      </figure>)}
    </div>
  </div>;
}