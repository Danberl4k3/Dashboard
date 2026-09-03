import { Dashboard } from '@/components/dashboard/dashboard';
import { dashboardSource } from '@/lib/data-sources/sharepoint-excel-source';
import { withoutDya } from '@/lib/dashboard/filters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const snapshot = withoutDya(await dashboardSource.getSnapshot());
  return <Dashboard snapshot={snapshot} />;
}
