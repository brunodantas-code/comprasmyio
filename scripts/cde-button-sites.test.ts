import { describe, expect, it } from "vitest";
import { buttonSites, instrumentButtons } from "./cde-button-sites";
describe("live library inventory", () => {
  const code = 'export const View = () => <><Button onClick={keep}>Excluir visita e manter chamados</Button><button style={{ opacity: 1 }} onClick={remove}>{pending ? "Excluindo..." : "Excluir visita e chamados"}</button></>';
  it("wires native, dynamic and shared controls without changing handlers", () => {
    const result = instrumentButtons(code, "components/example.tsx");
    expect(result).toContain('onClick={keep}');
    expect(result).toContain('onClick={remove}');
    expect(result).toContain('cdeNative');
    expect(result).toContain('Excluir visita e manter chamados');
    expect(result).toContain('pending ? "Excluindo..."');
    expect(buttonSites(code, "components/example.tsx").every(b => result?.includes(b.id))).toBe(true);
  });
  it("keeps identity when line numbers change", () => {
    expect(buttonSites(code, "components/example.tsx").map(b => b.id)).toEqual(buttonSites('\n\n' + code, "components/example.tsx").map(b => b.id));
  });
  it("does not count wrapper consumers again", () => {
    expect(buttonSites('<ConfirmDeleteButton /><GalleryQrButton /><Button>Excluir</Button>', 'components/example.tsx')).toHaveLength(1);
  });
  it("does not instrument its own implementation or test fixtures", () => {
    expect(instrumentButtons(code, 'components/ui/button.tsx')).toBeNull();
    expect(instrumentButtons(code, 'components/example.test.tsx')).toBeNull();
  });
});