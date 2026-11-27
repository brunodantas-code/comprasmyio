export function sequentialRegistryOrder<T extends { position: number }>(rows: T[]): T[] {
  return rows.map((row, index) => ({ ...row, position: index + 1 }));
}