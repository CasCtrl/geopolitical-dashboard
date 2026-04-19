interface RiskGaugeCompactProps {
  value: number;
  max?: number;
}

export function RiskGaugeCompact({ value, max = 100 }: RiskGaugeCompactProps) {
  const percentage = (value / max) * 100;
  const rotation = (percentage / 100) * 180 - 90;

  const getColor = (val: number) => {
    if (val >= 75) return "#dc2626"; // Critical - Red
    if (val >= 51) return "#ea580c"; // High - Orange
    if (val >= 26) return "#eab308"; // Medium - Yellow
    return "#16a34a"; // Low - Green
  };

  const color = getColor(value);

  return (
    <div className="relative w-full max-w-[140px] mx-auto">
      {/* Background arc */}
      <svg className="w-full h-auto overflow-visible" viewBox="0 0 200 100" style={{ display: 'block' }}>
        <path
          d="M 30 90 A 60 60 0 0 1 170 90"
          fill="none"
          stroke="#27272a"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Colored arc */}
        <path
          d="M 30 90 A 60 60 0 0 1 170 90"
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(percentage / 100) * 220} 220`}
        />
        {/* Needle */}
        <line
          x1="100"
          y1="90"
          x2="100"
          y2="40"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${rotation} 100 90)`}
          className="transition-transform duration-700 ease-out"
        />
        {/* Center dot */}
        <circle cx="100" cy="90" r="4" fill={color} />
        
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="25%" stopColor="#16a34a" />
            <stop offset="26%" stopColor="#eab308" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="51%" stopColor="#ea580c" />
            <stop offset="74%" stopColor="#ea580c" />
            <stop offset="75%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Value display - moved below */}
      <div className="text-center mt-1">
        <p className="text-xl md:text-2xl font-bold text-white tabular-nums">{value}</p>
        <p className="text-[10px] text-zinc-600 uppercase tracking-wide">Risk Score</p>
      </div>
    </div>
  );
}