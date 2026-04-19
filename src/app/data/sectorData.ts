// Sector exposure to different countries
export interface SectorExposure {
  [country: string]: number; // percentage of sector exposure to this country
}

export interface Sector {
  name: string;
  exposure: SectorExposure;
  volatilityMultiplier: number; // How much geopolitical risk affects this sector
}

export const sectors: { [key: string]: Sector } = {
  technology: {
    name: "Technology",
    volatilityMultiplier: 1.3,
    exposure: {
      "United States": 45,
      "China": 25,
      "South Korea": 10,
      "Japan": 8,
      "Germany": 5,
      "India": 4,
      "Israel": 3,
    },
  },
  energy: {
    name: "Energy",
    volatilityMultiplier: 1.8,
    exposure: {
      "Saudi Arabia": 20,
      "United States": 18,
      "Russia": 15,
      "United Arab Emirates": 8,
      "Iraq": 7,
      "Iran": 6,
      "Norway": 5,
      "Canada": 5,
      "Nigeria": 4,
      "Venezuela": 3,
      "Mexico": 3,
      "Brazil": 3,
      "Libya": 3,
    },
  },
  finance: {
    name: "Finance",
    volatilityMultiplier: 1.2,
    exposure: {
      "United States": 40,
      "United Kingdom": 15,
      "China": 12,
      "Japan": 8,
      "France": 6,
      "Germany": 5,
      "Switzerland": 5,
      "Singapore": 4,
      "Canada": 3,
      "Australia": 2,
    },
  },
  healthcare: {
    name: "Healthcare",
    volatilityMultiplier: 0.9,
    exposure: {
      "United States": 50,
      "Switzerland": 12,
      "United Kingdom": 10,
      "Germany": 8,
      "France": 6,
      "Japan": 5,
      "Denmark": 4,
      "Ireland": 3,
      "Israel": 2,
    },
  },
  manufacturing: {
    name: "Manufacturing",
    volatilityMultiplier: 1.4,
    exposure: {
      "China": 30,
      "United States": 18,
      "Germany": 12,
      "Japan": 10,
      "South Korea": 8,
      "India": 6,
      "Mexico": 5,
      "Italy": 4,
      "Vietnam": 3,
      "Thailand": 2,
      "Poland": 2,
    },
  },
  "consumer-goods": {
    name: "Consumer Goods",
    volatilityMultiplier: 1.1,
    exposure: {
      "United States": 30,
      "China": 25,
      "Japan": 10,
      "Germany": 8,
      "United Kingdom": 7,
      "France": 5,
      "South Korea": 5,
      "India": 4,
      "Brazil": 3,
      "Mexico": 3,
    },
  },
  commodities: {
    name: "Commodities",
    volatilityMultiplier: 2.0,
    exposure: {
      "China": 20,
      "United States": 15,
      "Brazil": 12,
      "Russia": 10,
      "Australia": 10,
      "Canada": 8,
      "South Africa": 8,
      "Chile": 6,
      "Peru": 5,
      "Indonesia": 3,
      "India": 3,
    },
  },
  telecommunications: {
    name: "Telecommunications",
    volatilityMultiplier: 1.0,
    exposure: {
      "United States": 25,
      "China": 20,
      "Japan": 12,
      "Germany": 8,
      "United Kingdom": 8,
      "South Korea": 7,
      "France": 6,
      "Spain": 5,
      "India": 5,
      "Italy": 4,
    },
  },
};

export interface PortfolioAsset {
  id: string;
  name: string;
  sector: string;
  allocation: number; // percentage of portfolio
  currentValue: number;
}

export function calculatePortfolioRisk(
  assets: PortfolioAsset[],
  riskData: { [key: string]: number }
): {
  totalRisk: number;
  countryExposure: { [country: string]: number };
  sectorRisk: { [sector: string]: number };
  volatilityScore: number;
} {
  let totalRisk = 0;
  const countryExposure: { [country: string]: number } = {};
  const sectorRisk: { [sector: string]: number } = {};

  assets.forEach((asset) => {
    const sector = sectors[asset.sector];
    if (!sector) return;

    let assetRisk = 0;
    
    // Calculate risk from country exposure
    Object.entries(sector.exposure).forEach(([country, exposure]) => {
      const countryRisk = riskData[country] || 30;
      const exposureWeight = (exposure / 100) * (asset.allocation / 100);
      
      assetRisk += countryRisk * exposureWeight * sector.volatilityMultiplier;
      
      // Track country exposure
      countryExposure[country] = (countryExposure[country] || 0) + 
        asset.allocation * (exposure / 100);
    });

    totalRisk += assetRisk;
    sectorRisk[asset.sector] = (sectorRisk[asset.sector] || 0) + assetRisk;
  });

  // Calculate volatility score (0-100)
  const volatilityScore = Math.min(100, totalRisk * 1.5);

  return {
    totalRisk: Math.round(totalRisk * 10) / 10,
    countryExposure,
    sectorRisk,
    volatilityScore: Math.round(volatilityScore),
  };
}
