export function approvalShortcut(key: string, repeat: boolean, busy: boolean, approved: boolean, editing: boolean) {
  return key === "Enter" && !repeat && !busy && !approved && !editing;
}