/** The workspace supplies canonical account labels as "code · name". */
export function spendAccountDisplay(account: { id: string; name: string }) {
  const separator = account.name.indexOf(' · ');
  return { id: account.id, code: separator < 0 ? '' : account.name.slice(0, separator), name: separator < 0 ? account.name : account.name.slice(separator + 3) };
}