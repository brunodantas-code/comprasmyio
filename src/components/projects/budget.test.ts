import {describe,it,expect} from "vitest";
import {budgetTotal,projectNameKey} from "./budget";
describe("Orçamento do Projects",()=>{
 it("detalhado soma valores das contas",()=>expect(budgetTotal("detailed","999",[{amount:100},{amount:250}])).toBe(350));
 it("estimativa usa apenas total informado",()=>expect(budgetTotal("estimated","2000",[{amount:100}])).toBe(2000));
 it("sem estimativa não representa um orçamento aprovado",()=>expect(budgetTotal("none","2000",[])).toBe(0));
 it("não aceita estimativa em branco",()=>expect(()=>budgetTotal("estimated","",[])).toThrow());
 it("exige contas para detalhamento",()=>expect(()=>budgetTotal("detailed","",[])).toThrow());
 it("confere nome do Supply ignorando separador e acentos",()=>expect(projectNameKey("Implantação | Shopping Vila Velha")).toBe(projectNameKey("Implantação Shopping Vila Velha")));
});