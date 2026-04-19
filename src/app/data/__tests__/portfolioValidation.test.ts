import { defaultPortfolio } from '../portfolioData';

describe('Portfolio Data Validation', () => {
  /**
   * Test 1: Asset weights should sum to 100% in default portfolio
   * TDD: Portfolio allocation should always equal 100%
   */
  test('should have asset weights that sum to 100%', () => {
    const totalWeight = defaultPortfolio.reduce((sum, asset) => sum + asset.weight, 0);
    expect(totalWeight).toBe(100);
  });

  /**
   * Test 2: Each asset should have at least one country dependency
   * TDD: All assets must have geopolitical exposure to at least one country
   */
  test('should have each asset with at least one country dependency', () => {
    defaultPortfolio.forEach((asset) => {
      expect(asset.countryDependencies.length).toBeGreaterThan(0);
      expect(asset.countryDependencies[0]).toHaveProperty('country');
      expect(asset.countryDependencies[0]).toHaveProperty('weight');
      expect(asset.countryDependencies[0]).toHaveProperty('type');
    });
  });

  /**
   * Test 3: Dependency weights should be between 0 and 1
   * TDD: Dependency weights represent ratios, must be valid probabilities
   */
  test('should have valid dependency weights (0-1)', () => {
    defaultPortfolio.forEach((asset) => {
      asset.countryDependencies.forEach((dep) => {
        expect(dep.weight).toBeGreaterThanOrEqual(0);
        expect(dep.weight).toBeLessThanOrEqual(1);
      });
    });
  });

  /**
   * Test 4: Dependency types should be valid
   * TDD: Dependencies must be categorized as direct, indirect, or macro
   */
  test('should have valid dependency types (direct/indirect/macro)', () => {
    const validTypes = ['direct', 'indirect', 'macro'];
    defaultPortfolio.forEach((asset) => {
      asset.countryDependencies.forEach((dep) => {
        expect(validTypes).toContain(dep.type);
      });
    });
  });

  /**
   * Test 5: Asset values should be positive and reasonable
   * TDD: Portfolio values should be non-negative and make financial sense
   */
  test('should have positive asset values that align with weights', () => {
    const totalValue = defaultPortfolio.reduce((sum, asset) => sum + asset.value, 0);

    defaultPortfolio.forEach((asset) => {
      expect(asset.value).toBeGreaterThan(0);
      expect(asset.weight).toBeGreaterThan(0);
      
      // Value should roughly correlate with weight
      const expectedMinValue = (totalValue * (asset.weight - 5)) / 100;
      const expectedMaxValue = (totalValue * (asset.weight + 5)) / 100;
      
      expect(asset.value).toBeGreaterThanOrEqual(expectedMinValue * 0.8);
      expect(asset.value).toBeLessThanOrEqual(expectedMaxValue * 1.2);
    });
  });
});
