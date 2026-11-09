import { describe, expect, it } from "vitest";
import { numberSites } from "./scan-cde-numbering";
describe("numbering usage inventory", () => {
  it("separates section and question/action numbering", () => {
    expect(numberSites('<><CdeNumber>1</CdeNumber><CdeNumber subcategory>2</CdeNumber><CdeNumberButton subcategory screen="x">3</CdeNumberButton></>', 'components/example.tsx').map(e => e.group)).toEqual(['number_section', 'number_subsection', 'number_subsection']);
  });
});