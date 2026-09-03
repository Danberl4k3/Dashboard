import type { DashboardSnapshot } from '@/lib/dashboard/types';

export interface DashboardSnapshotOptions {
  force?: boolean;
}

export interface DashboardSource {
  getSnapshot(options?: DashboardSnapshotOptions): Promise<DashboardSnapshot>;
}
