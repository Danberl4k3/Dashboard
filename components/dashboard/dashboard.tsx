'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  Database,
  MapPin,
  RotateCcw,
  Search,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DashboardSnapshot, WorkRecord, WorkStatus } from '@/lib/dashboard/types';

const PAGE_SIZE = 8;
const statusColors: Record<WorkStatus, string> = {
  Terminada: '#2f7d32',
  'En proceso': '#f2c94c',
  'No empezada': '#ef4444',
};

const chartConfig = {
  value: { label: 'Agencias', color: '#1f5f8b' },
  average: { label: 'Avance', color: '#2a6f97' },
} satisfies ChartConfig;

const stageDefinitions: Array<{ key: keyof WorkRecord; label: string; color: string }> = [
  { key: 'newConduit', label: 'Canalizado', color: '#1f5f8b' },
  { key: 'newCabling', label: 'Cableado', color: '#2a6f97' },
  { key: 'installation', label: 'Instalación', color: '#468faf' },
  { key: 'commissioning', label: 'Puesta en marcha', color: '#61a5c2' },
  { key: 'dismantling', label: 'Desmontaje', color: '#89c2d9' },
];

function average(records: WorkRecord[], key: keyof WorkRecord) {
  if (!records.length) return 0;
  return Math.round(records.reduce((sum, record) => sum + Number(record[key] || 0), 0) / records.length);
}

function formatDate(date: string | null) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

function StatusBadge({ status }: { status: WorkStatus }) {
  const styles = status === 'Terminada'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15'
    : status === 'En proceso'
      ? 'bg-amber-50 text-amber-800 ring-amber-600/20'
      : 'bg-red-50 text-red-700 ring-red-600/15';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${styles}`}>{status}</span>;
}

function KpiCard({ label, value, note, icon: Icon, tone }: { label: string; value: string | number; note: string; icon: typeof Activity; tone: string }) {
  return (
    <Card className="border-0 shadow-[0_1px_2px_rgb(15_23_42/4%),0_10px_28px_rgb(15_23_42/5%)] ring-1 ring-slate-200/80">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p><p className="mt-3 text-[1.75rem] font-semibold leading-none tracking-[-0.04em] tabular-nums">{value}</p><p className="mt-2 truncate text-xs text-muted-foreground">{note}</p></div>
        <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="size-5" /></div>
      </CardContent>
    </Card>
  );
}

export function Dashboard({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('Todos');
  const [status, setStatus] = useState('Todos');
  const [location, setLocation] = useState('Todas');
  const [page, setPage] = useState(1);

  const locations = useMemo(() => [...new Set(snapshot.records.map((record) => record.location).filter(Boolean))].sort(), [snapshot.records]);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    return snapshot.records.filter((record) => {
      const matchesText = !term || [record.agency, record.district, record.supervisor].some((value) => value.toLocaleLowerCase('es').includes(term));
      return matchesText && (provider === 'Todos' || record.provider === provider) && (status === 'Todos' || record.status === status) && (location === 'Todas' || record.location === location);
    });
  }, [snapshot.records, search, provider, status, location]);

  useEffect(() => setPage(1), [search, provider, status, location]);

  const summary = useMemo(() => {
    const completed = filtered.filter((record) => record.status === 'Terminada').length;
    const inProgress = filtered.filter((record) => record.status === 'En proceso').length;
    const pending = filtered.filter((record) => record.status === 'No empezada').length;
    return { total: filtered.length, completed, inProgress, pending, average: average(filtered, 'progress') };
  }, [filtered]);

  const statusData = [
    { status: 'Terminadas', sourceStatus: 'Terminada' as WorkStatus, value: summary.completed, fill: statusColors.Terminada },
    { status: 'En proceso', sourceStatus: 'En proceso' as WorkStatus, value: summary.inProgress, fill: statusColors['En proceso'] },
    { status: 'No empezadas', sourceStatus: 'No empezada' as WorkStatus, value: summary.pending, fill: statusColors['No empezada'] },
  ];
  const stageData = stageDefinitions.map((stage) => ({ ...stage, average: average(filtered, stage.key) }));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilters = [provider !== 'Todos', status !== 'Todos', location !== 'Todas', Boolean(search)].filter(Boolean).length;

  const resetFilters = () => { setSearch(''); setProvider('Todos'); setStatus('Todos'); setLocation('Todas'); };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Activity className="size-5" /></div>
            <div className="min-w-0"><p className="truncate text-sm font-semibold tracking-tight">Seguimiento de trabajos</p><p className="truncate text-xs text-muted-foreground">Cronograma operativo · 2026</p></div>
          </div>
          <nav aria-label="Navegación principal" className="hidden items-center gap-1 rounded-xl bg-muted p-1 md:flex"><a href="#resumen" className="rounded-lg bg-card px-3 py-1.5 text-xs font-semibold shadow-sm">Resumen</a><a href="#agencias" className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">Agencias</a></nav>
          <Badge variant="outline" className="hidden h-7 gap-1.5 bg-emerald-50 text-emerald-700 sm:inline-flex"><span className="size-1.5 rounded-full bg-emerald-500" />Datos cargados</Badge>
        </div>
      </header>

      <div id="resumen" className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary/70">Vista general</p><h1 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Avance del cronograma</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Lectura consolidada de la hoja CRONOGRAMA con el estado actual de las 95 agencias.</p></div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm"><Database className="size-4 text-primary" />Fuente: {snapshot.source}</span><span className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm"><CalendarDays className="size-4 text-primary" />Corte: {new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(snapshot.extractedAt))}</span></div>
        </section>

        <section aria-label="Filtros" className="mb-4 grid gap-3 rounded-2xl border bg-card p-3 shadow-[0_8px_24px_rgb(15_23_42/4%)] md:grid-cols-[minmax(220px,1fr)_180px_180px_160px_auto]">
          <label className="relative"><span className="sr-only">Buscar agencia, distrito o supervisor</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 pl-9" placeholder="Buscar agencia, distrito o supervisor…" /></label>
          <NativeSelect aria-label="Filtrar por proveedor" value={provider} onChange={(event) => setProvider(event.target.value)} className="w-full [&_select]:h-9"><NativeSelectOption>Todos</NativeSelectOption><NativeSelectOption>PROSEGUR</NativeSelectOption><NativeSelectOption>DOMINION</NativeSelectOption></NativeSelect>
          <NativeSelect aria-label="Filtrar por estado" value={status} onChange={(event) => setStatus(event.target.value)} className="w-full [&_select]:h-9"><NativeSelectOption>Todos</NativeSelectOption><NativeSelectOption>Terminada</NativeSelectOption><NativeSelectOption>En proceso</NativeSelectOption><NativeSelectOption>No empezada</NativeSelectOption></NativeSelect>
          <NativeSelect aria-label="Filtrar por ubicación" value={location} onChange={(event) => setLocation(event.target.value)} className="w-full [&_select]:h-9"><NativeSelectOption>Todas</NativeSelectOption>{locations.map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect>
          <Button variant="outline" className="h-9" onClick={resetFilters} disabled={!activeFilters}><RotateCcw />Limpiar{activeFilters ? ` (${activeFilters})` : ''}</Button>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard label="Agencias" value={summary.total} note={`${summary.total === snapshot.records.length ? 'Alcance completo' : 'Resultado filtrado'}`} icon={Building2} tone="bg-slate-100 text-slate-700" />
          <KpiCard label="Terminadas" value={summary.completed} note={`${summary.total ? Math.round(summary.completed / summary.total * 100) : 0}% del resultado`} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" />
          <KpiCard label="En proceso" value={summary.inProgress} note="Seguimiento activo" icon={Clock3} tone="bg-amber-50 text-amber-700" />
          <KpiCard label="No empezadas" value={summary.pending} note="Pendientes de inicio" icon={CircleDot} tone="bg-red-50 text-red-700" />
          <KpiCard label="Avance promedio" value={`${summary.average}%`} note="Promedio de ejecución" icon={Activity} tone="bg-sky-50 text-sky-700" />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
          <Card className="border-0 shadow-[0_1px_2px_rgb(15_23_42/4%),0_10px_28px_rgb(15_23_42/5%)] ring-1 ring-slate-200/80">
            <CardHeader><CardTitle>Distribución por estado</CardTitle><p className="text-xs text-muted-foreground">Composición del resultado actual</p></CardHeader>
            <CardContent className="grid items-center gap-5 sm:grid-cols-[1fr_170px] lg:grid-cols-1 xl:grid-cols-[1fr_170px]">
              <ChartContainer config={chartConfig} className="mx-auto h-[240px] w-full max-w-[290px] aspect-square">
                <PieChart accessibilityLayer><ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} /><Pie data={statusData} dataKey="value" nameKey="status" innerRadius={66} outerRadius={94} paddingAngle={2} strokeWidth={0}>{statusData.map((item) => <Cell key={item.status} fill={item.fill} />)}</Pie><text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-3xl font-semibold">{summary.average}%</text><text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[11px]">avance promedio</text></PieChart>
              </ChartContainer>
              <div className="space-y-4">{statusData.map((item) => <div key={item.status} className="flex items-center justify-between gap-4"><div className="flex items-center gap-2.5"><span className="size-2.5 rounded-full" style={{ backgroundColor: item.fill }} /><div><p className="text-sm font-medium">{item.status}</p><p className="text-[11px] text-muted-foreground">{summary.total ? Math.round(item.value / summary.total * 100) : 0}% del total</p></div></div><span className="text-lg font-semibold tabular-nums">{item.value}</span></div>)}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-[0_1px_2px_rgb(15_23_42/4%),0_10px_28px_rgb(15_23_42/5%)] ring-1 ring-slate-200/80">
            <CardHeader><CardTitle>Avance por etapa</CardTitle><p className="text-xs text-muted-foreground">Promedio de ejecución de cada componente del trabajo</p></CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full aspect-auto">
                <BarChart accessibilityLayer data={stageData} layout="vertical" margin={{ left: 16, right: 30 }}><CartesianGrid horizontal={false} /><XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} axisLine={false} tickLine={false} /><YAxis dataKey="label" type="category" width={112} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} /><ChartTooltip cursor={{ fill: 'rgba(31,95,139,.05)' }} content={<ChartTooltipContent hideLabel formatter={(value) => <div className="flex min-w-28 items-center justify-between gap-4"><span className="text-muted-foreground">Avance</span><span className="font-mono font-semibold">{value}%</span></div>} />} /><Bar dataKey="average" radius={[0, 7, 7, 0]} barSize={24}>{stageData.map((item) => <Cell key={item.label} fill={item.color} />)}</Bar></BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        <section id="agencias" className="mt-4 scroll-mt-24">
          <Card className="border-0 shadow-[0_1px_2px_rgb(15_23_42/4%),0_10px_28px_rgb(15_23_42/5%)] ring-1 ring-slate-200/80">
            <CardHeader className="border-b sm:grid-cols-[1fr_auto]"><div><CardTitle>Detalle de agencias</CardTitle><p className="mt-1 text-xs text-muted-foreground">{filtered.length} registros encontrados · orden original del cronograma</p></div><div className="flex items-center gap-2 text-xs text-muted-foreground" data-slot="card-action"><MapPin className="size-4 text-primary" />{location === 'Todas' ? 'Todas las ubicaciones' : location}</div></CardHeader>
            <CardContent className="px-0">
              {visibleRows.length ? <Table><TableHeader><TableRow className="bg-muted/35"><TableHead className="pl-4">Agencia</TableHead><TableHead>Proveedor</TableHead><TableHead className="hidden md:table-cell">Ubicación</TableHead><TableHead className="hidden lg:table-cell">Supervisor</TableHead><TableHead>Avance</TableHead><TableHead className="hidden xl:table-cell">Fechas</TableHead><TableHead className="pr-4">Estado</TableHead></TableRow></TableHeader><TableBody>
                {visibleRows.map((record) => <TableRow key={record.id}><TableCell className="max-w-[300px] whitespace-normal pl-4 font-medium"><span className="line-clamp-2">{record.agency}</span><span className="mt-0.5 block text-[11px] font-normal text-muted-foreground md:hidden">{record.district}</span></TableCell><TableCell><Badge variant="outline" className="bg-background text-[10px]">{record.provider}</Badge></TableCell><TableCell className="hidden md:table-cell"><p className="text-sm">{record.district || '—'}</p><p className="text-[11px] text-muted-foreground">{record.location}</p></TableCell><TableCell className="hidden text-muted-foreground lg:table-cell">{record.supervisor || '—'}</TableCell><TableCell><div className="flex min-w-24 items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${record.progress}%` }} /></div><span className="w-8 text-right text-xs font-semibold tabular-nums">{record.progress}%</span></div></TableCell><TableCell className="hidden xl:table-cell"><p className="text-xs">{formatDate(record.startDate)}</p><p className="mt-0.5 text-[11px] text-muted-foreground">hasta {formatDate(record.endDate)}</p></TableCell><TableCell className="pr-4"><StatusBadge status={record.status} /></TableCell></TableRow>)}
              </TableBody></Table> : <div className="grid min-h-64 place-items-center px-6 text-center"><div><Search className="mx-auto mb-3 size-8 text-muted-foreground/60" /><p className="font-medium">No hay agencias que coincidan</p><p className="mt-1 text-sm text-muted-foreground">Prueba con otros filtros o limpia la búsqueda.</p><Button variant="outline" className="mt-4" onClick={resetFilters}><RotateCcw />Limpiar filtros</Button></div></div>}
            </CardContent>
            <div className="flex flex-col gap-3 border-t bg-muted/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">Mostrando {visibleRows.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}</p><div className="flex items-center gap-2"><Button variant="outline" size="sm" aria-label="Página anterior" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft /></Button><span className="min-w-20 text-center text-xs font-medium">Página {page} de {totalPages}</span><Button variant="outline" size="sm" aria-label="Página siguiente" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}><ChevronRight /></Button></div></div>
          </Card>
        </section>
        <footer className="mt-5 flex flex-col gap-1 pb-2 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><p>Datos extraídos de la hoja CRONOGRAMA. El Excel original no fue modificado.</p><p>{snapshot.records.filter((record) => record.provider === 'PROSEGUR').length} PROSEGUR · {snapshot.records.filter((record) => record.provider === 'DOMINION').length} DOMINION</p></footer>
      </div>
    </main>
  );
}
