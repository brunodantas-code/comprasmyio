export type UserBar = { id: string; name: string; total: number };

export function centralUserBars(data: readonly UserBar[]) {
  const all = [...data].sort((a, b) => b.total - a.total);
  return { all, summary: all.slice(0, 3) };
}