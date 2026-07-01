import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { getCountryIntelligence } from "../utils/riskIntelligence";
import { severityLabel, RiskWeights } from "../utils/riskAlertSummary";
import { baseRiskData } from "../data/countryRiskData";
import type { CountryRisk } from "../data/countryRiskData";

export interface RiskAlertDetail {
  country: string;
  riskScore: number;
  riskContribution: number;
  exposureType?: string;
  contributingAssets: string[];
}

interface RiskAlertDetailDialogProps {
  alert: RiskAlertDetail | null;
  weights: RiskWeights;
  countryDimensions?: Record<string, import('../data/countryRiskData').CountryRisk>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FACTOR_PLAIN: Record<keyof CountryRisk, string> = {
  political: "Political Instability",
  economic: "Economic Stress",
  conflict: "Armed Conflict",
  corruption: "Corruption",
  terrorism: "Terrorism",
};

const severityColor = (score: number) => {
  if (score >= 75) return "text-red-300";
  if (score >= 51) return "text-orange-300";
  if (score >= 26) return "text-yellow-300";
  return "text-emerald-300";
};

const riskBadgeClasses = (score: number) => {
  if (score >= 75) return "bg-red-900/40 border-red-800 text-red-200";
  if (score >= 51) return "bg-orange-900/40 border-orange-800 text-orange-200";
  if (score >= 26) return "bg-yellow-900/40 border-yellow-800 text-yellow-200";
  return "bg-emerald-900/40 border-emerald-800 text-emerald-200";
};

export function RiskAlertDetailDialog({
  alert,
  weights,
  countryDimensions,
  open,
  onOpenChange,
}: RiskAlertDetailDialogProps) {
  const dims = alert ? (countryDimensions?.[alert.country] ?? baseRiskData[alert.country]) : undefined;

  const intelligence = useMemo(
    () => (alert ? getCountryIntelligence(alert.country, weights, dims) : null),
    [alert, weights, dims]
  );

  const factors = useMemo(() => {
    if (!dims) return [];
    return (Object.keys(dims) as Array<keyof CountryRisk>)
      .map((key) => ({
        key,
        label: FACTOR_PLAIN[key],
        score: dims[key],
        weight: weights[key],
        impact: dims[key] * (weights[key] / 100),
      }))
      .sort((a, b) => b.impact - a.impact);
  }, [dims, weights]);

  const topFactor = factors[0];

  if (!alert) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            {alert.country}
            <span className={`px-2 py-0.5 rounded text-xs border font-normal ${riskBadgeClasses(alert.riskScore)}`}>
              {severityLabel(alert.riskScore).toUpperCase()} &middot; {alert.riskScore.toFixed(0)}/100
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">

          {/* Quick-facts row */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Portfolio Risk Share", value: `${alert.riskContribution.toFixed(2)}%` },
              { label: "Risk Level", value: severityLabel(alert.riskScore).charAt(0).toUpperCase() + severityLabel(alert.riskScore).slice(1) },
              { label: "Model Confidence", value: intelligence ? `${intelligence.confidence}%` : "—" },
              { label: "Last Updated", value: intelligence ? new Date(intelligence.lastUpdated).toLocaleDateString() : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-zinc-900/60 border border-zinc-800 rounded px-2.5 py-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</p>
                <p className="text-sm text-zinc-200 font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Contributing holdings */}
          {alert.contributingAssets.length > 0 && (
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1.5">Flagged Holdings</p>
              <div className="flex flex-wrap gap-1.5">
                {alert.contributingAssets.map((ticker) => (
                  <span key={ticker} className="px-2 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 font-mono">
                    {ticker}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Risk factor breakdown */}
          {factors.length > 0 && (
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Risk Factor Breakdown</p>
              <div className="space-y-1.5">
                {factors.map(({ key, label, score, weight, impact }) => (
                  <div key={key} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">{label}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-zinc-600">{weight}% weight</span>
                        <span className={`font-medium ${severityColor(score)}`}>{score.toFixed(0)}</span>
                      </div>
                    </div>
                    <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${score >= 75 ? 'bg-red-500' : score >= 51 ? 'bg-orange-500' : score >= 26 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, impact)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Short tip */}
          {topFactor && (
            <p className="text-[11px] text-zinc-500 border-t border-zinc-800 pt-3">
              Tip: <strong className="text-zinc-400">{topFactor.label}</strong> is driving the most impact.
              {topFactor.weight > 0
                ? ` Lowering its weight slider will reduce this score; raising it will increase it.`
                : ` Its weight is currently 0 — raise the slider to include it in scoring.`}
            </p>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
