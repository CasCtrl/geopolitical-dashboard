import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { RiskMethodologyModal } from './RiskMethodologyModal';

interface RiskLegendProps {
  compact?: boolean;
  showTitle?: boolean;
}

export function RiskLegend({ compact = false, showTitle = true }: RiskLegendProps) {
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const levels = [
    { label: 'Low', className: 'bg-green-500', range: '0-25' },
    { label: 'Medium', className: 'bg-yellow-500', range: '26-50' },
    { label: 'High', className: 'bg-orange-500', range: '51-74' },
    { label: 'Critical', className: 'bg-red-500', range: '75-100' },
    { label: 'No stocks', className: 'bg-zinc-700', range: 'N/A' },
  ];

  return (
    <>
      <div className={`rounded border border-zinc-800 bg-zinc-900/60 ${compact ? 'p-2' : 'p-3'}`}>
        {showTitle && (
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-zinc-200">Risk Score Legend (0-100)</h3>
            <button
              type="button"
              onClick={() => setMethodologyOpen(true)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              aria-label="View risk score methodology"
            >
              <BookOpen className="size-3" />
              Methodology
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {levels.map((level) => (
            <div key={level.label} className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${level.className}`} />
              <span className="text-[10px] text-zinc-300">{level.label}</span>
              <span className="text-[10px] text-zinc-500 ml-auto">{level.range}</span>
            </div>
          ))}
        </div>
      </div>
      <RiskMethodologyModal open={methodologyOpen} onClose={() => setMethodologyOpen(false)} />
    </>
  );
}
