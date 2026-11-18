import {addDays,parseISO} from "date-fns";
import {dateKey,isWorking,type Calendar} from "./logic";
import {classifyPointEnergyWater} from "@/lib/site-survey-energy-water";
export const DISCIPLINES=[{value:"electrical",label:"Elétrica"},{value:"hydraulic",label:"Hidráulica"}] as const;
export const DIFFICULTIES=[{value:"low",label:"Baixa"},{value:"medium",label:"Média"},{value:"high",label:"Alta"},{value:"unknown",label:"Não informada"}] as const;
export type AssumptionEntry={discipline:string;difficulty:string;quantity:number;productivity:number|null};
export function emptyEntries():AssumptionEntry[]{return DISCIPLINES.flatMap(d=>DIFFICULTIES.map(level=>({discipline:d.value,difficulty:level.value,quantity:0,productivity:null})));}
export function installationEstimate(entries:AssumptionEntry[],calendar:Calendar,end:string|null){
 const missing=entries.some(e=>e.quantity>0&&!(e.productivity&&e.productivity>0));
 const hours=entries.reduce((n,e)=>n+(e.productivity&&e.productivity>0?e.quantity/e.productivity:0),0);
 let days=0;if(end&&end>=calendar.start_date)for(let d=calendar.start_date;d<=end;d=dateKey(addDays(parseISO(d),1)))if(isWorking(d,calendar))days++;
 return {hours:missing?null:hours,days,professionals:missing||!days?null:Math.ceil(hours/(days*calendar.hours_per_day))};
}
const normalize=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function answerValue(v:unknown):string{if(v&&typeof v==="object"&&"value" in v)return answerValue((v as {value:unknown}).value);return String(v??"");}
export function surveyAssumptionEntries(points:{id:string;kind:string;point_type:string;completion_status:string;active:boolean;skipped_section_ids:unknown}[],responses:{visit_luc_id:string|null;visit_environment_id:string|null;question_id:string;answer:unknown}[],questions:{id:string;prompt:string;section_id:string}[],sections:{id:string;title:string}[],approvals:{point_kind:string;point_id:string;electrical_approved:boolean;hydraulic_approved:boolean}[],approvedOnly:boolean){
 const entries=emptyEntries();
 for(const point of points){
  if(!point.active||point.completion_status==="cancelada"||["vacant","vacant_kiosk"].includes(point.point_type))continue;
  const skipped=Array.isArray(point.skipped_section_ids)?point.skipped_section_ids:[];
  const visible=questions.filter(q=>!skipped.includes(q.section_id));
  const answers=new Map(responses.filter(r=>point.kind==="luc"?r.visit_luc_id===point.id:r.visit_environment_id===point.id).map(r=>[r.question_id,r.answer]));
  const kind=classifyPointEnergyWater(answers,visible);
  const approval=approvals.find(a=>a.point_kind===point.kind&&a.point_id===point.id);
  for(const d of DISCIPLINES){
   const q=visible.find(q=>normalize(q.prompt).includes("complexidade")&&(d.value==="electrical"?/eletric/.test(normalize(sections.find(s=>s.id===q.section_id)?.title??"")):/agua|hidrometro|hidraulic/.test(normalize(sections.find(s=>s.id===q.section_id)?.title??"")))&&answers.has(q.id));
   const raw=normalize(answerValue(q?answers.get(q.id):null));
   const hasInstallation=["baixa","media","alta"].some(level=>raw.startsWith(level));
   const included=approvedOnly?(d.value==="electrical"?approval?.electrical_approved:approval?.hydraulic_approved):hasInstallation||kind==="both"||(d.value==="electrical"?kind==="energy":kind==="water");
   if(!included)continue;
   const difficulty=raw.startsWith("baixa")?"low":raw.startsWith("media")?"medium":raw.startsWith("alta")?"high":"unknown";
   const entry=entries.find(e=>e.discipline===d.value&&e.difficulty===difficulty);if(entry)entry.quantity++;
  }
 }
 return entries;
}