import { describe, expect, it, vi } from "vitest";
import { canReopenCodeTicket, codeReopenReasonSchema, confirmCodeTicketConclusion } from "./code-ticket-lifecycle";

const ticket = { status: "concluido", reporter_id: "alexandre", assignee_id: "leonardo" };

describe("Reabertura de chamado Code", () => {
  it("permite ao Solicitante reabrir seu chamado concluído sem ser Admin", () => {
    expect(canReopenCodeTicket(ticket, "alexandre", false)).toBe(true);
  });
  it("permite ao Atendente atribuído reabrir o chamado concluído", () => {
    expect(canReopenCodeTicket(ticket, "leonardo", true)).toBe(true);
  });
  it("não permite a um Admin não atribuído nem a outro usuário reabrir", () => {
    expect(canReopenCodeTicket(ticket, "joao", true)).toBe(false);
    expect(canReopenCodeTicket(ticket, "outro", false)).toBe(false);
    expect(canReopenCodeTicket(ticket, undefined, true)).toBe(false);
  });
  it("não reabre excluídos ou chamados já em andamento", () => {
    for (const status of ["excluido", "aberto", "em_atendimento", "aguardando_resposta", "atendido"]) {
      expect(canReopenCodeTicket({ ...ticket, status }, "alexandre", false)).toBe(false);
    }
  });
  it("exige motivo e remove somente os espaços ao redor", () => {
    expect(codeReopenReasonSchema.safeParse("   ").success).toBe(false);
    expect(codeReopenReasonSchema.parse("  O problema permanece.  ")).toBe("O problema permanece.");
  });
});

describe("Confirmação antes de Concluir", () => {
  it("não conclui quando o Solicitante cancela a confirmação", async () => {
    const conclude = vi.fn();
    expect(await confirmCodeTicketConclusion("atendido", true, async () => false, conclude)).toBe(false);
    expect(conclude).not.toHaveBeenCalled();
  });
  it("conclui uma única vez depois da confirmação do Solicitante", async () => {
    const conclude = vi.fn();
    expect(await confirmCodeTicketConclusion("atendido", true, async () => true, conclude)).toBe(true);
    expect(conclude).toHaveBeenCalledTimes(1);
  });
  it("não confirma nem conclui para Atendente ou chamado não atendido", async () => {
    const confirm = vi.fn(async () => true);
    const conclude = vi.fn();
    expect(await confirmCodeTicketConclusion("atendido", false, confirm, conclude)).toBe(false);
    expect(await confirmCodeTicketConclusion("aberto", true, confirm, conclude)).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
    expect(conclude).not.toHaveBeenCalled();
  });
});