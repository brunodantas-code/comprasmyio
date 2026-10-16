import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { flowRateStatus, isUninformedLocation, lowerLeadingPreposition, uninformedRegisterSentences } from "./site-survey-report-prose";

const joined = (parts: { text: string }[]) => parts.map((part) => part.text).join("");

describe("uninformedRegisterSentences", () => {
  test("says the register type was not informed when nobody answered about its condition", () => {
    assert.equal(
      joined(uninformedRegisterSentences("Não informado", null)),
      "Não foi informado o tipo de registro existente. ",
    );
  });

  test("keeps the approved sentence when the condition was answered", () => {
    assert.equal(
      joined(uninformedRegisterSentences("Não informado", "funcional")),
      "O tipo de registro existente não foi informado, mas encontra-se funcional. ",
    );
  });

  test("reports type and condition together when both were left out", () => {
    assert.equal(
      joined(uninformedRegisterSentences("Não informado", "Não informado")),
      "O tipo e a condição do registro não foram informados. ",
    );
  });

  test("writes nothing when the register type was informed", () => {
    assert.deepEqual(uninformedRegisterSentences("Gaveta", "funcional"), []);
    assert.deepEqual(uninformedRegisterSentences(null, null), []);
  });
});

describe("lowerLeadingPreposition", () => {
  test("lowercases only the preposition that opens a flow rate", () => {
    assert.equal(lowerLeadingPreposition("Até 5 m³/h"), "até 5 m³/h");
    assert.equal(lowerLeadingPreposition("De 5 a 10 m³/h"), "de 5 a 10 m³/h");
    assert.equal(lowerLeadingPreposition("DN20"), "DN20");
  });
});


describe("missing technical values", () => {
  test("CEMA location markers are not physical places", () => {
    assert.equal(isUninformedLocation("Não informado"), true);
    assert.equal(isUninformedLocation("sem informação sobre a localização"), true);
    assert.equal(isUninformedLocation("na parede abaixo do duto de AC"), false);
  });
  test("CEMA unverifiable flow differs from uninformed and known rates", () => {
    assert.equal(flowRateStatus("Não é possível verificar."), "unverifiable");
    assert.equal(flowRateStatus("Outros — Não é possível verificar."), "unverifiable");
    assert.equal(flowRateStatus("Não informado e não legível"), "uninformed");
    assert.equal(flowRateStatus("Até 5 m³/h"), "informed");
  });
});
