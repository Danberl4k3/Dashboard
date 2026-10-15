import type {
  DashboardSnapshot,
  ProgressHistoryRecord,
  WorkRecord,
} from './types';

export interface HalfwayMilestone {
  record: WorkRecord;
  previous: ProgressHistoryRecord;
  latest: ProgressHistoryRecord;
}

/** Crossings recorded on the newest history date available for each project. */
export function latestHalfwayMilestones(
  snapshot: DashboardSnapshot,
): HalfwayMilestone[] {
  const latestDateByProject = new Map<string, string>();
  const historyByAgency = new Map<string, ProgressHistoryRecord[]>();

  // The workbook appends history cuts in chronological order. Repeated rows for
  // one date represent the same cut, so the last row for that date wins.
  for (const entry of snapshot.history) {
    latestDateByProject.set(entry.projectId, entry.date);
    const key = `${entry.projectId}::${entry.agency}`;
    const entries = historyByAgency.get(key) ?? [];
    if (entries.at(-1)?.date === entry.date) entries[entries.length - 1] = entry;
    else entries.push(entry);
    historyByAgency.set(key, entries);
  }

  return snapshot.records.flatMap((record) => {
    if (record.status !== 'En proceso' || (record.progress ?? 0) < 50)
      return [];
    const entries = historyByAgency.get(`${record.projectId}::${record.agency}`);
    if (!entries || entries.length < 2) return [];
    const previous = entries[entries.length - 2];
    const latest = entries[entries.length - 1];
    if (
      latest.date !== latestDateByProject.get(record.projectId) ||
      previous.progress >= 50 ||
      latest.progress < 50
    )
      return [];
    return [{ record, previous, latest }];
  });
}
