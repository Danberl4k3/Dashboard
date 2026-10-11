import type { DashboardSnapshot, ProjectStatus } from '@/lib/dashboard/types';

interface DataSourceStatusProps {
  status?: DashboardSnapshot['status'];
  projectStatuses?: ProjectStatus[];
}

const overallStatusMessages: Record<
  Exclude<DashboardSnapshot['status'], 'live' | undefined>,
  string
> = {
  partial: 'Información parcial; algunos datos son anteriores.',
  stale: 'Falló actualización; datos guardados.',
  fallback: 'Se muestra copia local.',
};

const projectStatusLabels: Record<
  Exclude<ProjectStatus['status'], undefined>,
  string
> = {
  live: 'Actualizado',
  cached: 'Datos anteriores',
  fallback: 'Copia local',
};

export function DataSourceStatus({
  status,
  projectStatuses,
}: DataSourceStatusProps) {
  const overallMessage =
    status && status !== 'live' ? overallStatusMessages[status] : null;
  if (!overallMessage && !projectStatuses?.length) return null;

  return (
    <div
      className="mb-4 rounded-lg border border-border bg-card px-4 py-3 text-xs"
      role="status"
    >
      {overallMessage ? (
        <p className="mb-2 font-medium text-amber-800">{overallMessage}</p>
      ) : null}
      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {projectStatuses?.map((project) => (
          <li
            key={project.projectId}
            className="flex flex-wrap items-center gap-2"
          >
            <span
              className={`size-1.5 rounded-full ${project.status === 'live' ? 'bg-emerald-600' : 'bg-amber-600'}`}
              aria-hidden="true"
            />
            <span className="font-medium">{project.label}</span>
            <span className="text-muted-foreground">
              {projectStatusLabels[project.status]}
            </span>
            <time dateTime={project.updatedAt ?? undefined}>
              {project.updatedAt &&
              Number.isFinite(Date.parse(project.updatedAt))
                ? new Intl.DateTimeFormat('es-PE', {
                    timeZone: 'America/Lima',
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(project.updatedAt))
                : 'Sin fecha'}
            </time>
          </li>
        ))}
      </ul>
    </div>
  );
}
