import { test } from "node:test";
import assert from "node:assert/strict";
import { currentCodeObservations, proposedSolutionSchema, codeObservationSchema } from "./code-records";
test("Solução Proposta é opcional", () => { assert.equal(proposedSolutionSchema.parse(""), ""); });
test("Nova observação não pode ser vazia", () => { assert.equal(codeObservationSchema.safeParse("   ").success, false); });
test("Edição apresenta texto atual preservando os eventos originais", () => {
  const logs = [{ id:"1", observation_id:"obs", event_type:"observation_added", note:"Original", created_at:"2026-10-28T10:00:00Z", changed_by:"admin" }, { id:"2", observation_id:"obs", event_type:"observation_edited", note:"Corrigida", created_at:"2026-10-28T11:00:00Z", changed_by:"admin" }];
  assert.equal(currentCodeObservations(logs)[0]?.note, "Corrigida"); assert.equal(logs[0]?.note, "Original"); assert.equal(logs.length, 2);
});
test("observação excluída sai da lista atual", () => {
  const logs = [
    { id: "1", observation_id: "o1", event_type: "observation_added", note: "A", created_at: "2026-10-28T10:00:00Z", changed_by: "u" },
    { id: "2", observation_id: "o1", event_type: "observation_deleted", note: null, created_at: "2026-10-28T11:00:00Z", changed_by: "u" },
  ];
  assert.deepEqual(currentCodeObservations(logs), []);
});
