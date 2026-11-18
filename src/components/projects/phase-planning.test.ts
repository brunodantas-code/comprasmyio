import {describe,it,expect} from "vitest";
import {phaseComparison,validatePeriod} from "./phase-planning";
describe("planejamento independente de fases",()=>{
 it("preserva período de fase sem tarefas",()=>expect(phaseComparison({planned_start:"2026-11-20",planned_end:"2026-11-25"},{start_date:"2026-11-18",planned_end:"2026-11-30"},[])).toEqual([]));
 it("compara início da fase com o projeto",()=>expect(phaseComparison({planned_start:"2026-11-17",planned_end:null},{start_date:"2026-11-18",planned_end:null},[])).toEqual(["Fase inicia antes do projeto"]));
 it("compara fim da fase com o projeto",()=>expect(phaseComparison({planned_start:null,planned_end:"2026-12-01"},{start_date:"2026-11-18",planned_end:"2026-11-30"},[])).toEqual(["Fase termina após o projeto"]));
 it("compara tarefas com o fim previsto",()=>expect(phaseComparison({planned_start:null,planned_end:"2026-11-25"},{start_date:"2026-11-18",planned_end:null},[{start:"2026-11-20",end:"2026-11-26"}])).toEqual(["Tarefas ultrapassam o fim da fase"]));
 it("rejeita fim anterior ao início",()=>expect(()=>validatePeriod("2026-11-25","2026-11-24")).toThrow());
});