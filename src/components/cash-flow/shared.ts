export const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const MONTHS = [
  ["january", "Jan"], ["february", "Fev"], ["march", "Mar"], ["april", "Abr"],
  ["may", "Mai"], ["june", "Jun"], ["july", "Jul"], ["august", "Ago"],
  ["september", "Set"], ["october", "Out"], ["november", "Nov"], ["december", "Dez"],
] as const;

export type Account = {
  id: string;
  code: string;
  name: string;
  nature: string;
  parent_id: string | null;
  accepts_entries: boolean;
  active: boolean;
};

export type BankAccount = {
  id: string;
  name: string;
  bank_name: string;
  agency: string | null;
  account_number: string | null;
  opening_balance: number;
  opening_balance_date: string;
  active: boolean;
};

export function accountLabel(account: Account) {
  return `${account.code} · ${account.name}`;
}

export function isPostingAccount(account: Account, accounts: Account[]) {
  return account.active && account.accepts_entries && !accounts.some((item) => item.active && item.parent_id === account.id);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

export function formatPeriod(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 7)}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" });
}

export function monthValue(value: string | null | undefined) {
  return value?.slice(0, 7) ?? "";
}

export function periodDate(value: string) {
  return `${value}-01`;
}