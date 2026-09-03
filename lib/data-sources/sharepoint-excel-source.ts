import fallbackSnapshot from '@/app/data/cronograma.json';
import type {
  DashboardProject,
  DashboardSnapshot,
  ProgressHistoryRecord,
  WorkRecord,
  WorkStatus,
} from '@/lib/dashboard/types';
import type {
  DashboardSource,
  DashboardSnapshotOptions,
} from '@/lib/data-sources/dashboard-source';
import { readXlsx, type XlsxSheet } from '@/lib/data-sources/xlsx-reader';

const project3979: DashboardProject = {
  id: '3979',
  label: 'Proyecto Esparta 1',
};
const projectEsparta: DashboardProject = {
  id: 'esparta',
  label: 'Proyecto Esparta 2',
};

const projects: DashboardProject[] = [project3979, projectEsparta];

const sources = [
  { ...project3979, env: 'SHAREPOINT_EXCEL_3979_URL' },
  { ...projectEsparta, env: 'SHAREPOINT_EXCEL_ESPARTA_URL' },
];

const CACHE_MS = 90 * 1000;
let cache: { expiresAt: number; snapshot: DashboardSnapshot } | null = null;

function stringValue(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function percent(value: unknown) {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(String(value).replace('%', '').trim());
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed <= 1 ? parsed * 100 : parsed);
}

function excelDate(value: unknown) {
  if (typeof value === 'number')
    return new Date(Date.UTC(1899, 11, 30) + value * 86_400_000)
      .toISOString()
      .slice(0, 10);
  const source = stringValue(value);
  const match = source.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return match
    ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
    : null;
}

function workStatus(progress: number): WorkStatus {
  return progress >= 100
    ? 'Terminada'
    : progress > 0
      ? 'En proceso'
      : 'No empezada';
}

function headerValue(value: unknown) {
  return stringValue(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .trim()
    .toUpperCase();
}

function cronogramaIdentityColumns(sheet: XlsxSheet) {
  for (let row = 1; row <= Math.min(sheet.maxRow, 20); row += 1) {
    let agencyColumn = 0;
    let providerColumn = 0;

    for (let column = 1; column <= 30; column += 1) {
      const header = headerValue(sheet.get(row, column));
      if (['AGENCIA', 'OFICINA', 'SEDE'].includes(header))
        agencyColumn = column;
      if (['CONTRATISTA', 'PROVEEDOR', 'EMPRESA CONTRATISTA'].includes(header))
        providerColumn = column;
    }

    if (agencyColumn && providerColumn)
      return { firstDataRow: row + 1, agencyColumn, providerColumn };
  }

  return { firstDataRow: 10, agencyColumn: 2, providerColumn: 3 };
}

function extractCronograma(sheet: XlsxSheet, project: DashboardProject) {
  const records: WorkRecord[] = [];
  const { firstDataRow, agencyColumn, providerColumn } =
    cronogramaIdentityColumns(sheet);
  for (let row = firstDataRow; row <= sheet.maxRow; row += 1) {
    const agency = stringValue(sheet.get(row, agencyColumn));
    const provider = stringValue(
      sheet.get(row, providerColumn),
    ).toLocaleUpperCase('es');
    if (!agency || !provider) continue;
    const progress = percent(sheet.get(row, 12));
    records.push({
      id: Number(sheet.get(row, 1)) || row,
      projectId: project.id,
      projectLabel: project.label,
      agency,
      provider,
      group: stringValue(sheet.get(row, 4)),
      location: stringValue(sheet.get(row, 5)),
      district: stringValue(sheet.get(row, 6)),
      newConduit: percent(sheet.get(row, 7)),
      newCabling: percent(sheet.get(row, 8)),
      installation: percent(sheet.get(row, 9)),
      commissioning: percent(sheet.get(row, 10)),
      dismantling: percent(sheet.get(row, 11)),
      progress,
      status: workStatus(progress),
      supervisor: stringValue(sheet.get(row, 14)),
      startDate: excelDate(sheet.get(row, 22)),
      endDate: excelDate(sheet.get(row, 23)),
      days: Number(sheet.get(row, 24)) || null,
      timelineStart: null,
      timelineEnd: null,
    });
  }
  return records;
}

function extractSentinel(sheet: XlsxSheet | null, project: DashboardProject) {
  if (!sheet) return [];
  const records: WorkRecord[] = [];
  for (let row = 8; row <= sheet.maxRow; row += 1) {
    const heading = stringValue(sheet.get(row, 1));
    const match = heading.match(
      /^AGENCIA\s+(\d+):\s*(.*?)\s*\((.*?)\s+-\s+(.*?)\)$/i,
    );
    if (!match) continue;
    records.push({
      id: 10_000 + Number(match[1]),
      projectId: project.id,
      projectLabel: project.label,
      agency: match[2].trim(),
      provider: 'SENTINEL',
      group: 'Programación detallada',
      location: match[3].trim(),
      district: match[4].trim(),
      newConduit: null,
      newCabling: null,
      installation: null,
      commissioning: null,
      dismantling: null,
      progress: null,
      status: 'Sin reporte',
      supervisor: 'FERNANDO IPARRAGUIRRE',
      startDate: excelDate(sheet.get(row, 5)),
      endDate: excelDate(sheet.get(row, 6)),
      days: Number(sheet.get(row, 7)) || null,
      timelineStart: null,
      timelineEnd: null,
    });
  }
  return records;
}

function extractHistory(sheet: XlsxSheet, project: DashboardProject) {
  const records: ProgressHistoryRecord[] = [];
  for (let row = 2; row <= sheet.maxRow; row += 1) {
    const date = stringValue(sheet.get(row, 1));
    const agency = stringValue(sheet.get(row, 3));
    if (!date || !agency) continue;
    records.push({
      date,
      item: Number(sheet.get(row, 2)) || row,
      projectId: project.id,
      projectLabel: project.label,
      agency,
      supervisor: stringValue(sheet.get(row, 4)),
      newConduit: percent(sheet.get(row, 5)),
      newCabling: percent(sheet.get(row, 6)),
      installation: percent(sheet.get(row, 7)),
      commissioning: percent(sheet.get(row, 8)),
      dismantling: percent(sheet.get(row, 9)),
      progress: percent(sheet.get(row, 10)),
      status: stringValue(sheet.get(row, 11)),
    });
  }
  return records;
}

async function loadProject(source: (typeof sources)[number], force = false) {
  const url = process.env[source.env];
  if (!url) throw new Error(`Missing ${source.env}`);
  const downloadUrl = new URL(url);
  downloadUrl.searchParams.set('download', '1');
  if (force)
    downloadUrl.searchParams.set('_dashboard_refresh', Date.now().toString());
  const headers = {
    'User-Agent': 'Mozilla/5.0 Dashboard-Sincro/1.0',
    'Cache-Control': 'no-cache, no-store',
    Pragma: 'no-cache',
  };
  const initial = await fetch(downloadUrl, {
    redirect: 'manual',
    headers,
    cache: 'no-store',
  });
  let response = initial;
  if (initial.status >= 300 && initial.status < 400) {
    const location = initial.headers.get('location');
    if (!location)
      throw new Error('SharePoint redirect is missing its destination');
    const cookies = (initial.headers.get('set-cookie') || '')
      .split(/,(?=[^;,]+=)/)
      .map((cookie) => cookie.split(';', 1)[0])
      .filter(Boolean)
      .join('; ');
    response = await fetch(new URL(location, downloadUrl), {
      headers: { ...headers, ...(cookies ? { Cookie: cookies } : {}) },
      cache: 'no-store',
    });
  }
  if (!response.ok) throw new Error(`SharePoint returned ${response.status}`);
  const buffer = await response.arrayBuffer();
  const signature = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  if (signature[0] !== 0x50 || signature[1] !== 0x4b)
    throw new Error('SharePoint did not return an Excel file');
  const workbook = readXlsx(buffer);
  const cronograma = workbook.sheet('CRONOGRAMA');
  const history = workbook.sheet('Historial de avance');
  if (!cronograma || !history)
    throw new Error('Required worksheets are missing');
  return {
    records: [
      ...extractCronograma(cronograma, source),
      ...extractSentinel(workbook.sheet('DETALLE SENTINEL'), source),
    ],
    history: extractHistory(history, source),
  };
}

function fallback(): DashboardSnapshot {
  const source = fallbackSnapshot as Omit<
    DashboardSnapshot,
    'projects' | 'isLive'
  >;
  return {
    ...source,
    source: 'Copia local de respaldo',
    projects,
    isLive: false,
    records: source.records.map((record) => ({
      ...record,
      projectId: project3979.id,
      projectLabel: project3979.label,
    })),
    history: source.history.map((record) => ({
      ...record,
      projectId: project3979.id,
      projectLabel: project3979.label,
    })),
  } as DashboardSnapshot;
}

class SharePointExcelSource implements DashboardSource {
  async getSnapshot(
    options: DashboardSnapshotOptions = {},
  ): Promise<DashboardSnapshot> {
    if (!options.force && cache && cache.expiresAt > Date.now())
      return cache.snapshot;
    const settledResults = await Promise.allSettled(
      sources.map((source) => loadProject(source, options.force === true)),
    );
    const results = settledResults.flatMap((result, index) => {
      if (result.status === 'fulfilled')
        return [{ projectId: sources[index].id, data: result.value }];
      console.error(`Unable to refresh ${sources[index].label}`, result.reason);
      return [];
    });

    if (results.length) {
      const allProjectsLive = results.length === sources.length;
      const liveByProject = new Map(
        results.map((result) => [result.projectId, result.data]),
      );
      const previousSnapshot = cache?.snapshot || fallback();
      const snapshot: DashboardSnapshot = {
        source: allProjectsLive
          ? 'SharePoint · 2 archivos Excel'
          : `SharePoint · ${results.length} de 2 archivos Excel`,
        workbook: 'Proyecto Esparta 1 + Proyecto Esparta 2',
        extractedAt: new Date().toISOString(),
        scheduleStart: '',
        scheduleEnd: '',
        projects,
        isLive: allProjectsLive,
        records: projects.flatMap(
          (project) =>
            liveByProject.get(project.id)?.records ||
            previousSnapshot.records.filter(
              (record) => record.projectId === project.id,
            ),
        ),
        history: projects.flatMap(
          (project) =>
            liveByProject.get(project.id)?.history ||
            previousSnapshot.history.filter(
              (record) => record.projectId === project.id,
            ),
        ),
      };
      cache = { expiresAt: Date.now() + CACHE_MS, snapshot };
      return snapshot;
    }

    return cache?.snapshot || fallback();
  }
}

export const dashboardSource: DashboardSource = new SharePointExcelSource();
