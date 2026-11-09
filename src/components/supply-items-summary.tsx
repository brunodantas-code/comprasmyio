import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog,DialogContent,DialogHeader,DialogTitle } from '@/components/ui/dialog';
import { ExternalLink } from 'lucide-react';
type Item={item_name:string;quantity:number;item_link?:string|null};
export function SupplyItemsSummary({items}:{items:Item[]}) {
 const [open,setOpen]=useState(false); const first=items[0]; if(!first) return <span>—</span>;
 const more=items.length>1||first.item_name.length>64;
 return <><div className="flex h-16 min-w-0 flex-col justify-center"><span className="line-clamp-2 text-xs">{first.item_name.slice(0,64)}{first.item_name.length>64?'…':''}</span>{more?<Button variant="ghost" size="sm" className="h-5 justify-start p-0 text-xs text-foreground hover:text-primary" onClick={()=>setOpen(true)}>Ver itens ({items.length})</Button>:/^https?:\/\//i.test(first.item_link||'')?<a href={first.item_link||''} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-foreground hover:text-primary">Abrir link<ExternalLink className="h-3 w-3"/></a>:null}</div><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Itens da Solicitação</DialogTitle></DialogHeader><ol className="space-y-4">{items.map((item,i)=><li key={i} className="border-b border-border pb-3"><p className="break-words text-sm">{i+1}. {item.item_name}</p><p className="text-xs text-muted-foreground">Quantidade: {item.quantity}</p>{/^https?:\/\//i.test(item.item_link||'')&&<a href={item.item_link||''} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-foreground hover:text-primary">Abrir link<ExternalLink className="h-3 w-3"/></a>}</li>)}</ol></DialogContent></Dialog></>;
}