import { Dashboard } from '@/components/dashboard/dashboard';
import { dashboardSource } from '@/lib/data-sources/excel-snapshot-source';

export default async function Home() {
  const snapshot = await dashboardSource.getSnapshot();
  return <Dashboard snapshot={snapshot} />;
}
