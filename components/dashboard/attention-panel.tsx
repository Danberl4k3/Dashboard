'use client';

import { AlertTriangle, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { attentionReason, recordAttention } from '@/lib/dashboard/tools';
import type { WorkRecord } from '@/lib/dashboard/types';
import { useState } from 'react';

export function AttentionPanel({
  records,
  referenceDate,
  onSelect,
  expanded = false,
}: {
  records: WorkRecord[];
  referenceDate: string;
  onSelect: (record: WorkRecord) => void;
  expanded?: boolean;
}) {
  const [visibleCount, setVisibleCount] = useState(12);
  const priorityRecords = records
    .filter((record) => recordAttention(record, referenceDate) !== null)
    .sort((a, b) =>
      (a.endDate || a.startDate || '9999').localeCompare(
        b.endDate || b.startDate || '9999',
      ),
    );
  return (
    <section
      id="prioridades"
      className="attention-panel scroll-mt-28"
      aria-label="Prioridades operativas"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="attention-icon">
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">
              Prioridades del cronograma
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {priorityRecords.length} agencias con fechas vencidas o sin
              reporte en el resultado actual.
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          Al corte: {referenceDate || 'sin fecha válida'} · Lima
        </span>
      </div>
      {priorityRecords.length ? (
        <details className="mt-3" open={expanded || undefined}>
          <summary className="w-fit cursor-pointer text-xs font-semibold text-primary">
            Revisar{' '}
            {Math.min(expanded ? visibleCount : 4, priorityRecords.length)} de{' '}
            {priorityRecords.length} prioridades
          </summary>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {priorityRecords
              .slice(0, expanded ? visibleCount : 4)
              .map((record) => (
                <button
                  key={`${record.projectId}-${record.id}-${record.agency}`}
                  type="button"
                  onClick={() => onSelect(record)}
                  className="priority-record text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold break-words">
                      {record.agency}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {record.projectLabel} · {record.provider}
                    </p>
                    <p className="mt-1 text-xs text-amber-800">
                      {attentionReason(record, referenceDate)}
                      {recordAttention(record, referenceDate) === 'late'
                        ? ` · ${record.endDate && record.endDate < referenceDate ? record.endDate : record.startDate}`
                        : ''}
                    </p>
                  </div>
                  <ArrowUpRight
                    className="size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span className="sr-only">
                    Ver detalle de {record.agency}
                  </span>
                </button>
              ))}
          </div>
          {expanded && priorityRecords.length > visibleCount && (
            <button
              type="button"
              className="overview-link mt-4"
              onClick={() => setVisibleCount((count) => count + 12)}
            >
              Mostrar 12 más
            </button>
          )}
        </details>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle2 className="size-4" />
          Sin fechas vencidas ni reportes faltantes en esta selección.
        </p>
      )}
    </section>
  );
}
