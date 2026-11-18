export const BUDGET_MODES = [{value:"detailed",label:"Orçamento detalhado pronto"},{value:"estimated",label:"Somente estimativa"},{value:"none",label:"Sem orçamento estimado"}];
export function budgetTotal(mode:string, estimate:string, details:{amount:number}[]) {
 if(mode==="none") return 0;
 const value=mode==="detailed"?details.reduce((s,r)=>s+r.amount,0):Number(estimate);
 if(!Number.isFinite(value)||value<0||details.some(r=>!Number.isFinite(r.amount)||r.amount<0))throw new Error("Informe valores de orçamento válidos e não negativos.");
 if(mode==="estimated"&&!estimate.trim())throw new Error("Informe o total estimado.");
 if(mode==="detailed"&&!details.length)throw new Error("Selecione as contas do orçamento no CDE antes de detalhar.");
 return value;
}
export const projectNameKey=(name:string)=>name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");