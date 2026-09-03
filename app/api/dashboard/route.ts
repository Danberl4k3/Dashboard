import { withoutDya } from '@/lib/dashboard/filters';
import { dashboardSource } from '@/lib/data-sources/sharepoint-excel-source';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get('force') === '1';
  const snapshot = withoutDya(await dashboardSource.getSnapshot({ force }));

  return Response.json(snapshot, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}
