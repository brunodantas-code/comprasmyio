export async function readAllCrmPages<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, pageSize = 500): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const result = await read(from, from + pageSize - 1);
    if (result.error) throw result.error;
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}