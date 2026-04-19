/**
 * Custom Scenario Builder
 * Allows users to create and test custom geopolitical crisis scenarios
 */

import { runBacktest, type BacktestResult } from './backtestingEngine';

export interface CustomScenario {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  countryRiskMultipliers: { [country: string]: number };
  affectedRegions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  expectedDuration: 'days' | 'weeks' | 'months' | 'years';
}

export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  baseMultipliers: { [country: string]: number };
  suggestedAdjustments: string;
}

const STORAGE_KEY = 'geopolitical_custom_scenarios';

/**
 * Scenario templates for quick creation
 */
export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'template-trade-war',
    name: 'Trade War Escalation',
    description: 'Major global trade conflict affecting key trading partners',
    baseMultipliers: {
      'United States': 1.3,
      China: 1.4,
      'European Union': 1.2,
      Japan: 1.1,
      'South Korea': 1.2,
    },
    suggestedAdjustments: 'Increase US/China if tensions escalate. Add trading partners.',
  },
  {
    id: 'template-regional-conflict',
    name: 'Regional Military Conflict',
    description: 'Armed conflict affecting specific region and trading routes',
    baseMultipliers: {
      'Middle East': 2.0,
      'Saudi Arabia': 2.2,
      Iran: 2.3,
      'United States': 1.2,
      Europe: 1.1,
    },
    suggestedAdjustments: 'Adjust affected region. Consider global shipping impact.',
  },
  {
    id: 'template-pandemic',
    name: 'Disease Outbreak',
    description: 'Global or regional pandemic affecting economics and stability',
    baseMultipliers: {
      'United States': 1.5,
      Europe: 1.4,
      China: 1.6,
      India: 1.5,
      Brazil: 1.4,
    },
    suggestedAdjustments: 'Increase for densely populated areas. Consider supply chain.',
  },
  {
    id: 'template-currency-crisis',
    name: 'Currency Crisis',
    description: 'Major currency devaluation and financial instability in one or more countries',
    baseMultipliers: {
      'Emerging Markets': 1.8,
      Brazil: 2.0,
      India: 1.5,
      Mexico: 1.7,
      Russia: 1.6,
    },
    suggestedAdjustments: 'Focus on emerging markets. Add contagion effects.',
  },
  {
    id: 'template-political-crisis',
    name: 'Political Crisis',
    description: 'Sudden government collapse, coup, or major political upheaval',
    baseMultipliers: {
      'Specific Country': 2.5,
      'Neighboring Countries': 1.3,
    },
    suggestedAdjustments: 'Select target country and increase. Adjust neighbors for contagion.',
  },
  {
    id: 'template-cyber-attack',
    name: 'Critical Cyber Attack',
    description: 'Major cyberattack on financial or infrastructure systems',
    baseMultipliers: {
      'United States': 1.8,
      'United Kingdom': 1.7,
      'Germany': 1.6,
      'Japan': 1.5,
      'Singapore': 1.5,
    },
    suggestedAdjustments: 'Focus on financial hubs. Consider supply chain disruption.',
  },
  {
    id: 'template-commodity-shock',
    name: 'Commodity Price Shock',
    description: 'Sudden spike or collapse in commodity prices',
    baseMultipliers: {
      'Saudi Arabia': 2.0,
      Russia: 1.8,
      Canada: 1.2,
      Australia: 1.3,
      'Emerging Markets': 1.5,
    },
    suggestedAdjustments: 'Adjust based on commodity type (oil, metals, agriculture).',
  },
];

/**
 * Create a new custom scenario
 */
export function createCustomScenario(
  name: string,
  description: string,
  countryRiskMultipliers: { [country: string]: number },
  affectedRegions: string[],
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  expectedDuration: 'days' | 'weeks' | 'months' | 'years' = 'months'
): CustomScenario {
  const scenario: CustomScenario = {
    id: `custom-${Date.now()}`,
    name,
    description,
    createdAt: new Date().toISOString(),
    countryRiskMultipliers,
    affectedRegions,
    severity,
    expectedDuration,
  };

  // Save to storage
  saveCustomScenario(scenario);

  return scenario;
}

/**
 * Save scenario to local storage
 */
export function saveCustomScenario(scenario: CustomScenario): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const scenarios = stored ? JSON.parse(stored) : [];

    // Update if exists, otherwise add
    const existingIndex = scenarios.findIndex((s: CustomScenario) => s.id === scenario.id);
    if (existingIndex >= 0) {
      scenarios[existingIndex] = scenario;
    } else {
      scenarios.push(scenario);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
    console.log('[Scenarios] Saved scenario:', scenario.name);
  } catch (error) {
    console.error('[Scenarios] Failed to save scenario:', error);
  }
}

/**
 * Load all custom scenarios
 */
export function getCustomScenarios(): CustomScenario[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[Scenarios] Failed to load scenarios:', error);
    return [];
  }
}

/**
 * Get scenario by ID
 */
export function getScenarioById(id: string): CustomScenario | null {
  const scenarios = getCustomScenarios();
  return scenarios.find((s) => s.id === id) || null;
}

/**
 * Delete scenario
 */
export function deleteCustomScenario(id: string): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const scenarios = JSON.parse(stored).filter((s: CustomScenario) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
    console.log('[Scenarios] Deleted scenario:', id);
  } catch (error) {
    console.error('[Scenarios] Failed to delete scenario:', error);
  }
}

/**
 * Test a custom scenario against portfolio
 */
export function testCustomScenario(
  scenario: CustomScenario,
  baselineCountryRisks: { [country: string]: number },
  portfolioExposures: Array<{ country: string; riskContribution: number; name: string }>,
  currentRisk: number
): BacktestResult & { severityAssessment: string } {
  // Convert to BacktestScenario format for runBacktest
  const backtestScenario = {
    id: scenario.id,
    name: scenario.name,
    description: scenario.description,
    date: scenario.createdAt,
    countryRiskMultipliers: scenario.countryRiskMultipliers,
    affectedRegions: scenario.affectedRegions,
    expectedImpact: scenario.description,
  };

  const result = runBacktest(
    backtestScenario,
    baselineCountryRisks,
    portfolioExposures,
    currentRisk
  );

  // Add severity assessment
  let severityAssessment = '';
  switch (scenario.severity) {
    case 'low':
      severityAssessment = '🟢 Low severity - Limited market impact expected';
      break;
    case 'medium':
      severityAssessment = '🟡 Medium severity - Moderate market disruption likely';
      break;
    case 'high':
      severityAssessment = '🟠 High severity - Significant market impact expected';
      break;
    case 'critical':
      severityAssessment = '🔴 Critical severity - Severe market disruption likely';
      break;
  }

  return {
    ...result,
    severityAssessment,
  };
}

/**
 * Generate template-based scenario
 */
export function generateFromTemplate(
  template: ScenarioTemplate,
  customizations: { [country: string]: number }
): CustomScenario {
  const multipliers = {
    ...template.baseMultipliers,
    ...customizations,
  };

  return createCustomScenario(
    template.name,
    template.description,
    multipliers,
    Object.keys(multipliers),
    'medium',
    'months'
  );
}

/**
 * Calculate scenario similarity to historical crises
 */
export function calculateSimilarityToHistorical(
  scenario: CustomScenario,
  historicalScenario: {
    countryRiskMultipliers: { [country: string]: number };
    name: string;
  }
): number {
  let matchCount = 0;
  let totalChecks = 0;

  for (const country in historicalScenario.countryRiskMultipliers) {
    if (country in scenario.countryRiskMultipliers) {
      const histValue = historicalScenario.countryRiskMultipliers[country];
      const customValue = scenario.countryRiskMultipliers[country];

      // Check if multipliers are within 20% of each other
      if (Math.abs(histValue - customValue) / Math.max(histValue, customValue) < 0.2) {
        matchCount++;
      }
      totalChecks++;
    }
  }

  return totalChecks > 0 ? (matchCount / totalChecks) * 100 : 0;
}

/**
 * Get risk statistics for custom scenario
 */
export function getScenarioStats(scenario: CustomScenario): {
  averageMultiplier: number;
  maxMultiplier: number;
  minMultiplier: number;
  affectedCountries: number;
} {
  const multipliers = Object.values(scenario.countryRiskMultipliers);

  return {
    averageMultiplier: Math.round((multipliers.reduce((a, b) => a + b) / multipliers.length) * 100) / 100,
    maxMultiplier: Math.round(Math.max(...multipliers) * 100) / 100,
    minMultiplier: Math.round(Math.min(...multipliers) * 100) / 100,
    affectedCountries: multipliers.length,
  };
}
