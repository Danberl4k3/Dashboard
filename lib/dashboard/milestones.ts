import type { DashboardSnapshot, WorkRecord } from './types';

export interface ProgressVisitAlert {
  record: WorkRecord;
  threshold: number;
}

export function progressAlertThreshold(record: WorkRecord): number {
  if (record.projectId.trim().toLowerCase() === 'esparta') return 85;
  if (record.location.trim().toUpperCase() === 'PROVINCIA') return 40;
  if (
    record.provider.trim().toUpperCase() === 'PROSEGUR' &&
    record.location.trim().toUpperCase() === 'LIMA'
  )
    return 48;
  return 50;
}

/** Agencies currently eligible for a progress visit, regardless of when they crossed the threshold. */
export function progressVisitAlerts(
  snapshot: DashboardSnapshot,
): ProgressVisitAlert[] {
  return snapshot.records
    .filter(
      (record) =>
        record.status === 'En proceso' &&
        record.progress !== null &&
        record.progress >= progressAlertThreshold(record),
    )
    .map((record) => ({ record, threshold: progressAlertThreshold(record) }))
    .sort((a, b) => {
      if (a.record.visit2.checked !== b.record.visit2.checked)
        return a.record.visit2.checked ? 1 : -1;
      return a.record.agency.localeCompare(b.record.agency, 'es', {
        numeric: true,
      });
    });
}
