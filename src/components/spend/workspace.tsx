import "./workspace.css";
import { useTextCaseChoice } from "@/hooks/use-text-case-choice";
import { useEffect, useState } from "react";
import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useSuspenseQuery, useQueryClient, useQuery } from "@tanstack/react-query";
import { Camera, Check, CheckCheck, CreditCard, DollarSign, FileUp, Download, Bell, Paperclip, History, ReceiptText, WandSparkles, Loader2, Save, MessageSquareWarning, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { MyioAppLogo } from "@/components/myio-app-logo";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SpendStatementPreview } from "./statement-preview";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { classificationAccess, showReceiptCnpj, classificationTargets, toggleFilteredSelection } from "./classification";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AppNavigation } from "@/components/ui/app-navigation";
import { useAppMenuLayout } from "@/components/cde/cde-menu-type";
import { useMenuOrders, sortByMenuOrder } from "@/components/cde/menu-order";
import { useTableFilters } from "@/components/use-table-filters";
import { supabase } from "@/integrations/supabase/client";
import { BRL, formatDate } from "@/components/cash-flow/shared";
import { spendOptions, spendAction, saveSpendClassification, spendFileUrl, type Line, type Receipt, type SpendData } from "./data";
import { SpendCapture } from "./capture";
import { SpendCards } from "./cards";
import { SpendSupplierAllocations } from "./supplier-allocations";
import { SpendStatementImport } from "./statement-import";
import { categories, canMatch } from "./rules";
import { approvalShortcut } from "./shortcut";
import { spendDescription } from "./text-case";
import { SpendTextCaseToggle } from "./text-case-toggle";
import { canEditSpendReceipt } from "./receipt-edit";
import { statementTotal } from "./statement-total";
import { confirmAction } from "@/components/confirm-dialog";
import { isCardReceipt, paymentSourceLabels } from "./payment-source";
import { TableSortMenu, type TableSorting } from "@/components/table-sort-menu";
import { compareColumnValues } from "@/lib/column-sort";
import { ReimbursementDialog } from './reimbursement-dialog';
import { competenceLines, monthOptions, statementMonth } from './period-filters';
import { useSpendProjectReview } from './project-review-dialog';
import { canClassifySpend, type ProjectReview } from './project-review';
import { extractSpendDocument } from '@/lib/spend.functions';
import { prepareSpendMatches, receiptReading, receiptVerification } from './receipt-verification';
const statusNames: Record<string,string> = { pending: "Pendente conciliação com fatura", matched: "Conciliado", approved: "Enviado ao Finance", adjustment: "Ajuste solicitado" };
function ReceiptPreview({ path, fullSize = false }: { path: string; fullSize?: boolean }) {
  const url = useQuery({ queryKey: ["spend-file", path], queryFn: () => spendFileUrl(path), staleTime: 300000 });
  if (url.isPending) return <Loader2 className="size-5 animate-spin" />;
  if (url.error) return <p className="text-sm text-destructive">Comprovante indisponível</p>;
  if (path.endsWith('.pdf')) return <a href={url.data} target="_blank" rel="noreferrer" className="text-sm underline hover:text-primary">Abrir comprovante PDF</a>;
  if (fullSize) return <img src={url.data} alt="Imagem do comprovante fiscal" className="mx-auto h-auto max-w-full object-contain" />;
  return <a href={url.data} target="_blank" rel="noreferrer" className="group block overflow-hidden"><img src={url.data} alt="Comprovante do lançamento" className="h-64 w-full rounded-md object-contain transition-transform group-hover:scale-125 motion-reduce:transition-none" /></a>;
}
function ReceiptAttachment({ path, merchant }: { path: string; merchant: string }) {
  const [open, setOpen] = useState(false);
  return <><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={`Abrir comprovante de ${merchant}`} onClick={() => setOpen(true)}><Paperclip /></Button></TooltipTrigger><TooltipContent>Abrir comprovante</TooltipContent></Tooltip></TooltipProvider><Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-3xl" aria-describedby={undefined}><DialogHeader><DialogTitle className="break-words">Comprovante · {merchant}</DialogTitle></DialogHeader>{open && <ReceiptPreview path={path} fullSize />}</DialogContent></Dialog></>;
}
function Audit({ line, data, busy, expanded, approve, save, notify, attach, link }: { line: Line; data: SpendData; busy: boolean; expanded: boolean; save: (line: Line,a:string,c:string,p:string,cnpj:boolean|null,notApplicable:boolean) => Promise<void>; approve: (line: Line,a:string,c:string,p:string) => Promise<void>; notify: (type:string) => void; attach: () => void; link: (id:string) => void }) {
  const receipt = data.receipts.find(r => r.id === line.receipt_id); const cfg = data.settings[receipt?.category ?? line.category ?? ''];
  const [account,setAccount] = useState(line.account_id ?? cfg?.account_id ?? ''); const [center,setCenter] = useState(line.cost_center_id ?? cfg?.cost_center_id ?? ''); const [project,setProject] = useState(line.project_id ?? '');
  const statement = data.statements.find(s => s.id === line.statement_id); const card = data.cards.find(c => c.id === statement?.card_id);
  const candidates = card ? data.receipts.filter(r => isCardReceipt(r) && !data.lines.some(l => l.receipt_id === r.id) && canMatch({ card_id:card.id,date:line.date,amount:line.amount,final_cartao:line.last_four ?? '' },{card_id:r.card_id,date:r.date,amount:r.amount,final_cartao:card.last_four})) : [];
  const [cnpj,setCnpj] = useState<boolean|null>(line.myio_cnpj ?? receipt?.myio_cnpj ?? null);
  const [notApplicable,setNotApplicable] = useState(line.receipt_not_applicable);
  useEffect(() => { setAccount(line.account_id ?? cfg?.account_id ?? ''); setCenter(line.cost_center_id ?? cfg?.cost_center_id ?? ''); setNotApplicable(line.receipt_not_applicable); }, [line.account_id,line.cost_center_id,line.receipt_not_applicable]);
  useEffect(() => { setProject(line.project_id ?? ''); }, [line.project_id]);
  useEffect(() => { setCnpj(line.myio_cnpj ?? receipt?.myio_cnpj ?? null); }, [line.myio_cnpj,line.receipt_id,receipt?.myio_cnpj]);
  const locked = line.status === 'approved';
  const access = classificationAccess(busy,locked,!!receipt,account,center,notApplicable && line.receipt_not_applicable);
  useEffect(() => {
    function keydown(e: KeyboardEvent) {
      const editing = e.target instanceof HTMLElement && !!e.target.closest('input,textarea,[role=combobox],[role=dialog],button,[contenteditable=true]');
      if (expanded && approvalShortcut(e.key, e.repeat, busy, locked, editing) && access.canApprove) { e.preventDefault(); void approve(line, account, center, project); }
    }
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [busy, locked, receipt, account, center, project, line, approve, access.canApprove, expanded]);
  return <section aria-label={`Classificação de ${line.merchant}`} className="min-w-0 space-y-3 py-2 text-left" tabIndex={0}>
    <h3 className="text-sm text-muted-foreground">Classificação financeira</h3>
    <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3"><label className="block min-w-0 space-y-1"><Label>Plano de Contas</Label><SearchableSelect aria-label="Plano de Contas do lançamento" disabled={locked} value={account} onChange={setAccount} options={data.accounts.map(a=>({value:a.id,label:a.name}))} placeholder="Selecionar conta contábil" /></label><label className="block min-w-0 space-y-1"><Label>Centro de Custo</Label><SearchableSelect aria-label="Centro de Custo do lançamento" disabled={locked} value={center} onChange={setCenter} options={data.centers.map(a=>({value:a.id,label:a.name}))} placeholder="Selecionar Centro de Custo" /></label><label className="block min-w-0 space-y-1"><Label>Projeto</Label><SearchableSelect aria-label="Projeto do lançamento" disabled={locked} value={project} onChange={setProject} options={data.projects.map(a=>({value:a.id,label:a.name}))} placeholder="Projeto (opcional)" /></label></div>
    {!receipt && <label className="flex items-center gap-2 text-xs"><Checkbox aria-label="Comprovante não se aplica" checked={notApplicable} disabled={busy || locked} onCheckedChange={v=>setNotApplicable(v===true)} /><span>Comprovante: Não se aplica</span></label>}
    <div className="flex items-center gap-2" aria-label="Ações do lançamento">
      {!receipt && <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Anexar comprovante" title={notApplicable ? "Anexar comprovante" : "Sem comprovante"} className={notApplicable ? "shrink-0" : "shrink-0 !text-destructive"} disabled={busy || locked} onClick={attach}><Paperclip className={notApplicable ? undefined : "!text-destructive"} /></Button></TooltipTrigger><TooltipContent>{notApplicable ? "Anexar comprovante" : "Sem comprovante"}</TooltipContent></Tooltip></TooltipProvider>}
      {!receipt && !notApplicable && <Button variant="ghost" size="icon" title="Notificar Portador" aria-label="Notificar Portador" disabled={busy || locked} onClick={() => notify('notify')}><Bell /></Button>}
      <Button variant="ghost" size="icon" title="Rejeitar / Pedir ajuste" aria-label="Rejeitar / Pedir ajuste" disabled={busy || locked} onClick={() => notify('adjustment')}><MessageSquareWarning /></Button>
      <Button variant="ghost" size="icon" aria-label="Salvar classificação" title="Salvar classificação" disabled={!access.canSave} onClick={() => save(line,account,center,project,cnpj,notApplicable)}><Save /></Button>
      <Button className="ml-0 shrink-0 sm:ml-auto" disabled={!access.canApprove} onClick={() => approve(line,account,center,project)}><Check />{locked ? 'Enviado ao Finance' : 'Aprovar'}</Button>
    </div>
    {receipt ? <><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"><span className="min-w-0 text-sm">Comprovante</span><Badge><Check />Conciliado</Badge></div><ReceiptPreview path={receipt.file_path} /><p className="text-sm">Portador: {data.users.find(u => u.id === receipt.holder_id)?.name ?? '—'}</p><p className="break-words text-sm">Projeto informado pelo portador: {data.projects.find(p => p.id === receipt.project_id)?.name ?? (receipt.project_id ? 'Projeto indisponível' : 'Não informado')}</p>{receipt.observation && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{receipt.observation}</p>}<div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">Categoria informada pelo portador</span><Badge>{data.settings[receipt.category]?.name || categories.find(c => c.key === receipt.category)?.name || receipt.category}</Badge></div></> : candidates.length > 0 && <SearchableSelect aria-label="Vincular comprovante" value="" placeholder="Selecionar comprovante correspondente" onChange={link} options={candidates.map(r => ({value:r.id,label:`${formatDate(r.date)} · ${r.merchant} · ${BRL.format(r.amount)}`}))} />}
    {showReceiptCnpj(receipt?.id ?? null) && <RadioGroup aria-label="CNPJ no comprovante" value={cnpj === null ? "" : cnpj ? "com" : "sem"} onValueChange={v => setCnpj(v === "com")} disabled={locked || busy} className="flex flex-wrap gap-4">{[["com","Com CNPJ myio"],["sem","Sem CNPJ myio"]].map(([value,label]) => <label key={value} className="flex items-center gap-2 text-sm"><RadioGroupItem value={value ?? ""} /><span>{label}</span></label>)}</RadioGroup>}

  </section>;
}
function LineRows(props: React.ComponentProps<typeof Audit> & { sentenceCase:boolean; selected:boolean; toggle:()=>void; select:(v:boolean)=>void }) {
  const {line:l,expanded}=props;
  return <><TableRow className="spend-line-row"><TableCell className="spend-line-select"><Checkbox aria-label={`Selecionar ${l.merchant}`} checked={props.selected} disabled={l.status==='approved'} onCheckedChange={v=>props.select(v===true)}/></TableCell><TableCell className="spend-line-detail max-w-56"><span className="spend-line-date block text-xs text-muted-foreground"><span className="spend-line-date-label">Data</span><span>{formatDate(l.date)}{l.installment?` · Parcela ${l.installment}`:''}</span></span><span className="spend-line-merchant block min-w-0 truncate" title={l.merchant}><span className="spend-line-merchant-label">Descrição</span><span className="spend-line-merchant-text">{spendDescription(l.merchant,props.sentenceCase)}</span></span></TableCell><TableCell className="spend-line-amount whitespace-nowrap tabular-nums">{BRL.format(l.amount)}</TableCell><TableCell className="spend-line-status">{l.receipt_id || l.receipt_not_applicable?<><Badge>{statusNames[l.status]}</Badge>{l.receipt_not_applicable && <span className="block text-xs text-muted-foreground">Comprovante: Não se aplica</span>}</>:!expanded&&<span className="text-xs text-destructive">Sem comprovante</span>}{l.receipt_id&&l.myio_cnpj!==null&&<Badge>{l.myio_cnpj?'Com CNPJ myio':'Sem CNPJ myio'}</Badge>}</TableCell><TableCell className="spend-line-actions"><Button variant="ghost" size="icon" title={expanded?'Recolher classificação':'Exibir classificação'} aria-label={`${expanded?'Recolher':'Exibir'} classificação de ${l.merchant}`} aria-expanded={expanded} onClick={props.toggle}>{expanded?<ChevronUp/>:<ChevronDown/>}</Button></TableCell></TableRow><TableRow className="spend-audit-row" hidden={!expanded}><TableCell colSpan={5}><Audit {...props}/></TableCell></TableRow></>;
}
export function SpendWorkspace() {
  const {data}=useSuspenseQuery(spendOptions); const qc=useQueryClient(); const ml=useAppMenuLayout('Spend'); const orders=useMenuOrders().data;
  const [sentenceCase,setSentenceCase]=useTextCaseChoice(`spend:${data.user_id}`);
  const finance=canClassifySpend(data.role); const [tab,setTab]=useState(finance?'reconcile':'receipts'); const [cardId,setCardId]=useState(''); const [period,setPeriod]=useState(new Date().toLocaleDateString('en-CA').slice(0,7)); const [lineId,setLineId]=useState(''); const [selected,setSelected]=useState<Set<string>>(new Set()); const [busy,setBusy]=useState(false); const [capture,setCapture]=useState<{line?:Line;receipt?:Receipt}|null>(null); const [importing,setImporting]=useState(false); const [notice,setNotice]=useState<string|null>(null); const [message,setMessage]=useState('');
  const projectReview=useSpendProjectReview(data.projects);
  const extract=useServerFn(extractSpendDocument);
  async function verifyReceipt(line: Line, receipt: Receipt | undefined) {
    if(!receipt)return;
    const reading=receiptReading(await extract({data:{path:receipt.file_path,kind:'receipt'}}));
    const check=receiptVerification(reading,line);
    if(!check.ok){
      if(check.amountMismatch&&reading)throw new Error(`${line.merchant}: comprovante ${BRL.format(reading.amount)}, lançamento ${BRL.format(line.amount)}. Selecione o comprovante correto.`);
      if(check.dateMismatch&&reading)throw new Error(`${line.merchant}: data do comprovante ${formatDate(reading.date)}, lançamento ${formatDate(line.date)}. A tolerância é de 2 dias.`);
      throw new Error(`${line.merchant}: não foi possível conferir o comprovante. Selecione um arquivo legível.`);
    }
    if(!receiptVerification(reading,receipt).ok)throw new Error(`${receipt.merchant}: corrija valor/data do comprovante pelo lápis antes de conciliar.`);
  }
  async function reviewProject(line: Line, project: string) {
    const receipt=data.receipts.find(r=>r.id===line.receipt_id);
    return projectReview.confirmProject(line.merchant,line.receipt_id,receipt?.project_id??null,project||null);
  }
  const [competence,setCompetence]=useState('statement');
  const ownCard=data.cards.find(c=>c.holder_id===data.user_id); const card=tab==='receipts'&&!finance?ownCard:data.cards.find(c=>c.id===cardId) ?? (tab==='receipts'?ownCard:undefined) ?? data.cards.find(c=>c.id===cardId) ?? data.cards[0]; const statement=data.statements.find(s=>s.card_id===card?.id && statementMonth(s)===period);
  const cardStatements=data.statements.filter(s=>s.card_id===card?.id);
  const year=Number(period.slice(0,4));
  const dueOptions=monthOptions([...cardStatements.map(statementMonth),period,...[year-1,year,year+1].flatMap(y=>Array.from({length:12},(_,m)=>`${y}-${String(m+1).padStart(2,'0')}`))]);
  const cardStatementIds=new Set(cardStatements.map(s=>s.id));
  const competenceOptions=monthOptions(data.lines.filter(l=>cardStatementIds.has(l.statement_id)).map(l=>l.date));
  const statementLines=data.lines.filter(l=>l.statement_id===statement?.id);
  const lines=competenceLines(data.lines,data.statements,card?.id??'',statement?.id,competence); const active=lines.find(l=>l.id===lineId); const receipts=data.receipts.filter(r=>r.card_id===card?.id && (tab==='receipts' || (isCardReceipt(r) && receiptInStatementWindow(r.date)))); function receiptInStatementWindow(date:string){if(!statementLines.length)return date.slice(0,7)===period;const ds=statementLines.map(l=>l.date).sort();const t=Date.parse(`${date}T00:00:00Z`);return t>=Date.parse(`${ds[0]}T00:00:00Z`)-2*86400000&&t<=Date.parse(`${ds[ds.length-1]}T00:00:00Z`)+2*86400000;}
  const receiptColumns = [
    { key: 'merchant', label: 'Estabelecimento', value: (r: Receipt) => r.merchant },
    { key: 'payment_source', label: 'Forma de pagamento', value: (r: Receipt) => isCardReceipt(r) ? paymentSourceLabels.myio_card : paymentSourceLabels.reimbursement },
    { key: 'date', label: 'Data', value: (r: Receipt) => r.date },
    { key: 'amount', label: 'Valor', kind: 'number' as const, value: (r: Receipt) => r.amount },
    { key: 'category', label: 'Categoria', value: (r: Receipt) => data.settings[r.category]?.name || categories.find(c => c.key === r.category)?.name || r.category },
    { key: 'project', label: 'Projeto', value: (r: Receipt) => data.projects.find(p => p.id === r.project_id)?.name ?? '' },
    { key: 'status', label: 'Situação', value: (r: Receipt) => isCardReceipt(r) ? statusNames[r.status] ?? r.status : r.reimbursement_order_id ? 'Solicitado no Supply' : 'Reembolso a solicitar' },
  ];
  const receiptFilters = useTableFilters(receipts, receiptColumns);
  const [receiptSorting, setReceiptSorting] = useState<TableSorting | undefined>();
  const receiptSortColumn = receiptColumns.find(c => c.key === receiptSorting?.key);
  const visibleReceipts = receiptSortColumn && receiptSorting ? [...receiptFilters.filtered].sort((a,b) => compareColumnValues(('kind' in receiptSortColumn ? receiptSortColumn.kind : undefined) ?? 'text', receiptSortColumn.value(a), receiptSortColumn.value(b), receiptSorting.direction)) : receiptFilters.filtered;
  const filters=useTableFilters(lines,[{key:'merchant',label:'Estabelecimento',value:l=>l.merchant},{key:'status',label:'Situação',value:l=>l.receipt_not_applicable?'Comprovante não se aplica':l.status==='pending'?'Sem comprovante':statusNames[l.status] ?? l.status},{key:'amount',label:'Valor',kind:'number',value:l=>l.amount},{key:'date',label:'Data',value:l=>l.date}]);
  const selectable=filters.filtered.filter(l=>l.status!=='approved');
  const selectedVisible=selectable.filter(l=>selected.has(l.id)).length;
  const refresh=async()=>{ await Promise.all([qc.invalidateQueries({queryKey:['spend']}),qc.invalidateQueries({queryKey:['cash-flow-payables']})]); };
  useEffect(()=>{setLineId('');setSelected(new Set());},[card?.id,period,competence]); const [dueDraft,setDueDraft]=useState(''); useEffect(()=>{setDueDraft(statement?.due_date??'');},[statement?.id,statement?.due_date]); async function saveDue(){if(!statement||!dueDraft)return;setBusy(true);try{const {error}=await supabase.rpc('spend_set_statement_due',{_statement_id:statement.id,_due_date:dueDraft});if(error)throw error;await refresh();setPeriod(dueDraft.slice(0,7));toast.success(`Fatura movida para ${dueDraft.slice(5,7)}/${dueDraft.slice(0,4)}`);}catch(e){toast.error(e instanceof Error?e.message:'Não foi possível salvar o vencimento');}finally{setBusy(false);}}
  async function action(type:string,payload: Parameters<typeof spendAction>[1]) {
    setBusy(true);
    try{
      if(payload&&typeof payload==='object'&&!Array.isArray(payload)){
        if(type==='link'){
          const line=data.lines.find(l=>l.id===payload['line_id']);const receipt=data.receipts.find(r=>r.id===payload['receipt_id']);
          if(!line||!receipt)throw new Error('Comprovante ou lançamento não encontrado');
          await verifyReceipt(line,receipt);
        }
        if(type==='automatch'&&typeof payload['statement_id']==='string'){
          const skipped=await prepareSpendMatches(data,payload['statement_id'],path=>extract({data:{path,kind:'receipt'}}));
          if(skipped)toast.warning(`${skipped} comprovante(s) permanecerão pendentes por divergência ou leitura indisponível.`);
        }
      }
      await spendAction(type,payload);await refresh();
    }catch(e){toast.error(e instanceof Error?e.message:'Não foi possível concluir');}finally{setBusy(false);}
  }
  async function approve(line:Line,account:string,center:string,project:string) {setBusy(true);try{await verifyReceipt(line,data.receipts.find(r=>r.id===line.receipt_id));const review=await reviewProject(line,project);if(!review)return;await spendAction('approve',{line_id:line.id,account_id:account,cost_center_id:center,project_id:project||null,project_review:review});await refresh();setLineId(lines.find(l=>l.id!==line.id && l.status!=='approved')?.id??'');toast.success('Lançamento enviado ao Finance');}catch(e){toast.error(e instanceof Error?e.message:'Não foi possível aprovar');}finally{setBusy(false);}}
  async function save(line:Line,account:string,center:string,project:string,cnpj:boolean|null,notApplicable:boolean) {
    const ids=classificationTargets(lines,selected,line.id);
    setBusy(true);
    try {
      if (lines.some(l=>ids.includes(l.id)&&l.statement_id!==line.statement_id)) throw new Error('Para aplicar uma classificação em lote, selecione gastos da mesma fatura.');
      if(ids.length>1 && !await confirmAction(`Aplicar a classificação a todos os selecionados? ${ids.length} movimentos receberão o mesmo Plano de Contas e Centro de Custo${notApplicable ? ', com comprovante marcado como Não se aplica' : ''}. O projeto de cada despesa será conferido antes de salvar.`,{title:'Aplicar classificação',confirmLabel:'Aplicar a todos'})) return;
      const reviews: Record<string,ProjectReview>={};
      for(const target of lines.filter(l=>ids.includes(l.id))){const review=await reviewProject(target,project);if(!review)return;reviews[target.id]=review;}
      await saveSpendClassification({line_ids:ids,account_id:account||null,cost_center_id:center||null,project_id:project||null,myio_cnpj:cnpj,receipt_not_applicable:notApplicable,project_reviews:reviews});
      await refresh();toast.success(ids.length>1?`Classificação salva em ${ids.length} movimentos`:'Classificação salva');
    } catch(e){toast.error(e instanceof Error?e.message:'Não foi possível salvar');}finally{setBusy(false);}
  }
  async function batch() {
    setBusy(true);let count=0;
    try{
      const targets=lines.filter(l=>selected.has(l.id)&&l.status!=='approved');
      if(new Set(targets.map(l=>l.statement_id)).size>1)throw new Error('Para aprovar um lote, selecione gastos da mesma fatura.');
      const approvals: {line:Line;account:string;center:string;review:ProjectReview}[]=[];
      for(const l of targets){
        const r=data.receipts.find(r=>r.id===l.receipt_id);const s=data.settings[r?.category??''];const a=l.account_id||s?.account_id;const c=l.cost_center_id||s?.cost_center_id;
        if((!r&&!l.receipt_not_applicable)||!a||!c)throw new Error(`${l.merchant}: confira comprovante, conta e centro de custo`);
        await verifyReceipt(l,r);
        const review=await reviewProject(l,l.project_id??'');if(!review)return;
        approvals.push({line:l,account:a,center:c,review});
      }
      for(const item of approvals){await spendAction('approve',{line_id:item.line.id,account_id:item.account,cost_center_id:item.center,project_id:item.line.project_id,project_review:item.review});count++;}
      setSelected(new Set());toast.success(`${count} lançamentos enviados ao Finance`);
    }catch(e){toast.error(`${count?`${count} lançamentos enviados; `:''}${e instanceof Error?e.message:'Não foi possível aprovar o lote'}`);}finally{await refresh();setBusy(false);}
  }
  async function exportZip(){if(!card)return;setBusy(true);try{const {default:JSZip}=await import('jszip');const zip=new JSZip();const paths=[...new Set([...receipts.map(r=>r.file_path),...(statement?[statement.file_path]:[])])];for(const path of paths){const r=await supabase.storage.from('spend-files').download(path);if(r.error)throw r.error;if(r.data)zip.file(path,r.data);}zip.file('classificacao.json',JSON.stringify({cartao:card.name,periodo:period,lancamentos:statementLines,comprovantes:receipts},null,2));const blob=await zip.generateAsync({type:'blob'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Spend-${period}-${card.last_four}.zip`;a.click();URL.revokeObjectURL(url);}catch(e){toast.error(e instanceof Error?e.message:'Não foi possível exportar');}finally{setBusy(false);}}
  const total=statementLines.reduce((s,l)=>s+Math.max(0,l.amount),0);const matched=statementLines.filter(l=>l.receipt_id || l.receipt_not_applicable).reduce((s,l)=>s+Math.max(0,l.amount),0);const pct=total?Math.round(matched/total*100):0;
  const tabs=sortByMenuOrder([{value:'receipts',label:'Meus comprovantes',icon:ReceiptText},...(finance?[{value:'reconcile',label:'Conciliação',icon:CheckCheck},{value:'cards',label:'Cartões',icon:CreditCard},{value:'allocations',label:'Alocação Automática (De-Para)',icon:WandSparkles}]:[]),{value:'logs',label:'Histórico',icon:History}],orders?.['Spend|Barra inferior']?.map(label => label === 'Meus gastos' ? 'Meus comprovantes' : label));
  return <div className="min-h-screen bg-background"><AppHeader logo={<MyioAppLogo appName="Spend" />} /><main className={`mx-auto max-w-[1500px] space-y-6 px-4 pb-32 pt-6 sm:px-6 ${ml.main}`}>
    <header className="space-y-4"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><h1 className="min-w-0 text-xl">{tab==='reconcile'?'Conciliação de faturas':tab==='cards'?'Cartões':tab==='logs'?'Histórico':tab==='allocations'?'Alocação Automática (De-Para)':'Meus comprovantes'}</h1>{tab==='receipts'&&<div className="flex shrink-0 items-center gap-2">{receiptFilters.menu}<TableSortMenu columns={receiptColumns} {...(receiptSorting ? { value: receiptSorting } : {})} onChange={setReceiptSorting} iconOnly/><SpendTextCaseToggle active={sentenceCase} onChange={setSentenceCase}/></div>}</div>{tab!=='cards'&&tab!=='allocations'&&<div className="spend-expense-toolbar" aria-label="Resumo e seleção de gastos">
      {card&&tab==='receipts'&&<div className="min-w-0"><p className="text-xs text-muted-foreground">Total dos gastos selecionados</p><strong className="text-xl tabular-nums">{BRL.format(visibleReceipts.filter(r=>r.status!=='approved').reduce((sum,r)=>sum+r.amount,0))}</strong><p className="text-xs text-muted-foreground">{visibleReceipts.length} comprovantes</p></div>}
      {tab==='receipts'&&finance?<div className="spend-card-summary min-w-0"><Label>Cartão</Label><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:gap-3"><div className="min-w-0 sm:w-72"><SearchableSelect aria-label="Cartão dos comprovantes" value={card?.id??''} onChange={setCardId} options={data.cards.map(c=>({value:c.id,label:`${c.name} · ${c.last_four} · ${data.users.find(u=>u.id===c.holder_id)?.name??''}`}))} placeholder="Selecionar cartão" /></div>{card?.holder_id===data.user_id&&<ReimbursementDialog receipts={visibleReceipts} userId={data.user_id}/>}</div></div>:tab==='receipts'?<div className="spend-card-summary min-w-0"><Label>Seu cartão</Label><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:gap-3"><p className="flex h-9 min-w-0 items-center gap-1 text-sm" title={card?`${card.name} · ${card.last_four}`:undefined}>{card?<><span className="min-w-0 truncate">{card.name}</span><span className="shrink-0">· •••• {card.last_four}</span></>:'Nenhum cartão vinculado'}</p>{card&&<ReimbursementDialog receipts={visibleReceipts} userId={data.user_id}/>}</div></div>:<div className="min-w-0"><Label>Cartão</Label><SearchableSelect aria-label="Cartão Spend" value={card?.id??''} onChange={setCardId} options={data.cards.map(c=>({value:c.id,label:`${c.name} · ${c.last_four}`}))} placeholder="Selecionar cartão" /></div>}{tab!=='receipts'&&<div className="min-w-0"><Label>Vencimento da fatura · mês/ano</Label><SearchableSelect aria-label="Mês e ano do vencimento da fatura" value={period} clearable={false} onChange={setPeriod} options={dueOptions} /></div>}
      {card&&tab==='receipts'&&<><Button variant="ghost" className="hidden shrink-0 lg:inline-flex" disabled={busy} onClick={()=>setCapture({})}><Camera />Salvar Comprovante Fiscal</Button><div className="spend-mobile-register-slot"><Button actionKind="specific" cdeNative className="spend-mobile-register" aria-label="Salvar Comprovante Fiscal" title="Salvar Comprovante Fiscal" aria-expanded={!!capture} disabled={busy} onClick={()=>setCapture({})}><Camera /><span className="sr-only">Salvar Comprovante Fiscal</span></Button></div></>}
    </div>}</header>
    {!data.cards.length&&tab!=='cards'&&tab!=='allocations'?<div className="py-12 text-center"><CreditCard className="mx-auto mb-3 size-10 text-muted-foreground" /><h2 className="text-lg">Nenhum cartão cadastrado</h2>{finance?<Button className="mt-4" onClick={()=>setTab('cards')}>Cadastrar cartão</Button>:<p className="mt-2 text-sm text-muted-foreground">Aguardando vínculo do cartão pelo Financeiro.</p>}</div>:null}
    {card&&tab==='receipts'&&<>
      {data.notices.filter(n=>n.card_id===card.id).slice(0,5).map(n=><p key={n.id} className="flex items-center gap-2 text-sm"><Bell className="size-4 text-primary" />{n.message}</p>)}
      {receiptFilters.summary}
      <section aria-label="Lista de comprovantes" className="divide-y divide-border">{visibleReceipts.map(r=><div key={r.id} className="grid h-[5.25rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2">
        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
          <Badge className="shrink-0" title={isCardReceipt(r) ? 'Cartão myio' : 'Reembolso'} aria-label={isCardReceipt(r) ? 'Cartão myio' : 'Reembolso'}>{isCardReceipt(r) ? <CreditCard className="size-3.5"/> : <DollarSign className="size-3.5"/>}</Badge>
          <div className="grid min-w-0 grid-rows-[1.25rem_1rem_2rem]"><p className="truncate text-sm" title={r.merchant}>{spendDescription(r.merchant,sentenceCase)}</p>
          <p className="truncate text-xs text-muted-foreground">{formatDate(r.date)} · {data.settings[r.category]?.name||categories.find(c=>c.key===r.category)?.name}</p>
          <div className="min-w-0 overflow-hidden text-xs" title={isCardReceipt(r) ? statusNames[r.status] : r.reimbursement_order_id ? 'Solicitado no Supply' : 'Reembolso a solicitar'}>{isCardReceipt(r) ? r.status === 'pending' ? <span className="line-clamp-2 text-xs text-muted-foreground">{statusNames[r.status]}</span> : <Badge className="max-w-full whitespace-normal text-xs">{statusNames[r.status]}</Badge> : r.reimbursement_order_id ? <Link to="/dashboard" search={{ section: "pedidos", subsection: "mine", order:r.reimbursement_order_id }} className="text-xs text-foreground underline hover:text-primary">Solicitado no Supply</Link> : <span className="text-xs text-muted-foreground">Reembolso a solicitar</span>}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1"><strong className="text-sm tabular-nums">{BRL.format(r.amount)}</strong><ReceiptAttachment path={r.file_path} merchant={r.merchant} />{canEditSpendReceipt(r,data.user_id,data.lines.some(item=>item.receipt_id===r.id && (item.status==='approved' || !!item.payable_id)),finance) && <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={`Editar comprovante de ${r.merchant}`} onClick={()=>setCapture({receipt:r})}><Pencil /></Button></TooltipTrigger><TooltipContent>Editar comprovante</TooltipContent></Tooltip></TooltipProvider>}</div>
      </div>)}{!visibleReceipts.length&&<p className="py-8 text-center text-sm text-muted-foreground">Nenhum comprovante encontrado.</p>}</section>
    </>}
    {card&&finance&&tab==='reconcile'&&<><div className="flex flex-wrap items-center justify-between gap-4"><div className="w-72 max-w-full space-y-1"><p className="text-right text-xs tabular-nums">{pct}% Conciliado · {BRL.format(matched)} / {BRL.format(total)}</p><Progress value={pct} className="h-1.5 bg-muted" aria-label="Conciliação da fatura" /></div>{statement&&<div className="flex items-end gap-1"><div><Label>Vencimento</Label><Input type="date" aria-label="Vencimento da fatura importada" value={dueDraft} onChange={e=>setDueDraft(e.target.value)} /></div>{dueDraft&&dueDraft!==statement.due_date&&<Button variant="ghost" size="icon" title="Salvar vencimento (a fatura vai para o mês do vencimento)" aria-label="Salvar vencimento" disabled={busy} onClick={saveDue}><Save /></Button>}</div>}<div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={()=>setImporting(true)}><FileUp />Upload PDF Fatura</Button><Button title="Exportar para contabilidade" aria-label="Exportar ZIP" variant="ghost" size="icon" disabled={busy} onClick={exportZip}><Download /></Button>{statement&&<Button title="Conciliar automaticamente" aria-label="Conciliar automaticamente" variant="ghost" size="icon" disabled={busy} onClick={()=>action('automatch',{statement_id:statement.id})}><WandSparkles /></Button>}</div></div><div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      {statement?<SpendStatementPreview key={statement.id} path={statement.file_path}/>:<p className="py-10 text-sm text-muted-foreground">Nenhuma fatura importada neste mês.</p>}
      <section className="min-w-0 space-y-4" aria-label="Lançamentos da fatura">
        <div className="flex flex-wrap items-end justify-between gap-2" aria-label="Total da fatura"><div><p className="text-xs text-muted-foreground">{competence==='statement'?'Total da fatura':'Total dos gastos'}</p><strong className="text-xl tabular-nums">{BRL.format(statementTotal(filters.filtered.map(l => l.amount)))}</strong></div><span className="text-xs text-muted-foreground">{filters.filtered.length} movimentos</span></div>
        <div className="min-w-0 space-y-1"><Label>Competência dos gastos</Label><SearchableSelect aria-label="Competência dos gastos" value={competence} clearable={false} onChange={setCompetence} options={[{value:'statement',label:'Fatura selecionada'},{value:'all',label:'Todas as competências'},...competenceOptions]}/></div>
        <header className="flex flex-wrap items-center justify-between gap-3"><h2 className="min-w-0 text-sm text-muted-foreground">{competence==='statement'?'Lançamentos da fatura':'Gastos por data do fato gerador'}</h2><div className="flex shrink-0 items-center gap-2">{filters.menu}<SpendTextCaseToggle active={sentenceCase} onChange={setSentenceCase}/>{selected.size>0&&<Button disabled={busy} onClick={batch}><CheckCheck/>Aprovar lote ({selected.size})</Button>}</div></header>
        {filters.summary}
        <Table className="spend-reconciliation-table"><TableHeader><TableRow><TableHead className="w-10"><Checkbox aria-label="Marcar todos os filtrados" title="Marcar todos os filtrados" disabled={busy || !selectable.length} checked={selectedVisible===0?false:selectedVisible===selectable.length?true:"indeterminate"} onCheckedChange={v=>setSelected(prev=>toggleFilteredSelection(filters.filtered,prev,v===true))}/></TableHead><TableHead>Data / Descrição</TableHead><TableHead>Valor</TableHead><TableHead>Situação</TableHead><TableHead className="w-10">Ações</TableHead></TableRow></TableHeader><TableBody>
          {filters.filtered.map(l=><LineRows key={l.id} line={l} data={data} busy={busy} expanded={lineId===l.id} sentenceCase={sentenceCase} selected={selected.has(l.id)} toggle={()=>setLineId(lineId===l.id?'':l.id)} select={v=>setSelected(prev=>{const n=new Set(prev);if(v)n.add(l.id);else n.delete(l.id);return n;})} approve={approve} save={save} notify={t=>{setLineId(l.id);setNotice(t);setMessage(`${t==='notify'?'Envie o comprovante':'Confira e ajuste o comprovante'}: ${l.merchant} · ${BRL.format(l.amount)}`);}} attach={()=>setCapture({line:l})} link={id=>action('link',{line_id:l.id,receipt_id:id})}/>)}
        </TableBody></Table>
        {!filters.filtered.length&&<p className="py-10 text-center text-sm text-muted-foreground">Nenhum gasto encontrado para os filtros selecionados.</p>}
      </section>
    </div></>}
    {finance&&tab==='allocations'&&<SpendSupplierAllocations data={data} refresh={refresh}/>} {finance&&tab==='cards'&&<SpendCards data={data} refresh={refresh}/>} {tab==='logs'&&<section className="divide-y divide-border">{data.logs.filter(l=>l.card_id===card?.id).map(l=><div key={l.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><span>{l.action} · {data.users.find(u=>u.id===l.actor_id)?.name??'—'}</span><span className="text-muted-foreground">{new Date(l.created_at).toLocaleString('pt-BR')}</span></div>)}</section>}
  </main><AppNavigation className={ml.nav} aria-label="Navegação Spend"><div className={`mx-auto grid max-w-2xl grid-flow-col auto-cols-fr items-stretch ${ml.grid} rounded-[1.75rem] border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/90`}>{tabs.map(({value,label,icon:Icon})=><Button key={value} variant="ghost" className={`h-auto min-w-0 rounded-[1.35rem] p-0 shadow-none ${tab===value ? "!bg-primary/15 !text-primary hover:!bg-primary/20 hover:!text-primary" : "!bg-transparent !text-muted-foreground hover:!bg-muted hover:!text-foreground"}`} aria-current={tab===value?'page':undefined} onClick={()=>setTab(value)}><span className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1"><span className="menu-icon"><Icon className="h-5 w-5 shrink-0" /></span><span className="max-w-full text-[10px] font-semibold leading-tight whitespace-normal">{label}</span></span></Button>)}</div></AppNavigation>
    {projectReview.dialog}
    {capture&&card&&<SpendCapture data={data} cardId={card.id} {...(capture.line?{line:capture.line}:{})} {...(capture.receipt?{receipt:capture.receipt}:{})} onDone={refresh} onClose={()=>setCapture(null)} />}{importing&&card&&<SpendStatementImport card={card} period={period} sentenceCase={sentenceCase} onSentenceCaseChange={setSentenceCase} onDone={refresh} onImported={setPeriod} onClose={()=>setImporting(false)}/>}
    <Dialog open={!!notice} onOpenChange={o=>{if(!o)setNotice(null);}}><DialogContent><DialogHeader><DialogTitle>{notice==='notify'?'Notificar Portador':'Pedir ajuste'}</DialogTitle></DialogHeader><Textarea aria-label="Mensagem ao portador" value={message} onChange={e=>setMessage(e.target.value)}/><Button disabled={busy||!message.trim()} onClick={async()=>{if(!active||!notice)return;await action(notice,{line_id:active.id,message});setNotice(null);}}>Enviar aviso no app</Button></DialogContent></Dialog>
  </div>;
}