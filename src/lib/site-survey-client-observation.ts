export type ClientObservation = { point_kind: string; point_id: string; observation: string };

export function clientObservationForPoint(rows: ClientObservation[], kind: string, id: string) {
  return rows.find((row) => row.point_kind === kind && row.point_id === id)?.observation ?? "";
}