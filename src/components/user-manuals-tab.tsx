import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { manualVersions } from '@/lib/user-manuals';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function UserManualsTab() {
  const [expanded, setExpanded] = useState(false);
  return <Collapsible open={expanded} onOpenChange={setExpanded} asChild><Card>
    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
      <CardTitle>Manual do Usuário</CardTitle>
      <CollapsibleTrigger asChild><Button variant="ghost" size="compactIcon" aria-label={expanded ? 'Recolher Manual do Usuário' : 'Expandir Manual do Usuário'} title={expanded ? 'Recolher' : 'Exibir'}>
        {expanded ? <ChevronUp /> : <ChevronDown />}
      </Button></CollapsibleTrigger>
    </CardHeader>
    <CollapsibleContent asChild><CardContent>
      <Table><TableHeader><TableRow><TableHead>App</TableHead><TableHead>Versão</TableHead><TableHead>Data</TableHead><TableHead>Situação</TableHead><TableHead>Revisão</TableHead><TableHead className="text-right">PDF</TableHead></TableRow></TableHeader>
        <TableBody>{manualVersions.filter(m => m.app === "Supply").map(manual => <TableRow key={`${manual.app}-${manual.version}`}>
          <TableCell>{manual.app}</TableCell><TableCell>V{manual.version}</TableCell><TableCell>{manual.date}</TableCell><TableCell>{manual.current ? 'Atual' : 'Anterior'}</TableCell><TableCell className="whitespace-normal">{manual.summary}</TableCell>
          <TableCell className="text-right"><Button asChild variant="ghost" size="compactIcon"><a href={manual.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir PDF do manual ${manual.app} V${manual.version}`} title={`Manual ${manual.app} V${manual.version}`}><FileText className="h-4 w-4" /></a></Button></TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </CardContent></CollapsibleContent>
  </Card></Collapsible>;
}
