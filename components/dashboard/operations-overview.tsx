'use client';

import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCheck,
  CircleAlert,
  Layers3,
  TrendingUp,
} from 'lucide-react';
import type { WorkRecord } from '@/lib/dashboard/types';
import { recordAttention } from '@/lib/dashboard/tools';
import type { DashboardTab } from './dashboard-navigation';
const agendaMonth = new Intl.DateTimeFormat('es-PE', {
  month: 'short',
  timeZone: 'UTC',
});

export function OperationsOverview({
  records,
  referenceDate,
  onNavigate,
  onSelect,
}: {
  records: WorkRecord[];
  referenceDate: string;
  onNavigate: (tab: DashboardTab) => void;
  onSelect: (record: WorkRecord) => void;
}) {
  const reported = records.filter((record) => record.progress !== null);
  const completed = records.filter(
    (record) => record.status === 'Terminada',
  ).length;
  const attention = records.filter((record) =>
    recordAttention(record, referenceDate),
  );
  const providers = [
    ...new Set(records.map((record) => record.provider.trim().toUpperCase())),
  ]
    .map((name) => {
      const items = records.filter(
        (record) => record.provider.trim().toUpperCase() === name,
      );
      const values = items.filter((record) => record.progress !== null);
      return {
        name: name || 'Sin proveedor',
        count: items.length,
        average: values.length
          ? Math.round(
              values.reduce((sum, record) => sum + record.progress!, 0) /
                values.length,
            )
          : null,
      };
    })
    .sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
  const upcoming = records
    .filter(
      (record) =>
        record.status !== 'Terminada' &&
        record.endDate &&
        record.endDate >= referenceDate,
    )
    .sort((a, b) => a.endDate!.localeCompare(b.endDate!))
    .slice(0, 4);

  return (
    <div className="overview-layout">
      <section className="overview-health">
        <div className="section-eyebrow">
          <Layers3 size={15} /> PULSO DEL PORTAFOLIO
        </div>
        <h2>Cada agencia cuenta.</h2>
        <p>Una lectura rápida del alcance que tienes seleccionado.</p>
        <div
          className="health-track"
          aria-label={`${completed} de ${records.length} agencias terminadas`}
        >
          <span
            style={{
              width: `${records.length ? (completed / records.length) * 100 : 0}%`,
            }}
          />
        </div>
        <div className="health-caption">
          <strong>{completed} terminadas</strong>
          <span>{records.length} agencias en alcance</span>
        </div>
        <div className="health-facts">
          <div>
            <CheckCheck />
            <strong>
              {records.length
                ? Math.round((reported.length / records.length) * 100)
                : 0}
              %
            </strong>
            <span>con avance reportado</span>
          </div>
          <div>
            <CircleAlert />
            <strong>{attention.length}</strong>
            <span>requieren atención</span>
          </div>
        </div>
        <button
          type="button"
          className="overview-link"
          onClick={() => onNavigate('prioridades')}
        >
          Revisar prioridades <ArrowRight size={16} />
        </button>
      </section>

      <section className="overview-providers">
        <div className="overview-section-heading">
          <div>
            <div className="section-eyebrow">
              <TrendingUp size={15} /> RENDIMIENTO
            </div>
            <h2>Avance por proveedor</h2>
          </div>
          <span className="overview-count">{providers.length}</span>
        </div>
        <p>Promedio de agencias con avance reportado.</p>
        {providers.length ? (
          <div className="provider-ranking">
            {providers.map((provider, index) => (
              <div
                className="provider-rank"
                key={provider.name}
                style={
                  {
                    '--item-delay': `${Math.min(index, 8) * 55}ms`,
                  } as React.CSSProperties
                }
              >
                <span className="rank-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="rank-detail">
                  <div>
                    <strong>{provider.name}</strong>
                    <span>{provider.count} agencias</span>
                  </div>
                  <div className="rank-track">
                    <span style={{ width: `${provider.average ?? 0}%` }} />
                  </div>
                </div>
                <strong className="rank-value">
                  {provider.average === null ? '—' : `${provider.average}%`}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="overview-empty">
            No hay proveedores en esta selección.
          </p>
        )}
      </section>

      <section className="overview-deadlines">
        <div className="overview-section-heading">
          <div>
            <div className="section-eyebrow">
              <CalendarDays size={15} /> AGENDA
            </div>
            <h2>Próximos cierres</h2>
          </div>
          <button
            type="button"
            className="overview-link"
            onClick={() => onNavigate('tabla-detalle')}
          >
            Ver detalle <ArrowRight size={16} />
          </button>
        </div>
        <p>
          Fechas programadas desde el corte de datos:{' '}
          {referenceDate || 'sin fecha'}.
        </p>
        {upcoming.length ? (
          <div className="deadline-list">
            {upcoming.map((record) => (
              <button
                type="button"
                className="deadline-item"
                onClick={() => onSelect(record)}
                key={`${record.projectId}-${record.id}-${record.agency}`}
              >
                <span className="deadline-date">
                  <strong>{record.endDate!.slice(8)}</strong>
                  <span>
                    {agendaMonth.format(
                      new Date(`${record.endDate}T00:00:00Z`),
                    )}{' '}
                    {record.endDate!.slice(0, 4)}
                  </span>
                </span>
                <span className="deadline-agency">
                  <strong>{record.agency}</strong>
                  <span>
                    {record.projectLabel} · {record.provider}
                  </span>
                </span>
                <span className="deadline-progress">
                  {record.progress === null
                    ? 'Sin reporte'
                    : `${record.progress}%`}
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        ) : (
          <div className="overview-empty">
            <CalendarDays />
            <p>No hay cierres futuros en esta selección.</p>
            <button
              type="button"
              className="overview-link"
              onClick={() => onNavigate('prioridades')}
            >
              Consultar prioridades <ArrowRight size={16} />
            </button>
          </div>
        )}
      </section>

      <button
        type="button"
        className="overview-explore"
        onClick={() => onNavigate('agencias')}
      >
        <span className="explore-icon">
          <Building2 />
        </span>
        <span>
          <span className="section-eyebrow">DEL PANORAMA AL DETALLE</span>
          <strong>Explora tus agencias</strong>
          <span>Un tablero para cada estado de ejecución.</span>
        </span>
        <ArrowRight />
      </button>
    </div>
  );
}
