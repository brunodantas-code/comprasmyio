export function standardsFirst<T>(items: T[], selected: (item: T) => boolean): T[] {
  return items.map((item, index) => ({ item, index })).sort((a, b) => Number(selected(b.item)) - Number(selected(a.item)) || a.index - b.index).map(e => e.item);
}