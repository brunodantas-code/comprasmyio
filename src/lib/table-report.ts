export type ReportCell = string | number | null;
export type TableReport = { columns: string[]; rows: ReportCell[][] };

export function mergeTableReports(reports: TableReport[]): TableReport {
  const columns = [...new Set(reports.flatMap(report => report.columns))];
  return { columns, rows: reports.flatMap(report => report.rows.map(row => columns.map(column => {
    const index = report.columns.indexOf(column);
    return index < 0 ? null : row[index] ?? null;
  }))) };
}