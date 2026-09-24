import { dashboardSource as sharepointDashboardSource } from '@/lib/data-sources/sharepoint-excel-source';
import { dashboardSource as snapshotDashboardSource } from '@/lib/data-sources/excel-snapshot-source';
import type { DashboardSource } from './dashboard-source';

const DASHBOARD_SOURCE_ENV_VAR = 'DASHBOARD_SOURCE';
const SHAREPOINT_VALUE = 'sharepoint';
const SNAPSHOT_VALUE = 'snapshot';

function resolveDashboardSource(): DashboardSource {
  const configuredSource =
    process.env[DASHBOARD_SOURCE_ENV_VAR] ?? SHAREPOINT_VALUE;

  if (configuredSource === SHAREPOINT_VALUE) {
    return sharepointDashboardSource;
  }

  if (configuredSource === SNAPSHOT_VALUE) {
    return snapshotDashboardSource;
  }

  throw new Error(
    `Invalid ${DASHBOARD_SOURCE_ENV_VAR} value "${configuredSource}". Accepted values: "${SHAREPOINT_VALUE}" (default) or "${SNAPSHOT_VALUE}".`,
  );
}

export const dashboardSource = resolveDashboardSource();
