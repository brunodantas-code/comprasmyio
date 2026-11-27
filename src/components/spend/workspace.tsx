import { applyMenuNames } from "@/components/cde/menu-names";
import { useMenuNames } from "@/components/cde/use-menu-names";
import { SpendCategoryConfig } from "./category-config";
import { SpendNoticeHistory } from "./notice-history";
import { SpendLineDetailsEditor } from './line-details-editor';
import { SpendBulkClassificationDialog } from './bulk-classification-dialog';
import { SpendClassificationFields } from './classification-fields';
import { spendAccountDisplay } from './account-display';
import { MissingReceiptDialog } from "./missing-receipt-dialog";
import { canDeclareMissingReceipt, missingReceiptLabels, missingReceiptReason } from "./missing-receipt";
import { activeSpendNotices, type SpendAdjustment } from "./pending";
import "./workspace.css";
import { usePendingActions } from "@/hooks/use-pending-actions";
import { useTextCaseChoice } from "@/hooks/use-text-case-choice";
import { useEffect, useRef, useState } from "react";
import { useSearch, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useSuspenseQuery, useQueryClient, useQuery } from "@tanstack/react-query";
import { Camera, Check, CheckCheck, CreditCard, DollarSign, Upload, Download, Bell, Paperclip, History, ReceiptText, WandSparkles, Loader2, Save, MessageSquareWarning, ChevronDown, ChevronUp, Pencil, FileX2, CameraOff, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { MyioAppLogo } from "@/components/myio-app-logo";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SpendStatementPreview } from "./statement-preview";
import { SpendReceiptPdfPreview } from "./receipt-pdf-preview";
import { receiptBelongsToView } from "./receipt-visibility";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { classificationAccess, showReceiptCnpj, lineActionVisibility, classificationTargets, toggleFilteredSelection, bulkClassificationTargets, type bulkClassificationPatch } from "./classification";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { receiptCardsFor, receiptDisplayCardsFor } from "./delegation";
import { receiptCategoryOverride } from "./category-check";
import { DelegationDialog } from "./delegation-dialog";
import { statementTotal } from "./statement-total";
import { confirmAction } from "@/components/confirm-dialog";
import { isAdvanceReceipt, isCardReceipt, paymentSourceLabel, reimbursementPaymentDate, reimbursementStatusLabel } from "./payment-source";
import { SpendAdvanceAccountability, SpendAdvancesPanel } from "./advances";
import { AdvanceIcon } from "./icons";
import { TableSortMenu, type TableSorting } from "@/components/table-sort-menu";
import { compareColumnValues } from "@/lib/column-sort";
import { ReimbursementDialog } from './reimbursement-dialog';
import { competenceLines, monthOptions, statementMonth, monthOf, yearOf, monthSelectOptions, yearSelectOptions } from './period-filters';
import { useSpendProjectReview } from './project-review-dialog';
import { canClassifySpend, type ProjectReview } from './project-review';
import { extractSpendDocument } from '@/lib/spend.functions';
import { prepareSpendMatches, receiptReading, receiptVerification } from './receipt-verification';
const statusNames: Record<string,string> = { pending: "Pendente conciliação com fatura", matched: "Vinculado · aguardando aprovação", approved: "Enviado ao Finance", adjustment: "Ajuste solicitado" };
function ReceiptPreview({ path, fullSize = false }: { path: string; fullSize?: boolean }) {
  const url = useQuery({ queryKey: ["spend-file", path], queryFn: () => spendFileUrl(path), staleTime: 300000 });
  if (url.isPending) return <Loader2 className="size-5 animate-spin" />;
  if (url.error) return <p className="text-sm text-destructive">Comprovante indisponível</p>;
  if (path.toLowerCase().endsWith('.pdf')) return <SpendReceiptPdfPreview src={url.data} fullSize={fullSize} />;
  if (fullSize) return <img src={url.data} alt="Imagem do comprovante fiscal" className="mx-auto h-auto max-w-full object-contain" />;
  return <a href={url.data} target="_blank" rel="noreferrer" className="group block overflow-hidden"><img src={url.data} alt="Comprovante do lançamento" className="h-64 w-full rounded-md object-contain transition-transform group-hover:scale-125 motion-reduce:transition-none" /></a>;
}
function ReceiptAttachment({ path, merchant }: { path: string; merchant: string }) {
  const [open, setOpen] = useState(false);
  if (path.startsWith('no-receipt/')) return <TooltipProvider><Tooltip><TooltipTrigger asChild><span tabIndex={0} aria-label="Despesa sem comprovante" className="inline-flex size-9 items-center justify-center text-muted-foreground"><FileX2 className="size-4" /></span></TooltipTrigger><TooltipContent>Sem comprovante</TooltipContent></Tooltip></TooltipProvider>;
  return <><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={`Abrir comprovante de ${merchant}`} onClick={() => setOpen(true)}><Paperclip /></Button></TooltipTrigger><TooltipContent>Abrir comprovante</TooltipContent></Tooltip></TooltipProvider><Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-3xl" aria-describedby={undefined}><DialogHeader><DialogTitle className="break-words">Comprovante · {merchant}</DialogTitle></DialogHeader>{open && <ReceiptPreview path={path} fullSize />}</DialogContent></Dialog></>;
}
function Audit({ line, data, busy, expanded, approve, save, notify, attach, link }: { line: Line; data: SpendData; busy: boolean; expanded: boolean; save: (line: Line,a:string,c:string,p:string,cnpj:boolean|null,notApplicable:boolean) => Promise<void>; approve: (line: Line,a:string,c:string,p:string) => Promise<void>; notify: (type:string) => void; attach: () => void; link: (id:string) => void }) {
  const receipt = data.receipts.find(r => r.id === line.receipt_id); const cfg = data.settings[receipt?.category ?? line.category ?? ''];
  const [account,setAccount] = useState(line.account_id ?? cfg?.account_id ?? ''); const [center,setCenter] = useState(line.cost_center_id ?? cfg?.cost_center_id ?? ''); const [project,setProject] = useState(line.project_id ?? '');
  const statement = data.statements.find(s => s.id === line.statement_id); const card = data.cards.find(c => c.id === statement?.card_id);
  const candidates = card ? data.receipts.filter(r => isCardReceipt(r) && !data.lines.some(l => l.receipt_id === r.id) && canMatch({ card_id:card.id,date:line.date,amount:line.amount,final_cartao:line.last_four ?? '' },{card_id:r.card_id??'',date:r.date,amount:r.amount,final_cartao:card.last_four})) : [];
  const [cnpj,setCnpj] = useState<boolean|null>(line.myio_cnpj ?? receipt?.myio_cnpj ?? null);
  const [notApplicable,setNotApplicable] = useState(line.receipt_not_applicable);
  useEffect(() => { setAccount(line.account_id ?? cfg?.account_id ?? ''); setCenter(line.cost_center_id ?? cfg?.cost_center_id ?? ''); setNotApplicable(line.receipt_not_applicable); }, [line.account_id,line.cost_center_id,line.receipt_not_applicable]);
  useEffect(() => { setProject(line.project_id ?? ''); }, [line.project_id]);
  useEffect(() => { setCnpj(line.myio_cnpj ?? receipt?.myio_cnpj ?? null); }, [line.myio_cnpj,line.receipt_id,receipt?.myio_cnpj]);
  const locked = line.status === 'approved';
  const sent=(kind:string)=>data.logs.some(log=>log.action===kind&&log.details&&typeof log.details==='object'&&!Array.isArray(log.details)&&log.details['line_id']===line.id);
  const access = classificationAccess(busy,locked,!!receipt,account,center,notApplicable && line.receipt_not_applicable);
  const actions = lineActionVisibility(!!receipt, notApplicable);
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
    <SpendClassificationFields data={data} account={account} center={center} project={project} setAccount={setAccount} setCenter={setCenter} setProject={setProject} disabled={locked} />
    {(()=>{const response=data.logs.find(log=>log.action==='receipt_missing_response'&&log.details&&typeof log.details==='object'&&!Array.isArray(log.details)&&log.details['line_id']===line.id);if(!response||!response.details||typeof response.details!=='object'||Array.isArray(response.details))return null;const reason=missingReceiptReason.safeParse(response.details['reason']);return reason.success?<p className="text-sm text-muted-foreground">Portador informou: {missingReceiptLabels[reason.data]}</p>:null;})()}
    {!receipt && <label className="flex items-center gap-2 text-xs"><Checkbox aria-label="Comprovante não se aplica" checked={notApplicable} disabled={busy || locked} onCheckedChange={v=>setNotApplicable(v===true)} /><span>Comprovante: Não se aplica</span></label>}
    <div className="flex items-center gap-2" aria-label="Ações do lançamento">
      {actions.attach && <Button variant="ghost" size="icon" aria-label="Anexar comprovante" title="Sem comprovante" className="shrink-0 !text-destructive" disabled={busy || locked} onClick={attach}><Paperclip className="!text-destructive" /></Button>}
      {actions.notify && <Button variant="ghost" size="icon" title="Notificar Portador" aria-label="Notificar Portador" disabled={busy || locked} className="relative" onClick={() => notify('notify')}><Bell />{sent('notify')&&<Check className="absolute -right-1 -top-1 size-3 text-primary"/>}</Button>}
      {actions.requestAdjustment && <Button variant="ghost" size="icon" title="Rejeitar / Pedir ajuste" aria-label="Rejeitar / Pedir ajuste" disabled={busy || locked} className="relative" onClick={() => notify('adjustment')}><MessageSquareWarning />{sent('adjustment')&&<Check className="absolute -right-1 -top-1 size-3 text-primary"/>}</Button>}
      <Button variant="ghost" size="icon" aria-label="Salvar classificação" title="Salvar classificação" disabled={!access.canSave} onClick={() => save(line,account,center,project,cnpj,notApplicable)}><Save /></Button>
      <SpendLineDetailsEditor line={line} disabled={busy || locked} />
      <Button className="ml-0 shrink-0 sm:ml-auto" disabled={!access.canApprove} onClick={() => approve(line,account,center,project)}><Check />{locked ? 'Enviado ao Finance' : 'Aprovar'}</Button>
    </div>
    <SpendNoticeHistory data={data} lineId={line.id} inline />
    {line.display_description && line.display_description !== line.merchant && <p className="break-words text-sm text-muted-foreground">Descrição original da fatura: {line.merchant}</p>}
    {line.additional_observation && <div className="space-y-1"><Label>Observação adicional</Label><p className="whitespace-pre-wrap break-words text-sm">{line.additional_observation}</p></div>}
    {receipt ? <><div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2"><span className="min-w-0 text-sm">Comprovante</span><Badge className="max-w-full whitespace-normal text-right">{locked ? <Check /> : <Paperclip className="size-4 shrink-0" />}{locked ? "Enviado ao Finance" : line.status === "adjustment" ? "Ajuste solicitado" : "Vinculado · aguardando aprovação"}</Badge></div><ReceiptPreview path={receipt.file_path} /><p className="text-sm">Portador: {data.users.find(u => u.id === receipt.holder_id)?.name ?? '—'}</p><p className="break-words text-sm">Projeto informado pelo portador: {data.projects.find(p => p.id === receipt.project_id)?.name ?? (receipt.project_id ? 'Projeto indisponível' : 'Não informado')}</p>{receipt.observation && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{receipt.observation}</p>}<div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">Categoria informada pelo portador</span><Badge>{data.settings[receipt.category]?.name || categories.find(c => c.key === receipt.category)?.name || receipt.category}</Badge>{(()=>{const o=receiptCategoryOverride(data.logs,receipt.id,receipt.category);return o&&<span className="text-xs text-muted-foreground">Categoria alterada pelo usuário · sugestão do app: {data.settings[o.suggested]?.name || categories.find(c => c.key === o.suggested)?.name || o.suggested}</span>;})()}</div></> : candidates.length > 0 && <SearchableSelect aria-label="Vincular comprovante" value="" placeholder="Selecionar comprovante correspondente" onChange={link} options={candidates.map(r => ({value:r.id,label:`${formatDate(r.date)} · ${r.merchant} · ${BRL.format(r.amount)}`}))} />}
    {showReceiptCnpj(receipt?.id ?? null) && <RadioGroup aria-label="CNPJ no comprovante" value={cnpj === null ? "" : cnpj ? "com" : "sem"} onValueChange={v => setCnpj(v === "com")} disabled={locked || busy} className="flex flex-wrap gap-4">{[["com","Com CNPJ myio"],["sem","Sem CNPJ myio"]].map(([value,label]) => <label key={value} className="flex items-center gap-2 text-sm"><RadioGroupItem value={value ?? ""} /><span>{label}</span></label>)}</RadioGroup>}

  </section>;
}
function LineRows(props: React.ComponentProps<typeof Audit> & { sentenceCase:boolean; full:boolean; selected:boolean; toggle:()=>void; select:(v:boolean)=>void }) {
  const {line:l,expanded}=props;
  return <><TableRow className="spend-line-row"><TableCell className="spend-line-select"><Checkbox aria-label={`Selecionar ${l.merchant}`} checked={props.selected} disabled={l.status==='approved'} onCheckedChange={v=>props.select(v===true)}/></TableCell><TableCell className={props.full ? "spend-line-date-cell" : "spend-line-detail max-w-56"}><span className="spend-line-date block text-xs text-muted-foreground"><span className="spend-line-date-label">Data</span><span>{formatDate(l.date)}{l.installment?` · Parcela ${l.installment}`:''}{l.installment_source_line_id?' · comprovante da parcela anterior':''}</span></span>{!props.full && <span className="spend-line-merchant block min-w-0 truncate" title={l.display_description ?? l.merchant}><span className="spend-line-merchant-label">Descrição</span><span className="spend-line-merchant-text">{spendDescription(l.display_description ?? l.merchant,props.sentenceCase)}</span></span>}</TableCell>{props.full && <TableCell className="spend-line-detail"><span className="spend-line-merchant block min-w-0" title={l.display_description ?? l.merchant}><span className="spend-line-merchant-label">Descrição</span><span className="spend-line-merchant-text">{spendDescription(l.display_description ?? l.merchant,props.sentenceCase)}</span></span></TableCell>}<TableCell className="spend-line-amount whitespace-nowrap tabular-nums">{BRL.format(l.amount)}</TableCell><TableCell className="spend-line-status">{l.receipt_id || l.receipt_not_applicable?<><Badge>{statusNames[l.status]}</Badge>{l.receipt_not_applicable && <span className="block text-xs text-muted-foreground">Comprovante: Não se aplica</span>}</>:!expanded&&<span className="text-xs text-destructive">Sem comprovante</span>}{l.receipt_id&&l.myio_cnpj!==null&&<Badge>{l.myio_cnpj?'Com CNPJ myio':'Sem CNPJ myio'}</Badge>}</TableCell><TableCell className="spend-line-actions"><Button variant="ghost" size="icon" title={expanded?'Recolher classificação':'Exibir classificação'} aria-label={`${expanded?'Recolher':'Exibir'} classificação de ${l.merchant}`} aria-expanded={expanded} onClick={props.toggle}>{expanded?<ChevronUp/>:<ChevronDown/>}</Button></TableCell></TableRow><TableRow className="spend-audit-row" hidden={!expanded}><TableCell colSpan={props.full ? 6 : 5}><Audit {...props}/></TableCell></TableRow></>;
}
function NoPhotoIcon(){return <span aria-hidden className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-foreground text-foreground"><CameraOff className="size-3"/></span>;}
export function SpendWorkspace() {
  const search=useSearch({from:"/_authenticated/spend"});
  const pending=usePendingActions().data;
  const {data}=useSuspenseQuery(spendOptions); const qc=useQueryClient(); const ml=useAppMenuLayout('Spend'); const orders=useMenuOrders().data; const menuNames=useMenuNames().data;
  const categoryAdmin = useQuery({ queryKey: ["spend-category-admin", data.user_id], queryFn: async () => { const result = await supabase.from("erp_admins").select("user_id").eq("user_id", data.user_id).maybeSingle(); if (result.error) throw result.error; return Boolean(result.data); } }).data === true;
  const [sentenceCase,setSentenceCase]=useTextCaseChoice(`spend:${data.user_id}`);
  const finance=canClassifySpend(data.role); const [tab,setTab]=useState(finance?'reconcile':'receipts'); const [cardId,setCardId]=useState(''); const [period,setPeriod]=useState(new Date().toLocaleDateString('en-CA').slice(0,7)); const [lineId,setLineId]=useState(''); const [selected,setSelected]=useState<Set<string>>(new Set()); const [busy,setBusy]=useState(false); const [capture,setCapture]=useState<{line?:Line;receipt?:Receipt;file?:File;manual?:boolean}|null>(null); const cameraInput=useRef<HTMLInputElement>(null); const documentInput=useRef<HTMLInputElement>(null); const [importing,setImporting]=useState(false); const [notice,setNotice]=useState<string|null>(null); const [message,setMessage]=useState('');
  const receiptToolbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const toolbar = receiptToolbarRef.current;
    if (!toolbar) return;
    const manual = toolbar.querySelector<HTMLElement>('.spend-manual-action');
    if (!manual) return;
    const update = () => {
      const children = Array.from(toolbar.children).filter((child): child is HTMLElement => child instanceof HTMLElement && getComputedStyle(child).display !== 'none');
      const gap = Number.parseFloat(getComputedStyle(toolbar).columnGap) || 0;
      const width = children.reduce((sum, child) => sum + (child === manual ? child.firstElementChild?.getBoundingClientRect().width ?? 0 : child.getBoundingClientRect().width), 0) + Math.max(0, children.length - 1) * gap;
      manual.classList.toggle('spend-manual-newline', width > toolbar.clientWidth + 1);
    };
    const observer = new ResizeObserver(update);
    observer.observe(toolbar);
    toolbar.querySelectorAll('button').forEach(button => observer.observe(button));
    update();
    return () => observer.disconnect();
  }, [tab, cardId, busy]);
  const [missingRequest,setMissingRequest]=useState<SpendAdjustment|null>(null);
  const [openedAdjustment,setOpenedAdjustment]=useState('');
  const [openedAdvance,setOpenedAdvance]=useState('');
  useEffect(()=>{
    if(!search.adjustment || openedAdjustment===search.adjustment)return;
    const line=data.lines.find(l=>l.id===search.adjustment);
    const notice=data.notices.find(n=>n.line_id===search.adjustment);
    const request=pending?.spendItems.find(r=>r.line_id===search.adjustment);
    const targetCard=line ? data.statements.find(s=>s.id===line.statement_id)?.card_id : request?.card_id ?? notice?.card_id;
    if(!targetCard || !pending)return;
    setTab('receipts');setCardId(targetCard);
    const receipt=data.receipts.find(r=>r.id===(line?.receipt_id ?? request?.receipt_id));
    if(receipt)setCapture({receipt});
    else if(request && canDeclareMissingReceipt(request.holder_id,data.user_id,request.receipt_id,request.status))setMissingRequest(request);
    setOpenedAdjustment(search.adjustment);
  },[search.adjustment,openedAdjustment,data,pending,finance]);
  useEffect(()=>{
    if(!search.advance||openedAdvance===search.advance)return;
    const advance=data.advances.find(a=>a.id===search.advance);if(!advance)return;
    setOpenedAdvance(search.advance);
    if(finance){setTab('advances');return;}
    setTab('receipts');setCardId(data.cards.find(c=>c.holder_id===advance.holder_id)?.id??'');
    window.setTimeout(()=>document.getElementById(`spend-advance-${advance.id}`)?.scrollIntoView({block:'center',behavior:'smooth'}),100);
  },[search.advance,openedAdvance,data.advances,data.cards,finance]);
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
  const [classificationFull, setClassificationFull] = useState(false);
  useEffect(() => {
    if (!classificationFull) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('[role="dialog"],[data-radix-popper-content-wrapper]')) setClassificationFull(false);
    };
    window.addEventListener('keydown', escape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', escape); };
  }, [classificationFull]);
  const [competence,setCompetence]=useState('statement');
  const [editingDue,setEditingDue]=useState(false);
  const myCards=receiptCardsFor(data.user_id,data.cards,data.delegations,new Date().toLocaleDateString('sv-SE')); const ownCard=myCards.find(c=>c.holder_id===data.user_id); const receiptCardChoices=finance?receiptDisplayCardsFor(data.user_id,data.cards):myCards; const card=tab==='receipts'?(receiptCardChoices.find(c=>c.id===cardId)??ownCard??receiptCardChoices[0]):data.cards.find(c=>c.id===cardId)??data.cards[0]; const hasAdvanceOnly=!card&&data.advances.some(a=>a.holder_id===data.user_id&&a.status==='open'); const canSubmitWithoutCard=!card&&tab==='receipts'; const statement=data.statements.find(s=>s.card_id===card?.id && statementMonth(s)===period);
  const cardStatements=data.statements.filter(s=>s.card_id===card?.id);
  const year=Number(period.slice(0,4));
  const dueMonth=monthOf(period), dueYear=yearOf(period);
  const dueYearOptions=yearSelectOptions(cardStatements.map(statementMonth), year);
  const cardStatementIds=new Set(cardStatements.map(s=>s.id));
  const competenceOptions=monthOptions(data.lines.filter(l=>cardStatementIds.has(l.statement_id)).map(l=>l.date));
  const statementLines=data.lines.filter(l=>l.statement_id===statement?.id);
  const lines=competenceLines(data.lines,data.statements,card?.id??'',statement?.id,competence); const active=lines.find(l=>l.id===lineId); const receipts=data.receipts.filter(r=>receiptBelongsToView(r,{tab,cardId:card?.id??null,holderId:card?.holder_id??data.user_id}) && (tab==='receipts' || (isCardReceipt(r) && receiptInStatementWindow(r.date)))); function receiptInStatementWindow(date:string){if(!statementLines.length)return date.slice(0,7)===period;const ds=statementLines.map(l=>l.date).sort();const t=Date.parse(`${date}T00:00:00Z`);return t>=Date.parse(`${ds[0]}T00:00:00Z`)-2*86400000&&t<=Date.parse(`${ds[ds.length-1]}T00:00:00Z`)+2*86400000;}
  const receiptColumns = [
    { key: 'merchant', label: 'Estabelecimento', value: (r: Receipt) => r.merchant },
    { key: 'payment_source', label: 'Tipo', value: (r: Receipt) => paymentSourceLabel(r.payment_source) },
    { key: 'date', label: 'Data', value: (r: Receipt) => r.date },
    { key: 'amount', label: 'Valor', kind: 'number' as const, value: (r: Receipt) => r.amount },
    { key: 'category', label: 'Categoria', value: (r: Receipt) => data.settings[r.category]?.name || categories.find(c => c.key === r.category)?.name || r.category },
    { key: 'project', label: 'Projeto', value: (r: Receipt) => data.projects.find(p => p.id === r.project_id)?.name ?? '' },
    { key: 'status', label: 'Situação', value: (r: Receipt) => isCardReceipt(r) ? statusNames[r.status] ?? r.status : isAdvanceReceipt(r) ? (r.status === 'approved' ? 'Adiantamento · aprovado' : 'Adiantamento · aguardando aprovação') : reimbursementStatusLabel(r) },
  ];
  const receiptFilters = useTableFilters(receipts.filter(r => !isAdvanceReceipt(r)), receiptColumns);
  const [receiptSorting, setReceiptSorting] = useState<TableSorting | undefined>();
  const receiptSortColumn = receiptColumns.find(c => c.key === receiptSorting?.key);
  const visibleReceipts = receiptSortColumn && receiptSorting ? [...receiptFilters.filtered].sort((a,b) => compareColumnValues(('kind' in receiptSortColumn ? receiptSortColumn.kind : undefined) ?? 'text', receiptSortColumn.value(a), receiptSortColumn.value(b), receiptSorting.direction)) : receiptFilters.filtered;
  const receiptNotices = activeSpendNotices(data.notices.filter(n=>n.card_id===card?.id),pending?.spendItems??[]).slice(0,5);
  const accountDisplays = data.accounts.map(spendAccountDisplay);
  const lineColumns = [
    { key: 'merchant', label: 'Descrição', value: (line: Line) => line.display_description ?? line.merchant },
    { key: 'status', label: 'Situação', value: (line: Line) => line.receipt_not_applicable ? 'Comprovante não se aplica' : line.status === 'pending' ? 'Sem comprovante' : statusNames[line.status] ?? line.status },
    { key: 'amount', label: 'Valor', kind: 'number' as const, value: (line: Line) => line.amount },
    { key: 'date', label: 'Data', kind: 'date' as const, value: (line: Line) => line.date },
    { key: 'account_code', label: 'Código da conta', value: (line: Line) => accountDisplays.find(account => account.id === line.account_id)?.code ?? '' },
    { key: 'account_name', label: 'Nome da conta', value: (line: Line) => accountDisplays.find(account => account.id === line.account_id)?.name ?? '' },
    { key: 'cost_center', label: 'Centro de Custo', value: (line: Line) => data.centers.find(center => center.id === line.cost_center_id)?.name ?? '' },
    { key: 'project', label: 'Projeto', value: (line: Line) => data.projects.find(project => project.id === line.project_id)?.name ?? '' },
  ];
  const filters=useTableFilters(lines,lineColumns);
  const selectable=filters.filtered.filter(l=>l.status!=='approved');
  const [lineSorting, setLineSorting] = useState<TableSorting | undefined>();
  const lineSortColumns = lineColumns.map(column => ({ key: column.key, label: column.label }));
  const lineSortColumn = lineColumns.find(column => column.key === lineSorting?.key);
  const visibleLines = lineSorting && lineSortColumn ? [...filters.filtered].sort((a,b) => compareColumnValues(('kind' in lineSortColumn ? lineSortColumn.kind : undefined) ?? 'text', lineSortColumn.value(a), lineSortColumn.value(b), lineSorting.direction)) : filters.filtered;
  const selectedVisible=selectable.filter(l=>selected.has(l.id)).length;
  const refresh=async()=>{ await Promise.all([qc.invalidateQueries({queryKey:['spend']}),qc.invalidateQueries({queryKey:['cash-flow-payables']}),qc.invalidateQueries({queryKey:['pending-actions']}),qc.invalidateQueries({queryKey:['central-admin']})]); };
  useEffect(()=>{setLineId('');setSelected(new Set());},[card?.id,period,competence]); const [dueDraft,setDueDraft]=useState(''); useEffect(()=>{setDueDraft(statement?.due_date??'');},[statement?.id,statement?.due_date]); async function saveDue(){if(!statement||!dueDraft)return;setBusy(true);try{const {error}=await supabase.rpc('spend_set_statement_due',{_statement_id:statement.id,_due_date:dueDraft});if(error)throw error;await refresh();setPeriod(dueDraft.slice(0,7));setEditingDue(false);toast.success(`Fatura movida para ${dueDraft.slice(5,7)}/${dueDraft.slice(0,4)}`);}catch(e){toast.error(e instanceof Error?e.message:'Não foi possível salvar o vencimento');}finally{setBusy(false);}}
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
  async function classifyBatch(patch: ReturnType<typeof bulkClassificationPatch>): Promise<boolean> {
    if (busy || !Object.keys(patch).length) return false;
    setBusy(true);
    try {
      const targets = bulkClassificationTargets(lines, selected);
      const fields = [patch.cost_center_id ? 'Centro de Custo' : '', patch.account_id ? 'Plano de Contas' : '', patch.project_id ? 'Projeto' : ''].filter(Boolean).join(', ');
      if (!await confirmAction(`Aplicar ${fields} aos ${targets.length} lançamentos selecionados? As classificações desses campos serão substituídas; os demais campos permanecerão como estão.`, { title: 'Classificação em lote', confirmLabel: 'Aplicar classificação' })) return false;
      const reviews: Record<string, ProjectReview> = {};
      if (patch.project_id) {
        for (const target of targets) {
          const review = await reviewProject(target, patch.project_id);
          if (!review) return false;
          reviews[target.id] = review;
        }
      }
      const result = await saveSpendClassification({ line_ids: targets.map(target => target.id), ...patch, ...(patch.project_id ? { project_reviews: reviews } : {}) });
      if (!result || typeof result !== 'object' || Array.isArray(result) || result['count'] !== targets.length) throw new Error('Não foi possível confirmar a classificação do lote.');
      await refresh();
      toast.success(`Classificação salva em ${targets.length} lançamentos`);
      return true;
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível classificar o lote'); return false; }
    finally { setBusy(false); }
  }
  async function exportZip(){if(!card)return;setBusy(true);try{const {default:JSZip}=await import('jszip');const zip=new JSZip();const paths=[...new Set([...receipts.filter(r=>!r.without_receipt).map(r=>r.file_path),...(statement?[statement.file_path]:[])])];for(const path of paths){const r=await supabase.storage.from('spend-files').download(path);if(r.error)throw r.error;if(r.data)zip.file(path,r.data);}zip.file('classificacao.json',JSON.stringify({cartao:card.name,periodo:period,lancamentos:statementLines,comprovantes:receipts},null,2));const blob=await zip.generateAsync({type:'blob'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Spend-${period}-${card.last_four}.zip`;a.click();URL.revokeObjectURL(url);}catch(e){toast.error(e instanceof Error?e.message:'Não foi possível exportar');}finally{setBusy(false);}}
  const receiptActions=(r:Receipt)=><><ReceiptAttachment path={r.file_path} merchant={r.merchant} />{canEditSpendReceipt(r,data.user_id,false,finance) && r.status!=='approved' ? <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={`Editar comprovante de ${r.merchant}`} onClick={()=>{const c=data.cards.find(x=>x.id===r.card_id);if(c)setCardId(c.id);setTab('receipts');setCapture({receipt:r});}}><Pencil /></Button></TooltipTrigger><TooltipContent>Editar comprovante</TooltipContent></Tooltip></TooltipProvider> : <Button variant="ghost" size="icon" aria-hidden tabIndex={-1} disabled className="invisible"><Pencil /></Button>}</>;
  const total=statementLines.reduce((s,l)=>s+Math.max(0,l.amount),0);const matched=statementLines.filter(l=>l.receipt_id || l.receipt_not_applicable).reduce((s,l)=>s+Math.max(0,l.amount),0);const pct=total?Math.round(matched/total*100):0;
  const tabs=applyMenuNames(sortByMenuOrder([{value:'receipts',label:'Meus comprovantes',icon:ReceiptText},...(finance?[{value:'reconcile',label:'Conciliação',icon:CheckCheck},{value:'advances',label:'Adiantamentos',icon:AdvanceIcon},{value:'cards',label:'Cartões',icon:CreditCard},{value:'allocations',label:'Alocação Automática (De-Para)',icon:WandSparkles}]:[]),...(categoryAdmin?[{value:'categories',label:'Categorias de despesas',icon:ReceiptText}]:[]),{value:'logs',label:'Histórico',icon:History}],orders?.['Spend|Barra inferior']?.map(label => label === 'Meus gastos' ? 'Meus comprovantes' : label)), menuNames, "Spend", "Barra inferior");
  const receiptToolbarActions = tab === 'receipts' ? <div ref={receiptToolbarRef} className="spend-receipt-actions erp-list-toolbar" aria-label="Ações dos comprovantes">
    <div className="spend-receipt-filter-actions">{receiptFilters.menu}<TableSortMenu columns={receiptColumns} {...(receiptSorting ? { value: receiptSorting } : {})} onChange={setReceiptSorting} iconOnly/><SpendTextCaseToggle active={sentenceCase} onChange={setSentenceCase}/></div>
    {(card?.holder_id===data.user_id||!card)&&<ReimbursementDialog receipts={visibleReceipts} userId={data.user_id}/>}
    {card?.holder_id===data.user_id&&<DelegationDialog card={card} data={data} refresh={refresh}/>}
    {(card||hasAdvanceOnly||canSubmitWithoutCard)&&<><Button variant="ghost" className="hidden shrink-0 lg:inline-flex" disabled={busy} aria-label="Anexar Comprovante Fiscal" title="Anexar Comprovante Fiscal" onClick={()=>documentInput.current?.click()}><Camera />Anexar Comprovante Fiscal</Button><Button cdeIgnore variant="ghost" size="icon" className="hidden shrink-0 lg:inline-flex" aria-label="Anexar Comprovante Fiscal" title="Anexar Comprovante Fiscal" disabled={busy} onClick={()=>documentInput.current?.click()}><Paperclip /></Button><div className="spend-manual-action hidden lg:flex"><Button variant="link" className="shrink-0" title="Registrar despesa sem comprovante" disabled={busy} onClick={()=>setCapture({manual:true})}><NoPhotoIcon/>Sem comprovante</Button></div><div className="spend-mobile-register-slot"><Button actionKind="specific" cdeNative className="spend-mobile-register" aria-label="Salvar Comprovante Fiscal" title="Salvar Comprovante Fiscal" aria-expanded={!!capture} disabled={busy} onClick={()=>cameraInput.current?.click()}><Camera /><span className="sr-only">Salvar Comprovante Fiscal</span></Button><span className="text-xs font-medium text-foreground">Fotografar Comprovante</span><Button cdeIgnore variant="link" size="sm" className="mt-2 h-auto gap-1.5 px-0 text-xs" aria-label="Anexar Comprovante Fiscal" title="Anexar Comprovante Fiscal" disabled={busy} onClick={()=>documentInput.current?.click()}><Paperclip />Anexar Comprovante Fiscal</Button><Button variant="link" size="sm" className="mt-4 h-auto gap-1.5 whitespace-nowrap px-0 text-xs" title="Registrar despesa sem comprovante" disabled={busy} onClick={()=>setCapture({manual:true})}><NoPhotoIcon/>Sem comprovante</Button></div></>}
  </div> : null;
  return <div className="min-h-screen bg-background"><AppHeader logo={<MyioAppLogo appName="Spend" />} /><main className={`mx-auto max-w-[1500px] space-y-6 px-4 pb-32 pt-6 sm:px-6 ${ml.main}`}>
    <section className="erp-screen-block space-y-6">
    <header hidden={tab==='categories'} className="space-y-4"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><CardTitle className="min-w-0">{tabs.find(item=>item.value===tab)?.label??'Meus comprovantes'}</CardTitle>{tab==='reconcile'&&finance&&<div className="spend-invoice-total min-w-0" aria-label="Total da fatura"><p className="text-xs text-muted-foreground">{competence==='statement'?'Total da fatura':'Total dos gastos'}</p><strong className="text-xl tabular-nums">{BRL.format(statementTotal(filters.filtered.map(l => l.amount)))}</strong><p className="text-xs text-muted-foreground">{filters.filtered.length} movimentos</p></div>}{tab==='receipts'&&<div className="spend-invoice-total min-w-0" aria-label="Total dos gastos selecionados"><p className="text-xs text-muted-foreground">Total dos gastos selecionados</p><strong className="text-xl tabular-nums">{BRL.format(visibleReceipts.filter(r=>r.status!=='approved').reduce((sum,r)=>sum+r.amount,0))}</strong><p className="text-xs text-muted-foreground">{visibleReceipts.length} comprovantes</p></div>}</div>{tab!=='cards'&&tab!=='allocations'&&tab!=='advances'&&tab!=='categories'&&<div className={`spend-expense-toolbar ${tab==='reconcile'?'spend-reconcile-toolbar':''}`} aria-label="Resumo e seleção de gastos">
      {tab==='receipts'&&finance?<div className="spend-card-summary min-w-0"><Label>Cartão</Label><div className="grid grid-cols-1 items-center gap-2 sm:flex sm:gap-3"><div className="min-w-0 sm:w-72"><SearchableSelect aria-label="Cartão dos comprovantes" value={card?.id??''} onChange={setCardId} options={receiptCardChoices.map(c=>({value:c.id,label:`${c.name} · ${c.last_four}`}))} placeholder="Selecionar cartão" /></div></div></div>:tab==='receipts'?<div className="spend-card-summary min-w-0"><Label>{card&&card.holder_id!==data.user_id?'Cartão autorizado':'Seu cartão'}</Label><div className="grid grid-cols-1 items-center gap-2 sm:flex sm:gap-3">{myCards.length>1?<div className="min-w-0 sm:w-72"><SearchableSelect aria-label="Cartão dos comprovantes" value={card?.id??''} clearable={false} onChange={setCardId} options={myCards.map(c=>({value:c.id,label:c.holder_id===data.user_id?`${c.name} · ${c.last_four}`:`${c.name} · ${c.last_four} · autorizado por ${data.users.find(u=>u.id===c.holder_id)?.name??'portador'} até ${formatDate(data.delegations.find(d=>d.card_id===c.id&&d.delegate_id===data.user_id)?.expires_at??'')}`}))}/></div>:<p className="flex h-9 min-w-0 items-center gap-1 text-sm" title={card?`${card.name} · ${card.last_four}`:undefined}>{card?<><span className="min-w-0 truncate">{card.name}</span><span className="shrink-0">· •••• {card.last_four}</span></>:'Nenhum cartão vinculado'}</p>}</div></div>:<div className="min-w-0"><Label>Cartão</Label><SearchableSelect aria-label="Cartão Spend" value={card?.id??''} onChange={setCardId} options={data.cards.map(c=>({value:c.id,label:`${c.name} · ${c.last_four}`}))} placeholder="Selecionar cartão" /></div>}{tab!=='receipts'&&<div className="min-w-0 spend-period-field"><Label>Mês do vencimento</Label><Select value={dueMonth} onValueChange={month=>setPeriod(`${dueYear}-${month}`)}><SelectTrigger aria-label="Mês do vencimento da fatura" className="h-9 w-full"><SelectValue/></SelectTrigger><SelectContent>{monthSelectOptions().map(option=><SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>}{tab!=='receipts'&&<div className="min-w-0 spend-period-field"><Label>Ano do vencimento</Label><Select value={dueYear} onValueChange={year=>setPeriod(`${year}-${dueMonth}`)}><SelectTrigger aria-label="Ano do vencimento da fatura" className="h-9 w-full"><SelectValue/></SelectTrigger><SelectContent>{dueYearOptions.map(option=><SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>}
      {tab==='reconcile'&&finance&&<div className="spend-reconcile-competence min-w-0 space-y-1"><Label>Competência dos gastos</Label><SearchableSelect aria-label="Competência dos gastos" value={competence} clearable={false} onChange={setCompetence} options={[{value:'statement',label:'Fatura selecionada'},{value:'all',label:'Todas as competências'},...competenceOptions]}/></div>}
    </div>}{receiptToolbarActions}</header>
    {!data.cards.length&&!hasAdvanceOnly&&tab!=='cards'&&tab!=='allocations'&&tab!=='advances'&&tab!=='categories'?<div className="py-12 text-center"><CreditCard className="mx-auto mb-3 size-10 text-muted-foreground" /><h2 className="text-lg">Nenhum cartão cadastrado</h2>{finance?<Button className="mt-4" onClick={()=>setTab('cards')}>Cadastrar cartão</Button>:<p className="mt-2 text-sm text-muted-foreground">Aguardando vínculo do cartão pelo Financeiro. Você ainda pode enviar reembolsos pagos em dinheiro ou cartão pessoal.</p>}</div>:null}
    {(card||hasAdvanceOnly||canSubmitWithoutCard)&&tab==='receipts'&&<>
      {receiptNotices.map(n=>{const request=pending?.spendItems.find(r=>r.line_id===n.line_id);return <div key={n.id} className="flex min-w-0 items-center gap-2 text-sm"><Bell className="size-4 shrink-0 text-primary" /><span className="min-w-0 break-words">{n.message}</span>{request&&canDeclareMissingReceipt(request.holder_id,data.user_id,request.receipt_id,request.status)&&<Button variant="ghost" size="icon" className="shrink-0" title="Responder sobre comprovante ausente" aria-label={`Responder sobre comprovante ausente de ${request.merchant}`} onClick={()=>setMissingRequest(request)}><MessageSquareWarning/></Button>}</div>;})}
      <SpendAdvanceAccountability data={data} holderId={card?.holder_id??data.user_id} receiptActions={receiptActions}/>
      {receiptFilters.summary}
      <h2 className="pt-4 text-base font-medium">Lista de comprovantes</h2><section aria-label="Lista de comprovantes" className="divide-y divide-border">{visibleReceipts.map(r=><div key={r.id} className="grid h-[5.25rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2">
        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
          <Badge className="shrink-0" title={isCardReceipt(r) ? 'Cartão myio' : 'Reembolso'} aria-label={isCardReceipt(r) ? 'Cartão myio' : 'Reembolso'}>{isCardReceipt(r) ? <CreditCard className="size-3.5"/> : <DollarSign className="size-3.5"/>}</Badge>
          <div className="grid min-w-0 grid-rows-[1.25rem_1rem_2rem]"><p className="truncate text-sm" title={r.merchant}>{spendDescription(r.merchant,sentenceCase)}</p>
          <p className="truncate text-xs text-muted-foreground">{formatDate(r.date)} · {data.settings[r.category]?.name||categories.find(c=>c.key===r.category)?.name}</p>
          <div className="min-w-0 overflow-hidden text-xs" title={isCardReceipt(r) ? statusNames[r.status] : reimbursementStatusLabel(r)}>{isCardReceipt(r) ? r.status === 'pending' ? <span className="line-clamp-2 text-xs text-muted-foreground">{statusNames[r.status]}</span> : <Badge className="max-w-full whitespace-normal text-xs">{statusNames[r.status]}</Badge> : isAdvanceReceipt(r) ? <Badge className="max-w-full whitespace-normal text-xs">{r.status === 'approved' ? 'Adiantamento · aprovado' : 'Adiantamento · aguardando aprovação'}</Badge> : r.reimbursement_order_id ? <Link to="/dashboard" search={{ section: "pedidos", subsection: "mine", order:r.reimbursement_order_id }} className="inline-flex max-w-full text-xs text-foreground hover:text-primary" title={reimbursementPaymentDate(r) ? `Pago em ${formatDate(reimbursementPaymentDate(r)!)}` : 'Abrir solicitação no Supply'}><Badge variant="outline" className="max-w-full whitespace-normal text-xs">{reimbursementStatusLabel(r)}{reimbursementPaymentDate(r) ? ` · ${formatDate(reimbursementPaymentDate(r)!)}` : ''}</Badge></Link> : <span className="text-xs text-muted-foreground">Reembolso a solicitar</span>}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1"><strong className="text-sm tabular-nums">{BRL.format(r.amount)}</strong><ReceiptAttachment path={r.file_path} merchant={r.merchant} />{canEditSpendReceipt(r,data.user_id,data.lines.some(item=>item.receipt_id===r.id && (item.status==='approved' || !!item.payable_id)),finance) ? <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={`Editar comprovante de ${r.merchant}`} onClick={()=>setCapture({receipt:r})}><Pencil /></Button></TooltipTrigger><TooltipContent>Editar comprovante</TooltipContent></Tooltip></TooltipProvider> : <Button variant="ghost" size="icon" aria-hidden tabIndex={-1} disabled className="invisible"><Pencil /></Button>}</div>
      </div>)}{!visibleReceipts.length&&<p className="py-8 text-center text-sm text-muted-foreground">Nenhum comprovante encontrado.</p>}</section>
    </>}
    {card&&finance&&tab==='reconcile'&&<>{filters.summary}<div className="spend-reconcile-columns grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      {statement?<SpendStatementPreview key={statement.id} path={statement.file_path} metadata={<span className="inline-flex flex-wrap items-center gap-1 text-sm text-muted-foreground"><span>| Vencimento: {formatDate(statement.due_date??'')}</span><Button variant="ghost" size="icon" aria-label="Editar vencimento da fatura" title="Editar vencimento da fatura" onClick={()=>setEditingDue(true)}><Pencil /></Button></span>}/>:<p className="py-10 text-sm text-muted-foreground">Nenhuma fatura importada neste mês.</p>}
      <section className={classificationFull ? "spend-invoice-lines spend-classification-full fixed inset-0 z-50 flex min-w-0 flex-col gap-3 bg-background p-4" : "spend-invoice-lines min-w-0 space-y-3"} aria-label="Lançamentos da fatura">
        <header className="spend-invoice-toolbar min-w-0">
          <div className="spend-bulk-action min-w-0"><SpendBulkClassificationDialog data={data} targets={lines.filter(line => selected.has(line.id) && line.status !== 'approved')} busy={busy} apply={classifyBatch}/></div>
          <div className="spend-invoice-actions" aria-label="Ações da conciliação">
            {filters.menu}<TableSortMenu columns={lineSortColumns} {...(lineSorting ? { value: lineSorting } : {})} onChange={setLineSorting} iconOnly/><SpendTextCaseToggle active={sentenceCase} onChange={setSentenceCase}/>
            <Button variant="ghost" size="icon" aria-label="Enviar PDF da fatura" title="Enviar PDF da fatura" disabled={busy} onClick={()=>setImporting(true)}><Upload /></Button>
            <Button title="Exportar para contabilidade" aria-label="Exportar ZIP" variant="ghost" size="icon" disabled={busy} onClick={exportZip}><Download /></Button>
            {statement&&<Button title="Conciliar automaticamente" aria-label="Conciliar automaticamente" variant="ghost" size="icon" disabled={busy} onClick={()=>action('automatch',{statement_id:statement.id})}><WandSparkles /></Button>}
            <Button variant="ghost" size="icon" aria-label={classificationFull ? 'Sair da classificação em tela cheia' : 'Ver classificação em tela cheia'} title={classificationFull ? 'Sair da tela cheia' : 'Tela cheia'} onClick={()=>setClassificationFull(value=>!value)}>{classificationFull ? <Minimize2/> : <Maximize2/>}</Button>
          </div>
          <div className="spend-invoice-progress" title={`${pct}% Conciliado · ${BRL.format(matched)} / ${BRL.format(total)}`}>
            <p className="text-right text-xs tabular-nums"><span>{pct}% Conciliado</span><span className="spend-invoice-progress-values"> · {BRL.format(matched)} / {BRL.format(total)}</span></p>
            <Progress value={pct} className="h-1.5 bg-muted" aria-label="Conciliação da fatura" />
          </div>
          {selected.size>0&&<div className="col-span-full flex justify-end"><Button disabled={busy} onClick={batch}><CheckCheck/>Aprovar lote ({selected.size})</Button></div>}
        </header>
        <div className={classificationFull ? "min-h-0 min-w-0 flex-1 space-y-3 overflow-auto" : "min-w-0 space-y-3"}>
        <Table className="spend-reconciliation-table"><TableHeader><TableRow><TableHead className="w-10"><Checkbox aria-label="Marcar todos os filtrados" title="Marcar todos os filtrados" disabled={busy || !selectable.length} checked={selectedVisible===0?false:selectedVisible===selectable.length?true:"indeterminate"} onCheckedChange={v=>setSelected(prev=>toggleFilteredSelection(filters.filtered,prev,v===true))}/></TableHead>{classificationFull ? <><TableHead>Data</TableHead><TableHead>Descrição</TableHead></> : <TableHead>Data / Descrição</TableHead>}<TableHead>Valor</TableHead><TableHead>Situação</TableHead><TableHead className="w-10">Ações</TableHead></TableRow></TableHeader><TableBody>
          {visibleLines.map(l=><LineRows key={l.id} line={l} data={data} busy={busy} full={classificationFull} expanded={lineId===l.id} sentenceCase={sentenceCase} selected={selected.has(l.id)} toggle={()=>setLineId(lineId===l.id?'':l.id)} select={v=>setSelected(prev=>{const n=new Set(prev);if(v)n.add(l.id);else n.delete(l.id);return n;})} approve={approve} save={save} notify={t=>{setLineId(l.id);setNotice(t);setMessage(`${t==='notify'?'Envie o comprovante':'Confira e ajuste o comprovante'}: ${l.merchant} · ${BRL.format(l.amount)}`);}} attach={()=>setCapture({line:l})} link={id=>action('link',{line_id:l.id,receipt_id:id})}/>)}
        </TableBody></Table>
        {!filters.filtered.length&&<p className="py-10 text-center text-sm text-muted-foreground">Nenhum gasto encontrado para os filtros selecionados.</p>}
        </div>
      </section>
    </div></>}
    {categoryAdmin&&tab==='categories'&&<SpendCategoryConfig standalone/>}
    {finance&&tab==='advances'&&<SpendAdvancesPanel data={data} refresh={refresh} receiptActions={receiptActions}/>} {finance&&tab==='allocations'&&<SpendSupplierAllocations data={data} refresh={refresh}/>} {finance&&tab==='cards'&&<SpendCards data={data} refresh={refresh}/>} {tab==='logs'&&<section className="divide-y divide-border">{[...new Set(data.notices.filter(n=>n.card_id===card?.id).map(n=>n.line_id))].filter((id):id is string=>!!id).map(id=><div key={id} className="flex items-center gap-2 py-2 text-sm"><span className="min-w-0 break-words">{data.lines.find(l=>l.id===id)?.merchant??'Envios ao portador'}</span><SpendNoticeHistory data={data} lineId={id}/></div>)}{data.logs.filter(l=>l.card_id===card?.id).map(l=><div key={l.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><span>{l.action === 'line_description_edited' ? 'Descrição e observação editadas' : l.action} · {data.users.find(u=>u.id===l.actor_id)?.name??'—'}</span><span className="text-muted-foreground">{new Date(l.created_at).toLocaleString('pt-BR')}</span></div>)}</section>}
    </section>
  </main><AppNavigation className={ml.nav} aria-label="Navegação Spend"><div className={`mx-auto grid max-w-2xl grid-flow-col auto-cols-fr items-stretch ${ml.grid} rounded-[1.75rem] border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/90`}>{tabs.map(({value,label,icon:Icon})=><Button key={value} variant="ghost" className={`h-auto min-w-0 rounded-[1.35rem] p-0 shadow-none ${tab===value ? "!bg-primary/15 !text-primary hover:!bg-primary/20 hover:!text-primary" : "!bg-transparent !text-muted-foreground hover:!bg-muted hover:!text-foreground"}`} aria-current={tab===value?'page':undefined} onClick={()=>setTab(value)}><span className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1"><span className="menu-icon"><Icon className="h-5 w-5 shrink-0" /></span><span className="max-w-full text-[10px] font-semibold leading-tight whitespace-normal">{label}</span></span></Button>)}</div></AppNavigation>
    {missingRequest&&<MissingReceiptDialog key={missingRequest.line_id} request={missingRequest} onClose={()=>setMissingRequest(null)} refresh={refresh}/>}
    {projectReview.dialog}
    <Dialog open={editingDue&&!!statement} onOpenChange={open=>{setEditingDue(open);if(!open)setDueDraft(statement?.due_date??'');}}><DialogContent aria-describedby={undefined}><DialogHeader><DialogTitle>Vencimento da fatura</DialogTitle></DialogHeader><Button variant="ghost" size="icon" className="absolute right-14 top-4" title="Salvar vencimento" aria-label="Salvar vencimento" disabled={busy||!dueDraft||dueDraft===statement?.due_date} onClick={saveDue}><Save /></Button><label className="block space-y-1"><Label>Vencimento</Label><Input type="date" aria-label="Vencimento da fatura importada" value={dueDraft} onChange={e=>setDueDraft(e.target.value)} /></label></DialogContent></Dialog>
    <input ref={documentInput} type="file" className="hidden" aria-hidden tabIndex={-1} accept=".pdf,application/pdf,.jpg,.jpeg,image/jpeg,.png,image/png,.webp,image/webp" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)setCapture({file:f});}} /><input ref={cameraInput} type="file" className="hidden" aria-hidden tabIndex={-1} accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)setCapture({file:f});}} />{capture&&(card||hasAdvanceOnly||canSubmitWithoutCard)&&<SpendCapture data={data} cardId={card?.id??''} {...(capture.file?{initialFile:capture.file}:{})} {...(capture.line?{line:capture.line}:{})} {...(capture.receipt?{receipt:capture.receipt}:{})} withoutReceipt={!!capture.manual} onDone={refresh} onClose={()=>setCapture(null)} />}{importing&&card&&<SpendStatementImport card={card} period={period} sentenceCase={sentenceCase} onSentenceCaseChange={setSentenceCase} onDone={refresh} onImported={setPeriod} onClose={()=>setImporting(false)}/>}
    <Dialog open={!!notice} onOpenChange={o=>{if(!o)setNotice(null);}}><DialogContent><DialogHeader><DialogTitle>{notice==='notify'?'Notificar Portador':'Pedir ajuste'}</DialogTitle></DialogHeader><Textarea aria-label="Mensagem ao portador" value={message} onChange={e=>setMessage(e.target.value)}/><Button disabled={busy||!message.trim()} onClick={async()=>{if(!active||!notice)return;await action(notice,{line_id:active.id,message});setNotice(null);}}>Enviar aviso no app</Button></DialogContent></Dialog>
  </div>;
}