import { expect, it } from "vitest";
import { indicatorDepartment } from "./department";
import { sortIndicatorCards } from "./card-order";
import { matchesColumnFilter } from "@/lib/column-filters";

const objectives = [
  { id: "finance", alignment_name: "Financeiro", parent_id: null },
  { id: "sales", alignment_name: "Comercial", parent_id: null },
  { id: "child", alignment_name: null, parent_id: "sales" },
];
const columns = [{ key: "department", value: (row: { id: string }) => indicatorDepartment(row.id, objectives) }];

it("filtra Comercial e Financeiro pelo departamento registrado", () => {
  const selected = objectives.filter(row => {
    const department = indicatorDepartment(row.id, objectives);
    return matchesColumnFilter("text", department, department, { selected: ["Comercial"] });
  });
  expect(selected.map(row => row.id)).toEqual(["sales", "child"]);
  expect(indicatorDepartment("finance", objectives)).toBe("Financeiro");
});

it("ordena departamentos nos dois sentidos", () => {
  expect(sortIndicatorCards(objectives, { key: "department", direction: "asc" }, columns).map(row => row.id)).toEqual(["sales", "child", "finance"]);
  expect(sortIndicatorCards(objectives, { key: "department", direction: "desc" }, columns).map(row => row.id)).toEqual(["finance", "sales", "child"]);
});

it("KRs e KPIs vinculados seguem o departamento do objetivo, sem inventar vínculo para KPIs independentes", () => {
  expect(indicatorDepartment("child", objectives)).toBe("Comercial");
  expect(indicatorDepartment(null, objectives)).toBe("Sem departamento/setor");
  expect(indicatorDepartment("missing", objectives)).toBe("Sem departamento/setor");
});

it("encerra vínculos cíclicos sem departamento", () => {
  expect(indicatorDepartment("a", [{ id: "a", alignment_name: null, parent_id: "b" }, { id: "b", alignment_name: null, parent_id: "a" }])).toBe("Sem departamento/setor");
});