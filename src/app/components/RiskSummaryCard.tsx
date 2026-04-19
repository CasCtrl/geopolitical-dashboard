import { Card } from "./ui/card";
import { AlertTriangle } from "lucide-react";
import { RiskGaugeCompact } from "./RiskGaugeCompact";
import { RiskScoreInfo } from "./RiskScoreInfo";

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
          <div className="mb-4 flex items-center justify-center gap-2">
            <p className="text-sm text-slate-400">Total Portfolio Risk Score</p>
            <RiskScoreInfo
              meaning="Overall geopolitical exposure of the portfolio on a 0-100 scale."
              calculation="Weighted average of each asset's country risk dependencies, then aggregated by portfolio allocation and normalized to 0-100."
            />
          </div>
          <RiskGaugeCompact value={totalRiskScore} />
          <p className="text-sm text-slate-400 text-center mt-2">
            {getRiskLabel(totalRiskScore)} Risk Level
          </p>
        </div>

        {/* Top Risk Assets */}
        <div className="pt-4 border-t border-slate-800">
          <div className="mb-3 flex items-center gap-1">
            <p className="text-sm text-slate-400">Top Risk Assets</p>
            <RiskScoreInfo
              meaning="Assets with the largest contribution to your portfolio's risk score."
              calculation="Ranked by per-asset contribution from country dependency risk weighted by portfolio allocation."
            />
          </div>
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
          <div className="mb-3 flex items-center gap-1">
            <p className="text-sm text-slate-400">Top Risk Countries</p>
            <RiskScoreInfo
              meaning="Countries that contribute most to the portfolio's total geopolitical risk."
              calculation="Ranked by combined risk contribution from all holdings exposed to each country."
            />
          </div>
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
