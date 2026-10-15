'use client';

import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  Layers3,
  Milestone,
  TrendingUp,
} from 'lucide-react';
import type { WorkRecord } from '@/lib/dashboard/types';
import { recordAttention } from '@/lib/dashboard/tools';
import type { DashboardTab } from './dashboard-navigation';

const agendaMonth = new Intl.DateTimeFormat('es-PE', {
  month: 'short',
  timeZone: 'UTC',
});
function reportedAverage(records: WorkRecord[]) {
  const values = records.filter((record) => record.progress !== null);
  return values.length
    ? Math.round(
        values.reduce((sum, record) => sum + record.progress!, 0) /
          values.length,
      )
    : null;
}

export function OperationsOverview({
  records,
  referenceDate,
  onNavigate,
  onSelect,
  onProject,
  onProvider,
  milestonesCount,
}: {
  records: WorkRecord[];
  referenceDate: string;
  onNavigate: (tab: DashboardTab) => void;
  onSelect: (record: WorkRecord) => void;
  onProject: (id: string) => void;
  onProvider: (name: string) => void;
  milestonesCount: number;
}) {
  const completed = records.filter(
    (record) => record.status === 'Terminada',
  ).length;
  const inProgress = records.filter(
    (record) => record.status === 'En proceso',
  ).length;
  const pending = records.filter(
    (record) => record.status === 'No empezada',
  ).length;
  const unreported = records.filter(
    (record) => record.status === 'Sin reporte',
  ).length;
  const attention = records.filter((record) =>
    recordAttention(record, referenceDate),
  );
  const projects = [...new Set(records.map((record) => record.projectId))].map(
    (id) => {
      const items = records.filter((record) => record.projectId === id);
      return {
        id,
        name: items[0].projectLabel,
        count: items.length,
        average: reportedAverage(items),
      };
    },
  );
  const providers = [
    ...new Set(records.map((record) => record.provider.trim().toUpperCase())),
  ]
    .map((name) => {
      const items = records.filter(
        (record) => record.provider.trim().toUpperCase() === name,
      );
      return { name, count: items.length, average: reportedAverage(items) };
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
  const states = [
    { label: 'Terminadas', count: completed, color: '#059669' },
    { label: 'En proceso', count: inProgress, color: '#e9a23b' },
    { label: 'No empezadas', count: pending, color: '#cbd5e1' },
    { label: 'Sin reporte', count: unreported, color: '#64748b' },
  ];

  return (
    <div className="overview-layout">
      <section className="overview-health">
        <div className="overview-section-heading">
          <div>
            <span className="section-eyebrow">
              <Layers3 size={14} aria-hidden="true" />
              EJECUCIÓN
            </span>
            <h2>Estado del portafolio</h2>
          </div>
          <span className="section-tag">{records.length} agencias</span>
        </div>
        <p>Distribución del alcance seleccionado.</p>
        <div
          className="portfolio-distribution"
          role="img"
          aria-label={states
            .map((s) => `${s.count} ${s.label.toLowerCase()}`)
            .join(', ')}
        >
          {states.map((s) => (
            <span
              key={s.label}
              style={{
                width: `${records.length ? (s.count / records.length) * 100 : 0}%`,
                background: s.color,
              }}
            />
          ))}
        </div>
        <div className="distribution-legend">
          {states
            .filter((s) => s.count > 0)
            .map((s) => (
              <span key={s.label}>
                <i style={{ background: s.color }} aria-hidden="true" />
                {s.label}
                <strong>{s.count}</strong>
              </span>
            ))}
        </div>
        <div className="project-section-label">
          <h3>Avance por proyecto</h3>
          <span>Promedio reportado</span>
        </div>
        {projects.length ? (
          <div className="project-progress-list">
            {projects.map((project, index) => (
              <button
                type="button"
                className="project-progress-item"
                key={project.id}
                onClick={() => onProject(project.id)}
                aria-label={`Ver agencias de ${project.name}`}
              >
                <span className={`project-monogram project-color-${index % 2}`}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="project-progress-detail">
                  <span>
                    <strong>{project.name}</strong>
                    <span>{project.count} agencias</span>
                  </span>
                  <span className="rank-track">
                    <span style={{ width: `${project.average ?? 0}%` }} />
                  </span>
                </span>
                <strong className="rank-value">
                  {project.average === null ? '—' : `${project.average}%`}
                </strong>
                <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : (
          <p className="overview-empty">No hay proyectos en esta selección.</p>
        )}
        <button
          type="button"
          className="health-attention"
          onClick={() => onNavigate('prioridades')}
        >
          <CircleAlert size={16} aria-hidden="true" />
          <span>
            <strong>{attention.length} agencias</strong> requieren atención
          </span>
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      </section>

      <section className="overview-providers">
        <div className="overview-section-heading">
          <div>
            <span className="section-eyebrow">
              <TrendingUp size={14} aria-hidden="true" />
              RENDIMIENTO
            </span>
            <h2>Avance por proveedor</h2>
          </div>
          <span className="section-tag">{providers.length} proveedores</span>
        </div>
        <p>Selecciona un proveedor para consultar sus agencias.</p>
        {providers.length ? (
          <div className="provider-ranking">
            {providers.map((provider, index) => (
              <button
                type="button"
                className="provider-rank"
                key={provider.name}
                onClick={() => onProvider(provider.name)}
                aria-label={`Ver agencias de ${provider.name || 'sin proveedor'}`}
              >
                <span className="rank-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="rank-detail">
                  <span>
                    <strong>{provider.name || 'Sin proveedor'}</strong>
                    <span>{provider.count} agencias</span>
                  </span>
                  <span className="rank-track">
                    <span style={{ width: `${provider.average ?? 0}%` }} />
                  </span>
                </span>
                <strong className="rank-value">
                  {provider.average === null ? '—' : `${provider.average}%`}
                </strong>
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
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
            <span className="section-eyebrow">
              <CalendarDays size={14} aria-hidden="true" />
              CRONOGRAMA
            </span>
            <h2>Próximos cierres</h2>
          </div>
          <button
            type="button"
            className="overview-link"
            onClick={() => onNavigate('tabla-detalle')}
          >
            Ver detalle <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
        <p>Fechas de cierre pendientes desde el corte de datos.</p>
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
                <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : (
          <div className="overview-empty">
            <CalendarDays size={26} aria-hidden="true" />
            <p>No hay cierres futuros en esta selección.</p>
            <button
              type="button"
              className="overview-link"
              onClick={() => onNavigate('prioridades')}
            >
              Consultar prioridades <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        )}
      </section>

      <section className="overview-milestone">
        <span className="milestone-icon">
          <Milestone size={24} aria-hidden="true" />
        </span>
        <span className="section-eyebrow">UN PASO MÁS CERCA</span>
        <h2>
          El 50% marca
          <br />
          un nuevo comienzo.
        </h2>
        <p>
          {milestonesCount
            ? `${milestonesCount} ${milestonesCount === 1 ? 'agencia cruzó' : 'agencias cruzaron'} la mitad de su implementación en el último corte disponible.`
            : 'Aquí podrás ver las agencias que cruzan la mitad de su implementación en el último corte.'}
        </p>
        <button
          type="button"
          className="milestone-cta"
          onClick={() => onNavigate('hito-50')}
        >
          Explorar hitos {milestonesCount > 0 && <span>{milestonesCount}</span>}
          <ArrowUpRight size={17} aria-hidden="true" />
        </button>
        <span className="milestone-decoration" aria-hidden="true">
          50<span>%</span>
        </span>
      </section>
    </div>
  );
}
