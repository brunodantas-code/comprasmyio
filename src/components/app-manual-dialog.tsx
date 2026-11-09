import { FileText } from 'lucide-react';
import { manualVersions } from '@/lib/user-manuals';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/** Current and previous manual versions of one app, opened from its main menu. */
export function AppManualDialog({ app, open, onOpenChange }: { app: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const versions = manualVersions.filter(m => m.app === app).sort((a, b) => b.version - a.version);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>Manual do Usuário — {app}</DialogTitle></DialogHeader>
    {versions.length === 0 ? <p className="text-sm text-muted-foreground">Manual ainda não disponível.</p> :
      <ul className="divide-y divide-border">{versions.map(m => <li key={m.version} className="flex items-center gap-3 py-2 text-sm">
        <div className="min-w-0 flex-1"><p>V{m.version} · {m.date} · {m.current ? 'Atual' : 'Anterior'}</p><p className="text-xs text-muted-foreground">{m.summary}</p></div>
        <Button asChild variant="ghost" size="compactIcon"><a href={m.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir manual ${app} V${m.version}`} title="Abrir PDF"><FileText className="h-4 w-4" /></a></Button>
      </li>)}</ul>}
  </DialogContent></Dialog>;
}
