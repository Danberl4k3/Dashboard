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
  if (!projectStatuses || projectStatuses.length === 0) {
    return null;
  }

  const overallMessage =
    status && status !== 'live' ? overallStatusMessages[status] : null;

  return (
    <div className="border-border bg-muted rounded p-3 text-xs">
      {overallMessage ? <p>{overallMessage}</p> : null}
      <ul>
        {projectStatuses.map((project) => (
          <li key={project.projectId}>
            <span>{project.label}</span>
            <span> </span>
            <span>{projectStatusLabels[project.status]}</span>
            <span> </span>
            <time dateTime={project.updatedAt ?? undefined}>
              {project.updatedAt}
            </time>
          </li>
        ))}
      </ul>
    </div>
  );
}
