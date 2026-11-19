/** Rules shared by every conversation that accepts message attachments. */

/** Every message attachment stays below 10 MB, the limit already used by Code and OpDesk. */
export const MESSAGE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/** Keeps only files a message can carry: not empty and within the size limit. */
export function filterValidMessageAttachments(files: File[]) {
  return files.filter((file) => file.size > 0 && file.size <= MESSAGE_ATTACHMENT_MAX_BYTES);
}

/** A message may be sent with files only, so it still needs a text for the record. */
export function messageTextForSend(text: string) {
  const trimmed = text.trim();
  return trimmed || "(arquivos anexados)";
}
