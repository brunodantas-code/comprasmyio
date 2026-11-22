export function importedField(data: unknown, key: string): string {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return '';
  const value = (data as Record<string, unknown>)[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

export function historicalAuthor(author: string | null, resolve: (id: string) => string) {
  return author ? resolve(author) : 'Autor não informado na origem';
}