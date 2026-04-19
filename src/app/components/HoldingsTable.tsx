import { Card } from "./ui/card";
import { Asset } from "../data/portfolioData";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useMemo, useCallback } from "react";
import { RiskScoreInfo } from "./RiskScoreInfo";

interface HoldingsTableProps {
  assets: Asset[];
  assetContributions: { ticker: string; riskScore: number; mainRisk?: string }[];
  countryRisks: { [country: string]: number };
}

const ROWS_PER_PAGE = 10; // Show 10 rows at a time for virtualization

export function HoldingsTable({ assets, assetContributions, countryRisks }: HoldingsTableProps) {
  const getContributionColor = useCallback((riskScore: number) => {
    if (riskScore >= 8) return "text-red-400 bg-red-950/30";
    if (riskScore >= 6) return "text-orange-400 bg-orange-950/30";
    if (riskScore >= 4) return "text-yellow-400 bg-yellow-950/30";
    return "text-green-400 bg-green-950/30";
  }, []);

  // Memoize sorted and paginated data
  const visibleAssets = useMemo(() => {
    return assets.slice(0, ROWS_PER_PAGE);
  }, [assets]);

  const assetContributionMap = useMemo(() => {
    return new Map(assetContributions.map(c => [c.ticker, c]));
  }, [assetContributions]);

  const sectorRiskIndexMap = useMemo(() => {
    const sectorAccumulator = new Map<string, { weightedRisk: number; totalWeight: number }>();

    const getAssetGeoRisk = (asset: Asset) => {
      if (!asset.countryDependencies || asset.countryDependencies.length === 0) return 0;

      let weightedRisk = 0;
      let totalDependencyWeight = 0;

      asset.countryDependencies.forEach((dep) => {
        const countryRisk = countryRisks[dep.country] ?? 50;
        weightedRisk += countryRisk * dep.weight;
        totalDependencyWeight += dep.weight;
      });

      return totalDependencyWeight > 0 ? weightedRisk / totalDependencyWeight : 0;
    };

    assets.forEach((asset) => {
      const sector = asset.sector || "Unknown";
      const assetGeoRisk = getAssetGeoRisk(asset);
      const sectorWeight = asset.weight || 0;

      const current = sectorAccumulator.get(sector) || { weightedRisk: 0, totalWeight: 0 };
      sectorAccumulator.set(sector, {
        weightedRisk: current.weightedRisk + assetGeoRisk * sectorWeight,
        totalWeight: current.totalWeight + sectorWeight,
      });
    });

    const result = new Map<string, number>();
    sectorAccumulator.forEach((value, sector) => {
      result.set(sector, value.totalWeight > 0 ? value.weightedRisk / value.totalWeight : 0);
    });

    return result;
  }, [assets, countryRisks]);

  return (
    <Card className="p-3 md:p-4 bg-zinc-950 border-zinc-900">
      <div className="mb-3 flex items-center gap-1.5">
        <h3 className="text-sm md:text-base text-white">Holdings Risk Analysis</h3>
        <RiskScoreInfo
          meaning="Each holding is scored by how exposed it is to country-level geopolitical risk."
          calculation="Asset risk uses weighted country dependencies per asset; sector risk index is the weighted average of asset geo-risk within each sector."
        />
      </div>
      <div className="overflow-x-auto -mx-3 md:mx-0">
        <div className="inline-block min-w-full align-middle max-h-96 overflow-y-auto">
          <table className="min-w-full text-left">
            <thead className="sticky top-0 bg-zinc-950/95 z-10">
              <tr className="border-b border-zinc-900">
                <th className="text-left py-2 px-3 text-xs text-zinc-500 whitespace-nowrap">Asset</th>
                <th className="text-left py-2 px-3 text-xs text-zinc-500 whitespace-nowrap">Sector</th>
                <th className="text-right py-2 px-3 text-xs text-zinc-500 whitespace-nowrap">
                  <div className="inline-flex items-center gap-1">
                    <span>Sector Risk Index</span>
                    <RiskScoreInfo
                      meaning="Average geopolitical risk level for assets in this sector."
                      calculation="For each asset, geo-risk is computed from country dependency weights and country risk scores; sector index is the weighted average of those asset geo-risks by portfolio weight."
                    />
                  </div>
                </th>
                <th className="text-right py-2 px-3 text-xs text-zinc-500 whitespace-nowrap">Value</th>
                <th className="text-right py-2 px-3 text-xs text-zinc-500 whitespace-nowrap">Allocation</th>
                <th className="text-right py-2 px-3 text-xs text-zinc-500 whitespace-nowrap">
                  <div className="inline-flex items-center gap-1">
                    <span>Risk Score</span>
                    <RiskScoreInfo
                      meaning="Per-asset risk contribution to portfolio geopolitical exposure."
                      calculation="Derived from each asset's country dependency risk profile and adjusted by its portfolio weight."
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleAssets.map((asset) => {
                const assetContribution = assetContributionMap.get(asset.ticker);
                const riskScore = assetContribution?.riskScore || 0;
                const sectorRiskIndex = sectorRiskIndexMap.get(asset.sector || "Unknown") || 0;
                return (
                  <tr
                    key={asset.ticker}
                    className="border-b border-zinc-900/50 hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div>
                        <p className="font-mono text-xs md:text-sm text-white">{asset.ticker}</p>
                        <p className="text-[10px] md:text-xs text-slate-400">{asset.name}</p>
                      </div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="text-xs md:text-sm text-slate-300">{asset.sector}</span>
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <span className="text-xs md:text-sm text-slate-300">{sectorRiskIndex.toFixed(1)}</span>
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <span className="text-xs md:text-sm text-slate-300">${asset.value.toLocaleString()}</span>
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <span className="text-xs md:text-sm text-slate-300">{asset.weight}%</span>
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs md:text-sm ${getContributionColor(
                          riskScore
                        )}`}
                      >
                        {riskScore.toFixed(2)}
                        {riskScore >= 6 ? (
                          <ArrowUpRight className="size-3" />
                        ) : (
                          <ArrowDownRight className="size-3" />
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {assets.length > ROWS_PER_PAGE && (
        <p className="text-xs text-zinc-500 mt-2">Showing {visibleAssets.length} of {assets.length} holdings</p>
      )}
    </Card>
  );
}