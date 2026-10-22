'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Layers3,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import type { DashboardSnapshot } from '@/lib/dashboard/types';
import { formatLimaTimestamp } from '@/lib/dashboard/format';
import { dashboardTabs, type DashboardTab } from './dashboard-navigation';

export function useWideDashboard() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1180px)');
    const update = () => setWide(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return wide;
}

export function DashboardSidebar({
  snapshot,
  milestoneCount,
  priorityCount,
  isRefreshing,
}: {
  snapshot: DashboardSnapshot;
  milestoneCount: number;
  priorityCount: number;
  isRefreshing: boolean;
}) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-brand">
        <span className="dashboard-brand-icon">
          <Activity aria-hidden="true" />
        </span>
        <div>
          <strong>
            Control de
            <br className="desktop-only" /> implementación
          </strong>
          <span>PORTAFOLIO OPERATIVO</span>
        </div>
      </div>
      <p className="nav-caption">ESPACIO DE TRABAJO</p>
      <TabsList className="workspace-tabs" aria-label="Secciones del dashboard">
        {dashboardTabs.map(({ id, label, icon: Icon }) => {
          const count =
            id === 'alertas-avance'
              ? milestoneCount
              : id === 'prioridades'
                ? priorityCount
                : 0;
          return (
            <TabsTrigger
              key={id}
              value={id}
              id={`tab-${id}`}
              className="workspace-tab"
            >
              <Icon className="size-4" aria-hidden="true" />
              <span>{label}</span>
              {count > 0 && (
                <span
                  className={`tab-count ${id === 'prioridades' ? 'count-warning' : ''}`}
                >
                  {count}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
      <div className="sidebar-foot">
        <div className="sidebar-scope">
          <Layers3 size={17} aria-hidden="true" />
          <div>
            <strong>{snapshot.projects.length} proyectos en seguimiento</strong>
            <span>{snapshot.records.length} agencias en el portafolio</span>
          </div>
        </div>
        <div className="sidebar-assurance">
          <ShieldCheck size={14} aria-hidden="true" />
          <span>Consulta de datos · Solo lectura</span>
        </div>
      </div>
      {isRefreshing && (
        <>
          <div className="refresh-track" aria-hidden="true">
            <span className="refresh-thumb" />
          </div>
          <output className="sr-only" aria-live="polite">
            Actualizando datos del dashboard
          </output>
        </>
      )}
    </header>
  );
}

export function DashboardHeading({
  activeTab,
  snapshot,
  isRefreshing,
  refreshError,
  onRefresh,
  onExport,
  canExport,
}: {
  activeTab: DashboardTab;
  snapshot: DashboardSnapshot;
  isRefreshing: boolean;
  refreshError: string | null;
  onRefresh: () => void;
  onExport: () => void;
  canExport: boolean;
}) {
  const current = dashboardTabs.find((tab) => tab.id === activeTab)!;
  const sourceLabel = snapshot.isLive
    ? 'Fuente conectada'
    : snapshot.status === 'partial'
      ? 'Datos parciales'
      : 'Datos de respaldo';
  return (
    <>
      <div className="dashboard-topbar">
        <div className="workspace-breadcrumb">
          <Layers3 size={15} aria-hidden="true" />
          <span>Portafolio</span>
          <ChevronRight size={13} aria-hidden="true" />
          <strong>{current.label}</strong>
        </div>
        <span
          className={`connection-state ${snapshot.isLive ? 'is-live' : 'is-backup'}`}
        >
          <i aria-hidden="true" />
          {sourceLabel}
        </span>
      </div>
      <section
        className="page-heading"
        id="dashboard-page-heading"
        aria-label="Vista actual"
      >
        <div>
          <p className="section-eyebrow">
            CONTROL OPERATIVO <span aria-hidden="true">/</span>{' '}
            {activeTab === 'resumen'
              ? 'VISIÓN GENERAL'
              : current.label.toUpperCase()}
          </p>
          <h1>
            {activeTab === 'resumen'
              ? 'Resumen del portafolio'
              : current.label === 'Detalle'
                ? 'Detalle de agencias'
                : current.label}
          </h1>
          <p>{current.description}</p>
        </div>
        <div className="heading-actions">
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label={
              isRefreshing ? 'Actualizando datos' : 'Actualizar datos ahora'
            }
          >
            <RefreshCw
              className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {isRefreshing ? 'Actualizando…' : 'Actualizar'}
          </Button>
          <Button
            onClick={onExport}
            disabled={!canExport}
            className="export-button"
          >
            <Download className="size-4" aria-hidden="true" />
            Exportar CSV
            <ArrowUpRight
              className="size-3.5 export-arrow"
              aria-hidden="true"
            />
          </Button>
        </div>
      </section>
      <div className="snapshot-meta">
        <FileSpreadsheet size={14} aria-hidden="true" />
        <span>{snapshot.source}</span>
        <span className="meta-divider" aria-hidden="true" />
        <span>
          Último corte{' '}
          <time dateTime={snapshot.extractedAt}>
            {formatLimaTimestamp(snapshot.extractedAt)}
          </time>
        </span>
        <span className="refresh-cadence">Actualización automática · 90 s</span>
      </div>
      {refreshError && (
        <p className="refresh-error" role="alert">
          {refreshError}
        </p>
      )}
    </>
  );
}
