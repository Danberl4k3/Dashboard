import type { DashboardSnapshot } from '@/lib/dashboard/types';

export interface DashboardSource {
  getSnapshot(): Promise<DashboardSnapshot>;
}
