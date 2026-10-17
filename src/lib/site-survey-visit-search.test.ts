import { test } from "node:test";
import assert from "node:assert/strict";

import { visitSearchHaystack } from "./site-survey-visit-search";

test("Busca de visitas encontra lojas e quiosques pelo nome", () => {
  const haystack = visitSearchHaystack([202609280001, "Implantação Mogi", "Av. Mogi Mirim"], "Burguer King Mogi  Loja 12 Burguer King Center Vale");
  assert.ok(haystack.includes("burguer king"), "deve encontrar o nome da loja");
});

test("Sem nomes de pontos, a busca continua cobrindo visita, cliente, projeto e técnico", () => {
  const haystack = visitSearchHaystack([202609300001, "Allos", "Leandro Silva"]);
  assert.ok(haystack.includes("leandro silva"));
  assert.ok(haystack.includes("202609300001"));
});
