export function RiskLegend() {
  const levels = [
    { label: "Very Low", color: "#84cc16", range: "0-20%" },
    { label: "Low", color: "#fbbf24", range: "20-40%" },
    { label: "Medium", color: "#f59e0b", range: "40-60%" },
    { label: "High", color: "#dc2626", range: "60-80%" },
    { label: "Very High", color: "#991b1b", range: "80-100%" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-sm font-semibold mb-3 text-slate-900">Risk Level</h3>
      <div className="space-y-2">
        {levels.map((level) => (
          <div key={level.label} className="flex items-center gap-3">
            <div
              className="w-8 h-4 rounded"
              style={{ backgroundColor: level.color }}
            />
            <span className="text-xs text-slate-700 flex-1">{level.label}</span>
            <span className="text-xs text-slate-500">{level.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
