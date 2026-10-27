import type { DashboardSnapshot, WorkRecord } from './types';

export interface ProgressVisitAlert {
  record: WorkRecord;
  threshold: number;
  kind: 'intermediate' | 'final';
}

export function progressAlertThreshold(record: WorkRecord): number {
  if (record.projectId.trim().toLowerCase() === 'esparta') return 85;
  if (record.location.trim().toUpperCase() === 'PROVINCIA')
    return record.provider.trim().toUpperCase() === 'PROSEGUR' ? 35 : 40;
  if (
    record.provider.trim().toUpperCase() === 'PROSEGUR' &&
    record.location.trim().toUpperCase() === 'LIMA'
  )
    return 48;
  return 50;
}

/** Final visits take precedence so an agency never appears in both groups. */
export function progressVisitAlerts(
  snapshot: DashboardSnapshot,
): ProgressVisitAlert[] {
  return snapshot.records
    .filter(
      (record) =>
        record.status === 'Terminada' ||
        (record.status === 'En proceso' &&
          record.provider.trim().toUpperCase() === 'PROSEGUR' &&
          record.progress !== null &&
          record.progress >= progressAlertThreshold(record)),
    )
    .map((record): ProgressVisitAlert => {
      const isFinal =
        record.status === 'Terminada' || (record.progress ?? 0) >= 100;
      return {
        record,
        threshold: isFinal ? 100 : progressAlertThreshold(record),
        kind: isFinal ? 'final' : 'intermediate',
      };
    })
    .sort((a, b) => {
      const aChecked =
        a.kind === 'final' ? a.record.visit3.checked : a.record.visit2.checked;
      const bChecked =
        b.kind === 'final' ? b.record.visit3.checked : b.record.visit2.checked;
      if (aChecked !== bChecked) return aChecked ? 1 : -1;
      return a.record.agency.localeCompare(b.record.agency, 'es', {
        numeric: true,
      });
    });
}
