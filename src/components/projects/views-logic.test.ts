import { describe,it,expect } from "vitest";
import { columnOf,defaultColumns,effortByUnit,workload,levelingProposal } from "./views-logic";
import { schedule,type PlanTask } from "./logic";
const cal={start_date:"2026-11-18",calendar_mode:"business",holidays:[],hours_per_day:8};
const task=(id:string):PlanTask=>({id,name:id,project_id:"p",start_date:cal.start_date,duration:1,progress:0,milestone:false,actual_start:null,actual_end:null,responsible_id:null,phase_id:null,position:0,notes:""});
const resources=[{id:"r",user_id:"u",name:"Equipe",kind:"person",capacity_per_day:8,unit:"h"}];
const allocations=["a","b"].map(task_id=>({task_id,resource_id:"r",planned_quantity:8,actual_quantity:0,unit_rate:10}));
describe("Visões e capacidade",()=>{
 it("classifica concluído em 100% e mantém coluna configurada",()=>{expect(columnOf({progress:100},defaultColumns)).toBe("done");expect(columnOf({progress:0,board_column:"doing"},defaultColumns)).toBe("doing");});
 it("soma 16 horas do mesmo profissional contra capacidade diária de 8",()=>{const rows=workload(schedule([task("a"),task("b")],[],cal),allocations,resources,new Map([["p",cal]]));expect(rows[0].load).toBe(16);expect(rows[0].capacity).toBe(8);});
 it("propõe separar tarefas sem mudar os registros de origem",()=>{const tasks=[task("a"),task("b")];const proposal=levelingProposal("p",tasks,[],cal,[],allocations,resources,new Map([["p",cal]]));expect(proposal.resolved).toBe(true);expect(proposal.changes[0].after).toBe("2026-11-19");expect(tasks[1].start_date).toBe("2026-11-18");});
 it("não nivela atividades já iniciadas",()=>{const tasks=[task("a"),task("b")].map(t=>({...t,actual_start:cal.start_date}));expect(levelingProposal("p",tasks,[],cal,[],allocations,resources,new Map([["p",cal]])).resolved).toBe(false);});
 it("separa esforço em horas e materiais sem somar unidades incompatíveis",()=>{const a=allocations[0];expect(effortByUnit([a,{...a,resource_id:"m",planned_quantity:4}],[{id:"r",unit:"h"},{id:"m",unit:"un"}])).toEqual({h:{planned:8,actual:0},un:{planned:4,actual:0}});});
});