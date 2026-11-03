import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("a divisão herda toda a formatação diretamente da etapa original", () => {
  const sql = readFileSync(new URL("../../drizzle/migrations/0152_mytosis_split_inherit_format.sql", import.meta.url), "utf8");
  const insert = sql.match(/INSERT INTO public\.mytosis_nodes\s*\(([^)]+)\)\s*VALUES\s*\(([^;]+)\)\s*RETURNING/);
  expect(insert).not.toBeNull();
  if (!insert) return;
  const fields = insert[1].split(",").map((field) => field.trim());
  const values = insert[2].split(/,(?![^()]*\))/).map((value) => value.trim());
  for (const field of ["shape", "fill_color", "border_color", "title_font_size", "description_font_size", "text_align", "text_vertical_align", "title_color"]) {
    expect(fields).toContain(field);
    expect(values[fields.indexOf(field)]).toBe(`source.${field}`);
  }
});