import type { DemandGroup } from './supply-consolidation';
export const consolidationMoney=(value:number)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export async function exportConsolidationPdf(groups:DemandGroup[],mode:'item'|'requester',detailed:boolean,filters:string) {
 const {jsPDF}=await import('jspdf');const {default:autoTable}=await import('jspdf-autotable');const doc=new jsPDF({orientation:'landscape'});
 doc.setFontSize(15);doc.text('myio Supply — Consolidação de itens',14,16);doc.setFontSize(9);
 const heading=doc.splitTextToSize(`Emissão: ${new Date().toLocaleString('pt-BR')} | ${mode==='item'?'Por Item':'Por Solicitante'} | ${detailed?'Detalhada':'Resumida'}\n${filters}`,265);doc.text(heading,14,23);
 const body:string[][]=[];
 for(const g of groups) {
  body.push([`${g.market} / ${g.origin}`,g.label,mode==='item'?String(g.quantity):'—',mode==='item'?g.unit:'—',String(g.orders),`${consolidationMoney(g.total)}${g.missingValue?' (parcial)':''}`]);
  if(detailed)for(const r of g.rows)body.push(['',`${r.number} | ${r.item} | ${r.requester}\n${r.destination} | ${r.date.split('-').reverse().join('/')} | ${r.state}`,String(r.quantity),r.unit,r.unitValue===null?'Não informado':consolidationMoney(r.unitValue),r.total===null?'Não informado':consolidationMoney(r.total)]);
 }
 autoTable(doc,{startY:25+heading.length*5,head:[['Origem','Item / Solicitante e demanda','Quantidade','Unidade','Pedidos / V. unit.','Valor estimado']],body,theme:'plain',styles:{fontSize:8,cellPadding:3},columnStyles:{1:{cellWidth:105}},margin:{left:14,right:14},didDrawPage:()=>{doc.setFontSize(8);doc.text(`Página ${doc.getNumberOfPages()}`,270,200);}});
 doc.save(`Supply-consolidacao-${detailed?'detalhada':'resumida'}.pdf`);
}