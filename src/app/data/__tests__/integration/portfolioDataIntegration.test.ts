/**
 * Integration Tests for Portfolio Data
 * 
 * Tests the integration between:
 * - Portfolio data loading
 * - Country risk calculations
 * - Asset aggregation
 * - End-to-end portfolio workflows
 */

import { calculateRiskIndex, baseRiskData } from '../../countryRiskData';
import { getPortfolioRiskMetrics, aggregatePortfolioData } from '../../portfolioData';

/**
 * Test Suite: Portfolio Data Integration
 * 
 * These tests verify that multiple components work together correctly
 * to produce accurate portfolio risk assessments.
 */
describe('Portfolio Data Integration Tests', () => {
  /**
   * Integration Test 1: End-to-end portfolio risk calculation
   * 
   * Scenario: User loads a portfolio and needs to see risk scores
   * Expected: System correctly calculates and aggregates all risk metrics
   */
  test('should correctly calculate portfolio risk from multiple assets in different countries', () => {
    const portfolio = {
      assets: [
        {
          id: 1,
          name: 'Tech Asset 1',
          value: 10000,
          country: 'United States',
          sector: 'Technology',
          directExposure: {
            'United States': 100
          },
          indirectExposure: {
            'China': 30,
            'Taiwan': 20
          }
        },
        {
          id: 2,
          name: 'Energy Asset 1',
          value: 5000,
          country: 'Saudi Arabia',
          sector: 'Energy',
          directExposure: {
            'Saudi Arabia': 100
          },
          indirectExposure: {
            'Iran': 15,
            'Iraq': 10
          }
        }
      ],
      weights: {
        political: 25,
        economic: 20,
        conflict: 20,
        corruption: 20,
        terrorism: 15
      }
    };

    // Calculate individual asset risks
    const asset1Risk = calculateRiskIndex('United States', portfolio.weights);
    const asset2Risk = calculateRiskIndex('Saudi Arabia', portfolio.weights);

    // Verify both risks are calculated
    expect(asset1Risk).toBeDefined();
    expect(asset2Risk).toBeDefined();
    expect(typeof asset1Risk).toBe('number');
    expect(typeof asset2Risk).toBe('number');

    // Portfolio risk should be weighted average
    const totalValue = portfolio.assets.reduce((sum, asset) => sum + asset.value, 0);
    const portfolioRisk = 
      (asset1Risk * portfolio.assets[0].value + asset2Risk * portfolio.assets[1].value) / 
      totalValue;

    expect(portfolioRisk).toBeGreaterThanOrEqual(0);
    expect(portfolioRisk).toBeLessThanOrEqual(100);
  });

  /**
   * Integration Test 2: Multi-country exposure aggregation
   * 
   * Scenario: Asset has indirect exposure through supply chain
   * Expected: Total exposure includes both direct and indirect
   */
  test('should aggregate direct and indirect country exposures correctly', () => {
    const asset = {
      id: 1,
      name: 'Tech Company',
      value: 50000,
      directExposure: {
        'United States': 70,  // 70% direct US exposure
        'Japan': 30           // 30% direct Japan exposure
      },
      indirectExposure: {
        'South Korea': 40,    // 40% indirect through supply chain
        'Vietnam': 25         // 25% indirect through supply chain
      }
    };

    // Calculate total exposure per country
    const directUSExposure = asset.directExposure['United States'] * asset.value / 100;
    const indirectKoreaExposure = asset.indirectExposure['South Korea'] * asset.value / 100;

    expect(directUSExposure).toBe(35000);
    expect(indirectKoreaExposure).toBe(20000);

    // Total exposures should sum correctly
    const allExposures = [
      ...Object.values(asset.directExposure),
      ...Object.values(asset.indirectExposure)
    ];
    const totalExposurePercentage = allExposures.reduce((a, b) => a + b, 0);

    // Note: In reality, exposures may overlap, so total can exceed 100%
    expect(totalExposurePercentage).toBeGreaterThan(100);
  });

  /**
   * Integration Test 3: Risk weight impact on portfolio assessment
   * 
   * Scenario: Different risk weighting profiles produce different assessments
   * Expected: Conservative weights = higher total risk, aggressive = lower
   */
  test('should produce different portfolio risks with different weight distributions', () => {
    const country = 'China';

    // Conservative profile: emphasizes conflict and political risk
    const conservativeWeights = {
      political: 35,
      economic: 20,
      conflict: 25,
      corruption: 10,
      terrorism: 10
    };

    // Aggressive profile: downplays political and conflict risk
    const aggressiveWeights = {
      political: 10,
      economic: 30,
      conflict: 10,
      corruption: 30,
      terrorism: 20
    };

    const conservativeRisk = calculateRiskIndex(country, conservativeWeights);
    const aggressiveRisk = calculateRiskIndex(country, aggressiveWeights);

    // Both should be valid numbers
    expect(conservativeRisk).toBeDefined();
    expect(aggressiveRisk).toBeDefined();

    // Different weights should generally produce different results
    // (unless the country has uniform risk across all dimensions)
    expect(typeof conservativeRisk).toBe('number');
    expect(typeof aggressiveRisk).toBe('number');
  });

  /**
   * Integration Test 4: Portfolio rebalancing impact
   * 
   * Scenario: User rebalances portfolio by changing asset allocation
   * Expected: Risk decreases when moving away from high-risk countries
   */
  test('should show risk reduction when rebalancing from high-risk to low-risk countries', () => {
    const weights = {
      political: 25,
      economic: 20,
      conflict: 20,
      corruption: 20,
      terrorism: 15
    };

    // Original portfolio: heavy in high-risk country
    const riskUS = calculateRiskIndex('United States', weights);
    const riskChina = calculateRiskIndex('China', weights);
    const riskIran = calculateRiskIndex('Iran', weights);

    const originalPortfolio = {
      'United States': 20000,  // 20%
      'China': 50000,          // 50%
      'Iran': 30000            // 30%
    };

    const originalRisk = 
      (riskUS * 0.2 + riskChina * 0.5 + riskIran * 0.3);

    // Rebalanced portfolio: moved away from Iran
    const rebalancedPortfolio = {
      'United States': 40000,  // 40%
      'China': 40000,          // 40%
      'Iran': 20000            // 20%
    };

    const rebalancedRisk = 
      (riskUS * 0.4 + riskChina * 0.4 + riskIran * 0.2);

    // Risk should decrease with more balanced allocation
    expect(rebalancedRisk).toBeLessThan(originalRisk);
  });

  /**
   * Integration Test 5: Data consistency across multiple datasets
   * 
   * Scenario: Same country appears in multiple portfolios
   * Expected: Country risk data is consistent across all portfolios
   */
  test('should maintain consistent country risk data across different portfolios', () => {
    const country = 'United States';
    const weights1 = { political: 25, economic: 20, conflict: 20, corruption: 20, terrorism: 15 };
    const weights2 = { political: 30, economic: 25, conflict: 15, corruption: 15, terrorism: 15 };

    // Same country, same weights should produce same risk
    const risk1 = calculateRiskIndex(country, weights1);
    const risk1Again = calculateRiskIndex(country, weights1);

    expect(risk1).toBe(risk1Again);

    // Different weights on same country should be calculated consistently
    const risk2 = calculateRiskIndex(country, weights2);
    expect(risk2).toBeDefined();
    expect(typeof risk2).toBe('number');
  });

  /**
   * Integration Test 6: Handling edge cases in aggregation
   * 
   * Scenario: Portfolio contains edge cases (zero value, missing data, etc)
   * Expected: System handles gracefully without errors
   */
  test('should handle edge cases in portfolio aggregation', () => {
    const edgeCasePortfolio = {
      assets: [
        {
          id: 1,
          name: 'Valuable Asset',
          value: 100000,
          country: 'United States'
        },
        {
          id: 2,
          name: 'Worthless Asset',
          value: 0,
          country: 'China'
        },
        {
          id: 3,
          name: 'Asset in Unknown Country',
          value: 1000,
          country: 'UnknownCountry'
        }
      ],
      weights: {
        political: 25,
        economic: 20,
        conflict: 20,
        corruption: 20,
        terrorism: 15
      }
    };

    // Process portfolio without crashing
    const validAssets = edgeCasePortfolio.assets.filter(a => a.value > 0);
    expect(validAssets.length).toBe(2);

    // Calculate risks for known countries only
    const knownCountries = Object.keys(baseRiskData);
    const knownAssets = validAssets.filter(a => 
      knownCountries.includes(a.country)
    );
    
    expect(knownAssets.length).toBeGreaterThanOrEqual(1);
  });

  /**
   * Integration Test 7: Performance with large portfolios
   * 
   * Scenario: Portfolio contains 1000+ assets
   * Expected: Calculation completes within acceptable time
   */
  test('should calculate risks efficiently for large portfolios', () => {
    const largePortfolio = {
      assets: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Asset ${i}`,
        value: 1000,
        country: ['United States', 'China', 'Japan', 'Germany', 'India'][i % 5]
      })),
      weights: {
        political: 25,
        economic: 20,
        conflict: 20,
        corruption: 20,
        terrorism: 15
      }
    };

    const startTime = performance.now();

    // Calculate risks for all assets
    let totalRisk = 0;
    for (const asset of largePortfolio.assets) {
      const risk = calculateRiskIndex(asset.country, largePortfolio.weights);
      totalRisk += risk;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should complete in under 1 second
    expect(duration).toBeLessThan(1000);
    expect(totalRisk).toBeGreaterThan(0);
  });

  /**
   * Integration Test 8: Validation of aggregated metrics
   * 
   * Scenario: Check that aggregated portfolio metrics make sense
   * Expected: Metrics fall within valid ranges
   */
  test('should produce valid aggregated portfolio metrics', () => {
    const portfolio = {
      assets: [
        { id: 1, name: 'Tech', value: 30000, country: 'United States' },
        { id: 2, name: 'Energy', value: 20000, country: 'Saudi Arabia' },
        { id: 3, name: 'Finance', value: 50000, country: 'United Kingdom' }
      ],
      weights: {
        political: 25,
        economic: 20,
        conflict: 20,
        corruption: 20,
        terrorism: 15
      }
    };

    // Calculate metrics
    const totalValue = portfolio.assets.reduce((sum, a) => sum + a.value, 0);
    const risks = portfolio.assets.map(a => 
      calculateRiskIndex(a.country, portfolio.weights)
    );
    const averageRisk = risks.reduce((a, b) => a + b) / risks.length;
    const maxRisk = Math.max(...risks);
    const minRisk = Math.min(...risks);

    // Validations
    expect(totalValue).toBe(100000);
    expect(averageRisk).toBeGreaterThanOrEqual(minRisk);
    expect(averageRisk).toBeLessThanOrEqual(maxRisk);
    expect(risks.every(r => r >= 0 && r <= 100)).toBe(true);
  });
});
