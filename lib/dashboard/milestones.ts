import type {
  DashboardSnapshot,
  ProgressHistoryRecord,
  WorkRecord,
} from './types';

export interface ProgressVisitAlert {
  record: WorkRecord;
  threshold: number;
  kind: 'intermediate' | 'final';
  isFirstCrossing: boolean;
}

// Excel history uses dd/MM; compare calendar dates, never their display strings.
function historyCut(date: string, reference: string): number | null {
  const iso = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const local = date.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (!iso && !local) return null;
  const month = Number(iso?.[2] ?? local?.[2]);
  const day = Number(iso?.[3] ?? local?.[1]);
  const referenceYear = Number(reference.slice(0, 4)) || 2000;
  let year = Number(iso?.[1] ?? local?.[3]) || referenceYear;
  if (
    !iso &&
    !local?.[3] &&
    month * 100 + day >
      Number(reference.slice(5, 7)) * 100 + Number(reference.slice(8, 10))
  )
    year -= 1;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? parsed.getTime()
    : null;
}

function historyReached(
  entry: ProgressHistoryRecord,
  threshold: number,
  isFinal: boolean,
): boolean {
  return (
    entry.progress >= threshold ||
    (isFinal && entry.status.trim().toLowerCase() === 'terminada')
  );
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
  const reference =
    snapshot.extractedAt || snapshot.scheduleEnd || '2000-12-31';
  const latestCuts = new Map<string, number>();
  const histories = new Map<
    string,
    { entry: ProgressHistoryRecord; cut: number }[]
  >();
  for (const entry of snapshot.history) {
    const cut = historyCut(entry.date, reference);
    if (cut === null) continue;
    latestCuts.set(
      entry.projectId,
      Math.max(latestCuts.get(entry.projectId) ?? cut, cut),
    );
    const key = `${entry.projectId}::${entry.agency}`;
    const history = histories.get(key) ?? [];
    history.push({ entry, cut });
    histories.set(key, history);
  }
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
      const threshold = isFinal ? 100 : progressAlertThreshold(record);
      const history =
        histories.get(`${record.projectId}::${record.agency}`) ?? [];
      const latestCut = latestCuts.get(record.projectId);
      // Require an earlier below-threshold report; missing history is not proof
      // of a first crossing. A prior crossing also prevents repeat alerts.
      const reachedInLatestCut = history.some(
        ({ entry, cut }) =>
          cut === latestCut && historyReached(entry, threshold, isFinal),
      );
      const isFirstCrossing =
        history.some(({ cut }) => cut === latestCut) &&
        history.some(
          ({ entry, cut }) =>
            (!reachedInLatestCut || cut !== latestCut) &&
            !historyReached(entry, threshold, isFinal),
        ) &&
        !history.some(
          ({ entry, cut }) =>
            cut !== latestCut && historyReached(entry, threshold, isFinal),
        );
      return {
        record,
        threshold,
        kind: isFinal ? 'final' : 'intermediate',
        isFirstCrossing,
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
