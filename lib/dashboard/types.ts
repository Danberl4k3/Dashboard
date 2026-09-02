export type WorkStatus = 'Terminada' | 'En proceso' | 'No empezada';

export interface WorkRecord {
  id: number;
  agency: string;
  provider: 'PROSEGUR' | 'DOMINION';
  group: string;
  location: string;
  district: string;
  newConduit: number;
  newCabling: number;
  installation: number;
  commissioning: number;
  dismantling: number;
  progress: number;
  status: WorkStatus;
  supervisor: string;
  startDate: string | null;
  endDate: string | null;
  days: number | null;
}

export interface DashboardSnapshot {
  source: string;
  workbook: string;
  extractedAt: string;
  records: WorkRecord[];
}
