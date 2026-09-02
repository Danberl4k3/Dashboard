export type WorkStatus = 'Terminada' | 'En proceso' | 'No empezada' | 'Sin reporte';

export interface DashboardProject {
  id: string;
  label: string;
}

export interface WorkRecord {
  id: number;
  projectId: string;
  projectLabel: string;
  agency: string;
  provider: string;
  group: string;
  location: string;
  district: string;
  newConduit: number | null;
  newCabling: number | null;
  installation: number | null;
  commissioning: number | null;
  dismantling: number | null;
  progress: number | null;
  status: WorkStatus;
  supervisor: string;
  startDate: string | null;
  endDate: string | null;
  days: number | null;
  timelineStart: string | null;
  timelineEnd: string | null;
}

export interface ProgressHistoryRecord {
  date: string;
  item: number;
  projectId: string;
  projectLabel: string;
  agency: string;
  supervisor: string;
  newConduit: number;
  newCabling: number;
  installation: number;
  commissioning: number;
  dismantling: number;
  progress: number;
  status: string;
}

export interface DashboardSnapshot {
  source: string;
  workbook: string;
  extractedAt: string;
  scheduleStart: string;
  scheduleEnd: string;
  projects: DashboardProject[];
  isLive: boolean;
  records: WorkRecord[];
  history: ProgressHistoryRecord[];
}
