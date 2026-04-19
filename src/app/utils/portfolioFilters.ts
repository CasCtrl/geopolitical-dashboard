import { Asset as PortfolioAsset } from '../data/portfolioData';

// Simplified asset type for holdings/portfolios
export interface HoldingAsset {
  symbol: string;
  name: string;
  country: string;
  sector: string;
  value: number;
  allocation?: number;
}

export interface Portfolio {
  id: string;
  name: string;
  description: string;
  assets: HoldingAsset[];
  createdAt: string;
  updatedAt: string;
}

export interface ScreeningCriteria {
  minRisk?: number;
  maxRisk?: number;
  sectors?: string[];
  countries?: string[];
  assetValue?: {
    min: number;
    max: number;
  };
}

export interface SectorData {
  sector: string;
  totalValue: number;
  averageRisk: number;
  assetCount: number;
  riskScore: number;
}

// Portfolio Management
export function createPortfolio(name: string, description: string, assets: HoldingAsset[] = []): Portfolio {
  return {
    id: `portfolio_${Date.now()}`,
    name,
    description,
    assets,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function savePortfolioToLocalStorage(portfolio: Portfolio): void {
  const portfolios = getPortfoliosFromLocalStorage();
  const index = portfolios.findIndex((p) => p.id === portfolio.id);
  
  if (index >= 0) {
    portfolios[index] = { ...portfolio, updatedAt: new Date().toISOString() };
  } else {
    portfolios.push(portfolio);
  }
  
  localStorage.setItem('portfolios', JSON.stringify(portfolios));
}

export function getPortfoliosFromLocalStorage(): Portfolio[] {
  const stored = localStorage.getItem('portfolios');
  return stored ? JSON.parse(stored) : [];
}

export function deletePortfolio(id: string): void {
  const portfolios = getPortfoliosFromLocalStorage();
  const filtered = portfolios.filter((p) => p.id !== id);
  localStorage.setItem('portfolios', JSON.stringify(filtered));
}

export function exportPortfolioAsJSON(portfolio: Portfolio): void {
  const dataStr = JSON.stringify(portfolio, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${portfolio.name}_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

// CSV Parsing for Holdings
export function parseCSVHoldings(csvText: string): HoldingAsset[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const assets: HoldingAsset[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    if (values.length < headers.length) continue;

    const asset: Record<string, string> = {};
    headers.forEach((header, index) => {
      asset[header] = values[index];
    });

    if (asset.symbol && asset.country) {
      assets.push({
        symbol: asset.symbol,
        name: asset.name || asset.symbol,
        country: asset.country,
        sector: asset.sector || 'Other',
        value: parseFloat(asset.value) || 0,
        allocation: parseFloat(asset.allocation) || 0,
      });
    }
  }

  return assets;
}

export function validateCSVHoldings(assets: HoldingAsset[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (assets.length === 0) {
    errors.push('No valid holdings found in CSV');
  }

  assets.forEach((asset, index) => {
    if (!asset.symbol) errors.push(`Row ${index + 2}: Missing symbol`);
    if (!asset.country) errors.push(`Row ${index + 2}: Missing country`);
    if (asset.value < 0) errors.push(`Row ${index + 2}: Invalid value`);
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function generateSampleCSV(): string {
  return `Symbol,Name,Country,Sector,Value,Allocation
AAPL,Apple Inc.,United States,Technology,150000,15
SAMSUNG,Samsung Electronics,South Korea,Technology,120000,12
NESTLE,Nestle SA,Switzerland,Consumer Staples,100000,10
BMW,BMW Group,Germany,Automotive,80000,8
SHELL,Shell Global,Netherlands,Energy,90000,9
GAZPROM,Gazprom,Russia,Energy,75000,7.5
SBER,Sberbank,Russia,Financials,70000,7
TSMC,Taiwan Semiconductor,Taiwan,Technology,85000,8.5
ALIBABA,Alibaba Group,China,Technology,100000,10
TATA,Tata Motors,India,Automotive,50000,5`;
}

// Sector Analysis
export function calculateSectorData(assets: HoldingAsset[], countryRisks: Record<string, number>): SectorData[] {
  const sectorMap = new Map<string, { assets: HoldingAsset[]; totalRisk: number }>();

  assets.forEach((asset) => {
    const sector = asset.sector || 'Other';
    const countryRisk = countryRisks[asset.country] || 50;

    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, { assets: [], totalRisk: 0 });
    }

    const sectorData = sectorMap.get(sector)!;
    sectorData.assets.push(asset);
    sectorData.totalRisk += countryRisk * (asset.allocation || 1);
  });

  const sectorDataArray: SectorData[] = [];

  sectorMap.forEach((data, sector) => {
    const totalValue = data.assets.reduce((sum, a) => sum + a.value, 0);
    const averageRisk = data.assets.length > 0 
      ? data.assets.reduce((sum, a) => sum + (countryRisks[a.country] || 50), 0) / data.assets.length
      : 0;

    sectorDataArray.push({
      sector,
      totalValue,
      averageRisk,
      assetCount: data.assets.length,
      riskScore: (data.totalRisk / data.assets.length) || 0,
    });
  });

  return sectorDataArray.sort((a, b) => b.totalValue - a.totalValue);
}

// Asset Screening
export function screenAssets(
  assets: HoldingAsset[],
  countryRisks: Record<string, number>,
  criteria: ScreeningCriteria
): HoldingAsset[] {
  return assets.filter((asset) => {
    const countryRisk = countryRisks[asset.country] || 50;

    // Risk filter
    if (criteria.minRisk !== undefined && countryRisk < criteria.minRisk) return false;
    if (criteria.maxRisk !== undefined && countryRisk > criteria.maxRisk) return false;

    // Sector filter
    if (criteria.sectors && criteria.sectors.length > 0) {
      if (!criteria.sectors.includes(asset.sector)) return false;
    }

    // Country filter
    if (criteria.countries && criteria.countries.length > 0) {
      if (!criteria.countries.includes(asset.country)) return false;
    }

    // Asset value filter
    if (criteria.assetValue) {
      if (asset.value < criteria.assetValue.min) return false;
      if (asset.value > criteria.assetValue.max) return false;
    }

    return true;
  });
}

export function getSectorsFromAssets(assets: HoldingAsset[]): string[] {
  const sectors = new Set(assets.map((a) => a.sector || 'Other'));
  return Array.from(sectors).sort();
}

export function getCountriesFromAssets(assets: HoldingAsset[]): string[] {
  const countries = new Set(assets.map((a) => a.country));
  return Array.from(countries).sort();
}

// Convert Portfolio Asset to Holding Asset for analysis
export function convertPortfolioAssetToHolding(asset: PortfolioAsset): HoldingAsset {
  const primaryCountry = asset.countryDependencies?.[0]?.country || 'Unknown';
  return {
    symbol: asset.ticker,
    name: asset.name,
    country: primaryCountry,
    sector: asset.sector,
    value: asset.value,
    allocation: asset.weight,
  };
}

