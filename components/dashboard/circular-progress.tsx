import { useEffect, useState } from 'react';

export function progressColor(value: number) {
  if (value >= 100) return 'text-emerald-500';
  if (value >= 60) return 'text-blue-600';
  if (value > 0) return 'text-amber-500';
  return 'text-slate-300';
}

export function CircularProgress({
  value,
  prefersReducedMotion,
  size = 48,
  strokeWidth = 4,
}: {
  value: number;
  prefersReducedMotion: boolean;
  size?: number;
  strokeWidth?: number;
}) {
  const [renderedValue, setRenderedValue] = useState(0);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setRenderedValue(value);
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [prefersReducedMotion, value]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (renderedValue / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-slate-100"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`transition-[stroke-dashoffset] duration-700 ease-out ${progressColor(value)}`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-[10px] font-semibold tabular-nums leading-none">{value}%</span>
      </div>
    </div>
  );
}

