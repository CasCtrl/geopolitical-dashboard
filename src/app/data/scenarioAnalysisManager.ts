/**
 * Scenario Analysis Manager
 * Performs what-if analysis on portfolios and geopolitical scenarios
 * Allows users to test impact of asset changes and crisis scenarios
 */

import { Asset, calculatePortfolioRisk } from "./portfolioData";

export interface PortfolioScenario {
  id: string;
  name: string;
  description: string;
  type: "custom" | "crisis" | "rebalance"; // Type of scenario
  baselinePortfolio: Asset[];
  modifiedPortfolio: Asset[];
  baselineRisk: number; // 0-100
  scenarioRisk: number; // 0-100
  riskChange: number; // Percentage change
  impactedCountries: {
    country: string;
    currentRisk: number;
    scenarioRisk: number;
    change: number;
  }[];
  createdAt: string;
  savedResults?: {
    topGainers?: string[];
    topLosers?: string[];
    riskReduction?: number;
  };
}

export interface CrisisScenario {
  id: string;
  name: string;
  description: string;
  affectedCountries: string[];
  riskMultiplier: number; // 1.5 = 50% increase
  affectedSectors?: string[]; // Sectors most impacted
}

const SCENARIOS_KEY = "geopolitical_scenarios";
const CRISIS_TEMPLATES_KEY = "geopolitical_crisis_templates";
const MAX_SCENARIOS = 50;

// Default crisis scenario templates
const DEFAULT_CRISIS_SCENARIOS: CrisisScenario[] = [
  {
    id: "crisis_taiwan",
    name: "Taiwan Conflict",
    description: "Armed conflict over Taiwan strait",
    affectedCountries: ["Taiwan", "China", "United States", "Japan", "South Korea"],
    riskMultiplier: 2.0,
    affectedSectors: ["semiconductors", "electronics", "energy"],
  },
  {
    id: "crisis_energy",
    name: "Energy Crisis",
    description: "Global energy supply disruption",
    affectedCountries: [
      "Russia",
      "Saudi Arabia",
      "Iran",
      "United States",
      "Europe",
    ],
    riskMultiplier: 1.8,
    affectedSectors: ["energy", "utilities", "transportation"],
  },
  {
    id: "crisis_banking",
    name: "Financial Crisis",
    description: "Major banking system collapse",
    affectedCountries: ["United States", "China", "Europe", "Japan"],
    riskMultiplier: 2.5,
    affectedSectors: ["finance", "banking", "real_estate"],
  },
  {
    id: "crisis_cyber",
    name: "Cyber Warfare",
    description: "Global cyber attack infrastructure",
    affectedCountries: ["United States", "China", "Russia", "Europe"],
    riskMultiplier: 1.6,
    affectedSectors: ["technology", "finance", "utilities"],
  },
  {
    id: "crisis_pandemic",
    name: "Global Pandemic",
    description: "New infectious disease outbreak",
    affectedCountries: [], // All countries affected
    riskMultiplier: 1.7,
    affectedSectors: ["healthcare", "pharmaceuticals", "logistics"],
  },
];

/**
 * Get default crisis scenario templates
 */
export function getCrisisScenarioTemplates(): CrisisScenario[] {
  try {
    const stored = localStorage.getItem(CRISIS_TEMPLATES_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.error("[Scenario] Failed to load crisis templates:", error);
  }
  return DEFAULT_CRISIS_SCENARIOS;
}

/**
 * Create a custom scenario
 */
export function createScenario(
  name: string,
  description: string,
  type: "custom" | "crisis" | "rebalance",
  baselinePortfolio: Asset[],
  modifiedPortfolio: Asset[],
  baselineRisk: number,
  currentCountryRisks: { [country: string]: number }
): PortfolioScenario {
  const id = `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Calculate scenario risk (simplified - would use actual portfolio calculation)
  const scenarioRisk = calculatePortfolioRisk(modifiedPortfolio, currentCountryRisks).totalRiskScore;
  const riskChange = ((scenarioRisk - baselineRisk) / baselineRisk) * 100;

  const scenario: PortfolioScenario = {
    id,
    name,
    description,
    type,
    baselinePortfolio: JSON.parse(JSON.stringify(baselinePortfolio)), // Deep copy
    modifiedPortfolio: JSON.parse(JSON.stringify(modifiedPortfolio)), // Deep copy
    baselineRisk: Math.round(baselineRisk * 10) / 10,
    scenarioRisk: Math.round(scenarioRisk * 10) / 10,
    riskChange: Math.round(riskChange * 10) / 10,
    impactedCountries: calculateCountryImpact(
      baselinePortfolio,
      modifiedPortfolio,
      currentCountryRisks
    ),
    createdAt: new Date().toISOString(),
  };

  const scenarios = getAllScenarios();
  scenarios.push(scenario);

  if (scenarios.length > MAX_SCENARIOS) {
    scenarios.shift();
  }

  try {
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify(scenarios));
    console.log(`[Scenario] Created scenario: ${name} (${id})`);
  } catch (error) {
    console.error("[Scenario] Failed to save scenario:", error);
  }

  return scenario;
}

/**
 * Apply a crisis scenario to existing portfolio
 */
export function applyCrisisScenario(
  portfolio: Asset[],
  crisis: CrisisScenario,
  currentCountryRisks: { [country: string]: number }
): PortfolioScenario {
  // Increase risk for affected countries
  const modifiedRisks = JSON.parse(JSON.stringify(currentCountryRisks));

  for (const country of crisis.affectedCountries) {
    if (modifiedRisks[country] !== undefined) {
      modifiedRisks[country] = Math.min(100, modifiedRisks[country] * crisis.riskMultiplier);
    }
  }

  const baselineRisk = calculatePortfolioRisk(portfolio, currentCountryRisks).totalRiskScore;
  const scenarioRisk = calculatePortfolioRisk(portfolio, modifiedRisks).totalRiskScore;

  return {
    id: `crisis_${crisis.id}_${Date.now()}`,
    name: `${crisis.name} Scenario`,
    description: crisis.description,
    type: "crisis",
    baselinePortfolio: JSON.parse(JSON.stringify(portfolio)),
    modifiedPortfolio: JSON.parse(JSON.stringify(portfolio)), // Same assets, different risk scores
    baselineRisk: Math.round(baselineRisk * 10) / 10,
    scenarioRisk: Math.round(scenarioRisk * 10) / 10,
    riskChange: Math.round(((scenarioRisk - baselineRisk) / baselineRisk) * 100 * 10) / 10,
    impactedCountries: crisis.affectedCountries.map((country) => ({
      country,
      currentRisk: Math.round((currentCountryRisks[country] || 0) * 10) / 10,
      scenarioRisk: Math.round((modifiedRisks[country] || 0) * 10) / 10,
      change: Math.round(((modifiedRisks[country] || 0) - (currentCountryRisks[country] || 0)) * 10) / 10,
    })),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Test removing an asset from portfolio
 */
export function testRemoveAsset(
  portfolio: Asset[],
  assetTicker: string,
  currentCountryRisks: { [country: string]: number }
): PortfolioScenario {
  const baselineRisk = calculatePortfolioRisk(portfolio, currentCountryRisks).totalRiskScore;
  const modifiedPortfolio = portfolio.filter((a) => a.ticker !== assetTicker);
  const scenarioRisk = calculatePortfolioRisk(modifiedPortfolio, currentCountryRisks).totalRiskScore;

  return {
    id: `remove_${assetTicker}_${Date.now()}`,
    name: `Remove ${assetTicker}`,
    description: `Impact of removing ${assetTicker} from portfolio`,
    type: "custom",
    baselinePortfolio: JSON.parse(JSON.stringify(portfolio)),
    modifiedPortfolio: JSON.parse(JSON.stringify(modifiedPortfolio)),
    baselineRisk: Math.round(baselineRisk * 10) / 10,
    scenarioRisk: Math.round(scenarioRisk * 10) / 10,
    riskChange: Math.round(((scenarioRisk - baselineRisk) / baselineRisk) * 100 * 10) / 10,
    impactedCountries: calculateCountryImpact(
      portfolio,
      modifiedPortfolio,
      currentCountryRisks
    ),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Test adding an asset to portfolio
 */
export function testAddAsset(
  portfolio: Asset[],
  newAsset: Asset,
  currentCountryRisks: { [country: string]: number }
): PortfolioScenario {
  const baselineRisk = calculatePortfolioRisk(portfolio, currentCountryRisks).totalRiskScore;
  const modifiedPortfolio = [...portfolio, newAsset];
  const scenarioRisk = calculatePortfolioRisk(modifiedPortfolio, currentCountryRisks).totalRiskScore;

  return {
    id: `add_${newAsset.ticker}_${Date.now()}`,
    name: `Add ${newAsset.ticker}`,
    description: `Impact of adding ${newAsset.ticker} to portfolio`,
    type: "custom",
    baselinePortfolio: JSON.parse(JSON.stringify(portfolio)),
    modifiedPortfolio: JSON.parse(JSON.stringify(modifiedPortfolio)),
    baselineRisk: Math.round(baselineRisk * 10) / 10,
    scenarioRisk: Math.round(scenarioRisk * 10) / 10,
    riskChange: Math.round(((scenarioRisk - baselineRisk) / baselineRisk) * 100 * 10) / 10,
    impactedCountries: calculateCountryImpact(
      portfolio,
      modifiedPortfolio,
      currentCountryRisks
    ),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Helper: Calculate country impact between two portfolios
 */
function calculateCountryImpact(
  baselinePortfolio: Asset[],
  modifiedPortfolio: Asset[],
  currentCountryRisks: { [country: string]: number }
): PortfolioScenario["impactedCountries"] {
  const baselineExposure = calculateExposure(baselinePortfolio);
  const modifiedExposure = calculateExposure(modifiedPortfolio);

  const impactedCountries: PortfolioScenario["impactedCountries"] = [];
  const allCountries = new Set([
    ...Object.keys(baselineExposure),
    ...Object.keys(modifiedExposure),
  ]);

  for (const country of allCountries) {
    const baselineExp = baselineExposure[country] || 0;
    const modifiedExp = modifiedExposure[country] || 0;

    if (Math.abs(baselineExp - modifiedExp) > 0.1) {
      const risk = currentCountryRisks[country] || 0;

      impactedCountries.push({
        country,
        currentRisk: Math.round(risk * 10) / 10,
        scenarioRisk: Math.round(risk * 10) / 10, // Same risk, different exposure
        change: Math.round((modifiedExp - baselineExp) * 100 * 10) / 10,
      });
    }
  }

  return impactedCountries.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

/**
 * Helper: Calculate country exposure from portfolio
 */
function calculateExposure(portfolio: Asset[]): { [country: string]: number } {
  const exposure: { [country: string]: number } = {};

  for (const asset of portfolio) {
    for (const dep of asset.countryDependencies) {
      const assetContribution = (asset.weight / 100) * dep.weight;
      exposure[dep.country] = (exposure[dep.country] || 0) + assetContribution;
    }
  }

  return exposure;
}

/**
 * Get all saved scenarios
 */
export function getAllScenarios(): PortfolioScenario[] {
  try {
    const stored = localStorage.getItem(SCENARIOS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("[Scenario] Failed to load scenarios:", error);
    return [];
  }
}

/**
 * Get scenario by ID
 */
export function getScenario(id: string): PortfolioScenario | null {
  const scenarios = getAllScenarios();
  return scenarios.find((s) => s.id === id) || null;
}

/**
 * Delete a scenario
 */
export function deleteScenario(id: string): boolean {
  const scenarios = getAllScenarios();
  const filtered = scenarios.filter((s) => s.id !== id);

  if (filtered.length === scenarios.length) return false;

  try {
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify(filtered));
    console.log(`[Scenario] Deleted scenario: ${id}`);
  } catch (error) {
    console.error("[Scenario] Failed to delete scenario:", error);
  }

  return true;
}

/**
 * Clear all scenarios (for testing)
 */
export function clearAllScenarios(): void {
  localStorage.removeItem(SCENARIOS_KEY);
  console.log("[Scenario] Cleared all scenarios");
}

/**
 * Get scenarios of a specific type
 */
export function getScenariosByType(type: "custom" | "crisis" | "rebalance"): PortfolioScenario[] {
  return getAllScenarios().filter((s) => s.type === type);
}

/**
 * Get recommended rebalancing suggestions
 */
export function getRebalancingSuggestions(
  portfolio: Asset[],
  currentCountryRisks: { [country: string]: number },
  _targetRiskReduction: number = 10 // Target 10% risk reduction
): {
  suggestions: Array<{
    action: "remove" | "reduce" | "add";
    asset?: string;
    reason: string;
    potentialRiskReduction: number;
  }>;
  bestScenario?: PortfolioScenario;
} {
  const currentRisk = calculatePortfolioRisk(portfolio, currentCountryRisks).totalRiskScore;
  const suggestions: Array<{
    action: "remove" | "reduce" | "add";
    asset?: string;
    reason: string;
    potentialRiskReduction: number;
  }> = [];

  // Identify high-risk assets
  for (const asset of portfolio) {
    const assetRisk = asset.countryDependencies.reduce((sum, dep) => {
      const countryRisk = currentCountryRisks[dep.country] || 0;
      return sum + countryRisk * dep.weight;
    }, 0) / Math.max(asset.countryDependencies.length, 1);

    if (assetRisk > 60) {
      const scenario = testRemoveAsset(portfolio, asset.ticker, currentCountryRisks);
      const riskReduction = ((currentRisk - scenario.scenarioRisk) / currentRisk) * 100;

      suggestions.push({
        action: "remove",
        asset: asset.ticker,
        reason: `High geopolitical risk exposure (${Math.round(assetRisk)})`,
        potentialRiskReduction: Math.round(riskReduction * 10) / 10,
      });
    }
  }

  suggestions.sort((a, b) => b.potentialRiskReduction - a.potentialRiskReduction);

  return {
    suggestions: suggestions.slice(0, 5), // Top 5 suggestions
    bestScenario: suggestions.length > 0
      ? testRemoveAsset(portfolio, suggestions[0].asset!, currentCountryRisks)
      : undefined,
  };
}
