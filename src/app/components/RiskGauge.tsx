import { Card } from "./ui/card";

interface RiskGaugeProps {
  score: number;
  label: string;
}

export function RiskGauge({ score, label }: RiskGaugeProps) {
  const getRiskLevel = (score: number) => {
    if (score > 80) return { label: "Critical", color: "#991b1b" };
    if (score > 60) return { label: "High", color: "#dc2626" };
    if (score > 40) return { label: "Moderate", color: "#f59e0b" };
    if (score > 20) return { label: "Low", color: "#eab308" };
    if (score > 5) return { label: "Minimal", color: "#facc15" };
    return { label: "None", color: "#84cc16" };
  };

  const riskLevel = getRiskLevel(score);
  const rotation = (score / 100) * 180 - 90;

  return (
    <Card className="p-6 bg-white">
      <div className="flex flex-col items-center">
        <p className="text-sm text-slate-600 mb-4">{label}</p>
        
        {/* Gauge SVG */}
        <div className="relative w-48 h-24">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 20 90 A 80 80 0 0 1 180 90"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="12"
              strokeLinecap="round"
            />
            
            {/* Colored segments */}
            <path
              d="M 20 90 A 80 80 0 0 1 56 34"
              fill="none"
              stroke="#22c55e"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              d="M 56 34 A 80 80 0 0 1 100 20"
              fill="none"
              stroke="#84cc16"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              d="M 100 20 A 80 80 0 0 1 144 34"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              d="M 144 34 A 80 80 0 0 1 180 90"
              fill="none"
              stroke="#dc2626"
              strokeWidth="12"
              strokeLinecap="round"
            />
            
            {/* Needle */}
            <g transform={`rotate(${rotation} 100 90)`}>
              <circle cx="100" cy="90" r="8" fill="#1e293b" />
              <path
                d="M 100 90 L 100 30"
                stroke="#1e293b"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="100" cy="30" r="4" fill="#ef4444" />
            </g>
            
            {/* Center circle */}
            <circle cx="100" cy="90" r="6" fill="white" stroke="#1e293b" strokeWidth="2" />
          </svg>
        </div>

        {/* Score display */}
        <div className="mt-2 text-center">
          <p className="text-3xl text-slate-900">{score}/100</p>
          <p className="text-sm mt-1" style={{ color: riskLevel.color }}>
            {riskLevel.label}
          </p>
        </div>
      </div>
    </Card>
  );
}
