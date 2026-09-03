import type { DashboardSnapshot, WorkRecord } from './types';

export function withoutDya(snapshot: DashboardSnapshot): DashboardSnapshot {
  const filteredRecords = snapshot.records.filter(
    (record) => record.provider.trim().toUpperCase() !== 'DYA',
  );
  const filteredHistory = snapshot.history.filter((entry) =>
    filteredRecords.some(
      (record) =>
        record.projectId === entry.projectId && record.agency === entry.agency,
    ),
  );
  return { ...snapshot, records: filteredRecords, history: filteredHistory };
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
