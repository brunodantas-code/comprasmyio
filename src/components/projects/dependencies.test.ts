import {it,expect} from "vitest";
import {schedule,type PlanTask} from "./logic";
import {wbsRows} from "./wbs";
const calendar={start_date:"2026-11-18",calendar_mode:"calendar",holidays:[],hours_per_day:8};
const task=(id:string,duration:number):PlanTask=>({id,name:id,duration,start_date:calendar.start_date,milestone:false,progress:0,actual_start:null,actual_end:null,responsible_id:null,phase_id:null,position:0,notes:"",project_id:"p"});
for(const [link_type,lag,start] of [["TI",0,"2026-11-22"],["II",1,"2026-11-19"],["TT",0,"2026-11-20"],["IT",3,"2026-11-20"],["TI",-2,"2026-11-20"]] as const)it(`${link_type} com intervalo ${lag}`,()=>expect(schedule([task("a",4),task("b",2)],[{predecessor_id:"a",successor_id:"b",link_type,lag}],calendar)[1].start).toBe(start));
it("folga zero no vínculo TT",()=>{const rows=schedule([task("a",4),task("b",2)],[{predecessor_id:"a",successor_id:"b",link_type:"TT",lag:0}],calendar);expect(rows.map(t=>t.float)).toEqual([0,0]);});
it("EAP mantém numeração hierárquica",()=>expect(wbsRows([{id:"a",position:0},{id:"b",position:0,parent_id:"a"},{id:"c",position:1,parent_id:"a"}]).map(r=>r.number)).toEqual(["1","1.1","1.2"]));
it("EAP recolhida oculta descendentes",()=>expect(wbsRows([{id:"a",position:0},{id:"b",position:0,parent_id:"a"}],new Set(["a"]))).toHaveLength(1));