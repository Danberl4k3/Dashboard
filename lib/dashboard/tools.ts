import type { WorkRecord } from './types';

export type RecordOrder =
  | 'original'
  | 'agency'
  | 'progress-up'
  | 'progress-down'
  | 'deadline';
export type Attention = 'late' | 'unreported' | null;

export function limaDate(instant: string): string {
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function validDate(date: string | null): date is string {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

export function recordAttention(
  record: WorkRecord,
  referenceDate: string,
): Attention {
  if (record.status === 'Terminada') return null;
  if (record.status === 'Sin reporte') return 'unreported';
  if (!validDate(referenceDate)) return null;
  if (validDate(record.endDate) && record.endDate < referenceDate)
    return 'late';
  if (
    record.status === 'No empezada' &&
    validDate(record.startDate) &&
    record.startDate < referenceDate
  )
    return 'late';
  return null;
}

export function attentionReason(
  record: WorkRecord,
  referenceDate: string,
): string {
  if (record.status === 'Sin reporte') return 'Falta reporte de avance';
  if (validDate(record.endDate) && record.endDate < referenceDate)
    return 'Fecha de cierre vencida';
  return 'Inicio programado vencido';
}

export function sortRecords(
  records: WorkRecord[],
  order: RecordOrder,
): WorkRecord[] {
  if (order === 'original') return records;
  return [...records].sort((a, b) => {
    if (order === 'agency')
      return a.agency.localeCompare(b.agency, 'es', { numeric: true });
    if (order === 'deadline') {
      const first = validDate(a.endDate) ? a.endDate : '9999-12-31';
      const second = validDate(b.endDate) ? b.endDate : '9999-12-31';
      return first.localeCompare(second);
    }
    // Unknown progress always follows reported values, in either direction.
    if (a.progress === null) return b.progress === null ? 0 : 1;
    if (b.progress === null) return -1;
    return order === 'progress-up'
      ? a.progress - b.progress
      : b.progress - a.progress;
  });
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  const safe =
    typeof value === 'string' && /^[\s\uFEFF]*[=+\-@\t\r\n]/.test(text)
      ? `'${text}`
      : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function recordsCsv(records: WorkRecord[]): string {
  const header = [
    'Proyecto',
    'Agencia',
    'Proveedor',
    'Ubicación',
    'Distrito',
    'Supervisor',
    'Estado',
    'Avance (%)',
    'Canalizado (%)',
    'Cableado (%)',
    'Instalación (%)',
    'Puesta en marcha (%)',
    'Desmontaje (%)',
    'Inicio',
    'Cierre',
    'Cámaras finales',
  ];
  const rows = records.map((r) => [
    r.projectLabel,
    r.agency,
    r.provider,
    r.location,
    r.district,
    r.supervisor,
    r.status,
    r.progress,
    r.newConduit,
    r.newCabling,
    r.installation,
    r.commissioning,
    r.dismantling,
    r.startDate,
    r.endDate,
    r.totalFinalCameras,
  ]);
  return (
    '\uFEFF' +
    [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')
  );
}
