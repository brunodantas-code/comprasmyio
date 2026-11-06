import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { supplyManualVersions } from '@/lib/user-manuals';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function UserManualsTab() {
  const [expanded, setExpanded] = useState(false);
  return <Collapsible open={expanded} onOpenChange={setExpanded} className="border-b border-border py-4">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-lg font-semibold">Manual do Usuário</h3>
      <CollapsibleTrigger asChild><Button variant="ghost" size="compactIcon" aria-label={expanded ? 'Recolher Manual do Usuário' : 'Expandir Manual do Usuário'} title={expanded ? 'Recolher' : 'Exibir'}>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </Button></CollapsibleTrigger>
    </div>
    <CollapsibleContent className="pt-4">
      <Table><TableHeader><TableRow><TableHead>Versão</TableHead><TableHead>Data</TableHead><TableHead>Situação</TableHead><TableHead>Revisão</TableHead><TableHead className="text-right">PDF</TableHead></TableRow></TableHeader>
        <TableBody>{supplyManualVersions.map(manual => <TableRow key={manual.version}>
          <TableCell>V{manual.version}</TableCell><TableCell>{manual.date}</TableCell><TableCell>{manual.current ? 'Atual' : 'Anterior'}</TableCell><TableCell className="whitespace-normal">{manual.summary}</TableCell>
          <TableCell className="text-right"><Button asChild variant="ghost" size="compactIcon"><a href={manual.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir PDF do manual V${manual.version}`} title={`Manual V${manual.version}`}><FileText className="h-4 w-4" /></a></Button></TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </CollapsibleContent>
  </Collapsible>;
}