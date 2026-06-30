import { useMemo } from 'react';
import { Card } from './ui/card';
import { RiskScoreInfo } from './RiskScoreInfo';
import { Asset } from '../data/portfolioData';
import {
  calculateDependencyDepth,
  findSinglePointFailures,
  suggestAlternativeCountries,
} from '../utils/riskIntelligence';

interface SupplyChainExposureMappingPanelProps {
  portfolio: Asset[];
  riskData: { [country: string]: number };
}

export function SupplyChainExposureMappingPanel({
  portfolio,
  riskData,
}: SupplyChainExposureMappingPanelProps) {
  const singlePointFailures = useMemo(() => findSinglePointFailures(portfolio, riskData), [portfolio, riskData]);

  const dependencyDepthByAsset = useMemo(
    () =>
      portfolio
        .map((asset) => ({
          ticker: asset.ticker,
          depth: calculateDependencyDepth(asset),
          alternatives: suggestAlternativeCountries(asset, riskData),
        }))
        .sort((a, b) => b.depth.maxDepth - a.depth.maxDepth)
        .slice(0, 8),
    [portfolio, riskData]
  );

  return (
    <Card className="p-4 bg-zinc-950 border border-zinc-800">
      <div className="mb-3 flex items-center gap-1.5">
        <h3 className="text-sm font-semibold text-zinc-100">Supply Chain Exposure Mapping</h3>
        <RiskScoreInfo
          meaning="Highlights dependency concentration and depth through supply chains."
          calculation="Single-point-of-failure flags countries shared by multiple assets with high average dependency weight; depth is inferred from exposure tiers (Tier 1/Tier 2/Tier 3)."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-xs text-zinc-300 font-medium">Single-Point-of-Failure Suppliers</p>
          {singlePointFailures.length > 0 ? (
            singlePointFailures.map((entry) => (
              <div key={entry.country} className="p-2 rounded border border-zinc-800 bg-zinc-900/60 text-xs">
                <div className="flex justify-between text-zinc-200">
                  <span>{entry.country}</span>
                  <span>Risk {entry.riskScore}</span>
                </div>
                <p className="text-zinc-400 mt-1">
                  {entry.assetCount} assets depend on this country (avg dependency {Math.round(entry.averageDependencyWeight * 100)}%).
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-zinc-500">No concentrated supplier bottlenecks detected in the current portfolio slice.</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs text-zinc-300 font-medium">Dependency Depth + Alternative Sourcing</p>
          {dependencyDepthByAsset.map((entry) => (
            <div key={entry.ticker} className="p-2 rounded border border-zinc-800 bg-zinc-900/60 text-xs">
              <div className="flex justify-between text-zinc-200">
                <span>{entry.ticker}</span>
                <span>Depth {entry.depth.maxDepth}</span>
              </div>
              <p className="text-zinc-500 mt-1">
                Tier 1 {entry.depth.direct} | Tier 2 {entry.depth.indirect} | Tier 3 {entry.depth.macro}
              </p>
              <p className="text-zinc-400 mt-1">
                Alternative low-risk sourcing: {entry.alternatives.length > 0
                  ? entry.alternatives.map((alt) => `${alt.country} (${alt.score})`).join(', ')
                  : 'None suggested'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
