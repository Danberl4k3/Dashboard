'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  Clock3,
  SearchX,
} from 'lucide-react';
import { attentionReason, recordAttention } from '@/lib/dashboard/tools';
import type { ProgressHistoryRecord, WorkRecord } from '@/lib/dashboard/types';

interface AgencyColumnsProps {
  records: WorkRecord[];
  referenceDate: string;
  history?: ProgressHistoryRecord[];
  prefersReducedMotion?: boolean;
  onSelectRecord?: (record: WorkRecord) => void;
}

export function AgencyColumns({
  records,
  referenceDate,
  onSelectRecord,
}: AgencyColumnsProps) {
  const groups = [
    {
      id: 'completed',
      label: 'Terminadas',
      description: 'Implementación completada',
      icon: CheckCircle2,
      records: records.filter((r) => r.status === 'Terminada'),
    },
    {
      id: 'progress',
      label: 'En proceso',
      description: 'Implementaciones en ejecución',
      icon: Clock3,
      records: records.filter((r) => r.status === 'En proceso'),
    },
    {
      id: 'pending',
      label: 'Pendientes',
      description: 'Por iniciar o sin reporte',
      icon: CircleDashed,
      records: records.filter(
        (r) => r.status === 'No empezada' || r.status === 'Sin reporte',
      ),
    },
  ];
  const [mobileColumn, setMobileColumn] = useState('progress');
  // A status filter should reveal its populated column on mobile.
  useEffect(() => {
    const counts = [
      records.filter((r) => r.status === 'Terminada').length,
      records.filter((r) => r.status === 'En proceso').length,
      records.filter(
        (r) => r.status === 'No empezada' || r.status === 'Sin reporte',
      ).length,
    ];
    const ids = ['completed', 'progress', 'pending'];
    const populated = counts
      .map((count, index) => (count > 0 ? ids[index] : null))
      .filter(Boolean);
    if (populated.length === 1) setMobileColumn(populated[0]!);
  }, [records]);

  return (
    <div className="agency-board">
      <div
        className="agency-board-tabs"
        role="group"
        aria-label="Estado del tablero"
      >
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            className="scope-chip"
            aria-pressed={mobileColumn === group.id}
            onClick={() => setMobileColumn(group.id)}
          >
            {group.label}
            <span>{group.records.length}</span>
          </button>
        ))}
      </div>
      <div className="agency-board-columns">
        {groups.map(
          ({ id, label, description, icon: Icon, records: items }) => (
            <section
              className={`agency-board-column board-${id} ${mobileColumn === id ? 'board-selected' : ''}`}
              key={id}
              aria-label={`${label}: ${items.length} agencias`}
            >
              <div className="agency-column-heading">
                <span>
                  <Icon size={17} aria-hidden="true" />
                  <h3>{label}</h3>
                </span>
                <strong>{items.length}</strong>
              </div>
              <p className="agency-column-description">{description}</p>
              <div className="agency-board-list">
                {items.length ? (
                  items.map((record) => {
                    const late =
                      recordAttention(record, referenceDate) === 'late';
                    return (
                      <button
                        key={`${record.projectId}-${record.id}-${record.agency}`}
                        type="button"
                        className="agency-row"
                        onClick={() => onSelectRecord?.(record)}
                        disabled={!onSelectRecord}
                        aria-label={`Ver detalle de ${record.agency}`}
                      >
                        <span className="agency-row-top">
                          <strong className="agency-name">
                            {record.agency}
                          </strong>
                          <ArrowUpRight size={14} aria-hidden="true" />
                        </span>
                        <span className="agency-row-meta">
                          {record.provider || 'Sin proveedor'}
                          <span aria-hidden="true">·</span>
                          {record.projectLabel}
                        </span>
                        <span className="agency-row-progress">
                          <span className="rank-track">
                            <span
                              style={{
                                width: `${Math.min(100, Math.max(0, record.progress ?? 0))}%`,
                              }}
                            />
                          </span>
                          <strong>
                            {record.progress === null
                              ? 'Sin reporte'
                              : `${record.progress}%`}
                          </strong>
                        </span>
                        {late && (
                          <span className="agency-risk">
                            <AlertTriangle size={11} aria-hidden="true" />
                            {attentionReason(record, referenceDate)}
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="agency-board-empty">
                    <SearchX size={23} aria-hidden="true" />
                    <p>No hay agencias en este estado.</p>
                    <span>Cambia de columna o ajusta los filtros.</span>
                  </div>
                )}
              </div>
            </section>
          ),
        )}
      </div>
    </div>
  );
}
