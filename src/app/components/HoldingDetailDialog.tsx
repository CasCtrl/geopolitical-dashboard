import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Asset, CountryDependency } from "../data/portfolioData";
import { baseRiskData, CountryRisk } from "../data/countryRiskData";
import { RiskWeights, severityLabel } from "../utils/riskAlertSummary";
import { getCountryIntelligence } from "../utils/riskIntelligence";

interface HoldingDetailDialogProps {
  asset: Asset | null;
  riskScore: number;
  countryRisks: { [country: string]: number };
  weights: RiskWeights;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FACTOR_PLAIN: Record<keyof CountryRisk, string> = {
  political: "political instability",
  economic: "economic stress",
  conflict: "armed conflict",
  corruption: "corruption / rule of law",
  terrorism: "terrorism & security",
};

const DEPENDENCY_TYPE_PLAIN: Record<CountryDependency["type"], string> = {
  direct: "direct operations or revenue",
  indirect: "supply chain / partner exposure",
  macro: "macroeconomic exposure",
};

function buildAssetSummary(
  asset: Asset,
  riskScore: number,
  countryRisks: { [country: string]: number },
  weights: RiskWeights
): string {
  const deps = asset.countryDependencies || [];
  if (deps.length === 0) {
    return `${asset.ticker} (${asset.name}) currently has no mapped country dependencies, so its geopolitical risk is driven entirely by sector-level signals rather than country-specific exposure.`;
  }

  const ranked = deps
    .map((dep) => {
      const countryRisk = countryRisks[dep.country] ?? 50;
      return {
        ...dep,
        countryRisk,
        weightedRisk: countryRisk * dep.weight,
      };
    })
    .sort((a, b) => b.weightedRisk - a.weightedRisk);

  const top = ranked[0];
  const base = baseRiskData[top.country];
  let topFactorPlain = "country-level geopolitical pressure";
  let topFactorWeight = 0;

  if (base) {
    const factors = (Object.keys(base) as Array<keyof CountryRisk>)
      .map((f) => ({
        factor: f,
        plain: FACTOR_PLAIN[f],
        weightedImpact: base[f] * (weights[f] / 100),
        weight: weights[f],
      }))
      .sort((a, b) => b.weightedImpact - a.weightedImpact);
    topFactorPlain = factors[0].plain;
    topFactorWeight = factors[0].weight;
  }

  const overall = severityLabel(riskScore * 10); // riskScore is roughly 0-10, scale to 0-100 band
  const second = ranked[1];

  let secondClause = "";
  if (second) {
    secondClause = ` It also has meaningful exposure to ${second.country} (risk ${second.countryRisk.toFixed(0)}, ${(second.weight * 100).toFixed(0)}% dependency).`;
  }

  return (
    `${asset.ticker} (${asset.name}) sits in the ${asset.sector} sector and is showing ${overall} geopolitical risk. ` +
    `Its biggest source of exposure is ${top.country}, which carries a country risk score of ${top.countryRisk.toFixed(0)} out of 100 and accounts for about ${(top.weight * 100).toFixed(0)}% of the stock's country dependency (${DEPENDENCY_TYPE_PLAIN[top.type]}).` +
    secondClause +
    ` Under your current sensitivity weights, ${topFactorPlain} is the dominant driver (weighted ${topFactorWeight}%), so swings in that area in ${top.country} flow straight into ${asset.ticker}'s risk score.`
  );
}

export function HoldingDetailDialog({
  asset,
  riskScore,
  countryRisks,
  weights,
  open,
  onOpenChange,
}: HoldingDetailDialogProps) {
  const summary = useMemo(
    () => (asset ? buildAssetSummary(asset, riskScore, countryRisks, weights) : ""),
    [asset, riskScore, countryRisks, weights]
  );

  const rankedDeps = useMemo(() => {
    if (!asset) return [];
    return (asset.countryDependencies || [])
      .map((dep) => {
        const countryRisk = countryRisks[dep.country] ?? 50;
        const intel = getCountryIntelligence(dep.country, weights);
        return {
          ...dep,
          countryRisk,
          weightedRisk: countryRisk * dep.weight,
          confidence: intel.confidence,
        };
      })
      .sort((a, b) => b.weightedRisk - a.weightedRisk);
  }, [asset, countryRisks, weights]);

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            {asset.ticker} &middot; {asset.name}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Why this stock is exposed and which countries are driving the risk.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-zinc-200 leading-relaxed">
          <p>{summary}</p>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-2 border-t border-zinc-800">
            <p>
              <span className="text-zinc-500">Sector:</span> {asset.sector}
            </p>
            <p>
              <span className="text-zinc-500">Allocation:</span> {asset.weight}%
            </p>
            <p>
              <span className="text-zinc-500">Holding value:</span> ${asset.value.toLocaleString()}
            </p>
            <p>
              <span className="text-zinc-500">Asset risk score:</span> {riskScore.toFixed(2)}
            </p>
          </div>

          <div className="pt-2 border-t border-zinc-800">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">
              Countries this stock depends on
            </p>
            {rankedDeps.length === 0 ? (
              <p className="text-xs text-zinc-500">No country dependencies mapped.</p>
            ) : (
              <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {rankedDeps.map((dep) => (
                  <li
                    key={`${asset.ticker}-${dep.country}-${dep.type}`}
                    className="rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-zinc-100">{dep.country}</p>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                        <span className="capitalize">{dep.type}</span>
                        <span>&middot;</span>
                        <span>{(dep.weight * 100).toFixed(0)}% dep</span>
                        <span>&middot;</span>
                        <span className="text-zinc-200">Risk {dep.countryRisk.toFixed(0)}</span>
                        <span className="text-zinc-500">({severityLabel(dep.countryRisk)})</span>
                      </div>
                    </div>
                    {dep.reason && (
                      <p className="text-[11px] text-zinc-400 mt-0.5">{dep.reason}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
