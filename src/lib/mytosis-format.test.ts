import { expect, it } from "vitest";
import { initialStageFormat } from "./mytosis-format";
import type { MytosisNode } from "./mytosis";

it("nova etapa usa exatamente a formatação da anterior sem alterá-la", () => {
  const previous = { id: "previous", shape: "document", fill_color: "dark", border_color: "purple", title_font_size: 14, description_font_size: 12, title_color: "white", control_color: "green", text_align: "right", text_vertical_align: "bottom" } as MytosisNode;
  const source = initialStageFormat([previous], null, "previous");
  expect(source).toEqual(previous);
  expect(source?.shape).toBe("document");
  expect(source?.title_font_size).toBe(14);
  expect(initialStageFormat([previous], { ...previous, id: "edited", shape: "decision" }, "previous")?.shape).toBe("decision");
});