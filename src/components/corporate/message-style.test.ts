import { describe, expect, it } from "vitest";
import { MESSAGE_COLORS, MESSAGE_STYLE_DEFAULT, messageStyleCss, parseMessageStyle } from "./message-style";

describe("corporate message style", () => {
  it("keeps today's look when nothing is saved", () => {
    expect(parseMessageStyle(null)).toEqual(MESSAGE_STYLE_DEFAULT);
    expect(messageStyleCss(MESSAGE_STYLE_DEFAULT)).toMatchObject({ background: "var(--myio-green-tint)", color: "var(--myio-dark)", symbol: "var(--myio-green)" });
  });
  it("offers the brand colours used by the app icons, including purple and lilac", () => {
    const values = MESSAGE_COLORS.fill.map((o) => o.value);
    expect(values).toEqual(expect.arrayContaining(["var(--myio-purple)", "var(--myio-lilac)", "var(--erp-landing)", "var(--myio-white)"]));
  });
  it("falls back to the default for unknown saved keys", () => {
    expect(parseMessageStyle('{"fill":"roxo","text":"xyz"}')).toEqual({ ...MESSAGE_STYLE_DEFAULT, fill: "roxo" });
  });
});
