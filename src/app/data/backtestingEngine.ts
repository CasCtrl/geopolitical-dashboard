/**
 * Backtesting Engine
 * Tests portfolio performance against historical crisis scenarios
 */

export interface BacktestScenario {
  id: string;
  name: string;
  description: string;
  date: string;
  countryRiskMultipliers: {
    [country: string]: number; // Multiplier applied to base risk
  };
  affectedRegions: string[];
  expectedImpact: string;
}

export interface BacktestResult {
  scenario: BacktestScenario;
  baselineRisk: number;
  stressedRisk: number;
  riskIncrease: number;
  percentageIncrease: number;
  wouldHaveFired: boolean; // If alert thresholds would have been exceeded
  affectedHoldings: Array<{
    name: string;
    baseRisk: number;
    stressedRisk: number;
    exposure: number;
  }>;
  recommendation: string;
}

/**
 * Historical crisis scenarios for backtesting
 */
export const HISTORICAL_SCENARIOS: BacktestScenario[] = [
  {
    id: 'covid-2020',
    name: 'COVID-19 Pandemic (2020)',
    description: 'Global pandemic caused supply chain disruptions and economic contraction',
    date: '2020-03-01',
    countryRiskMultipliers: {
      'United States': 1.4,
      'China': 1.5,
      'Italy': 2.0,
      'Spain': 1.8,
      'Japan': 1.3,
      'South Korea': 1.4,
      'Germany': 1.3,
      'France': 1.3,
      'United Kingdom': 1.3,
      'India': 1.6,
      'Brazil': 1.5,
    },
    affectedRegions: ['Americas', 'Europe', 'Asia'],
    expectedImpact: 'Economic disruption, supply chain issues, increased political tensions',
  },
  {
    id: 'russia-ukraine-2022',
    name: 'Russia-Ukraine War (2022)',
    description: 'Russian invasion of Ukraine caused energy crisis and geopolitical tensions',
    date: '2022-02-24',
    countryRiskMultipliers: {
      'Russia': 2.5,
      'Ukraine': 3.0,
      'Poland': 1.6,
      'Germany': 1.5,
      'France': 1.2,
      'United Kingdom': 1.2,
      'United States': 1.1,
      'Japan': 1.1,
      'South Korea': 1.1,
    },
    affectedRegions: ['Europe'],
    expectedImpact: 'Energy crisis, supply chain disruption, geopolitical realignment',
  },
  {
    id: 'financial-crisis-2008',
    name: '2008 Financial Crisis',
    description: 'Global financial system collapse affecting all markets',
    date: '2008-09-15',
    countryRiskMultipliers: {
      'United States': 2.5,
      'United Kingdom': 2.0,
      'Germany': 1.8,
      'France': 1.8,
      'Japan': 1.5,
      'China': 1.2,
      'Brazil': 1.6,
      'India': 1.3,
      'Australia': 1.4,
      'Singapore': 1.3,
    },
    affectedRegions: ['Americas', 'Europe', 'Asia'],
    expectedImpact: 'Credit crunch, currency volatility, political instability',
  },
  {
    id: 'taiwan-strait-crisis',
    name: 'Taiwan Strait Crisis (Hypothetical)',
    description: 'Escalation in China-Taiwan tensions affecting supply chains',
    date: '2024-01-01',
    countryRiskMultipliers: {
      'China': 2.2,
      'Taiwan': 2.8,
      'United States': 1.3,
      'Japan': 1.5,
      'South Korea': 1.4,
      'Singapore': 1.5,
      'Vietnam': 1.3,
      'Philippines': 1.2,
    },
    affectedRegions: ['Asia'],
    expectedImpact: 'Semiconductor supply disruption, military escalation, investment uncertainty',
  },
  {
    id: 'middle-east-conflict',
    name: 'Middle East Energy Crisis (Hypothetical)',
    description: 'Major conflict disrupting Middle East oil supplies',
    date: '2024-06-01',
    countryRiskMultipliers: {
      'Saudi Arabia': 2.5,
      'Iran': 2.8,
      'Israel': 2.2,
      'UAE': 1.8,
      'Iraq': 2.3,
      'Yemen': 2.5,
      'United States': 1.2,
      'Germany': 1.3,
      'China': 1.2,
      'Japan': 1.3,
      'India': 1.2,
    },
    affectedRegions: ['Middle East', 'Europe', 'Asia'],
    expectedImpact: 'Oil price spike, energy crisis, global inflation',
  },
  {
    id: 'cyberattack-pandemic',
    name: 'Global Cyber Attack (Hypothetical)',
    description: 'Coordinated cyber attacks on financial infrastructure',
    date: '2024-09-01',
    countryRiskMultipliers: {
      'United States': 2.0,
      'United Kingdom': 1.8,
      'Germany': 1.7,
      'France': 1.5,
      'Japan': 1.6,
      'China': 1.8,
      'Russia': 1.5,
      'India': 1.4,
      'Australia': 1.4,
      'Singapore': 1.4,
    },
    affectedRegions: ['Americas', 'Europe', 'Asia'],
    expectedImpact: 'Financial system disruption, data breaches, regulatory crackdowns',
  },
];

/**
 * Run backtest for a scenario
 */
export function runBacktest(
  scenario: BacktestScenario,
  baselineCountryRisks: { [country: string]: number },
  portfolioExposures: Array<{ country: string; riskContribution: number; name: string }>,
  currentRisk: number
): BacktestResult {
  // Apply multipliers to get stressed risk scores
  const stressedCountryRisks: { [country: string]: number } = {};

  for (const country in baselineCountryRisks) {
    const multiplier = scenario.countryRiskMultipliers[country] || 1.0;
    stressedCountryRisks[country] = Math.min(100, baselineCountryRisks[country] * multiplier);
  }

  // Recalculate portfolio risk under stress
  let stressedRisk = 0;
  const affectedHoldings: BacktestResult['affectedHoldings'] = [];

  portfolioExposures.forEach((exposure) => {
    const baselineRisk = baselineCountryRisks[exposure.country] || 50;
    const stressedRiskScore = stressedCountryRisks[exposure.country] || baselineRisk;

    stressedRisk += (stressedRiskScore / 100) * exposure.riskContribution;

    affectedHoldings.push({
      name: exposure.name || exposure.country,
      baseRisk: Math.round(baselineRisk),
      stressedRisk: Math.round(stressedRiskScore),
      exposure: Math.round(exposure.riskContribution * 100) / 100,
    });
  });

  const riskIncrease = stressedRisk - currentRisk;
  const percentageIncrease = currentRisk > 0 ? (riskIncrease / currentRisk) * 100 : 0;

  // Determine if alert would have fired (typical threshold is >70)
  const wouldHaveFired = stressedRisk > 70;

  let recommendation = 'Portfolio would have weathered this scenario.';
  if (percentageIncrease > 50) {
    recommendation = `⚠️ Risk would have increased ${percentageIncrease.toFixed(0)}%. Consider hedging or rebalancing.`;
  } else if (percentageIncrease > 25) {
    recommendation = `Risk would have increased ${percentageIncrease.toFixed(0)}%. Monitor exposure to affected regions.`;
  }

  if (wouldHaveFired) {
    recommendation += ' Alert threshold would have been triggered.';
  }

  return {
    scenario,
    baselineRisk: Math.round(currentRisk),
    stressedRisk: Math.round(stressedRisk),
    riskIncrease: Math.round(riskIncrease * 100) / 100,
    percentageIncrease: Math.round(percentageIncrease * 100) / 100,
    wouldHaveFired,
    affectedHoldings: affectedHoldings
      .filter((h) => h.baseRisk !== h.stressedRisk)
      .sort((a, b) => (b.stressedRisk - b.baseRisk) - (a.stressedRisk - a.baseRisk)),
    recommendation,
  };
}

/**
 * Run all backtests and return summary
 */
export function runAllBacktests(
  baselineCountryRisks: { [country: string]: number },
  portfolioExposures: Array<{ country: string; riskContribution: number; name: string }>,
  currentRisk: number
): BacktestResult[] {
  return HISTORICAL_SCENARIOS.map((scenario) =>
    runBacktest(scenario, baselineCountryRisks, portfolioExposures, currentRisk)
  );
}

/**
 * Get stress test summary statistics
 */
export function getBacktestSummary(results: BacktestResult[]) {
  const wouldHaveFired = results.filter((r) => r.wouldHaveFired).length;
  const maxRiskIncrease = Math.max(...results.map((r) => r.riskIncrease));
  const avgRiskIncrease =
    results.reduce((sum, r) => sum + r.riskIncrease, 0) / results.length;
  const worstScenario = results.reduce((worst, r) =>
    r.stressedRisk > worst.stressedRisk ? r : worst
  );

  return {
    totalScenarios: results.length,
    wouldHaveFired,
    maxRiskIncrease: Math.round(maxRiskIncrease * 100) / 100,
    avgRiskIncrease: Math.round(avgRiskIncrease * 100) / 100,
    worstScenario,
    resilience: Math.max(
      0,
      100 - (wouldHaveFired / results.length) * 50 - (maxRiskIncrease / 100) * 50
    ),
  };
}
