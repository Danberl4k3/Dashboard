import type { WorkRecord } from '@/lib/dashboard/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'; // Wait, do we have Tooltip? Let me check if ui/tooltip exists.

// Let me use standard HTML titles if Tooltip is not available, but I'll write the stepper first.
export const stageDefinitions: Array<{
  key: keyof WorkRecord;
  label: string;
  color: string;
}> = [
  { key: 'newConduit', label: 'Canalizado', color: '#2563eb' },
  { key: 'newCabling', label: 'Cableado', color: '#0f766e' },
  { key: 'installation', label: 'Instalación', color: '#d97706' },
  { key: 'commissioning', label: 'Puesta en marcha', color: '#16a34a' },
  { key: 'dismantling', label: 'Desmontaje', color: '#e11d48' },
];

export function StageStepper({ record }: { record: WorkRecord }) {
  return (
    <div className="flex items-center gap-1.5" aria-label="Progreso por etapas">
      {stageDefinitions.map((stage, index) => {
        const value = (record[stage.key] as number) ?? 0;
        const isComplete = value === 100;
        const isStarted = value > 0;
        
        return (
          <div key={stage.key} className="flex items-center" title={`${stage.label}: ${value}%`}>
            {index > 0 && (
              <div 
                className="h-[2px] w-3" 
                style={{ 
                  backgroundColor: isStarted ? stage.color : '#e2e8f0',
                  opacity: isStarted ? 0.5 : 1
                }} 
              />
            )}
            <div
              className={`flex size-4 items-center justify-center rounded-full border-2 transition-colors`}
              style={{
                borderColor: isStarted ? stage.color : '#e2e8f0',
                backgroundColor: isComplete ? stage.color : 'transparent',
              }}
            >
              {isComplete && (
                <svg className="size-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

