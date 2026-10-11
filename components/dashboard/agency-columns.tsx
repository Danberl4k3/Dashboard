'use client';

import { recordAttention } from '@/lib/dashboard/tools';
import { useCallback, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  FilterX,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { ProgressHistoryRecord, WorkRecord } from '@/lib/dashboard/types';

interface AgencyColumnsProps {
  records: WorkRecord[];
  referenceDate: string;
  history?: ProgressHistoryRecord[];
  prefersReducedMotion?: boolean;
  onSelectRecord?: (record: WorkRecord) => void;
}

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
    styles[provider.trim().toUpperCase()] ??
    'border-slate-200 bg-slate-50 text-slate-700'
  );
}

export function AgencyColumns({ records, referenceDate }: AgencyColumnsProps) {
  const [mobileColumn, setMobileColumn] = useState('progress');
  const isAgencyAtRisk = (record: WorkRecord) =>
    recordAttention(record, referenceDate) === 'late';
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrado local por texto
  const filterList = useCallback(
    (list: WorkRecord[]) => {
      if (!searchTerm.trim()) return list;
      const term = searchTerm.toLowerCase().trim();
      return list.filter(
        (r) =>
          r.agency.toLowerCase().includes(term) ||
          r.district.toLowerCase().includes(term) ||
          r.provider.toLowerCase().includes(term) ||
          r.location.toLowerCase().includes(term),
      );
    },
    [searchTerm],
  );

  const terminadas = useMemo(
    () => records.filter((r) => r.status === 'Terminada'),
    [records],
  );

  const enProceso = useMemo(
    () => records.filter((r) => r.status === 'En proceso'),
    [records],
  );

  const noTerminadas = useMemo(
    () =>
      records.filter(
        (r) => r.status === 'No empezada' || r.status === 'Sin reporte',
      ),
    [records],
  );

  const filteredTerminadas = useMemo(
    () => filterList(terminadas),
    [filterList, terminadas],
  );
  const filteredEnProceso = useMemo(
    () => filterList(enProceso),
    [filterList, enProceso],
  );
  const filteredNoTerminadas = useMemo(
    () => filterList(noTerminadas),
    [filterList, noTerminadas],
  );

  const avgEnProceso = useMemo(() => {
    if (!enProceso.length) return 0;
    const total = enProceso.reduce((sum, r) => sum + (r.progress ?? 0), 0);
    return Math.round(total / enProceso.length);
  }, [enProceso]);

  return (
    <div className="space-y-3">
      {/* Barra superior de control y filtro rápido */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-foreground">
            Clasificación de agencias ({records.length}):
          </span>
          <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-medium"
          >
            {terminadas.length} Terminadas
          </Badge>
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-800 text-[11px] font-medium"
          >
            {enProceso.length} En proceso ({avgEnProceso}% prom.)
          </Badge>
          <Badge
            variant="outline"
            className="border-slate-200 bg-slate-50 text-slate-700 text-[11px] font-medium"
          >
            {noTerminadas.length} No terminadas
          </Badge>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar en el tablero de agencias"
            placeholder="Filtrar nombres de agencias..."
            className="h-8 pl-8 text-xs bg-background"
          />
          {searchTerm && (
            <button
              type="button"
              aria-label="Limpiar búsqueda del tablero"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div
        className="flex gap-2 overflow-x-auto pb-1 lg:hidden"
        role="group"
        aria-label="Estado del tablero"
      >
        {[
          {
            key: 'completed',
            label: 'Terminadas',
            count: filteredTerminadas.length,
          },
          {
            key: 'progress',
            label: 'En proceso',
            count: filteredEnProceso.length,
          },
          {
            key: 'pending',
            label: 'Pendientes',
            count: filteredNoTerminadas.length,
          },
        ].map((item) => (
          <button
            className="scope-chip shrink-0"
            key={item.key}
            type="button"
            aria-pressed={mobileColumn === item.key}
            onClick={() => setMobileColumn(item.key)}
          >
            {item.label}
            <span>{item.count}</span>
          </button>
        ))}
      </div>
      {/* 3 Columnas enfocadas en los nombres */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ==================== COLUMNA 1: TERMINADAS ==================== */}
        <div
          className={`${mobileColumn === 'completed' ? 'flex' : 'hidden'} lg:flex flex-col rounded-lg border border-emerald-200 bg-card shadow-xs overflow-hidden`}
        >
          {/* Header */}
          <div className="border-b border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-950">
                Terminadas
              </h3>
            </div>
            <span className="rounded-full bg-emerald-200/70 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-800">
              {filteredTerminadas.length}
            </span>
          </div>

          {/* Tabla / Lista de Nombres */}
          <div className="flex-1 divide-y divide-border/60 lg:max-h-[560px] lg:overflow-y-auto">
            {filteredTerminadas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <FilterX className="size-5 text-muted-foreground/60 mb-1" />
                <p className="text-xs">No hay agencias terminadas</p>
              </div>
            ) : (
              filteredTerminadas.map((record, index) => (
                <div
                  key={`${record.projectId}-${record.id}-${record.agency}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-xs transition-colors hover:bg-emerald-50/40"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="w-5 shrink-0 text-right font-mono text-[10px] text-muted-foreground/70">
                      {index + 1}.
                    </span>
                    <span
                      className="font-medium text-foreground truncate"
                      title={record.agency}
                    >
                      {record.agency}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 font-medium ${providerBadgeClass(record.provider)}`}
                    >
                      {record.provider}
                    </Badge>
                    <span className="inline-flex items-center gap-0.5 rounded-sm bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                      100%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ==================== COLUMNA 2: EN PROCESO (CON PORCENTAJE) ==================== */}
        <div
          className={`${mobileColumn === 'progress' ? 'flex' : 'hidden'} lg:flex flex-col rounded-lg border border-amber-200 bg-card shadow-xs overflow-hidden`}
        >
          {/* Header */}
          <div className="border-b border-amber-200 bg-amber-50/80 px-3.5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-amber-600" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-950">
                En proceso
              </h3>
            </div>
            <span className="rounded-full bg-amber-200/70 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-800">
              {filteredEnProceso.length}
            </span>
          </div>

          {/* Tabla / Lista de Nombres con Porcentaje */}
          <div className="flex-1 divide-y divide-border/60 lg:max-h-[560px] lg:overflow-y-auto">
            {filteredEnProceso.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <FilterX className="size-5 text-muted-foreground/60 mb-1" />
                <p className="text-xs">No hay agencias en proceso</p>
              </div>
            ) : (
              filteredEnProceso.map((record, index) => {
                const progressVal = record.progress ?? 0;
                const isAtRisk = isAgencyAtRisk(record);
                return (
                  <div
                    key={`${record.projectId}-${record.id}-${record.agency}`}
                    className="flex flex-col gap-1 px-3 py-2 text-xs transition-colors hover:bg-amber-50/40"
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-5 shrink-0 text-right font-mono text-[10px] text-muted-foreground/70">
                          {index + 1}.
                        </span>
                        {isAtRisk && (
                          <AlertTriangle
                            className="size-3 text-rose-500 shrink-0"
                            aria-label="Agencia en riesgo"
                          />
                        )}
                        <span
                          className="font-medium text-foreground truncate"
                          title={record.agency}
                        >
                          {record.agency}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 font-medium ${providerBadgeClass(record.provider)}`}
                        >
                          {record.provider}
                        </Badge>
                        <span className="inline-flex min-w-11 items-center justify-center rounded-sm bg-amber-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-900">
                          {progressVal}%
                        </span>
                      </div>
                    </div>
                    {/* Barra de progreso sutil y compacta */}
                    <div className="ml-7 mr-1 h-1 overflow-hidden rounded-full bg-muted/80">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(0, progressVal))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ==================== COLUMNA 3: NO TERMINADAS ==================== */}
        <div
          className={`${mobileColumn === 'pending' ? 'flex' : 'hidden'} lg:flex flex-col rounded-lg border border-slate-200 bg-card shadow-xs overflow-hidden`}
        >
          {/* Header */}
          <div className="border-b border-slate-200 bg-slate-100/80 px-3.5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-slate-600" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                No terminadas
              </h3>
            </div>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
              {filteredNoTerminadas.length}
            </span>
          </div>

          {/* Tabla / Lista de Nombres */}
          <div className="flex-1 divide-y divide-border/60 lg:max-h-[560px] lg:overflow-y-auto">
            {filteredNoTerminadas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <FilterX className="size-5 text-muted-foreground/60 mb-1" />
                <p className="text-xs">No hay agencias pendientes</p>
              </div>
            ) : (
              filteredNoTerminadas.map((record, index) => {
                const isAtRisk = isAgencyAtRisk(record);
                const isUnreported = record.status === 'Sin reporte';
                return (
                  <div
                    key={`${record.projectId}-${record.id}-${record.agency}`}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-xs transition-colors hover:bg-slate-50/60"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-5 shrink-0 text-right font-mono text-[10px] text-muted-foreground/70">
                        {index + 1}.
                      </span>
                      {isAtRisk && (
                        <AlertTriangle
                          className="size-3 text-rose-500 shrink-0"
                          aria-label="Retrasada en inicio"
                        />
                      )}
                      <span
                        className="font-medium text-foreground truncate"
                        title={record.agency}
                      >
                        {record.agency}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 font-medium ${providerBadgeClass(record.provider)}`}
                      >
                        {record.provider}
                      </Badge>
                      <span
                        className={`inline-flex rounded-sm px-1.5 py-0.5 text-[9px] font-medium border ${
                          isUnreported
                            ? 'border-slate-200 bg-slate-100 text-slate-600'
                            : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}
                      >
                        {record.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
