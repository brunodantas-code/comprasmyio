import { describe, expect, it } from "vitest";
import { inheritActionLook, isSpecificAction } from "./action-standard";

describe("Action classification", () => {
  it("width alone keeps the common standard", () => {
    expect(isSpecificAction({ className: "w-48 min-w-max", group: "save" })).toBe(false);
  });
  it("custom height is a specific function", () => {
    expect(isSpecificAction({ className: "!h-7", group: "save" })).toBe(true);
  });
  it("custom border is a specific function", () => {
    expect(isSpecificAction({ className: "rounded-full border-0" })).toBe(true);
  });
  it("custom background is a specific function", () => {
    expect(isSpecificAction({ className: "hover:!bg-primary" })).toBe(true);
  });
  it("custom models are classified as specific", () => {
    expect(isSpecificAction({ modelStyle: { actionSpecific: true } })).toBe(true);
  });
  it("secondary standards remain specific", () => {
    expect(isSpecificAction({ secondary: true })).toBe(true);
  });
  it("changing the common standard updates appearance without changing action identity", () => {
    const own = { variant: "ghost", size: "sm", className: "", style: {}, icon: "Send", label: "Enviar pergunta" };
    const common = { variant: "outline", size: "default", className: "rounded-md", style: {} };
    const updated = inheritActionLook(own, common);
    expect(updated.variant).toBe("outline");
    expect(updated.size).toBe("default");
    expect(updated.icon).toBe("Send");
    expect(updated.label).toBe("Enviar pergunta");
  });
});