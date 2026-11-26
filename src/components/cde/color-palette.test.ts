import { describe, expect, it } from "vitest";
import { COLOR_PALETTE, colorOption, paletteExtras, withDefault } from "./color-palette";
import { HEADER_COLORS, headerColor, type HeaderColorKind } from "./table-fonts-config";
import { TAG_COLOR_CHOICES, tagColor } from "./tag-style";
import { MESSAGE_COLORS } from "@/components/corporate/message-style";

const labels = (list: readonly { label: string }[]) => list.map((o) => o.label.trim().toLowerCase());

describe("paleta de cores do CDE", () => {
  it("oferece cada cor uma única vez, sem nome nem valor repetido", () => {
    expect(new Set(labels(COLOR_PALETTE)).size).toBe(COLOR_PALETTE.length);
    expect(new Set(COLOR_PALETTE.map((o) => o.value)).size).toBe(COLOR_PALETTE.length);
  });

  it("tem exatamente um Branco, e ele é branco", () => {
    const brancos = COLOR_PALETTE.filter((o) => o.label === "Branco");
    expect(brancos).toHaveLength(1);
    expect(brancos[0].value).toBe("var(--myio-white)");
  });

  it("nenhuma lista de seleção repete cor ou chave", () => {
    for (const kind of Object.keys(HEADER_COLORS) as HeaderColorKind[]) {
      const list = HEADER_COLORS[kind] as readonly { key: string; value: string; label: string }[];
      expect(new Set(list.map((o) => o.key)).size, kind).toBe(list.length);
      expect(new Set(list.map((o) => o.value)).size, kind).toBe(list.length);
      expect(new Set(labels(list)).size, kind).toBe(list.length);
    }
    for (const kind of Object.keys(MESSAGE_COLORS) as (keyof typeof MESSAGE_COLORS)[]) {
      const list = MESSAGE_COLORS[kind] as readonly { key: string; value: string; label: string }[];
      expect(new Set(labels(list)).size, kind).toBe(list.length);
    }
    expect(new Set(TAG_COLOR_CHOICES.map((o) => o.key)).size).toBe(TAG_COLOR_CHOICES.length);
  });

  it("as cores já salvas continuam valendo", () => {
    expect(tagColor("branco").value).toBe("var(--myio-white)");
    expect(tagColor("cinza_claro").value).toBe("color-mix(in oklab, var(--muted) 50%, transparent)");
    expect(tagColor("preto").value).toBe("var(--cde-palette-black)");
    expect(tagColor("verde").value).toBe("var(--myio-green)");
    expect(tagColor("atual:_branco_/_verde_claro").value).toBe("var(--card)");
    expect(tagColor(undefined).key).toBe("padrao");
    expect(tagColor("cor-inexistente").key).toBe("padrao");
    expect(headerColor("headerBg", "cinza_claro").value).toBe("color-mix(in oklab, var(--muted) 50%, transparent)");
    expect(headerColor("headerText", "padrao").value).toBe("var(--muted-foreground)");
  });

  it("a cor em uso aparece uma única vez na lista que a tem como padrão", () => {
    const list = withDefault("Cinza (texto)", "var(--muted-foreground)");
    expect(list[0].key).toBe("padrao");
    expect(list.filter((o) => o.value === "var(--muted-foreground)")).toHaveLength(1);
    expect(new Set(labels(list)).size).toBe(list.length);
    expect(paletteExtras([{ value: "transparent" }]).some((o) => o.value === "transparent")).toBe(false);
  });
});
