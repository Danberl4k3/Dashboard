'use client';

import { ArrowUpRight, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import type { ProgressVisitAlert } from '@/lib/dashboard/milestones';
import type { WorkRecord } from '@/lib/dashboard/types';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';

function VisitGroup({
  kind,
  milestones,
  onSelect,
}: {
  kind: ProgressVisitAlert['kind'];
  milestones: ProgressVisitAlert[];
  onSelect: (record: WorkRecord) => void;
}) {
  const [visitFilter, setVisitFilter] = useState<
    'all' | 'checked' | 'unchecked'
  >('all');
  const [crossingFilter, setCrossingFilter] = useState<'all' | 'first'>('all');
  const isFinal = kind === 'final';
  const title = isFinal ? 'Visitas finales' : 'Visitas intermedias';
  const visitLabel = isFinal ? 'Visita 3' : 'Visita 2';
  const pendingVisits = milestones.filter(
    ({ record }) => !(isFinal ? record.visit3 : record.visit2).checked,
  ).length;
  const visibleMilestones = milestones.filter(({ record, isFirstCrossing }) => {
    const checked = (isFinal ? record.visit3 : record.visit2).checked;
    return (
      (visitFilter === 'all' || checked === (visitFilter === 'checked')) &&
      (crossingFilter === 'all' || isFirstCrossing)
    );
  });

  return (
    <section className="mt-5" aria-label={title}>
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {isFinal
            ? 'Agencias terminadas o con 100% de avance. Control de cierre: Visita 3.'
            : 'Solo agencias Prosegur en proceso con avance menor al 100% que alcanzan su umbral: Lima 48%, provincia 35% y Esparta 2 85%. Control: Visita 2.'}
        </p>
        <p className="mt-3 text-sm font-medium" aria-live="polite">
          {milestones.length} {milestones.length === 1 ? 'agencia' : 'agencias'}{' '}
          · {pendingVisits} pendientes · {milestones.length - pendingVisits}{' '}
          marcadas
        </p>
        <label className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span>Mostrar</span>
          <NativeSelect
            aria-label={`Filtrar ${title.toLowerCase()} por estado de marcado`}
            value={visitFilter}
            onChange={(event) =>
              setVisitFilter(event.target.value as typeof visitFilter)
            }
          >
            <NativeSelectOption value="all">Todas</NativeSelectOption>
            <NativeSelectOption value="checked">Marcadas</NativeSelectOption>
            <NativeSelectOption value="unchecked">
              No marcadas
            </NativeSelectOption>
          </NativeSelect>
          <span className="text-muted-foreground">
            {visibleMilestones.length} mostradas
          </span>
        </label>
        <label
          htmlFor={`crossing-filter-${kind}`}
          className="mt-3 flex flex-wrap items-center gap-2 text-sm"
        >
          <span>Cruce del umbral</span>
          <NativeSelect
            id={`crossing-filter-${kind}`}
            aria-label={`Filtrar ${title.toLowerCase()} por primer cruce`}
            value={crossingFilter}
            onChange={(event) =>
              setCrossingFilter(event.target.value as typeof crossingFilter)
            }
          >
            <NativeSelectOption value="all">
              Todas las alertas
            </NativeSelectOption>
            <NativeSelectOption value="first">
              Primer cruce en el último reporte
            </NativeSelectOption>
          </NativeSelect>
        </label>
        <p className="mt-2 text-xs text-muted-foreground">
          Primer cruce: alcanzó el umbral en el último reporte de su proyecto o
          después, con un reporte previo por debajo y sin cruces anteriores. Las
          sedes sin historial suficiente se muestran en Todas las alertas.
        </p>
      </div>
      {visibleMilestones.length ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleMilestones.map(({ record, threshold }) => {
            const checked = (isFinal ? record.visit3 : record.visit2).checked;
            return (
              <button
                key={`${record.projectId}-${record.id}-${record.agency}`}
                type="button"
                onClick={() => onSelect(record)}
                className="group rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Ver historial de ${record.agency}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold break-words">{record.agency}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {record.projectLabel} · {record.provider}
                    </p>
                  </div>
                  <ArrowUpRight
                    className="size-4 shrink-0 text-blue-600"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-xs text-muted-foreground">
                    {isFinal ? record.status : `Umbral ${threshold}%`}
                  </span>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-mono font-semibold tabular-nums text-emerald-800">
                    Avance{' '}
                    {record.progress === null
                      ? 'sin reporte'
                      : `${record.progress}%`}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {visitLabel}: {checked ? 'marcada' : 'sin marcar'}
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium">
            {milestones.length === 0
              ? isFinal
                ? 'No hay agencias listas para visita final en la selección actual.'
                : 'No hay agencias listas para visita intermedia en la selección actual.'
              : 'No hay visitas que coincidan con los filtros de marcado y cruce del umbral.'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Prueba otros filtros o espera la próxima actualización de datos.
          </p>
        </div>
      )}
    </section>
  );
}

export function ProgressMilestones({
  milestones,
  onSelect,
}: {
  milestones: ProgressVisitAlert[];
  onSelect: (record: WorkRecord) => void;
}) {
  return (
    <section
      id="alertas-avance"
      className="mt-3 scroll-mt-28"
      aria-label="Alertas de visitas por agencia"
    >
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 sm:p-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700">
          <TrendingUp className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Visitas intermedias y finales
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta por separado las visitas por avance y las visitas de cierre
            en la selección actual.
          </p>
        </div>
      </div>
      {(['intermediate', 'final'] as const).map((kind) => (
        <VisitGroup
          key={kind}
          kind={kind}
          milestones={milestones.filter((milestone) => milestone.kind === kind)}
          onSelect={onSelect}
        />
      ))}
    </section>
  );
}
