import { Card } from "./ui/card";
import { AlertTriangle, TrendingUp, Target, Shield } from "lucide-react";
import { RiskScoreInfo } from "./RiskScoreInfo";

interface SummaryProps {
  portfolioAnalysis: {
    totalRiskScore: number;
    countryExposures: Array<{ country: string; riskContribution: number; contributingAssets: string[] }>;
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
  portfolio: Array<{ ticker: string; name: string; sector: string; weight: number; value: number }>;
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
  
  // Generate insights
  const insights: string[] = [];
  const recommendations: string[] = [];

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
    recommendations.push(
      "Your portfolio is exposed to critical geopolitical risks. Take immediate action to reduce exposure to high-risk assets or regions. Consider increasing allocation to assets in stable, low-risk countries."
    );
  } else if (riskScore >= 60) {
    recommendations.push(
      "Your portfolio carries significant geopolitical risk. Review your asset allocation and implement hedging strategies for major exposures. Focus on rebalancing toward lower-risk geographic regions."
    );
  } else if (riskScore >= 40) {
    recommendations.push(
      "Your portfolio shows moderate risk exposure. Monitor key geopolitical developments in your primary exposure regions, especially emerging markets and conflict zones. Maintain current diversification but stay vigilant."
    );
  } else {
    recommendations.push(
      "Your portfolio demonstrates strong resilience to geopolitical shocks. Continue maintaining diversified exposure across regions and risk factors to preserve this advantage."
    );
  }

  // Specific country recommendation
  if (portfolioAnalysis.topRiskCountries.length > 0) {
    const topCountry = portfolioAnalysis.topRiskCountries[0];
    const topCountryRisk = riskData[topCountry] || 0;
    recommendations.push(
      `${topCountry} represents your highest geographic risk exposure with a score of ${topCountryRisk.toFixed(0)}. Review your holdings in this region and consider reducing exposure or adding hedges.`
    );
  }

  // Sector concentration recommendation
  const sectorCounts: { [key: string]: number } = {};
  portfolio.forEach((asset) => {
    sectorCounts[asset.sector] = (sectorCounts[asset.sector] || 0) + 1;
  });
  const mostCommonSector = Object.entries(sectorCounts).sort(([, a], [, b]) => b - a)[0];
  if (mostCommonSector && mostCommonSector[1] > portfolio.length * 0.3) {
    recommendations.push(
      `Your portfolio has high concentration in the ${mostCommonSector[0]} sector with ${mostCommonSector[1]} assets. Diversify into other sectors to reduce sector-specific geopolitical vulnerability.`
    );
  }

  // Asset diversity recommendation
  if (portfolio.length < 5) {
    recommendations.push(
      `Your portfolio contains only ${portfolio.length} assets, which limits diversification benefits. Consider adding more assets across different geographies and sectors to better distribute risk.`
    );
  }

  // Geographic breadth recommendation
  const uniqueCountries = new Set(
    portfolioAnalysis.countryExposures.map((e) => e.country)
  );
  if (uniqueCountries.size < 3) {
    recommendations.push(
      `Your portfolio is concentrated in only ${uniqueCountries.size} countries. Expand geographic exposure to at least 5-7 countries to reduce country-specific and regional geopolitical risk.`
    );
  }

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
        <div className="flex items-start justify-between mb-4">
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
          <div className="mb-3 flex items-center gap-1">
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
        <div className="flex items-center gap-2 mb-3">
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
        <div className="flex items-center gap-2 mb-3">
          <Target className="size-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Recommendations</h3>
          <RiskScoreInfo
            meaning="Action-oriented suggestions to reduce risk concentration and improve resilience."
            calculation="Generated from threshold rules based on total risk score, top-risk countries, and concentration checks."
          />
        </div>
        <div className="space-y-2 text-xs text-zinc-300">
          {recommendations.map((rec, idx) => (
            <div key={idx} className="bg-zinc-900/40 p-2 rounded border border-zinc-800/50">
              <p>{rec}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Top Exposures */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Risk Assets */}
        <Card className="p-4 bg-zinc-950 border-zinc-900">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="size-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-white">Top Risk Assets</h3>
            <RiskScoreInfo
              meaning="Assets contributing the most to total portfolio geopolitical risk."
              calculation="Ranked by each asset's risk contribution score derived from dependency exposure and portfolio weighting."
            />
          </div>
          <div className="space-y-2">
            {portfolioAnalysis.topRiskAssets.slice(0, 5).map((asset) => {
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
          <div className="flex items-center gap-2 mb-3">
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
    </div>
  );
}
