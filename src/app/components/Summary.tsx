import { useState } from "react";
import { Card } from "./ui/card";
import { AlertTriangle, TrendingUp, Target, Shield } from "lucide-react";
import { RiskScoreInfo } from "./RiskScoreInfo";
import { Asset } from "../data/portfolioData";
import { AssetLevelIntelligencePanel } from "./AssetLevelIntelligencePanel";

interface SummaryProps {
  portfolioAnalysis: {
    totalRiskScore: number;
    countryExposures: Array<{ country: string; totalExposure: number; riskContribution: number; contributingAssets: string[] }>;
    assetContributions: Array<{ ticker: string; riskScore: number; mainRisk?: string }>;
    topRiskAssets: string[];
    topRiskCountries: string[];
  };
  riskData: { [key: string]: number };
  weights: {
    political: number;
    economic: number;
    conflict: number;
    corruption: number;
    terrorism: number;
  };
  portfolio: Asset[];
  dataFreshnessLabel?: string;
  isStaleData?: boolean;
}

export function Summary({
  portfolioAnalysis,
  riskData,
  weights,
  portfolio,
  dataFreshnessLabel,
  isStaleData = false,
}: SummaryProps) {
  const PORTFOLIO_VALUE_PLACEHOLDER_USD = 337500;

  // Calculate average risk
  const averageGlobalRisk = Object.values(riskData).length > 0
    ? (Object.values(riskData).reduce((a, b) => a + b, 0) / Object.values(riskData).length).toFixed(1)
    : 0;

  // Get top risk factors
  const riskFactors = [
    { name: "Political", value: weights.political },
    { name: "Economic", value: weights.economic },
    { name: "Conflict", value: weights.conflict },
    { name: "Corruption", value: weights.corruption },
    { name: "Terrorism", value: weights.terrorism },
  ].sort((a, b) => b.value - a.value);

  // Calculate percentages of total weight
  const totalWeight = riskFactors.reduce((sum, f) => sum + f.value, 0);
  const normalizedRiskFactors = riskFactors.map(factor => ({
    ...factor,
    normalizedScore: (factor.value / totalWeight) * 100
  }));

  const riskScore = portfolioAnalysis.totalRiskScore;

  const totalPortfolioValueUsd = portfolio.reduce((sum, asset) => sum + asset.value, 0);
  const totalExposureWeight = portfolioAnalysis.countryExposures.reduce(
    (sum, exposure) => sum + Math.max(exposure.totalExposure, 0),
    0
  );
  const weightedCountryRiskScore = totalExposureWeight > 0
    ? portfolioAnalysis.countryExposures.reduce((sum, exposure) => {
        const countryRisk = riskData[exposure.country] || 0;
        return sum + exposure.totalExposure * countryRisk;
      }, 0) / totalExposureWeight
    : riskScore;
  const topCountryExposureShare = totalExposureWeight > 0
    ? Math.max(portfolioAnalysis.countryExposures[0]?.totalExposure || 0, 0) / totalExposureWeight
    : 0;

  // Loss-policy scenarios to tune downside assumptions by risk tolerance.
  const lossPolicyScenarios = [
    {
      key: "conservative",
      label: "Conservative",
      stressFactor: 0.22,
      concentrationWeight: 0.35,
      minLossPct: 0.015,
      maxLossPct: 0.3,
      colorClass: "text-yellow-300",
    },
    {
      key: "base",
      label: "Base",
      stressFactor: 0.35,
      concentrationWeight: 0.6,
      minLossPct: 0.03,
      maxLossPct: 0.45,
      colorClass: "text-orange-300",
    },
    {
      key: "aggressive",
      label: "Aggressive",
      stressFactor: 0.5,
      concentrationWeight: 0.85,
      minLossPct: 0.05,
      maxLossPct: 0.6,
      colorClass: "text-red-300",
    },
  ] as const;

  const lossScenarios = lossPolicyScenarios.map((scenario) => {
    const rawLossPct =
      (weightedCountryRiskScore / 100) *
      scenario.stressFactor *
      (1 + topCountryExposureShare * scenario.concentrationWeight);
    const lossPct = Math.min(scenario.maxLossPct, Math.max(scenario.minLossPct, rawLossPct));
    const lossUsd = totalPortfolioValueUsd * lossPct;
    const remainingValueUsd = Math.max(0, totalPortfolioValueUsd - lossUsd);

    return {
      ...scenario,
      lossPct,
      lossUsd,
      remainingValueUsd,
    };
  });

  const autoPrimaryScenario = riskScore >= 70
    ? lossScenarios.find((scenario) => scenario.key === "aggressive")
    : riskScore >= 45
    ? lossScenarios.find((scenario) => scenario.key === "base")
    : lossScenarios.find((scenario) => scenario.key === "conservative");

  const [scenarioSelection, setScenarioSelection] = useState<"auto" | "conservative" | "base" | "aggressive">("auto");
  const primaryScenario = scenarioSelection === "auto"
    ? autoPrimaryScenario
    : lossScenarios.find((scenario) => scenario.key === scenarioSelection) ?? autoPrimaryScenario;

  const usdFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const displayPortfolioValueUsd =
    totalPortfolioValueUsd > 0 ? totalPortfolioValueUsd : PORTFOLIO_VALUE_PLACEHOLDER_USD;
  const formatUsdWithSuffix = (amount: number): string => `${usdFormatter.format(amount)} USD`;
  
  // Generate insights
  const insights: string[] = [];
  const recommendationCandidates: Array<{ text: string; priority: number }> = [];
  const addRecommendation = (text: string, priority: number) => {
    recommendationCandidates.push({ text, priority });
  };

  const rankedAssetsByRiskDesc = [...portfolioAnalysis.assetContributions].sort((a, b) => b.riskScore - a.riskScore);
  const rankedAssetsByRiskAsc = [...portfolioAnalysis.assetContributions].sort((a, b) => a.riskScore - b.riskScore);
  const highestRiskAsset = rankedAssetsByRiskDesc[0];
  const lowRiskAlternatives = rankedAssetsByRiskAsc
    .filter((asset) => asset.ticker !== highestRiskAsset?.ticker)
    .slice(0, 3);
  const lowRiskAlternativeText =
    lowRiskAlternatives.length > 0
      ? lowRiskAlternatives.map((asset) => `${asset.ticker} (${asset.riskScore.toFixed(1)})`).join(", ")
      : "the lowest-risk holdings in your portfolio";
  const alternativeTickers =
    lowRiskAlternatives.length > 0 ? lowRiskAlternatives.map((asset) => asset.ticker).join(", ") : "low-risk assets";

  const lowRiskCountries = Object.entries(riskData)
    .sort(([, a], [, b]) => a - b)
    .filter(([country]) => !portfolioAnalysis.topRiskCountries.includes(country))
    .slice(0, 3)
    .map(([country]) => country);
  const lowRiskCountryText = lowRiskCountries.length > 0 ? lowRiskCountries.join(", ") : "lower-risk countries";

  const sectorRiskByAverage = Object.entries(
    portfolio.reduce<Record<string, { totalRisk: number; count: number }>>((acc, asset) => {
      const contribution = portfolioAnalysis.assetContributions.find((item) => item.ticker === asset.ticker);
      if (!contribution) return acc;
      const existing = acc[asset.sector] || { totalRisk: 0, count: 0 };
      acc[asset.sector] = {
        totalRisk: existing.totalRisk + contribution.riskScore,
        count: existing.count + 1,
      };
      return acc;
    }, {})
  )
    .map(([sector, stats]) => ({ sector, averageRisk: stats.totalRisk / Math.max(1, stats.count) }))
    .sort((a, b) => a.averageRisk - b.averageRisk);
  const lowRiskSectorText = sectorRiskByAverage.slice(0, 2).map((item) => item.sector).join(", ") || "lower-risk sectors";

  // Key Insights
  insights.push(
    riskScore < 40
      ? `Portfolio demonstrates strong geopolitical resilience with a risk score of ${riskScore.toFixed(0)}. This suggests well-balanced exposure across regions and risk factors.`
      : riskScore < 60
      ? `Portfolio shows moderate geopolitical risk at ${riskScore.toFixed(0)}. While diversified, monitor high-exposure regions for potential instability.`
      : `Portfolio carries elevated geopolitical risk at ${riskScore.toFixed(0)}. Consider active risk management and portfolio rebalancing strategies.`
  );

  insights.push(
    `Geographic exposure spans ${portfolioAnalysis.countryExposures.length} countries, with primary drivers being ${portfolioAnalysis.countryExposures.slice(0, 3).map((e) => e.country).join(", ")}. This diversification helps mitigate country-specific risks.`
  );

  insights.push(
    `Your portfolio's primary risk is driven by ${riskFactors[0].name} factors (${normalizedRiskFactors[0].normalizedScore.toFixed(0)}% weight). Understanding this dominant risk factor is crucial for strategic adjustments.`
  );

  // Recommendations for changes
  if (riskScore >= 80) {
    addRecommendation(
      `Your portfolio is exposed to critical geopolitical risks. Alternative: cut 5-10% from the highest-risk position ${highestRiskAsset?.ticker || "currently highest-risk asset"} and reallocate toward lower-risk names like ${lowRiskAlternativeText}, with added country exposure to ${lowRiskCountryText}.`,
      100
    );
  } else if (riskScore >= 60) {
    addRecommendation(
      `Your portfolio carries significant geopolitical risk. Alternative: trim 3-7% from top-risk holdings and rotate into ${lowRiskAlternativeText}; prioritize new allocation in ${lowRiskCountryText} to reduce concentration risk.`,
      85
    );
  } else if (riskScore >= 40) {
    addRecommendation(
      `Your portfolio shows moderate risk exposure. Alternative: maintain core positions but shift 2-4% from high-risk names into ${lowRiskAlternativeText}, and direct incremental exposure toward ${lowRiskCountryText}.`,
      70
    );
  } else {
    addRecommendation(
      `Your portfolio demonstrates strong resilience to geopolitical shocks. Alternative: preserve current mix by keeping higher weights in ${alternativeTickers} and only adding new exposure in lower-risk markets such as ${lowRiskCountryText}.`,
      55
    );
  }

  // Specific country recommendation
  if (portfolioAnalysis.topRiskCountries.length > 0) {
    const topCountry = portfolioAnalysis.topRiskCountries[0];
    const topCountryRisk = riskData[topCountry] || 0;
    const topCountryExposure = portfolioAnalysis.countryExposures.find((entry) => entry.country === topCountry);
    const topCountryAssets = topCountryExposure?.contributingAssets?.slice(0, 3).join(", ") || "the related holdings";
    addRecommendation(
      `${topCountry} represents your highest geographic risk exposure with a score of ${topCountryRisk.toFixed(0)}. Alternative: reduce exposure in ${topCountryAssets} and redirect that capital into assets tied to ${lowRiskCountryText}.`,
      90
    );
  }

  // Asset replacement recommendation
  if (portfolioAnalysis.assetContributions.length >= 2) {
    const rankedByRisk = [...portfolioAnalysis.assetContributions].sort((a, b) => b.riskScore - a.riskScore);
    const highestRiskAsset = rankedByRisk[0];
    const lowestRiskAsset = [...portfolioAnalysis.assetContributions].sort((a, b) => a.riskScore - b.riskScore)[0];
    const highestRiskHolding = portfolio.find((asset) => asset.ticker === highestRiskAsset.ticker);

    const sameSectorLowerRisk = rankedByRisk
      .slice()
      .reverse()
      .find((candidate) => {
        const candidateHolding = portfolio.find((asset) => asset.ticker === candidate.ticker);
        return (
          candidate.ticker !== highestRiskAsset.ticker &&
          candidateHolding?.sector === highestRiskHolding?.sector
        );
      });

    if (sameSectorLowerRisk && highestRiskHolding) {
      addRecommendation(
        `Replace strategy: reduce ${highestRiskAsset.ticker} (${highestRiskAsset.riskScore.toFixed(1)} risk) and increase ${sameSectorLowerRisk.ticker} (${sameSectorLowerRisk.riskScore.toFixed(1)} risk) to keep ${highestRiskHolding.sector} exposure with lower geopolitical sensitivity.`,
        95
      );
    } else if (lowestRiskAsset.ticker !== highestRiskAsset.ticker) {
      addRecommendation(
        `Replace strategy: trim ${highestRiskAsset.ticker} (${highestRiskAsset.riskScore.toFixed(1)} risk) and add to ${lowestRiskAsset.ticker} (${lowestRiskAsset.riskScore.toFixed(1)} risk) as a direct lower-risk alternative.`,
        95
      );
    }
  }

  // Sector concentration recommendation
  const sectorCounts: { [key: string]: number } = {};
  portfolio.forEach((asset) => {
    sectorCounts[asset.sector] = (sectorCounts[asset.sector] || 0) + 1;
  });
  const mostCommonSector = Object.entries(sectorCounts).sort(([, a], [, b]) => b - a)[0];
  if (mostCommonSector && mostCommonSector[1] > portfolio.length * 0.3) {
    addRecommendation(
      `Your portfolio has high concentration in the ${mostCommonSector[0]} sector with ${mostCommonSector[1]} assets. Alternative: shift part of new buys toward ${lowRiskSectorText} and use lower-risk tickers like ${alternativeTickers}.`,
      80
    );
  }

  // Asset diversity recommendation
  if (portfolio.length < 5) {
    addRecommendation(
      `Your portfolio contains only ${portfolio.length} assets, which limits diversification benefits. Alternative: add 2-3 names from lower-risk options such as ${lowRiskAlternativeText}, across sectors like ${lowRiskSectorText}.`,
      75
    );
  }

  // Geographic breadth recommendation
  const uniqueCountries = new Set(
    portfolioAnalysis.countryExposures.map((e) => e.country)
  );
  if (uniqueCountries.size < 3) {
    addRecommendation(
      `Your portfolio is concentrated in only ${uniqueCountries.size} countries. Alternative: add exposure to ${lowRiskCountryText} so your allocation spans at least 5-7 countries.`,
      78
    );
  }

  addRecommendation(
    `Action plan: set a rebalance trigger to review ${highestRiskAsset?.ticker || "your highest-risk holding"} weekly and rotate increments into ${alternativeTickers} if its risk score rises further.`,
    65
  );

  addRecommendation(
    `Execution order: 1) reduce highest country concentration, 2) swap into lower-risk alternatives (${alternativeTickers}), 3) add exposure to ${lowRiskCountryText}.`,
    60
  );

  const recommendations = recommendationCandidates
    .sort((a, b) => b.priority - a.priority)
    .filter((item, index, arr) => arr.findIndex((candidate) => candidate.text === item.text) === index)
    .slice(0, 4);

  const getPriorityMeta = (priority: number) => {
    if (priority >= 90) {
      return { label: "Priority 1", className: "bg-red-950/40 text-red-300 border-red-900/50" };
    }

    if (priority >= 75) {
      return { label: "Priority 2", className: "bg-orange-950/30 text-orange-300 border-orange-900/50" };
    }

    return { label: "Priority 3", className: "bg-yellow-950/30 text-yellow-300 border-yellow-900/50" };
  };

  const getRiskLevel = (score: number) => {
    if (score >= 80) return { label: "CRITICAL", color: "text-red-400", bg: "bg-red-950/20" };
    if (score >= 60) return { label: "HIGH", color: "text-orange-400", bg: "bg-orange-950/20" };
    if (score >= 40) return { label: "MODERATE", color: "text-yellow-400", bg: "bg-yellow-950/20" };
    return { label: "LOW", color: "text-green-400", bg: "bg-green-950/20" };
  };

  // Get color for risk factor based on its score value (0-100) - matching map colors
  const getRiskFactorColor = (scoreValue: number) => {
    if (scoreValue > 80) return "from-red-900 to-red-800";
    if (scoreValue > 60) return "from-red-700 to-red-600";
    if (scoreValue > 40) return "from-orange-600 to-orange-500";
    if (scoreValue > 20) return "from-yellow-600 to-yellow-500";
    if (scoreValue > 5) return "from-yellow-500 to-yellow-400";
    return "from-lime-600 to-lime-500";
  };

  const riskLevel = getRiskLevel(riskScore);

  if (portfolio.length === 0 || portfolioAnalysis.countryExposures.length === 0) {
    return (
      <Card className="p-6 bg-zinc-950 border-zinc-900" role="status" aria-live="polite">
        <h2 className="text-sm font-semibold text-white mb-2">Summary</h2>
        {dataFreshnessLabel && (
          <div className="mb-3 inline-flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-[11px]">
            <span className={isStaleData ? "text-amber-300" : "text-emerald-300"}>{isStaleData ? "Stale" : "Fresh"}</span>
            <span className="text-zinc-400">{dataFreshnessLabel}</span>
          </div>
        )}
        <p className="text-sm text-zinc-300">Not enough portfolio data to generate insights yet.</p>
        <p className="text-xs text-zinc-500 mt-1">Add holdings or switch datasets to view recommendations and risk summaries.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {dataFreshnessLabel && (
        <div className="inline-flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-[11px]">
          <span className={isStaleData ? "text-amber-300" : "text-emerald-300"}>{isStaleData ? "Stale" : "Fresh"}</span>
          <span className="text-zinc-400">{dataFreshnessLabel}</span>
        </div>
      )}
      {/* Current Snapshot */}
      <Card className="p-4 bg-zinc-950 border-zinc-900">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="mb-1 flex items-center gap-1">
              <h2 className="text-sm font-semibold text-white">Portfolio Snapshot</h2>
              <RiskScoreInfo
                meaning="High-level summary of the portfolio's current geopolitical risk posture."
                calculation="Combines portfolio risk score, global baseline risk, diversification counts, and active factor weights from current settings."
              />
            </div>
            <p className="text-xs text-zinc-500">Risk assessment based on current weights and global conditions</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded text-xs font-semibold ${riskLevel.color} ${riskLevel.bg}`}>
              {riskLevel.label}
            </div>
          </div>
        </div>

        {/* Risk Gauge and Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Risk Gauge */}
          <div className="md:col-span-1 flex items-center justify-center">
            <div className="w-full max-w-xs">
              <div className="relative w-40 h-20 mx-auto">
                <svg viewBox="0 0 200 100" className="w-full h-full">
                  {/* Background arc */}
                  <path
                    d="M 20 90 A 80 80 0 0 1 180 90"
                    fill="none"
                    stroke="#27272a"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  
                  {/* Colored segments - matching map colors */}
                  <path d="M 20 90 A 80 80 0 0 1 56 34" fill="none" stroke="#16a34a" strokeWidth="10" strokeLinecap="round" />
                  <path d="M 56 34 A 80 80 0 0 1 100 20" fill="none" stroke="#eab308" strokeWidth="10" strokeLinecap="round" />
                  <path d="M 100 20 A 80 80 0 0 1 144 34" fill="none" stroke="#f59e0b" strokeWidth="10" strokeLinecap="round" />
                  <path d="M 144 34 A 80 80 0 0 1 180 90" fill="none" stroke="#dc2626" strokeWidth="10" strokeLinecap="round" />
                  
                  {/* Needle */}
                  <g transform={`rotate(${(riskScore / 100) * 180 - 90} 100 90)`}>
                    <circle cx="100" cy="90" r="6" fill="#09090b" />
                    <path d="M 100 90 L 100 35" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="100" cy="35" r="3" fill="#ef4444" />
                  </g>
                  
                  {/* Center circle */}
                  <circle cx="100" cy="90" r="5" fill="#18181b" stroke="#ef4444" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="text-center mt-2">
                <p className="text-2xl font-bold text-white">{riskScore.toFixed(0)}</p>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-xs text-zinc-500">Portfolio Risk</p>
                  <RiskScoreInfo
                    meaning="Overall geopolitical risk level for your current portfolio on a 0-100 scale."
                    calculation="Computed from country dependency risks per asset, weighted by each asset's portfolio allocation, then normalized to 0-100."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="md:col-span-2 grid grid-cols-3 gap-2">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded p-3">
              <div className="mb-1 flex items-center gap-1">
                <p className="text-xs text-zinc-500">Global Avg Risk</p>
                <RiskScoreInfo
                  meaning="Average geopolitical risk across all tracked countries."
                  calculation="Simple average of country risk scores currently loaded in the dashboard risk dataset."
                />
              </div>
              <p className="text-lg font-bold text-white">{averageGlobalRisk}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded p-3">
              <div className="mb-1 flex items-center gap-1">
                <p className="text-xs text-zinc-500">Assets</p>
                <RiskScoreInfo
                  meaning="Count of individual holdings included in this summary view."
                  calculation="Direct count of assets currently loaded in your portfolio list."
                />
              </div>
              <p className="text-lg font-bold text-white">{portfolio.length}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded p-3">
              <div className="mb-1 flex items-center gap-1">
                <p className="text-xs text-zinc-500">Countries</p>
                <RiskScoreInfo
                  meaning="Number of unique countries contributing to portfolio exposure."
                  calculation="Distinct count of country names found in portfolio country exposure analysis."
                />
              </div>
              <p className="text-lg font-bold text-white">{new Set(portfolioAnalysis.countryExposures.map((e) => e.country)).size}</p>
            </div>
          </div>
        </div>

        {/* Risk Factor Breakdown */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded p-3">
          <div className="mb-2 flex items-center gap-1">
            <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Active Risk Factors</p>
            <RiskScoreInfo
              meaning="Relative weighting of the geopolitical factors currently driving model sensitivity."
              calculation="Each factor is normalized as a percent of the total selected factor weights."
            />
          </div>
          <div className="grid grid-cols-5 gap-3">
            {normalizedRiskFactors.map((factor) => {
              const scoreValue = factor.normalizedScore;
              const colorClass = getRiskFactorColor(scoreValue);
              return (
                <div key={factor.name} className="text-center">
                  <p className="text-xs text-zinc-500 mb-2">{factor.name}</p>
                  <div className="h-16 bg-zinc-800/50 rounded relative overflow-hidden border border-zinc-700/50">
                    <div
                      className={`absolute bottom-0 w-full bg-gradient-to-t ${colorClass}`}
                      style={{ height: `${Math.min(scoreValue, 100)}%` }}
                    />
                    <p className="absolute inset-0 flex items-end justify-center pb-1 text-xs font-bold text-white drop-shadow-lg">
                      {scoreValue.toFixed(0)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Key Insights */}
      <Card className="p-4 bg-zinc-950 border-zinc-900">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="size-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Potential Losses from Exposure</h3>
          <RiskScoreInfo
            meaning="Estimated downside if the portfolio is not diversified while current geopolitical stress persists."
            calculation="Estimated loss = portfolio value × [weighted country risk × scenario stress factor], adjusted upward for concentration in the largest country exposure."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          <div className="bg-zinc-900/40 p-2 rounded border border-zinc-800/50">
            <p className="text-[11px] text-zinc-500">Portfolio Value</p>
            <p className="text-sm font-semibold text-zinc-100">{formatUsdWithSuffix(displayPortfolioValueUsd)}</p>
          </div>
          <div className="bg-zinc-900/40 p-2 rounded border border-zinc-800/50">
            <p className="text-[11px] text-zinc-500">Primary Scenario</p>
            <p className={`text-sm font-semibold ${primaryScenario?.colorClass || "text-zinc-100"}`}>
              {primaryScenario?.label || "Base"}
            </p>
          </div>
          <div className="bg-zinc-900/40 p-2 rounded border border-zinc-800/50">
            <p className="text-[11px] text-zinc-500">Primary Loss (USD)</p>
            <p className="text-sm font-semibold text-red-300">{usdFormatter.format(primaryScenario?.lossUsd || 0)}</p>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-[11px] text-zinc-500 mb-2">Scenario Driver</p>
          <div className="inline-flex flex-wrap rounded border border-zinc-800 overflow-hidden">
            {[
              { key: "auto", label: `Auto (${autoPrimaryScenario?.label || "Base"})` },
              { key: "conservative", label: "Conservative" },
              { key: "base", label: "Base" },
              { key: "aggressive", label: "Aggressive" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setScenarioSelection(option.key as "auto" | "conservative" | "base" | "aggressive")}
                className={`px-2 py-1 text-[11px] border-r last:border-r-0 border-zinc-800 transition-colors ${
                  scenarioSelection === option.key
                    ? "bg-zinc-700 text-white"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          {lossScenarios.map((scenario) => (
            <div key={scenario.key} className="bg-zinc-900/40 p-2 rounded border border-zinc-800/50">
              <p className={`text-xs font-semibold ${scenario.colorClass}`}>{scenario.label}</p>
              <p className="text-[11px] text-zinc-500">Drawdown: {(scenario.lossPct * 100).toFixed(1)}%</p>
              <p className="text-[11px] text-zinc-300">Loss: {usdFormatter.format(scenario.lossUsd)}</p>
              <p className="text-[11px] text-zinc-400">Remaining: {usdFormatter.format(scenario.remainingValueUsd)}</p>
            </div>
          ))}
        </div>

        <div className="bg-zinc-900/40 p-3 rounded border border-zinc-800/50 text-xs text-zinc-300 space-y-1">
          <p>
            Under current conditions, if diversification is not improved, this portfolio could lose approximately
            <span className="font-semibold text-red-300"> {usdFormatter.format(primaryScenario?.lossUsd || 0)}</span>
            {" "}from its current value of
            <span className="font-semibold text-zinc-100"> {formatUsdWithSuffix(displayPortfolioValueUsd)}</span>.
          </p>
          <p>
            That implies a stressed remaining value near
            <span className="font-semibold text-zinc-100"> {usdFormatter.format(primaryScenario?.remainingValueUsd || totalPortfolioValueUsd)}</span>,
            driven by an average exposure-adjusted country risk of
            <span className="font-semibold text-zinc-100"> {weightedCountryRiskScore.toFixed(0)}</span>
            {" "}and concentration in
            <span className="font-semibold text-zinc-100"> {portfolioAnalysis.countryExposures[0]?.country || "your top country"}</span>.
          </p>
        </div>
      </Card>

      {/* Key Insights */}
      <Card className="p-4 bg-zinc-950 border-zinc-900">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="size-4 text-green-400" />
          <h3 className="text-sm font-semibold text-white">Key Insights</h3>
          <RiskScoreInfo
            meaning="Auto-generated interpretation of your portfolio's current geopolitical risk profile."
            calculation="Built from current risk score, country exposure concentration, and dominant risk-factor weighting."
          />
        </div>
        <div className="space-y-2 text-xs text-zinc-300">
          {insights.map((insight, idx) => (
            <div key={idx} className="bg-zinc-900/40 p-2 rounded border border-zinc-800/50">
              <p>{insight}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Recommendations */}
      <Card className="p-4 bg-zinc-950 border-zinc-900">
        <div className="flex items-center gap-2 mb-2">
          <Target className="size-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Recommendations</h3>
          <RiskScoreInfo
            meaning="Action-oriented suggestions to reduce risk concentration and improve resilience."
            calculation="Generated from threshold rules based on total risk score, top-risk countries, and concentration checks."
          />
        </div>
        <div className="space-y-2 text-xs text-zinc-300">
          {recommendations.map((rec, idx) => {
            const priority = getPriorityMeta(rec.priority);
            return (
            <div key={idx} className="bg-zinc-900/40 p-2 rounded border border-zinc-800/50">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${priority.className}`}>
                  {priority.label}
                </span>
                <span className="text-[10px] text-zinc-500">Weight {rec.priority}</span>
              </div>
              <p>{rec.text}</p>
            </div>
            );
          })}
        </div>
      </Card>

      {/* Top Exposures */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Risk Assets */}
        <Card className="p-4 bg-zinc-950 border-zinc-900">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="size-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-white">Top Risk Assets</h3>
            <RiskScoreInfo
              meaning="Assets contributing the most to total portfolio geopolitical risk."
              calculation="Ranked by each asset's risk contribution score derived from dependency exposure and portfolio weighting."
            />
          </div>
          <div className="space-y-2">
            {portfolioAnalysis.topRiskAssets.slice(0, 7).map((asset) => {
              const contrib = portfolioAnalysis.assetContributions.find((a) => a.ticker === asset);
              return (
                <div key={asset} className="flex items-center justify-between text-xs bg-zinc-900/40 p-2 rounded border border-zinc-800/50">
                  <span className="font-mono text-zinc-300">{asset}</span>
                  <span className="text-orange-400 font-semibold">{contrib?.riskScore.toFixed(2) || "N/A"}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top Risk Countries */}
        <Card className="p-4 bg-zinc-950 border-zinc-900">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="size-4 text-red-400" />
            <h3 className="text-sm font-semibold text-white">Top Risk Countries</h3>
            <RiskScoreInfo
              meaning="Countries with the highest risk impact on your current holdings."
              calculation="Ranked by aggregated country risk contribution from all assets with exposure to each country."
            />
          </div>
          <div className="space-y-2">
            {portfolioAnalysis.topRiskCountries.slice(0, 5).map((country) => {
              const risk = riskData[country] || 0;
              const exposure = portfolioAnalysis.countryExposures.find((e) => e.country === country);
              return (
                <div key={country} className="flex items-center justify-between text-xs bg-zinc-900/40 p-2 rounded border border-zinc-800/50">
                  <div className="flex-1">
                    <p className="text-zinc-300 font-medium">{country}</p>
                    <p className="text-zinc-600 text-[10px]">{exposure?.contributingAssets.join(", ")}</p>
                  </div>
                  <span className={`font-semibold ${risk > 60 ? "text-red-400" : "text-yellow-400"}`}>
                    {risk.toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <AssetLevelIntelligencePanel
        portfolio={portfolio}
        riskData={riskData}
      />
    </div>
  );
}
