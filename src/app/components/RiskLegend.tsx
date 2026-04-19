interface RiskLegendProps {
  compact?: boolean;
  showTitle?: boolean;
}

export function RiskLegend({ compact = false, showTitle = true }: RiskLegendProps) {
  const levels = [
    { label: 'Low', className: 'bg-green-500', range: '0-25' },
    { label: 'Medium', className: 'bg-yellow-500', range: '26-50' },
    { label: 'High', className: 'bg-orange-500', range: '51-74' },
    { label: 'Critical', className: 'bg-red-500', range: '75-100' },
  ];

  return (
    <div className={`rounded border border-zinc-800 bg-zinc-900/60 ${compact ? 'p-2' : 'p-3'}`}>
      {showTitle && <h3 className="text-xs font-semibold text-zinc-200 mb-2">Risk Score Legend (0-100)</h3>}
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
  );
}
