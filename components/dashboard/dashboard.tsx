'use client';

import ProviderFilter from '@/components/dashboard/provider-filter';
import { filterDashboard } from '@/lib/dashboard/filters';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Building2,
  CalendarRange,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  Database,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  DashboardSnapshot,
  VisitCheck,
  WorkRecord,
  WorkStatus,
} from '@/lib/dashboard/types';

const PAGE_SIZE = 8;
const REFRESH_INTERVAL_MS = 90_000;
const statusColors: Record<WorkStatus, string> = {
  Terminada: '#2f7d32',
  'En proceso': '#f2c94c',
  'No empezada': '#ef4444',
  'Sin reporte': '#94a3b8',
};

const chartConfig = {
  value: { label: 'Agencias', color: '#1f5f8b' },
  average: { label: 'Avance', color: '#2a6f97' },
} satisfies ChartConfig;

const stageDefinitions: Array<{
  key: keyof WorkRecord;
  label: string;
  color: string;
}> = [
  { key: 'newConduit', label: 'Canalizado', color: '#1f5f8b' },
  { key: 'newCabling', label: 'Cableado', color: '#2a6f97' },
  { key: 'installation', label: 'Instalación', color: '#468faf' },
  { key: 'commissioning', label: 'Puesta en marcha', color: '#61a5c2' },
  { key: 'dismantling', label: 'Desmontaje', color: '#89c2d9' },
];

type HistorySeriesKey =
  | 'progress'
  | 'newConduit'
  | 'newCabling'
  | 'installation'
  | 'commissioning'
  | 'dismantling';

const historySeries: Array<{
  key: HistorySeriesKey;
  label: string;
  color: string;
}> = [
  { key: 'progress', label: 'Promedio total', color: '#0f4c75' },
  { key: 'newConduit', label: 'Canalizado', color: '#2f80ed' },
  { key: 'newCabling', label: 'Cableado', color: '#8b5cf6' },
  { key: 'installation', label: 'Instalación', color: '#f59e0b' },
  { key: 'commissioning', label: 'Puesta en marcha', color: '#10b981' },
  { key: 'dismantling', label: 'Desmontaje', color: '#ef4444' },
];

function average(records: WorkRecord[], key: keyof WorkRecord) {
  const values = records
    .map((record) => record[key])
    .filter((value): value is number => typeof value === 'number');
  if (!values.length) return 0;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function formatDate(date: string | null) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatSnapshotDate(date: string) {
  return Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  })
    .format(new Date(date))
    .replace(/\s+/g, ' ');
}

function StatusBadge({ status }: { status: WorkStatus }) {
  const styles =
    status === 'Terminada'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15'
      : status === 'En proceso'
        ? 'bg-amber-50 text-amber-800 ring-amber-600/20'
        : status === 'No empezada'
          ? 'bg-red-50 text-red-700 ring-red-600/15'
          : 'bg-slate-100 text-slate-700 ring-slate-500/20';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${styles}`}
    >
      {status}
    </span>
  );
}

function VisitCheckMark({
  visit,
  label,
}: {
  visit: VisitCheck;
  label: string;
}) {
  return visit.checked ? (
    <span
      aria-label={`${label} realizada`}
      className="inline-flex size-7 items-center justify-center text-xl font-bold"
      style={{ color: visit.color || '#000000' }}
    >
      ✓
    </span>
  ) : (
    <span aria-label={`${label} pendiente`} className="text-muted-foreground/45">
      —
    </span>
  );
}

function KpiCard({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof Activity;
  tone: string;
}) {
  return (
    <Card className="border-0 shadow-[0_1px_2px_rgb(15_23_42/4%),0_10px_28px_rgb(15_23_42/5%)] ring-1 ring-slate-200/80">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-3 text-[1.75rem] font-semibold leading-none tracking-[-0.04em] tabular-nums">
            {value}
          </p>
          <p className="mt-2 truncate text-xs text-muted-foreground">{note}</p>
        </div>
        <div
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}
        >
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard({
  snapshot: initialSnapshot,
}: {
  snapshot: DashboardSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const refreshingRef = useRef(false);
  const [search, setSearch] = useState('');
  const [project, setProject] = useState('Todos');
  const [status, setStatus] = useState('Todos');
  const [location, setLocation] = useState('Todas');
  const [page, setPage] = useState(1);
  const [visibleHistorySeries, setVisibleHistorySeries] = useState<
    HistorySeriesKey[]
  >(() => historySeries.map((series) => series.key));
  const [historyAgency, setHistoryAgency] = useState(() => {
    const preferred =
      snapshot.history.find(
        (record) =>
          record.projectId === '3979' &&
          record.agency === 'OFICINA BUSTAMANTE Y RIVERO',
      ) || snapshot.history[0];
    return preferred ? `${preferred.projectId}::${preferred.agency}` : '';
  });

  const refresh = useCallback(async (force = false) => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const response = await fetch(
        force ? '/api/dashboard?force=1' : '/api/dashboard',
        {
          cache: 'no-store',
        },
      );
      if (!response.ok) throw new Error('Dashboard refresh failed');
      const nextSnapshot = (await response.json()) as DashboardSnapshot;
      setSnapshot(nextSnapshot);
    } catch {
      setRefreshError(
        'No se pudo actualizar. Se mantienen los datos anteriores.',
      );
    } finally {
      refreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(
      () => void refresh(false),
      REFRESH_INTERVAL_MS,
    );
    return () => window.clearInterval(interval);
  }, [refresh]);

  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);

  const filterView = useMemo(
    () =>
      filterDashboard(snapshot.records, {
        project,
        search,
        status,
        location,
        providers: selectedProviders,
      }),
    [snapshot.records, project, search, status, location, selectedProviders],
  );

  const providers = filterView.availableProviders;
  const locations = filterView.availableLocations;
  const activeProviders = filterView.activeProviders;
  const filtered = filterView.records;
  const projectOptions = useMemo(
    () =>
      snapshot.projects.map((item) => ({
        ...item,
        hasData: snapshot.records.some(
          (record) => record.projectId === item.id,
        ),
      })),
    [snapshot.projects, snapshot.records],
  );

  const effectiveLocation =
    location === 'Todas' || locations.includes(location) ? location : 'Todas';

  const summary = useMemo(() => {
    const completed = filtered.filter(
      (record) => record.status === 'Terminada',
    ).length;
    const inProgress = filtered.filter(
      (record) => record.status === 'En proceso',
    ).length;
    const pending = filtered.filter(
      (record) => record.status === 'No empezada',
    ).length;
    const unreported = filtered.filter(
      (record) => record.status === 'Sin reporte',
    ).length;
    return {
      total: filtered.length,
      completed,
      inProgress,
      pending,
      unreported,
      average: average(filtered, 'progress'),
    };
  }, [filtered]);

  const statusData = [
    {
      status: 'Terminadas',
      sourceStatus: 'Terminada' as WorkStatus,
      value: summary.completed,
      fill: statusColors.Terminada,
    },
    {
      status: 'En proceso',
      sourceStatus: 'En proceso' as WorkStatus,
      value: summary.inProgress,
      fill: statusColors['En proceso'],
    },
    {
      status: 'No empezadas',
      sourceStatus: 'No empezada' as WorkStatus,
      value: summary.pending,
      fill: statusColors['No empezada'],
    },
    {
      status: 'Sin reporte',
      sourceStatus: 'Sin reporte' as WorkStatus,
      value: summary.unreported,
      fill: statusColors['Sin reporte'],
    },
  ];
  const stageData = stageDefinitions.map((stage) => ({
    ...stage,
    average: average(filtered, stage.key),
    fill: stage.color,
  }));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const historyAgencies = useMemo(() => {
    const unique = new Map<
      string,
      { key: string; agency: string; projectId: string; projectLabel: string }
    >();
    snapshot.history
      .filter((record) =>
        filtered.some(
          (r) => r.projectId === record.projectId && r.agency === record.agency,
        ),
      )
      .forEach((record) => {
        const key = `${record.projectId}::${record.agency}`;
        unique.set(key, {
          key,
          agency: record.agency,
          projectId: record.projectId,
          projectLabel: record.projectLabel,
        });
      });
    return [...unique.values()].sort((first, second) =>
      first.agency.localeCompare(second.agency, 'es'),
    );
  }, [snapshot.history, filtered]);
  const effectiveHistoryAgency = historyAgencies.some(
    (option) => option.key === historyAgency,
  )
    ? historyAgency
    : historyAgencies[0]?.key || '';
  const selectedHistory = historyAgencies.find(
    (option) => option.key === effectiveHistoryAgency,
  );
  const historyData = useMemo(
    () =>
      snapshot.history.filter(
        (record) =>
          record.projectId === selectedHistory?.projectId &&
          record.agency === selectedHistory?.agency,
      ),
    [snapshot.history, selectedHistory],
  );
  const historyFirst = historyData[0];
  const historyLatest = historyData[historyData.length - 1];
  const historyChange =
    historyFirst && historyLatest
      ? historyLatest.progress - historyFirst.progress
      : 0;
  const activeFilters = [
    project !== 'Todos',
    activeProviders.length > 0,
    status !== 'Todos',
    effectiveLocation !== 'Todas',
    Boolean(search),
  ].filter(Boolean).length;
  const resetFilters = () => {
    setSearch('');
    setProject('Todos');
    setSelectedProviders([]);
    setStatus('Todos');
    setLocation('Todas');
    setPage(1);
  };

  const providerTotals = providers
    .map((name) => ({
      name,
      count: filtered.filter((r) => r.provider.trim().toUpperCase() === name)
        .length,
    }))
    .filter((item) => item.count > 0);

  const changeProject = (value: string) => {
    setProject(value);
    setSelectedProviders([]);
    setLocation('Todas');
    setPage(1);
  };

  const toggleHistorySeries = (key: HistorySeriesKey) =>
    setVisibleHistorySeries((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Activity className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">
                Seguimiento de trabajos
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Cronograma operativo · 2026
              </p>
            </div>
          </div>
          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-1 rounded-xl bg-muted p-1 md:flex"
          >
            <a
              href="#resumen"
              className="rounded-lg bg-card px-3 py-1.5 text-xs font-semibold shadow-sm"
            >
              Resumen
            </a>
            <a
              href="#linea-tiempo"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Línea de tiempo
            </a>
            <a
              href="#agencias"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Agencias
            </a>
          </nav>
          <Badge
            variant="outline"
            className={`hidden h-7 gap-1.5 sm:inline-flex ${snapshot.isLive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
          >
            <span
              className={`size-1.5 rounded-full ${snapshot.isLive ? 'bg-emerald-500' : 'bg-amber-500'}`}
            />
            {snapshot.isLive ? 'Excel online conectado' : 'Copia de respaldo'}
          </Badge>
        </div>
      </header>

      <div
        id="resumen"
        className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
      >
        <section className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
              Vista general
            </p>
            <h1 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
              Avance del cronograma
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Lectura consolidada de los dos Excel de SharePoint con
              contratistas y proyectos independientes.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
                <Database className="size-4 text-primary" />
                Fuente: {snapshot.source}
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
                <CalendarDays className="size-4 text-primary" />
                Corte: {formatSnapshotDate(snapshot.extractedAt)}
              </span>
              <Button
                type="button"
                variant="outline"
                className="h-9"
                onClick={() => void refresh(true)}
                disabled={isRefreshing}
                aria-label={
                  isRefreshing ? 'Actualizando datos' : 'Actualizar datos ahora'
                }
              >
                <RefreshCw className={isRefreshing ? 'animate-spin' : ''} />
                {isRefreshing ? 'Actualizando…' : 'Actualizar ahora'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isRefreshing
                ? 'Descargando ambos Excel…'
                : 'Actualización automática cada 90 s'}
            </p>
            {refreshError ? (
              <p
                className="text-xs font-medium text-red-600"
                aria-live="polite"
              >
                {refreshError}
              </p>
            ) : null}
          </div>
        </section>

        <section
          aria-label="Filtros"
          className="mb-4 grid gap-3 rounded-2xl border bg-card p-3 shadow-[0_8px_24px_rgb(15_23_42/4%)] md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_190px_170px_170px_150px_auto]"
        >
          <div className="relative">
            <label htmlFor="dashboard-search" className="sr-only">
              Buscar agencia, distrito o supervisor
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="dashboard-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="h-9 pl-9"
              placeholder="Buscar agencia, distrito o supervisor…"
            />
          </div>
          <NativeSelect
            aria-label="Filtrar por proyecto"
            value={project}
            onChange={(event) => changeProject(event.target.value)}
            className="w-full [&_select]:h-9"
          >
            <NativeSelectOption value="Todos">
              Todos los proyectos
            </NativeSelectOption>
            {projectOptions.map((item) => (
              <NativeSelectOption
                key={item.id}
                value={item.id}
                disabled={!item.hasData}
              >
                {item.label}
                {item.hasData ? '' : ' (sin datos)'}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Filtrar por estado"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="w-full [&_select]:h-9"
          >
            <NativeSelectOption>Todos</NativeSelectOption>
            <NativeSelectOption>Terminada</NativeSelectOption>
            <NativeSelectOption>En proceso</NativeSelectOption>
            <NativeSelectOption>No empezada</NativeSelectOption>
            <NativeSelectOption>Sin reporte</NativeSelectOption>
          </NativeSelect>
          <NativeSelect
            aria-label="Filtrar por ubicación"
            value={effectiveLocation}
            onChange={(event) => {
              setLocation(event.target.value);
              setPage(1);
            }}
            className="w-full [&_select]:h-9"
          >
            <NativeSelectOption>Todas</NativeSelectOption>
            {locations.map((item) => (
              <NativeSelectOption key={item}>{item}</NativeSelectOption>
            ))}
          </NativeSelect>
          <Button
            variant="outline"
            className="h-9"
            onClick={resetFilters}
            disabled={!activeFilters}
          >
            <RotateCcw />
            Limpiar{activeFilters ? ` (${activeFilters})` : ''}
          </Button>
          <div className="col-span-full">
            <ProviderFilter
              key={project}
              options={providers}
              value={activeProviders}
              onChange={(value) => {
                setSelectedProviders(value);
                setPage(1);
              }}
            />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            label="Agencias"
            value={summary.total}
            note={
              summary.unreported
                ? `${summary.unreported} sin reporte de avance`
                : `${summary.total === snapshot.records.length ? 'Alcance completo' : 'Resultado filtrado'}`
            }
            icon={Building2}
            tone="bg-slate-100 text-slate-700"
          />
          <KpiCard
            label="Terminadas"
            value={summary.completed}
            note={`${summary.total ? Math.round((summary.completed / summary.total) * 100) : 0}% del resultado`}
            icon={CheckCircle2}
            tone="bg-emerald-50 text-emerald-700"
          />
          <KpiCard
            label="En proceso"
            value={summary.inProgress}
            note="Seguimiento activo"
            icon={Clock3}
            tone="bg-amber-50 text-amber-700"
          />
          <KpiCard
            label="No empezadas"
            value={summary.pending}
            note="Pendientes de inicio"
            icon={CircleDot}
            tone="bg-red-50 text-red-700"
          />
          <KpiCard
            label="Avance promedio"
            value={`${summary.average}%`}
            note="Solo agencias con reporte"
            icon={Activity}
            tone="bg-sky-50 text-sky-700"
          />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
          <Card className="border-0 shadow-[0_1px_2px_rgb(15_23_42/4%),0_10px_28px_rgb(15_23_42/5%)] ring-1 ring-slate-200/80">
            <CardHeader>
              <CardTitle>Distribución por estado</CardTitle>
              <p className="text-xs text-muted-foreground">
                Composición del resultado actual
              </p>
            </CardHeader>
            <CardContent className="grid items-center gap-5 sm:grid-cols-[1fr_170px] lg:grid-cols-1 xl:grid-cols-[1fr_170px]">
              <ChartContainer
                config={chartConfig}
                className="mx-auto h-[240px] w-full max-w-[290px] aspect-square"
              >
                <PieChart accessibilityLayer>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="status" hideLabel />}
                  />
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="status"
                    innerRadius={66}
                    outerRadius={94}
                    paddingAngle={2}
                    strokeWidth={0}
                  />
                  <text
                    x="50%"
                    y="47%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-foreground text-3xl font-semibold"
                  >
                    {summary.average}%
                  </text>
                  <text
                    x="50%"
                    y="58%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-muted-foreground text-[11px]"
                  >
                    avance promedio
                  </text>
                </PieChart>
              </ChartContainer>
              <div className="space-y-4">
                {statusData.map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <div>
                        <p className="text-sm font-medium">{item.status}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {summary.total
                            ? Math.round((item.value / summary.total) * 100)
                            : 0}
                          % del total
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-semibold tabular-nums">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-[0_1px_2px_rgb(15_23_42/4%),0_10px_28px_rgb(15_23_42/5%)] ring-1 ring-slate-200/80">
            <CardHeader>
              <CardTitle>Avance por etapa</CardTitle>
              <p className="text-xs text-muted-foreground">
                Promedio de ejecución de cada componente del trabajo
              </p>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={chartConfig}
                className="h-[300px] w-full aspect-auto"
              >
                <BarChart
                  accessibilityLayer
                  data={stageData}
                  layout="vertical"
                  margin={{ left: 16, right: 30 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="label"
                    type="category"
                    width={112}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip
                    cursor={{ fill: 'rgba(31,95,139,.05)' }}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value) => (
                          <div className="flex min-w-28 items-center justify-between gap-4">
                            <span className="text-muted-foreground">
                              Avance
                            </span>
                            <span className="font-mono font-semibold">
                              {value}%
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="average" radius={[0, 7, 7, 0]} barSize={24} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        <section id="linea-tiempo" className="mt-4 scroll-mt-24">
          <Card className="border-0 shadow-[0_1px_2px_rgb(15_23_42/4%),0_10px_28px_rgb(15_23_42/5%)] ring-1 ring-slate-200/80">
            <CardHeader className="border-b lg:grid-cols-[1fr_340px]">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarRange className="size-4 text-primary" />
                  Línea de tiempo del avance
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Evolución diaria extraída de la hoja Historial de avance
                </p>
              </div>
              <NativeSelect
                aria-label="Seleccionar agencia para la línea de tiempo"
                value={effectiveHistoryAgency}
                onChange={(event) => setHistoryAgency(event.target.value)}
                className="w-full"
                data-slot="card-action"
              >
                {historyAgencies.map((option) => (
                  <NativeSelectOption key={option.key} value={option.key}>
                    {project === 'Todos' ? `${option.projectLabel} · ` : ''}
                    {option.agency}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </CardHeader>
            <CardContent>
              {historyData.length ? (
                <>
                  <div className="mb-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Avance actual
                      </p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums">
                        {historyLatest.progress}%
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50/70 p-3 ring-1 ring-emerald-200/70">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                        Variación
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-2xl font-semibold tabular-nums text-emerald-700">
                        <TrendingUp className="size-5" />
                        {historyChange >= 0 ? '+' : ''}
                        {historyChange} pts
                      </p>
                    </div>
                    <div className="rounded-xl bg-sky-50/70 p-3 ring-1 ring-sky-200/70">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                        Última actualización
                      </p>
                      <p className="mt-1 text-lg font-semibold text-sky-800">
                        {historyLatest.date}
                      </p>
                      <p className="text-[11px] text-sky-700">
                        {historyLatest.supervisor || 'Sin supervisor'}
                      </p>
                    </div>
                  </div>
                  <div className="mb-4 flex flex-col gap-3 border-y border-slate-100 py-3 xl:flex-row xl:items-center xl:justify-between">
                    <fieldset
                      className="flex flex-wrap gap-2"
                      aria-label="Series visibles en la línea de tiempo"
                    >
                      {historySeries.map((series) => {
                        const visible = visibleHistorySeries.includes(
                          series.key,
                        );
                        return (
                          <button
                            key={series.key}
                            type="button"
                            aria-pressed={visible}
                            onClick={() => toggleHistorySeries(series.key)}
                            className={`inline-flex h-8 items-center gap-2 rounded-lg border px-2.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${visible ? 'border-slate-200 bg-white text-slate-700 shadow-sm' : 'border-transparent bg-slate-100/70 text-slate-400'}`}
                          >
                            <span
                              className="h-0.5 w-4 rounded-full transition-opacity"
                              style={{
                                backgroundColor: series.color,
                                opacity: visible ? 1 : 0.28,
                              }}
                            />
                            {series.label}
                          </button>
                        );
                      })}
                    </fieldset>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() =>
                          setVisibleHistorySeries(
                            historySeries.map((series) => series.key),
                          )
                        }
                        disabled={
                          visibleHistorySeries.length === historySeries.length
                        }
                      >
                        Todas
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setVisibleHistorySeries(['progress'])}
                        disabled={
                          visibleHistorySeries.length === 1 &&
                          visibleHistorySeries[0] === 'progress'
                        }
                      >
                        Solo promedio
                      </Button>
                    </div>
                  </div>
                  <ChartContainer
                    config={chartConfig}
                    className="h-[340px] w-full aspect-auto sm:h-[390px]"
                  >
                    <LineChart
                      accessibilityLayer
                      data={historyData}
                      margin={{ left: 4, right: 18, top: 12, bottom: 4 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="4 4" />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tickMargin={10}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 20, 40, 60, 80, 100]}
                        tickFormatter={(value) => `${value}%`}
                        axisLine={false}
                        tickLine={false}
                        width={42}
                      />
                      <ChartTooltip
                        cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4' }}
                        content={
                          <ChartTooltipContent
                            labelFormatter={(label) => `Fecha: ${label}`}
                            formatter={(value, name) => (
                              <div className="flex min-w-40 items-center justify-between gap-4">
                                <span className="text-muted-foreground">
                                  {String(name)}
                                </span>
                                <span className="font-mono font-semibold">
                                  {value}%
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      {historySeries
                        .filter((series) =>
                          visibleHistorySeries.includes(series.key),
                        )
                        .map((series) => (
                          <Line
                            key={series.key}
                            name={series.label}
                            type="monotone"
                            dataKey={series.key}
                            stroke={series.color}
                            strokeWidth={series.key === 'progress' ? 4 : 2}
                            dot={{
                              r: series.key === 'progress' ? 4 : 3,
                              fill:
                                series.key === 'progress'
                                  ? series.color
                                  : '#fff',
                            }}
                            activeDot={{ r: series.key === 'progress' ? 6 : 5 }}
                          />
                        ))}
                    </LineChart>
                  </ChartContainer>
                </>
              ) : (
                <div className="grid min-h-72 place-items-center px-6 text-center">
                  <div>
                    <CalendarRange className="mx-auto mb-3 size-8 text-muted-foreground/60" />
                    <p className="font-medium">No hay historial disponible</p>
                  </div>
                </div>
              )}
            </CardContent>
            <div className="border-t bg-muted/25 px-4 py-3 text-xs text-muted-foreground">
              {historyData.length} cortes registrados para esta agencia ·
              periodo {historyFirst?.date} a {historyLatest?.date}
            </div>
          </Card>
        </section>

        <section id="agencias" className="mt-4 scroll-mt-24">
          <Card className="border-0 shadow-[0_1px_2px_rgb(15_23_42/4%),0_10px_28px_rgb(15_23_42/5%)] ring-1 ring-slate-200/80">
            <CardHeader className="border-b sm:grid-cols-[1fr_auto]">
              <div>
                <CardTitle>Detalle de agencias</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {filtered.length} registros encontrados · orden original del
                  cronograma
                </p>
              </div>
              <div
                className="flex items-center gap-2 text-xs text-muted-foreground"
                data-slot="card-action"
              >
                <MapPin className="size-4 text-primary" />
                {effectiveLocation === 'Todas'
                  ? 'Todas las ubicaciones'
                  : effectiveLocation}
              </div>
            </CardHeader>
            <CardContent className="px-0">
              {visibleRows.length ? (
                <Table className="min-w-[1380px]">
                  <TableHeader>
                    <TableRow className="bg-muted/35">
                      <TableHead className="pl-4">Agencia</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Ubicación
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Supervisor
                      </TableHead>
                      <TableHead>Avance</TableHead>
                      <TableHead className="text-center">Visita 1</TableHead>
                      <TableHead className="text-center">Visita 2</TableHead>
                      <TableHead className="text-center">Visita 3</TableHead>
                      <TableHead className="w-28 text-center whitespace-normal">
                        TOTAL FINAL
                        <br />
                        CÁMARAS
                      </TableHead>
                      <TableHead className="hidden xl:table-cell">
                        Fechas
                      </TableHead>
                      <TableHead className="pr-4">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRows.map((record) => (
                      <TableRow
                        key={`${record.projectId}-${record.id}-${record.agency}`}
                      >
                        <TableCell className="max-w-[300px] whitespace-normal pl-4 font-medium">
                          <span className="line-clamp-2">{record.agency}</span>
                          <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                            {record.projectLabel}
                            <span className="md:hidden">
                              {' '}
                              · {record.district}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-background text-[10px]"
                          >
                            {record.provider}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <p className="text-sm">{record.district || '—'}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {record.location}
                          </p>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground lg:table-cell">
                          {record.supervisor || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex min-w-24 items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-primary transition-[width]"
                                style={{ width: `${record.progress ?? 0}%` }}
                              />
                            </div>
                            <span className="w-8 text-right text-xs font-semibold tabular-nums">
                              {record.progress === null
                                ? '—'
                                : `${record.progress}%`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <VisitCheckMark
                            visit={record.visit1}
                            label="Visita 1"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <VisitCheckMark
                            visit={record.visit2}
                            label="Visita 2"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <VisitCheckMark
                            visit={record.visit3}
                            label="Visita 3"
                          />
                        </TableCell>
                        <TableCell className="text-center font-semibold tabular-nums">
                          {record.totalFinalCameras ?? '—'}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <p className="text-xs">
                            {formatDate(record.startDate)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            hasta {formatDate(record.endDate)}
                          </p>
                        </TableCell>
                        <TableCell className="pr-4">
                          <StatusBadge status={record.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="grid min-h-64 place-items-center px-6 text-center">
                  <div>
                    <Search className="mx-auto mb-3 size-8 text-muted-foreground/60" />
                    <p className="font-medium">No hay agencias que coincidan</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Prueba con otros filtros o limpia la búsqueda.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={resetFilters}
                    >
                      <RotateCcw />
                      Limpiar filtros
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            <div className="flex flex-col gap-3 border-t bg-muted/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Mostrando{' '}
                {visibleRows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} de{' '}
                {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Página anterior"
                  disabled={currentPage === 1}
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                >
                  <ChevronLeft />
                </Button>
                <span className="min-w-20 text-center text-xs font-medium">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Página siguiente"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </Card>
        </section>
        <footer className="mt-5 flex flex-col gap-1 pb-2 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Datos leídos desde SharePoint. Los Excel originales no se modifican.
          </p>
          <p>
            {providerTotals
              .map(({ name, count }) => `${count} ${name}`)
              .join(' · ')}
          </p>
        </footer>
      </div>
    </main>
  );
}
