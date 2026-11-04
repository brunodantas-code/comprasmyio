import { expect, it } from "vitest";
import { BUILTIN_FORMAT, canEditBoxLayout, initialStageFormat, standardForShape } from "./mytosis-format";
import type { MytosisNode } from "./mytosis";

it("nova etapa usa exatamente a formatação da anterior sem alterá-la", () => {
  const previous = { id: "previous", shape: "document", fill_color: "dark", border_color: "purple", title_font_size: 14, description_font_size: 12, title_color: "white", control_color: "green", text_align: "right", text_vertical_align: "bottom" } as MytosisNode;
  const source = initialStageFormat([previous], null, "previous");
  expect(source).toEqual(previous);
  expect(source?.shape).toBe("document");
  expect(source?.title_font_size).toBe(14);
  expect(initialStageFormat([previous], { ...previous, id: "edited", shape: "decision" }, "previous")?.shape).toBe("decision");
});

it("cada forma mantém seu próprio padrão sem receber o da outra", () => {
  const formats = { process: { ...BUILTIN_FORMAT, fill_color: "green" }, decision: { ...BUILTIN_FORMAT, shape: "decision", fill_color: "purple-soft", border_color: "dark" } };
  expect(standardForShape(formats, BUILTIN_FORMAT, "decision")).toMatchObject({ shape: "decision", fill_color: "purple-soft", border_color: "dark" });
  expect(standardForShape(formats, BUILTIN_FORMAT, "process").fill_color).toBe("green");
});

it("Admin pode editar o layout dos boxes", () => {
  expect(canEditBoxLayout("admin")).toBe(true);
});

it("Editor não pode editar o layout dos boxes", () => {
  expect(canEditBoxLayout("editor")).toBe(false);
});

it("Visualizador não pode editar o layout dos boxes", () => {
  expect(canEditBoxLayout("viewer")).toBe(false);
});