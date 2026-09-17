import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import type { ProgressHistoryRecord } from '@/lib/dashboard/types';

export function AgencySparkline({
  history,
  prefersReducedMotion,
  width = 60,
  height = 24,
}: {
  history: ProgressHistoryRecord[];
  prefersReducedMotion: boolean;
  width?: number;
  height?: number;
}) {
  if (!history || history.length < 2) {
    return (
      <div 
        className="flex items-center justify-center text-[10px] text-muted-foreground" 
        style={{ width, height }}
        title="Sin historial suficiente"
      >
        --
      </div>
    );
  }

  const change = history[history.length - 1].progress - history[0].progress;
  const color = change >= 0 ? '#10b981' : '#f43f5e'; // emerald-500 or rose-500

  return (
    <div style={{ width, height }} title={`Tendencia: ${change >= 0 ? '+' : ''}${change}%`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history}>
          <YAxis domain={[0, 100]} hide />
          <Line
            type="monotone"
            dataKey="progress"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={!prefersReducedMotion}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

