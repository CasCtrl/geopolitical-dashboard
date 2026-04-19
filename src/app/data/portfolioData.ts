export interface CountryDependency {
  country: string;
  weight: number; // 0-1, how much this asset depends on this country
  type: "direct" | "indirect" | "macro";
  reason: string;
}

export interface Asset {
  ticker: string;
  name: string;
  weight: number; // percentage
  value: number;
  sector: string;
  countryDependencies: CountryDependency[];
}

export interface PortfolioExposure {
  country: string;
  exposureType: "direct" | "indirect" | "macro";
  totalExposure: number;
  contributingAssets: string[];
  riskContribution: number;
}

export interface AssetContribution {
  ticker: string;
  riskScore: number;
  mainRisk?: string;
}

// Example portfolio
export const defaultPortfolio: Asset[] = [
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    weight: 20,
    value: 50000,
    sector: "technology",
    countryDependencies: [
      { country: "United States", weight: 0.7, type: "direct", reason: "U.S. headquarters and operations" },
      { country: "China", weight: 0.6, type: "indirect", reason: "Manufacturing and supply chain" },
      { country: "Taiwan", weight: 0.3, type: "indirect", reason: "Semiconductor supply chain" },
    ],
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corporation",
    weight: 20,
    value: 50000,
    sector: "technology",
    countryDependencies: [
      { country: "United States", weight: 0.8, type: "direct", reason: "U.S. headquarters and operations" },
      { country: "India", weight: 0.2, type: "indirect", reason: "Development centers" },
    ],
  },
  {
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    weight: 15,
    value: 37500,
    sector: "technology",
    countryDependencies: [
      { country: "United States", weight: 0.6, type: "direct", reason: "U.S. headquarters" },
      { country: "Taiwan", weight: 0.9, type: "indirect", reason: "TSMC semiconductor manufacturing" },
      { country: "China", weight: 0.4, type: "indirect", reason: "Market demand" },
    ],
  },
  {
    ticker: "XOM",
    name: "Exxon Mobil",
    weight: 15,
    value: 37500,
    sector: "energy",
    countryDependencies: [
      { country: "United States", weight: 0.7, type: "direct", reason: "U.S. headquarters and operations" },
      { country: "Saudi Arabia", weight: 0.5, type: "indirect", reason: "OPEC energy market influence" },
      { country: "United Arab Emirates", weight: 0.4, type: "indirect", reason: "Gulf energy market" },
      { country: "Iraq", weight: 0.3, type: "indirect", reason: "Regional energy supply" },
    ],
  },
  {
    ticker: "TSLA",
    name: "Tesla Inc.",
    weight: 15,
    value: 37500,
    sector: "manufacturing",
    countryDependencies: [
      { country: "United States", weight: 0.6, type: "direct", reason: "U.S. headquarters" },
      { country: "China", weight: 0.7, type: "indirect", reason: "Shanghai Gigafactory and market" },
      { country: "Germany", weight: 0.3, type: "indirect", reason: "Berlin Gigafactory" },
    ],
  },
  {
    ticker: "BTC",
    name: "Bitcoin ETF",
    weight: 15,
    value: 37500,
    sector: "commodities",
    countryDependencies: [
      { country: "United States", weight: 0.4, type: "macro", reason: "Regulatory environment" },
      { country: "China", weight: 0.3, type: "macro", reason: "Mining and regulation" },
      { country: "Russia", weight: 0.2, type: "macro", reason: "Sanctions and alternative currency" },
    ],
  },
];

export function calculatePortfolioRisk(
  assets: Asset[],
  countryRiskScores: { [country: string]: number }
): {
  totalRiskScore: number;
  countryExposures: PortfolioExposure[];
  assetContributions: AssetContribution[];
  topRiskCountries: string[];
  topRiskAssets: string[];
} {
  const countryExposureMap = new Map<string, PortfolioExposure>();
  const assetContributions: AssetContribution[] = [];

  let totalRiskScore = 0;

  // Calculate exposure for each asset
  assets.forEach((asset) => {
    let assetRiskContribution = 0;
    let assetMainRisk = "";
    let maxRiskForAsset = 0;

    asset.countryDependencies.forEach((dep) => {
      const countryRisk = countryRiskScores[dep.country] !== undefined ? countryRiskScores[dep.country] : 0;
      // Country Exposure Score = Asset Weight × Country Dependency Weight × Country Risk Factor
      const exposureScore = (asset.weight / 100) * dep.weight * countryRisk;
      
      assetRiskContribution += exposureScore;

      if (exposureScore > maxRiskForAsset) {
        maxRiskForAsset = exposureScore;
        assetMainRisk = `${dep.country} - ${dep.reason}`;
      }

      // Track country exposure
      const existing = countryExposureMap.get(dep.country);
      if (existing) {
        existing.totalExposure += asset.weight * dep.weight;
        existing.riskContribution += exposureScore;
        if (!existing.contributingAssets.includes(asset.ticker)) {
          existing.contributingAssets.push(asset.ticker);
        }
      } else {
        countryExposureMap.set(dep.country, {
          country: dep.country,
          exposureType: dep.type,
          totalExposure: asset.weight * dep.weight,
          contributingAssets: [asset.ticker],
          riskContribution: exposureScore,
        });
      }
    });

    totalRiskScore += assetRiskContribution;
    assetContributions.push({
      ticker: asset.ticker,
      riskScore: assetRiskContribution,
      mainRisk: assetMainRisk,
    });
  });

  const countryExposures = Array.from(countryExposureMap.values()).sort(
    (a, b) => b.riskContribution - a.riskContribution
  );

  const topRiskCountries = countryExposures.slice(0, 5).map((e) => e.country);
  
  const topRiskAssets = assetContributions
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5)
    .map((a) => a.ticker);

  return {
    totalRiskScore: Math.min(100, Math.round(totalRiskScore)),
    countryExposures,
    assetContributions: assetContributions.sort((a, b) => b.riskScore - a.riskScore),
    topRiskCountries,
    topRiskAssets,
  };
}