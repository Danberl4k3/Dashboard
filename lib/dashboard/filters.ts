import type {
  DashboardSnapshot,
  ProgressHistoryRecord,
  WorkRecord,
} from './types';
import { limaDate } from './tools';

export function withoutDya(snapshot: DashboardSnapshot): DashboardSnapshot {
  const eligibleRecords = snapshot.records.filter(
    (record) => record.provider.trim().toUpperCase() !== 'DYA',
  );
  const eligibleKeys = new Set(
    eligibleRecords.map((record) => `${record.projectId}::${record.agency}`),
  );
  const filteredHistory = snapshot.history.filter((entry) =>
    eligibleKeys.has(`${entry.projectId}::${entry.agency}`),
  );
  return { ...snapshot, records: eligibleRecords, history: filteredHistory };
}

function nextHistoryDate(
  history: ProgressHistoryRecord[],
  referenceDate: string,
): string {
  const referenceYear = Number(referenceDate.slice(0, 4)) || 2000;
  const referenceMonthDay = Number(referenceDate.slice(5, 7)) * 100 +
    Number(referenceDate.slice(8, 10));
  let latestCut: number | null = null;

  for (const entry of history) {
    const iso = entry.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const local = entry.date.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
    if (!iso && !local) continue;
    const month = Number(iso?.[2] ?? local?.[2]);
    const day = Number(iso?.[3] ?? local?.[1]);
    let year = Number(iso?.[1] ?? local?.[3]) || referenceYear;
    if (
      !iso &&
      !local?.[3] &&
      month * 100 + day > referenceMonthDay
    )
      year -= 1;
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    )
      continue;
    latestCut = Math.max(latestCut ?? parsed.getTime(), parsed.getTime());
  }

  if (latestCut === null)
    return referenceDate
      ? `${referenceDate.slice(8, 10)}/${referenceDate.slice(5, 7)}`
      : 'Sin fecha';
  const nextDay = new Date(latestCut + 86_400_000);
  return `${String(nextDay.getUTCDate()).padStart(2, '0')}/${String(nextDay.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function indexHistoryByAgency(
  snapshot: DashboardSnapshot,
): Map<string, ProgressHistoryRecord[]> {
  const index = new Map<string, ProgressHistoryRecord[]>();
  for (const entry of snapshot.history) {
    const key = `${entry.projectId}::${entry.agency}`;
    const existing = index.get(key);
    if (existing) {
      existing.push(entry);
    } else {
      index.set(key, [entry]);
    }
  }
  const observedAt = limaDate(snapshot.extractedAt);
  for (const record of snapshot.records) {
    if (record.progress !== 100) continue;
    const key = `${record.projectId}::${record.agency}`;
    const existing = index.get(key) ?? [];
    if (existing.at(-1)?.progress === 100) continue;
    const completionDate = nextHistoryDate(existing, observedAt);
    const completion: ProgressHistoryRecord = {
      date: completionDate,
      item: record.id,
      projectId: record.projectId,
      projectLabel: record.projectLabel,
      agency: record.agency,
      supervisor: record.supervisor,
      newConduit: record.newConduit ?? 100,
      newCabling: record.newCabling ?? 100,
      installation: record.installation ?? 100,
      commissioning: record.commissioning ?? 100,
      dismantling: record.dismantling ?? 100,
      progress: 100,
      status: 'Terminada',
    };
    index.set(key, [...existing, completion]);
  }
  return index;
}
export interface DashboardFilters {
  project: string;
  providers: string[];
  status: string;
  location: string;
  search: string;
}

export function filterDashboard(
  records: WorkRecord[],
  filters: DashboardFilters,
): {
  availableProviders: string[];
  availableLocations: string[];
  activeProviders: string[];
  records: WorkRecord[];
} {
  const projectRecords = records.filter((r) => {
    if (r.provider.trim().toUpperCase() === 'DYA') return false;
    if (filters.project === 'Todos' || r.projectId === filters.project)
      return true;
    return false;
  });

  const availableProviders = [
    ...new Set(
      projectRecords.map((record) => record.provider.trim().toUpperCase()),
    ),
  ]
    .filter((provider) => provider !== '')
    .sort();

  const availableLocations = [
    ...new Set(projectRecords.map((record) => record.location.trim())),
  ]
    .filter((location) => location !== '')
    .sort();

  const activeProviders = Array.from(
    new Set(filters.providers.map((p) => p.trim().toUpperCase())),
  ).filter((p) => availableProviders.includes(p));
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es');
  const terms = normalize(filters.search).trim().split(/\s+/).filter(Boolean);

  const filteredRecords = projectRecords.filter((r) => {
    const matchesProvider =
      activeProviders.length === 0 ||
      activeProviders.includes(r.provider.trim().toUpperCase());
    const matchesStatus =
      filters.status === 'Todos' || r.status === filters.status;
    const matchesLocation =
      filters.location === 'Todas' ||
      !availableLocations.includes(filters.location) ||
      r.location.trim() === filters.location;
    const searchableText = normalize(
      [
        r.agency,
        r.district,
        r.supervisor,
        r.provider,
        r.location,
        r.projectLabel,
      ].join(' '),
    );
    const matchesText = terms.every((term) => searchableText.includes(term));
    return matchesProvider && matchesStatus && matchesLocation && matchesText;
  });

  return {
    availableProviders,
    availableLocations,
    activeProviders,
    records: filteredRecords,
  };
}
