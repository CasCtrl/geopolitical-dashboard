import { calculateRiskIndex, baseRiskData } from '../countryRiskData';

describe('Risk Index Calculation', () => {
  /**
   * Test 1: Risk calculation should be 0 when all weights are 0
   * TDD: When no risk factors are weighted, portfolio risk should be minimal
   */
  test('should return 0 risk when all weights are zero', () => {
    const weights = {
      political: 0,
      economic: 0,
      conflict: 0,
      corruption: 0,
      terrorism: 0,
    };

    const riskScore = calculateRiskIndex('United States', weights);
    expect(riskScore).toBe(0);
  });

  /**
   * Test 2: Risk should scale with weight increases
   * TDD: Higher weights should produce higher risk scores
   */
  test('should increase risk proportionally with weight increases', () => {
    const lowWeights = {
      political: 10,
      economic: 0,
      conflict: 0,
      corruption: 0,
      terrorism: 0,
    };

    const highWeights = {
      political: 50,
      economic: 0,
      conflict: 0,
      corruption: 0,
      terrorism: 0,
    };

    const lowRisk = calculateRiskIndex('China', lowWeights);
    const highRisk = calculateRiskIndex('China', highWeights);

    expect(highRisk).toBeGreaterThan(lowRisk);
  });

  /**
   * Test 3: Risk values should stay within expected bounds
   * TDD: Risk should be divided by 500, so max realistic is ~100
   */
  test('should keep risk scores within reasonable bounds (0-100)', () => {
    const maxWeights = {
      political: 1,
      economic: 1,
      conflict: 1,
      corruption: 1,
      terrorism: 1,
    };

    Object.keys(baseRiskData).forEach((country) => {
      const risk = calculateRiskIndex(country, maxWeights);
      expect(risk).toBeGreaterThanOrEqual(0);
      expect(risk).toBeLessThanOrEqual(100);
    });
  });

  /**
   * Test 4: Different countries should have different base risk profiles
   * TDD: Risk calculation should reflect country-specific geopolitical factors
   */
  test('should differentiate risk between countries with same weights', () => {
    const weights = {
      political: 50,
      economic: 30,
      conflict: 20,
      corruption: 10,
      terrorism: 10,
    };

    const usRisk = calculateRiskIndex('United States', weights);
    const iranRisk = calculateRiskIndex('Iran', weights);
    const norwayRisk = calculateRiskIndex('Norway', weights);

    // Iran should typically have higher conflict/terrorism risk than Norway
    expect(iranRisk).not.toBe(norwayRisk);
    expect(usRisk).not.toBe(iranRisk);
    expect(iranRisk).toBeGreaterThan(norwayRisk);
  });

  /**
   * Test 5: Alert threshold validation (> 5)
   * TDD: Countries with risk > 5 should trigger alerts, <= 5 should not
   */
  test('should correctly identify alert-level risk (>5) vs safe (<5)', () => {
    // When weights are 0, all risks should be 0 (no alerts)
    const zeroWeights = {
      political: 0,
      economic: 0,
      conflict: 0,
      corruption: 0,
      terrorism: 0,
    };

    const zeroRisk = calculateRiskIndex('United States', zeroWeights);
    expect(zeroRisk).toBeLessThanOrEqual(5); // Safe

    // With moderate weights, some countries should breach threshold
    const moderateWeights = {
      political: 30,
      economic: 20,
      conflict: 20,
      corruption: 10,
      terrorism: 30,
    };

    const risks = Object.keys(baseRiskData).map((country) =>
      calculateRiskIndex(country, moderateWeights)
    );

    const aboveThreshold = risks.filter((r) => r > 5);
    // With these weights, at least some countries should have risk > 5
    expect(aboveThreshold.length).toBeGreaterThan(0);
  });
});
