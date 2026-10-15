'use client';

import { ArrowUpRight, TrendingUp } from 'lucide-react';
import type { HalfwayMilestone } from '@/lib/dashboard/milestones';
import type { WorkRecord } from '@/lib/dashboard/types';

export function HalfwayMilestones({
  milestones,
  onSelect,
}: {
  milestones: HalfwayMilestone[];
  onSelect: (record: WorkRecord) => void;
}) {
  return (
    <section id="hito-50" className="mt-3 scroll-mt-28" aria-label="Agencias que acaban de alcanzar el 50 por ciento">
      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700">
            <TrendingUp className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Agencias que llegaron al 50%</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              En proceso, con un avance anterior menor a 50% y un avance de 50% o más en el último corte de historial de su proyecto.
            </p>
          </div>
        </div>
        <p className="mt-5 text-sm font-medium text-blue-900" aria-live="polite">
          {milestones.length} {milestones.length === 1 ? 'agencia alcanzó' : 'agencias alcanzaron'} este hito en la selección actual.
        </p>
      </div>

      {milestones.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {milestones.map(({ record, previous, latest }) => (
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
                  <p className="mt-1 text-xs text-muted-foreground">{record.projectLabel} · {record.provider}</p>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-blue-600" aria-hidden="true" />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-mono tabular-nums text-muted-foreground">{previous.progress}%</span>
                <span aria-hidden="true">→</span>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-mono font-semibold tabular-nums text-emerald-800">{latest.progress}%</span>
                <span className="text-xs text-muted-foreground">+{latest.progress - previous.progress} puntos</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Último corte: {latest.date} · Avance actual: {record.progress}%</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium">Ninguna agencia cruzó el 50% en el último corte disponible.</p>
          <p className="mt-1 text-xs text-muted-foreground">Prueba otros filtros o espera la próxima actualización de datos.</p>
        </div>
      )}
    </section>
  );
}
