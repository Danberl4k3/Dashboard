import type {
  DashboardSnapshot,
  ProgressHistoryRecord,
  WorkRecord,
} from './types';

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
  const term = filters.search.trim().toLocaleLowerCase('es');

  const filteredRecords = projectRecords.filter((r) => {
    const matchesProvider =
      activeProviders.length === 0 ||
      activeProviders.includes(r.provider.trim().toUpperCase());
    const matchesStatus =
      filters.status === 'Todos' || r.status === filters.status;
    const matchesLocation =
      filters.location === 'Todas' ||
      !availableLocations.includes(filters.location) ||
      r.location === filters.location;
    const matchesText =
      !term ||
      [r.agency, r.district, r.supervisor].some((v) =>
        v.toLocaleLowerCase('es').includes(term),
      );
    return matchesProvider && matchesStatus && matchesLocation && matchesText;
  });

  return {
    availableProviders,
    availableLocations,
    activeProviders,
    records: filteredRecords,
  };
}
