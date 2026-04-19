import { Card } from "./ui/card";
import { AlertTriangle } from "lucide-react";
import { RiskGaugeCompact } from "./RiskGaugeCompact";

interface RiskSummaryCardProps {
  totalRiskScore: number;
  topRiskCountries: string[];
  topRiskAssets: string[];
  alertCount: number;
}

export function RiskSummaryCard({
  totalRiskScore,
  topRiskCountries,
  topRiskAssets,
  alertCount,
}: RiskSummaryCardProps) {
  const getRiskLabel = (score: number) => {
    if (score > 80) return "Critical";
    if (score > 60) return "High";
    if (score > 40) return "Moderate";
    if (score > 20) return "Low";
    if (score > 5) return "Minimal";
    return "None";
  };

  return (
    <Card className="p-6 bg-slate-900 border-slate-800 text-white">
      <div className="space-y-6">
        {/* Gauge */}
        <div>
          <p className="text-sm text-slate-400 mb-4 text-center">
            Total Portfolio Risk Score
          </p>
          <RiskGaugeCompact value={totalRiskScore} />
          <p className="text-sm text-slate-400 text-center mt-2">
            {getRiskLabel(totalRiskScore)} Risk Level
          </p>
        </div>

        {/* Top Risk Assets */}
        <div className="pt-4 border-t border-slate-800">
          <p className="text-sm text-slate-400 mb-3">Top Risk Assets</p>
          <div className="space-y-2">
            {topRiskAssets.slice(0, 5).map((asset, index) => (
              <div
                key={asset}
                className="flex items-center gap-3 text-sm bg-slate-800/50 px-3 py-2 rounded"
              >
                <span className="text-slate-500 text-xs w-4">{index + 1}</span>
                <span className="font-mono">{asset}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Risk Countries */}
        <div className="pt-4 border-t border-slate-800">
          <p className="text-sm text-slate-400 mb-3">Top Risk Countries</p>
          <div className="space-y-2">
            {topRiskCountries.slice(0, 5).map((country, index) => (
              <div
                key={country}
                className="flex items-center gap-3 text-sm bg-slate-800/50 px-3 py-2 rounded"
              >
                <span className="text-slate-500 text-xs w-4">{index + 1}</span>
                <span>{country}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alert Count */}
        {alertCount > 0 && (
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="size-4" />
              <p className="text-sm">
                {alertCount} Active Risk {alertCount === 1 ? "Alert" : "Alerts"}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
