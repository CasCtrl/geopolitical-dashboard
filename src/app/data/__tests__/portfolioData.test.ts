import { calculatePortfolioRisk, defaultPortfolio, Asset } from '../portfolioData';
import { calculateRiskIndex } from '../countryRiskData';

describe('Portfolio Risk Calculation', () => {
  /**
   * Test 1: Portfolio risk should be 0 when no countries have risk
   * TDD: With zero country risk scores, portfolio should show no risk
   */
  test('should return zero portfolio risk when country risks are zero', () => {
    const zeroRiskData: { [key: string]: number } = {};
    // Create a map with all countries having 0 risk
    ['United States', 'China', 'Taiwan', 'Saudi Arabia', 'Germany', 'India'].forEach(
      (country) => {
        zeroRiskData[country] = 0;
      }
    );

    const result = calculatePortfolioRisk(defaultPortfolio, zeroRiskData);

    expect(result.totalRiskScore).toBe(0);
    expect(result.countryExposures.length).toBeGreaterThan(0); // Still tracks exposures
    result.countryExposures.forEach((exposure) => {
      expect(exposure.riskContribution).toBe(0); // But no risk contribution
    });
  });

  /**
   * Test 2: Top risk countries should be correctly identified
   * TDD: Highest contributing countries should be in top risk list
   */
  test('should correctly identify top 5 risk countries', () => {
    const riskData: { [key: string]: number } = {};
    riskData['United States'] = 10;
    riskData['China'] = 50; // High risk
    riskData['Taiwan'] = 75; // Highest risk
    riskData['Saudi Arabia'] = 45;
    riskData['Germany'] = 5;
    riskData['India'] = 15;

    const result = calculatePortfolioRisk(defaultPortfolio, riskData);

    expect(result.topRiskCountries).toContain('Taiwan');
    expect(result.topRiskCountries).toContain('China');
    expect(result.topRiskCountries.length).toBeLessThanOrEqual(5);
  });

  /**
   * Test 3: Assets with higher weights should contribute more to risk
   * TDD: Asset weight should proportionally impact portfolio risk
   */
  test('should scale asset risk contribution by asset weight', () => {
    const sampleRisk: { [key: string]: number } = {};
    const countries = ['United States', 'China', 'Taiwan', 'Saudi Arabia', 'Germany', 'India', 'United Arab Emirates', 'Iraq', 'Russia'];
    countries.forEach((c) => (sampleRisk[c] = 50));

    const result = calculatePortfolioRisk(defaultPortfolio, sampleRisk);

    // Asset with highest weight (AAPL at 20%) should contribute more
    const aapl = result.assetContributions.find((a) => a.ticker === 'AAPL');
    const btc = result.assetContributions.find((a) => a.ticker === 'BTC');

    expect(aapl?.riskScore).toBeGreaterThan(btc?.riskScore || 0);
  });

  /**
   * Test 4: Portfolio should handle empty or missing country data gracefully
   * TDD: Missing country risk data should default to 0, not crash
   */
  test('should handle missing country risk data gracefully', () => {
    const sparseRiskData: { [key: string]: number } = {
      'United States': 20,
      // Missing other countries - should default to 0
    };

    expect(() => {
      calculatePortfolioRisk(defaultPortfolio, sparseRiskData);
    }).not.toThrow();

    const result = calculatePortfolioRisk(defaultPortfolio, sparseRiskData);
    expect(result.totalRiskScore).toBeGreaterThanOrEqual(0);
  });

  /**
   * Test 5: Country exposure types should match asset dependency types
   * TDD: Country exposure should correctly aggregate by dependency type
   */
  test('should correctly categorize country exposures by type (direct/indirect/macro)', () => {
    const riskData: { [key: string]: number } = {};
    ['United States', 'China', 'Taiwan', 'Saudi Arabia', 'Germany', 'India', 'United Arab Emirates', 'Iraq', 'Russia'].forEach(
      (c) => (riskData[c] = 30)
    );

    const result = calculatePortfolioRisk(defaultPortfolio, riskData);

    // Verify exposure types are valid
    result.countryExposures.forEach((exposure) => {
      expect(['direct', 'indirect', 'macro']).toContain(exposure.exposureType);
    });

    // United States should have direct exposures (headquarters)
    const usExposure = result.countryExposures.find((e) => e.country === 'United States');
    expect(usExposure?.exposureType).toBe('direct');

    // China should have indirect exposures (manufacturing)
    const chinaExposure = result.countryExposures.find((e) => e.country === 'China');
    expect(['indirect', 'macro']).toContain(chinaExposure?.exposureType);
  });
});
