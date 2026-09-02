import cronograma from '@/app/data/cronograma.json';
import type { DashboardSnapshot } from '@/lib/dashboard/types';
import type { DashboardSource } from '@/lib/data-sources/dashboard-source';

class ExcelSnapshotSource implements DashboardSource {
  async getSnapshot(): Promise<DashboardSnapshot> {
    return cronograma as DashboardSnapshot;
  }
}

export const dashboardSource: DashboardSource = new ExcelSnapshotSource();
