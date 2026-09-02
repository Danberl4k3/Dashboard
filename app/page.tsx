import { Dashboard } from '@/components/dashboard/dashboard';
import { dashboardSource } from '@/lib/data-sources/sharepoint-excel-source';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const snapshot = await dashboardSource.getSnapshot();
  return <Dashboard snapshot={snapshot} />;
}
