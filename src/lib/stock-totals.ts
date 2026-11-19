export function stockComponentTotals(rows: readonly { balance: number }[]) {
  return { registered: rows.length, positive: rows.filter(row => row.balance > 0).length, zero: rows.filter(row => row.balance === 0).length };
}