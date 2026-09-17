import type { ProgressHistoryRecord, WorkRecord } from '@/lib/dashboard/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CircularProgress } from './circular-progress';
import { StageStepper } from './stage-stepper';
import { AgencySparkline } from './agency-sparkline';
import { MapPin, Calendar, User, AlertTriangle } from 'lucide-react';

function formatDate(date: string | null) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function StatusBadge({ status }: { status: WorkRecord['status'] }) {
  const styles =
    status === 'Terminada'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'En proceso'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : status === 'No empezada'
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-slate-200 bg-slate-50 text-slate-500';
  return (
    <span className={`inline-flex rounded-sm border px-2 py-0.5 text-[10px] font-medium ${styles}`}>
      {status}
    </span>
  );
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
  return styles[provider.trim().toUpperCase()] ?? 'border-slate-200 bg-slate-50';
}

export function AgencyCard({
  record,
  history,
  prefersReducedMotion,
  isAtRisk,
}: {
  record: WorkRecord;
  history: ProgressHistoryRecord[];
  prefersReducedMotion: boolean;
  isAtRisk: boolean;
}) {
  return (
    <Card className={`relative flex flex-col justify-between overflow-hidden transition-all ${isAtRisk ? 'border-rose-300 ring-1 ring-rose-200' : ''}`}>
      {isAtRisk && (
        <div className="absolute right-0 top-0 rounded-bl-lg bg-rose-100 p-1.5 text-rose-600" title="Agencia en riesgo (estancada o retrasada)">
          <AlertTriangle className="size-4" />
        </div>
      )}
      <CardContent className="p-4">
        <div className="mb-3 flex items-start gap-4">
          <div className="shrink-0">
            <CircularProgress value={record.progress ?? 0} prefersReducedMotion={prefersReducedMotion} size={52} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground" title={record.agency}>
              {record.agency}
            </h3>
            <p className="mt-1 truncate text-[11px] text-muted-foreground" title={record.projectLabel}>
              {record.projectLabel}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline" className={`text-[9px] font-medium ${providerBadgeClass(record.provider)}`}>
                {record.provider}
              </Badge>
              <StatusBadge status={record.status} />
            </div>
          </div>
        </div>

        <div className="mb-4 mt-2">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Avance por etapas</p>
          <StageStepper record={record} />
        </div>

        <div className="grid grid-cols-2 gap-y-2 border-t pt-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate" title={`${record.district} - ${record.location}`}>{record.district || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <User className="size-3 shrink-0" />
            <span className="truncate" title={record.supervisor || 'Sin supervisor'}>{record.supervisor?.split(' ')[0] || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Calendar className="size-3 shrink-0" />
            <span>{formatDate(record.startDate)} - {formatDate(record.endDate)}</span>
          </div>
          <div className="flex items-center justify-end gap-2 pr-1">
            <span className="text-[10px] uppercase">Tendencia</span>
            <AgencySparkline history={history} prefersReducedMotion={prefersReducedMotion} width={40} height={18} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

