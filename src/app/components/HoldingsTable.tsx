import { Card } from "./ui/card";
import { Asset } from "../data/portfolioData";
import { ArrowUpRight, ArrowDownRight, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useCallback, useState } from "react";
import { RiskScoreInfo } from "./RiskScoreInfo";
import { computeAssetConfidence, getCountryIntelligence } from "../utils/riskIntelligence";

interface HoldingsTableProps {
  assets: Asset[];
  assetContributions: { ticker: string; riskScore: number; mainRisk?: string }[];
  countryRisks: { [country: string]: number };
  weights?: {
    political: number;
    economic: number;
    conflict: number;
    corruption: number;
    terrorism: number;
  };
  dataFreshnessLabel?: string;
  isStaleData?: boolean;
}

const ROWS_PER_PAGE = 10;

const defaultWeights = { political: 20, economic: 20, conflict: 20, corruption: 20, terrorism: 20 };

type SortKey =
  | "asset"
  | "sector"
  | "sectorRiskIndex"
  | "confidence"
  | "topDrivers"
  | "value"
  | "allocation"
  | "riskScore"
  | "potentialLoss";

type SortDirection = "asc" | "desc";

type SortConfig = {
  key: SortKey;
  direction: SortDirection;
};

type HoldingRow = {
  asset: Asset;
  riskScore: number;
  potentialLossUsd: number;
  sectorRiskIndex: number;
  confidence: number;
  topDrivers: string;
  lastUpdated?: string;
};

export function HoldingsTable({
  assets,
  assetContributions,
  countryRisks,
  weights = defaultWeights,
  dataFreshnessLabel,
  isStaleData = false,
}: HoldingsTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "riskScore", direction: "desc" });

  const getContributionColor = useCallback((riskScore: number) => {
    if (riskScore >= 8) return "text-red-400 bg-red-950/30";
    if (riskScore >= 6) return "text-orange-400 bg-orange-950/30";
    if (riskScore >= 4) return "text-yellow-400 bg-yellow-950/30";
    return "text-green-400 bg-green-950/30";
  }, []);

  const assetContributionMap = useMemo(() => {
    return new Map(assetContributions.map((c) => [c.ticker, c]));
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

  const assetIntelligence = useMemo(() => {
    return new Map(
      assets.map((asset) => {
        const confidence = computeAssetConfidence(asset, weights);
        const topDependency = asset.countryDependencies
          .map((dep) => {
            const countryIntelligence = getCountryIntelligence(dep.country, weights);
            return {
              country: dep.country,
              weightedRisk: (countryRisks[dep.country] ?? 50) * dep.weight,
              lastUpdated: countryIntelligence.lastUpdated,
              topFactors: countryIntelligence.topFactors,
            };
          })
          .sort((a, b) => b.weightedRisk - a.weightedRisk)[0];

        return [
          asset.ticker,
          {
            confidence,
            topFactors: topDependency?.topFactors ?? [],
            lastUpdated: topDependency?.lastUpdated,
          },
        ];
      })
    );
  }, [assets, countryRisks, weights]);

  const holdingRows = useMemo<HoldingRow[]>(() => {
    return assets.map((asset) => {
      const assetContribution = assetContributionMap.get(asset.ticker);
      const intelligence = assetIntelligence.get(asset.ticker);

      return {
        asset,
        riskScore: assetContribution?.riskScore || 0,
        potentialLossUsd: asset.value * Math.min(1, (assetContribution?.riskScore || 0) / 100),
        sectorRiskIndex: sectorRiskIndexMap.get(asset.sector || "Unknown") || 0,
        confidence: intelligence?.confidence ?? 60,
        topDrivers: intelligence?.topFactors?.length
          ? intelligence.topFactors.map((factor) => factor.label).join(" / ")
          : "n/a",
        lastUpdated: intelligence?.lastUpdated,
      };
    });
  }, [assets, assetContributionMap, sectorRiskIndexMap, assetIntelligence]);

  const sortedRows = useMemo(() => {
    const rows = [...holdingRows];
    const direction = sortConfig.direction === "asc" ? 1 : -1;

    rows.sort((a, b) => {
      switch (sortConfig.key) {
        case "asset":
          return direction * a.asset.ticker.localeCompare(b.asset.ticker);
        case "sector":
          return direction * (a.asset.sector || "").localeCompare(b.asset.sector || "");
        case "sectorRiskIndex":
          return direction * (a.sectorRiskIndex - b.sectorRiskIndex);
        case "confidence":
          return direction * (a.confidence - b.confidence);
        case "topDrivers":
          return direction * a.topDrivers.localeCompare(b.topDrivers);
        case "value":
          return direction * (a.asset.value - b.asset.value);
        case "allocation":
          return direction * (a.asset.weight - b.asset.weight);
        case "riskScore":
          return direction * (a.riskScore - b.riskScore);
        case "potentialLoss":
          return direction * (a.potentialLossUsd - b.potentialLossUsd);
        default:
          return 0;
      }
    });

    return rows;
  }, [holdingRows, sortConfig]);

  const visibleAssets = useMemo(() => {
    return sortedRows.slice(0, ROWS_PER_PAGE);
  }, [sortedRows]);

  const handleSort = useCallback((key: SortKey) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key,
        direction: "asc",
      };
    });
  }, []);

  const getSortIcon = useCallback(
    (key: SortKey) => {
      if (sortConfig.key !== key) {
        return <ArrowUpDown className="size-3 text-zinc-600" aria-hidden="true" />;
      }

      return sortConfig.direction === "asc" ? (
        <ChevronUp className="size-3 text-zinc-300" aria-hidden="true" />
      ) : (
        <ChevronDown className="size-3 text-zinc-300" aria-hidden="true" />
      );
    },
    [sortConfig]
  );

  const renderSortableHeader = useCallback(
    (label: string, key: SortKey, rightAlign = false) => (
      <button
        type="button"
        onClick={() => handleSort(key)}
        className={`inline-flex items-center gap-1 hover:text-zinc-300 ${rightAlign ? "justify-end" : ""}`}
      >
        <span>{label}</span>
        {getSortIcon(key)}
      </button>
    ),
    [getSortIcon, handleSort]
  );

  return (
    <Card className="p-3 md:p-4 bg-zinc-950 border-zinc-900">
      <div className="mb-3 flex items-center gap-1.5">
        <h3 className="text-sm md:text-base text-white">Holdings Risk Analysis</h3>
        <RiskScoreInfo
          meaning="Each holding is scored by how exposed it is to country-level geopolitical risk."
          calculation="Asset risk uses weighted country dependencies per asset; sector risk index is the weighted average of asset geo-risk within each sector."
        />
      </div>
      {dataFreshnessLabel && (
        <div className="mb-3 inline-flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-[11px]">
          <span className={isStaleData ? "text-amber-300" : "text-emerald-300"}>{isStaleData ? "Stale" : "Fresh"}</span>
          <span className="text-zinc-400">{dataFreshnessLabel}</span>
        </div>
      )}

      {assets.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-center" role="status" aria-live="polite">
          <p className="text-sm text-zinc-300">No holdings available for this dataset.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-3 md:mx-0">
          <div className="w-full align-middle max-h-96 overflow-y-auto pr-2 [scrollbar-gutter:stable]">
            <table className="w-full table-fixed text-left">
              <thead className="sticky top-0 bg-zinc-950/95 z-10">
                <tr className="border-b border-zinc-900">
                  <th className="text-left py-2 px-2 text-xs text-zinc-500 whitespace-nowrap">{renderSortableHeader("Ticker", "asset")}</th>
                  <th className="text-left py-2 px-2 text-xs text-zinc-500 whitespace-nowrap">{renderSortableHeader("Sector", "sector")}</th>
                  <th className="text-right py-2 px-2 text-xs text-zinc-500 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      {renderSortableHeader("Sct Risk", "sectorRiskIndex", true)}
                      <RiskScoreInfo
                        meaning="Average geopolitical risk level for assets in this sector."
                        calculation="For each asset, geo-risk is computed from country dependency weights and country risk scores; sector index is the weighted average of those asset geo-risks by portfolio weight."
                      />
                    </div>
                  </th>
                  <th className="text-right py-2 px-2 text-xs text-zinc-500 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      {renderSortableHeader("Conf", "confidence", true)}
                      <RiskScoreInfo
                        meaning="Estimated quality confidence for each holding's risk estimate."
                        calculation="Computed as dependency-weighted average of country confidence scores used by the geopolitical model."
                      />
                    </div>
                  </th>
                  <th className="text-right py-2 px-2 text-xs text-zinc-500 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      {renderSortableHeader("Drivers", "topDrivers", true)}
                      <RiskScoreInfo
                        meaning="Primary risk factors driving this holding's country exposure profile."
                        calculation="Derived from top weighted factor impacts for the dominant dependency country per holding."
                      />
                    </div>
                  </th>
                  <th className="text-right py-2 px-2 text-xs text-zinc-500 whitespace-nowrap">{renderSortableHeader("Value $", "value", true)}</th>
                  <th className="text-right py-2 px-2 text-xs text-zinc-500 whitespace-nowrap">{renderSortableHeader("Alloc %", "allocation", true)}</th>
                  <th className="text-right py-2 px-2 pr-4 text-xs text-zinc-500 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      {renderSortableHeader("Loss ($)", "potentialLoss", true)}
                      <RiskScoreInfo
                        meaning="Estimated dollar loss for this holding under current exposure risk."
                        calculation="Potential Loss = holding value × (asset risk score / 100), capped at 100% of holding value."
                      />
                    </div>
                  </th>
                  <th className="text-right py-2 px-2 text-xs text-zinc-500 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      {renderSortableHeader("Risk", "riskScore", true)}
                      <RiskScoreInfo
                        meaning="Per-asset risk contribution to portfolio geopolitical exposure."
                        calculation="Derived from each asset's country dependency risk profile and adjusted by its portfolio weight."
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleAssets.map((row) => {
                  const { asset, riskScore, potentialLossUsd, sectorRiskIndex, confidence, topDrivers, lastUpdated } = row;

                  return (
                    <tr
                      key={asset.ticker}
                      className="border-b border-zinc-900/50 hover:bg-zinc-900/50 transition-colors"
                    >
                      <td className="py-2 px-2 whitespace-nowrap">
                        <div className="max-w-[120px]">
                          <p className="font-mono text-xs md:text-sm text-white">{asset.ticker}</p>
                          <p className="text-[10px] md:text-xs text-slate-400 truncate" title={asset.name}>{asset.name}</p>
                        </div>
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">
                        <span className="inline-block max-w-[90px] truncate text-xs md:text-sm text-slate-300" title={asset.sector}>{asset.sector}</span>
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        <span className="text-xs md:text-sm text-slate-300">{sectorRiskIndex.toFixed(1)}</span>
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        <div className="text-xs md:text-sm text-slate-300">{confidence}%</div>
                        <div className="text-[10px] text-zinc-500">
                          {lastUpdated ? new Date(lastUpdated).toLocaleDateString() : "-"}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        <span className="inline-block max-w-[120px] truncate text-xs text-zinc-300" title={topDrivers}>
                          {topDrivers}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        <span className="text-xs md:text-sm text-slate-300">${asset.value.toLocaleString()}</span>
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        <span className="text-xs md:text-sm text-slate-300">{asset.weight}%</span>
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        <span className="text-xs md:text-sm text-red-300">
                          ${potentialLossUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap">
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
      )}
      {assets.length > ROWS_PER_PAGE && (
        <p className="text-xs text-zinc-500 mt-2">Showing {visibleAssets.length} of {assets.length} holdings (sorted)</p>
      )}
    </Card>
  );
}