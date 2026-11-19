import { describe, expect, it } from "vitest";
import { MESSAGE_ATTACHMENT_MAX_BYTES, filterValidMessageAttachments, messageTextForSend } from "./message-attachment-rules";

function fileNamed(name: string, size: number, type = "application/pdf") {
  return new File([new Uint8Array(size)], name, { type });
}

describe("Anexos das mensagens", () => {
  it("aceita arquivo dentro do limite de 10 MB", () => {
    const files = filterValidMessageAttachments([fileNamed("nota-fiscal.pdf", 1024)]);
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe("nota-fiscal.pdf");
  });

  it("recusa arquivo vazio e arquivo acima de 10 MB", () => {
    const files = filterValidMessageAttachments([
      fileNamed("vazio.pdf", 0),
      fileNamed("grande.pdf", MESSAGE_ATTACHMENT_MAX_BYTES + 1),
      fileNamed("ok.pdf", MESSAGE_ATTACHMENT_MAX_BYTES),
    ]);
    expect(files.map((f) => f.name)).toEqual(["ok.pdf"]);
  });

  it("mantém a mensagem quando ela é enviada só com arquivos", () => {
    expect(messageTextForSend("   ")).toBe("(arquivos anexados)");
    expect(messageTextForSend("  Conferir o anexo  ")).toBe("Conferir o anexo");
  });
});
