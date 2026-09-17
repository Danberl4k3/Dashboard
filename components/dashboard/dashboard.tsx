'use client';

import ProviderFilter from '@/components/dashboard/provider-filter';
import { filterDashboard } from '@/lib/dashboard/filters';
import { AgencyCard } from './agency-card';
import { AgencySparkline } from './agency-sparkline';
import { StageStepper } from './stage-stepper';
import { CircularProgress } from './circular-progress';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  LayoutGrid,
  List,
  AlertTriangle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  Area,
  ComposedChart,
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
const MOTION_DURATION_MS = 650;
const statusColors: Record<WorkStatus, string> = {
  Terminada: '#16a34a',
  'En proceso': '#d97706',
  'No empezada': '#e11d48',
  'Sin reporte': '#94a3b8',
};

const chartConfig = {
  value: { label: 'Agencias', color: '#1d4ed8' },
  average: { label: 'Avance', color: '#1d4ed8' },
} satisfies ChartConfig;

const stageDefinitions: Array<{
  key: keyof WorkRecord;
  label: string;
  color: string;
}> = [
  { key: 'newConduit', label: 'Canalizado', color: '#2563eb' },
  { key: 'newCabling', label: 'Cableado', color: '#0f766e' },
  { key: 'installation', label: 'Instalación', color: '#d97706' },
  { key: 'commissioning', label: 'Puesta en marcha', color: '#16a34a' },
  { key: 'dismantling', label: 'Desmontaje', color: '#e11d48' },
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
  dash?: string;
}> = [
  { key: 'progress', label: 'Promedio total', color: '#1e40af' },
  { key: 'newConduit', label: 'Canalizado', color: '#2563eb' },
  { key: 'newCabling', label: 'Cableado', color: '#0f766e', dash: '7 3' },
  { key: 'installation', label: 'Instalación', color: '#d97706' },
  {
    key: 'commissioning',
    label: 'Puesta en marcha',
    color: '#16a34a',
    dash: '4 3',
  },
  { key: 'dismantling', label: 'Desmontaje', color: '#e11d48' },
];

type KpiTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'teal';

const kpiToneStyles: Record<KpiTone, { card: string; value: string }> = {
  blue: {
    card: 'border-t-blue-500 bg-blue-50/25',
    value: 'text-blue-700',
  },
  emerald: {
    card: 'border-t-emerald-500 bg-emerald-50/25',
    value: 'text-emerald-700',
  },
  amber: {
    card: 'border-t-amber-500 bg-amber-50/30',
    value: 'text-amber-700',
  },
  rose: {
    card: 'border-t-rose-500 bg-rose-50/25',
    value: 'text-rose-700',
  },
  teal: {
    card: 'border-t-teal-500 bg-teal-50/25',
    value: 'text-teal-700',
  },
};

function providerBadgeClass(provider: string) {
  const styles: Record<string, string> = {
    DOMINION: 'border-blue-200 bg-blue-50 text-blue-700',
    INTELLISOFT: 'border-teal-200 bg-teal-50 text-teal-700',
    PROSEGUR: 'border-amber-200 bg-amber-50 text-amber-800',
    RUWAY: 'border-violet-200 bg-violet-50 text-violet-700',
    SELECTEC: 'border-rose-200 bg-rose-50 text-rose-700',
    SENTINEL: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  };
  return (
    styles[provider.trim().toUpperCase()] ?? 'border-slate-200 bg-slate-50'
  );
}

function progressColor(value: number) {
  if (value >= 100) return 'bg-emerald-500';
  if (value >= 60) return 'bg-blue-600';
  if (value > 0) return 'bg-amber-500';
  return 'bg-slate-300';
}

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

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(media.matches);

    updatePreference();
    media.addEventListener('change', updatePreference);
    return () => media.removeEventListener('change', updatePreference);
  }, []);

  return prefersReducedMotion;
}

function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  prefersReducedMotion,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  prefersReducedMotion: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const displayValueRef = useRef(value);

  useEffect(() => {
    const from = displayValueRef.current;
    if (prefersReducedMotion || from === value) {
      displayValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    const startedAt = performance.now();
    let animationFrame = 0;
    const update = (now: number) => {
      const progress = Math.min((now - startedAt) / MOTION_DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(from + (value - from) * eased);
      displayValueRef.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(update);
      }
    };

    animationFrame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [prefersReducedMotion, value]);

  const resolvedValue = `${prefix}${value}${suffix}`;
  return (
    <>
      <span key={value} aria-hidden="true" className="metric-settle">
        {prefix}
        {displayValue}
        {suffix}
      </span>
      <span className="sr-only">{resolvedValue}</span>
    </>
  );
}

function ProgressFill({
  value,
  prefersReducedMotion,
}: {
  value: number;
  prefersReducedMotion: boolean;
}) {
  const [renderedValue, setRenderedValue] = useState(0);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setRenderedValue(value);
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [prefersReducedMotion, value]);

  return (
    <>
      <div
        className="h-1.5 w-20 overflow-hidden rounded-sm bg-slate-100"
        aria-hidden="true"
      >
        <div
          className={`h-full rounded-sm transition-[width] duration-700 ease-out ${progressColor(value)}`}
          style={{ width: `${renderedValue}%` }}
        />
      </div>
      <progress
        className="sr-only"
        value={value}
        max={100}
        aria-label="Avance de la agencia"
      />
    </>
  );
}

function StatusBadge({ status }: { status: WorkStatus }) {
  const styles =
    status === 'Terminada'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'En proceso'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : status === 'No empezada'
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-slate-200 bg-slate-50 text-slate-500';
  return (
    <span
      className={`inline-flex rounded-sm border px-2 py-0.5 text-[10px] font-medium ${styles}`}
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
      className="visit-check inline-flex size-6 items-center justify-center font-mono text-sm font-semibold"
      style={{ color: visit.color || '#16a34a' }}
      title={`Color de la marca en Excel: ${visit.color || '#16A34A'}`}
    >
      ✓
    </span>
  ) : (
    <span
      aria-label={`${label} pendiente`}
      className="text-muted-foreground/45"
    >
      —
    </span>
  );
}

function KpiCard({
  label,
  value,
  suffix,
  note,
  tone,
  className = '',
  prefersReducedMotion,
}: {
  label: string;
  value: number;
  suffix?: string;
  note: string;
  tone: KpiTone;
  className?: string;
  prefersReducedMotion: boolean;
}) {
  const styles = kpiToneStyles[tone];
  return (
    <Card size="sm" className={`border-t-2 ${styles.card} ${className}`}>
      <CardContent className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <p
          className={`mt-1 font-mono text-2xl font-semibold leading-none tracking-[-0.04em] tabular-nums ${styles.value}`}
        >
          <AnimatedNumber
            value={value}
            suffix={suffix}
            prefersReducedMotion={prefersReducedMotion}
          />
        </p>
        <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
          {note}
        </p>
      </CardContent>
    </Card>
  );
}

function isAgencyAtRisk(record: WorkRecord) {
  if (record.status === 'No empezada' && record.startDate) {
    const start = new Date(`${record.startDate}T00:00:00Z`);
    const now = new Date();
    if (start < now) return true;
  }
  return false;
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
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
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
  const prefersReducedMotion = usePrefersReducedMotion();

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
  const tableMotionKey = [
    project,
    activeProviders.join(','),
    status,
    effectiveLocation,
  ].join('|');
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
    <main
      className="dashboard-root min-h-screen bg-background text-foreground"
      data-dashboard-root
    >
      <header className="dashboard-header sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-sm border border-slate-800 bg-slate-900 font-mono text-[10px] font-semibold tracking-wider text-white">
              CI
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold tracking-tight">
                Control de implementación
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Portafolio operativo · 2026
              </p>
            </div>
          </div>
          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-0.5 md:flex"
          >
            <a
              href="#resumen"
              className="dashboard-nav-link rounded-sm border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            >
              Resumen
            </a>
            <a
              href="#linea-tiempo"
              className="dashboard-nav-link rounded-sm border border-transparent px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            >
              Línea de tiempo
            </a>
            <a
              href="#agencias"
              className="dashboard-nav-link rounded-sm border border-transparent px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            >
              Agencias
            </a>
          </nav>
          <Badge
            variant="outline"
            className={`hidden h-6 gap-1.5 sm:inline-flex ${snapshot.isLive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}
          >
            <span
              className={`size-1.5 rounded-full ${snapshot.isLive ? 'bg-emerald-500' : 'bg-amber-500'}`}
            />
            {snapshot.isLive ? 'Excel online conectado' : 'Copia de respaldo'}
          </Badge>
        </div>
        {isRefreshing ? (
          <>
            <div className="refresh-track" aria-hidden="true">
              <span className="refresh-thumb" />
            </div>
            <output className="sr-only" aria-live="polite">
              Actualizando datos del dashboard
            </output>
          </>
        ) : null}
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        <section
          id="resumen"
          className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end"
        >
          <div>
            <p className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-blue-700">
              <span className="h-1.5 w-5 rounded-sm bg-blue-600" />
              Control operativo
            </p>
            <h1 className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
              Seguimiento de implementación
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              Estado por agencia, contratista y frente de trabajo al corte
              seleccionado.
            </p>
          </div>
          <div className="flex flex-col items-start gap-1.5 lg:items-end">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">Fuente</span>{' '}
                {snapshot.source}
              </span>
              <span>
                <span className="font-medium text-foreground">Corte</span>{' '}
                <span className="font-mono tabular-nums">
                  {formatSnapshotDate(snapshot.extractedAt)}
                </span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-blue-200 text-blue-700 hover:border-blue-300 hover:bg-blue-50"
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
            <p className="text-[10px] text-muted-foreground">
              {isRefreshing
                ? 'Descargando ambos Excel…'
                : 'Actualización automática cada 30 s'}
            </p>
            {refreshError ? (
              <p
                className="text-[11px] font-medium text-red-600"
                aria-live="polite"
              >
                {refreshError}
              </p>
            ) : null}
          </div>
        </section>

        <section
          aria-label="Filtros"
          className="mb-3 grid gap-3 rounded-md border border-border bg-card p-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.35fr)_190px_160px_170px_auto]"
        >
          <div>
            <label
              htmlFor="dashboard-search"
              className="mb-1 block text-[10px] font-medium text-muted-foreground"
            >
              Buscar
            </label>
            <div className="group relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="dashboard-search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="pl-8"
                placeholder="Agencia, distrito o supervisor"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="dashboard-project"
              className="mb-1 block text-[10px] font-medium text-muted-foreground"
            >
              Proyecto
            </label>
            <NativeSelect
              id="dashboard-project"
              aria-label="Filtrar por proyecto"
              value={project}
              onChange={(event) => changeProject(event.target.value)}
              className="w-full"
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
          </div>
          <div>
            <label
              htmlFor="dashboard-status"
              className="mb-1 block text-[10px] font-medium text-muted-foreground"
            >
              Estado
            </label>
            <NativeSelect
              id="dashboard-status"
              aria-label="Filtrar por estado"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="w-full"
            >
              <NativeSelectOption>Todos</NativeSelectOption>
              <NativeSelectOption>Terminada</NativeSelectOption>
              <NativeSelectOption>En proceso</NativeSelectOption>
              <NativeSelectOption>No empezada</NativeSelectOption>
              <NativeSelectOption>Sin reporte</NativeSelectOption>
            </NativeSelect>
          </div>
          <div>
            <label
              htmlFor="dashboard-location"
              className="mb-1 block text-[10px] font-medium text-muted-foreground"
            >
              Ubicación
            </label>
            <NativeSelect
              id="dashboard-location"
              aria-label="Filtrar por ubicación"
              value={effectiveLocation}
              onChange={(event) => {
                setLocation(event.target.value);
                setPage(1);
              }}
              className="w-full"
            >
              <NativeSelectOption>Todas</NativeSelectOption>
              {locations.map((item) => (
                <NativeSelectOption key={item}>{item}</NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <Button
            variant="outline"
            className="self-end"
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

        <section className="kpi-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="Agencias"
            value={summary.total}
            note={
              summary.unreported
                ? `${summary.unreported} sin reporte de avance`
                : `${summary.total === snapshot.records.length ? 'Alcance completo' : 'Resultado filtrado'}`
            }
            tone="blue"
            prefersReducedMotion={prefersReducedMotion}
          />
          <KpiCard
            label="Terminadas"
            value={summary.completed}
            note={`${summary.total ? Math.round((summary.completed / summary.total) * 100) : 0}% del alcance`}
            tone="emerald"
            prefersReducedMotion={prefersReducedMotion}
          />
          <KpiCard
            label="En proceso"
            value={summary.inProgress}
            note="Requieren seguimiento"
            tone="amber"
            prefersReducedMotion={prefersReducedMotion}
          />
          <KpiCard
            label="No empezadas"
            value={summary.pending}
            note="Pendientes de movilización"
            tone="rose"
            prefersReducedMotion={prefersReducedMotion}
          />
          <KpiCard
            label="Avance promedio"
            value={summary.average}
            suffix="%"
            note="Avance reportado"
            tone="teal"
            className="xl:col-span-2"
            prefersReducedMotion={prefersReducedMotion}
          />
          <p className="sr-only" aria-live="polite">
            Resultado actualizado: {summary.total} agencias, {summary.completed}{' '}
            terminadas, {summary.inProgress} en proceso y {summary.average}% de
            avance promedio.
          </p>
        </section>

        <section className="chart-grid mt-3 grid gap-3 lg:grid-cols-[0.82fr_1.18fr]">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Distribución por estado</CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Composición del resultado actual
              </p>
            </CardHeader>
            <CardContent className="grid items-center gap-4 sm:grid-cols-[1fr_170px] lg:grid-cols-1 xl:grid-cols-[1fr_170px]">
              <ChartContainer
                config={chartConfig}
                className="mx-auto h-[210px] w-full max-w-[260px] aspect-square"
              >
                <PieChart accessibilityLayer>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="status" hideLabel />}
                  />
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="status"
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={1}
                    strokeWidth={0}
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={MOTION_DURATION_MS}
                    animationEasing="ease-out"
                    onClick={(data) => {
                      if (data?.payload?.sourceStatus) {
                        setStatus(data.payload.sourceStatus);
                        setPage(1);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <text
                    x="50%"
                    y="47%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-foreground font-mono text-2xl font-semibold"
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
              <div className="divide-y divide-border/80">
                {statusData.map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-[2px]"
                        style={{ backgroundColor: item.fill }}
                      />
                      <div>
                        <p className="text-xs font-medium">{item.status}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {summary.total
                            ? Math.round((item.value / summary.total) * 100)
                            : 0}
                          % del total
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      <AnimatedNumber
                        value={item.value}
                        prefersReducedMotion={prefersReducedMotion}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Avance por etapa</CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Promedio de ejecución de cada componente del trabajo
              </p>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={chartConfig}
                className="h-[270px] w-full aspect-auto"
              >
                <BarChart
                  accessibilityLayer
                  data={stageData}
                  layout="vertical"
                  margin={{ left: 8, right: 24 }}
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
                    cursor={{ fill: 'rgba(37,99,235,.04)' }}
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
                  <Bar
                    dataKey="average"
                    radius={[0, 3, 3, 0]}
                    barSize={20}
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={MOTION_DURATION_MS}
                    animationEasing="ease-out"
                    animateNewValues
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        <section id="linea-tiempo" className="mt-3 scroll-mt-20">
          <Card>
            <CardHeader className="border-b lg:grid-cols-[1fr_340px]">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarRange className="size-4 text-muted-foreground" />
                  Línea de tiempo del avance
                </CardTitle>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
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
                  <div className="timeline-metrics mb-4 grid overflow-hidden rounded-md border border-border bg-muted/25 sm:grid-cols-3 sm:divide-x sm:divide-border">
                    <div className="border-b border-blue-100 bg-blue-50/70 p-3 sm:border-b-0">
                      <p className="text-[10px] font-medium text-muted-foreground">
                        Avance actual
                      </p>
                      <p className="mt-1 font-mono text-xl font-semibold text-blue-700 tabular-nums">
                        <AnimatedNumber
                          value={historyLatest.progress}
                          suffix="%"
                          prefersReducedMotion={prefersReducedMotion}
                        />
                      </p>
                    </div>
                    <div
                      className={`border-b p-3 sm:border-b-0 ${historyChange >= 0 ? 'border-emerald-100 bg-emerald-50/70' : 'border-rose-100 bg-rose-50/70'}`}
                    >
                      <p className="text-[10px] font-medium text-muted-foreground">
                        Variación
                      </p>
                      <p
                        className={`mt-1 font-mono text-xl font-semibold tabular-nums ${historyChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
                      >
                        <AnimatedNumber
                          value={historyChange}
                          prefix={historyChange >= 0 ? '+' : ''}
                          suffix=" pts"
                          prefersReducedMotion={prefersReducedMotion}
                        />
                      </p>
                    </div>
                    <div className="bg-amber-50/60 p-3">
                      <p className="text-[10px] font-medium text-muted-foreground">
                        Última actualización
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
                        {historyLatest.date}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {historyLatest.supervisor || 'Sin supervisor'}
                      </p>
                    </div>
                  </div>
                  <div className="mb-3 flex flex-col gap-2 border-y border-border/80 py-2 xl:flex-row xl:items-center xl:justify-between">
                    <fieldset
                      className="flex flex-wrap gap-1.5"
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
                            className={`inline-flex h-7 items-center gap-2 rounded-md border px-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 ${visible ? 'bg-card' : 'border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-muted/50'}`}
                            style={
                              visible
                                ? {
                                    color: series.color,
                                    borderColor: `${series.color}55`,
                                    backgroundColor: `${series.color}0d`,
                                  }
                                : undefined
                            }
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
                    className="h-[300px] w-full aspect-auto sm:h-[340px]"
                  >
                    <ComposedChart
                      accessibilityLayer
                      data={historyData}
                      margin={{ left: 4, right: 18, top: 12, bottom: 4 }}
                    >
                      <defs>
                        <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1e40af" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#1e40af" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
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
                        cursor={{
                          stroke: '#94a3b8',
                          strokeDasharray: '4 4',
                        }}
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
                        .map((series, index) => {
                          if (series.key === 'progress') {
                            return (
                              <Area
                                key={series.key}
                                name={series.label}
                                type="monotone"
                                dataKey={series.key}
                                stroke={series.color}
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#colorProgress)"
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                                isAnimationActive={!prefersReducedMotion}
                                animationBegin={index * 70}
                                animationDuration={MOTION_DURATION_MS}
                                animationEasing="ease-out"
                              />
                            );
                          }
                          return (
                            <Line
                              key={series.key}
                              name={series.label}
                              type="monotone"
                              dataKey={series.key}
                              stroke={series.color}
                              strokeWidth={1.5}
                              strokeDasharray={series.dash}
                              dot={false}
                              activeDot={{ r: 4 }}
                              isAnimationActive={!prefersReducedMotion}
                              animationBegin={index * 70}
                              animationDuration={MOTION_DURATION_MS}
                              animationEasing="ease-out"
                              animateNewValues
                            />
                          );
                        })}
                    </ComposedChart>
                  </ChartContainer>
                </>
              ) : (
                <div className="grid min-h-40 place-items-center px-6 text-center">
                  <div>
                    <p className="text-sm font-medium">
                      No hay historial disponible
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Selecciona otra agencia o ajusta los filtros.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            <div className="border-t bg-muted/25 px-4 py-2 text-[11px] text-muted-foreground">
              {historyData.length} cortes registrados para esta agencia ·
              periodo {historyFirst?.date} a {historyLatest?.date}
            </div>
          </Card>
        </section>

        <section id="agencias" className="mt-3 scroll-mt-20">
          <Card>
            <CardHeader className="border-b sm:grid-cols-[1fr_auto]">
              <div>
                <CardTitle>Detalle de agencias</CardTitle>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {filtered.length} registros encontrados · orden original del
                  cronograma
                </p>
              </div>
              <div
                className="flex items-center gap-4"
                data-slot="card-action"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {effectiveLocation === 'Todas'
                    ? 'Todas las ubicaciones'
                    : effectiveLocation}
                </div>
                <div className="flex items-center rounded-md border p-0.5 bg-muted/50">
                  <button
                    type="button"
                    title="Vista de cuadrícula"
                    aria-label="Vista de cuadrícula"
                    aria-pressed={viewMode === 'grid'}
                    onClick={() => setViewMode('grid')}
                    className={`rounded-sm p-1 transition-colors ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}
                  >
                    <LayoutGrid className="size-4" />
                  </button>
                  <button
                    type="button"
                    title="Vista de tabla"
                    aria-label="Vista de tabla"
                    aria-pressed={viewMode === 'table'}
                    onClick={() => setViewMode('table')}
                    className={`rounded-sm p-1 transition-colors ${viewMode === 'table' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}
                  >
                    <List className="size-4" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className={viewMode === 'grid' ? 'p-4' : 'px-0'}>
              {visibleRows.length ? (
                viewMode === 'table' ? (
                  <Table className="min-w-[1280px]">
                    <TableHeader>
                      <TableRow className="bg-blue-50/45">
                        <TableHead className="pl-4">Agencia</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Ubicación
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          Supervisor
                        </TableHead>
                        <TableHead className="text-right">Avance</TableHead>
                        <TableHead className="text-center">Etapas</TableHead>
                        <TableHead className="text-center">Tendencia</TableHead>
                        <TableHead className="text-center">Visita 1</TableHead>
                        <TableHead className="text-center">Visita 2</TableHead>
                        <TableHead className="text-center">Visita 3</TableHead>
                        <TableHead className="w-28 text-right whitespace-normal">
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
                      {visibleRows.map((record, rowIndex) => {
                        const agencyHistory = snapshot.history.filter(
                          (h) => h.projectId === record.projectId && h.agency === record.agency
                        );
                        const isAtRisk = isAgencyAtRisk(record);
                        return (
                        <TableRow
                          key={`${record.projectId}-${record.id}-${record.agency}-${tableMotionKey}`}
                          className={`data-row-refresh ${isAtRisk ? 'bg-rose-50/20' : ''}`}
                          style={
                            {
                              '--row-delay': `${rowIndex * 36}ms`,
                            } as CSSProperties
                          }
                        >
                          <TableCell className="max-w-[280px] whitespace-normal pl-4 text-xs font-medium">
                            <div className="flex items-center gap-1.5">
                              {isAtRisk && <AlertTriangle className="size-3.5 text-rose-500 shrink-0" title="Agencia en riesgo" />}
                              <span className="line-clamp-2">{record.agency}</span>
                            </div>
                            <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                              {record.projectLabel}
                              <span className="md:hidden">
                                {' '}
                                · {record.district}
                              </span>
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-medium ${providerBadgeClass(record.provider)}`}
                            >
                              {record.provider}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <p className="text-xs">{record.district || '—'}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {record.location}
                            </p>
                          </TableCell>
                          <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                            {record.supervisor || '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="ml-auto flex min-w-24 max-w-32 items-center justify-end gap-2">
                              <ProgressFill
                                value={record.progress ?? 0}
                                prefersReducedMotion={prefersReducedMotion}
                              />
                              <span className="w-9 text-right font-mono text-xs font-semibold tabular-nums">
                                {record.progress === null
                                  ? '—'
                                  : `${record.progress}%`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <StageStepper record={record} />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <AgencySparkline history={agencyHistory} prefersReducedMotion={prefersReducedMotion} />
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
                          <TableCell className="text-right font-mono text-xs font-semibold tabular-nums">
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
                      )})}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visibleRows.map((record) => {
                      const agencyHistory = snapshot.history.filter(
                        (h) => h.projectId === record.projectId && h.agency === record.agency
                      );
                      const isAtRisk = isAgencyAtRisk(record);
                      return (
                        <AgencyCard 
                          key={`${record.projectId}-${record.agency}`}
                          record={record} 
                          history={agencyHistory} 
                          prefersReducedMotion={prefersReducedMotion} 
                          isAtRisk={isAtRisk}
                        />
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="grid min-h-48 place-items-center px-6 text-center">
                  <div>
                    <p className="text-sm font-medium">
                      No hay agencias que coincidan
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Prueba con otros filtros o limpia la búsqueda.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={resetFilters}
                    >
                      <RotateCcw />
                      Limpiar filtros
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            <div className="flex flex-col gap-2 border-t bg-muted/25 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
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
                <span className="min-w-20 text-center font-mono text-[11px] font-medium tabular-nums">
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
        <footer className="mt-4 flex flex-col gap-1 pb-1 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
