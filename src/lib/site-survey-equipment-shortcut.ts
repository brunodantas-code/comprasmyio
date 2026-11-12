export function toggleSurveyEquipment<T extends { catalog_item_id: string }>(rows: T[], catalogId: string, checked: boolean, createRow: () => T): T[] {
  if (!checked) return rows.filter((row) => row.catalog_item_id !== catalogId);
  return rows.some((row) => row.catalog_item_id === catalogId) ? rows : [...rows, createRow()];
}