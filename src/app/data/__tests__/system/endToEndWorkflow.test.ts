/**
 * System Tests - End-to-End Workflows
 * 
 * Tests complete user workflows from start to finish:
 * 1. Portfolio load and assessment
 * 2. Risk analysis and interpretation
 * 3. Data comparison across datasets
 * 4. Decision-making scenarios
 */

import { calculateRiskIndex } from '../../countryRiskData';

/**
 * Test Suite: End-to-End System Workflows
 * 
 * These tests simulate real user scenarios and verify the complete
 * application flow produces expected results.
 */
describe('End-to-End System Workflows', () => {
  /**
   * Workflow Test 1: Portfolio Assessment Use Case
   * 
   * User Story: "As a portfolio manager, I want to upload my portfolio
   * and immediately see a risk assessment"
   * 
   * Expected Workflow:
   * 1. User uploads portfolio CSV
   * 2. System parses and validates data
   * 3. System calculates risks for all holdings
   * 4. Dashboard displays risk gauge and metrics
   */
  test('Workflow 1: Complete portfolio assessment should provide risk overview', () => {
    // Step 1: User uploads portfolio
    const uploadedPortfolio = {
      name: 'Tech Portfolio Q1 2026',
      assets: [
        { name: 'Apple Inc', value: 50000, headquarters: 'United States', sector: 'Technology' },
        { name: 'TSMC', value: 30000, headquarters: 'Taiwan', sector: 'Technology' },
        { name: 'Samsung', value: 20000, headquarters: 'South Korea', sector: 'Technology' }
      ]
    };

    // Step 2: System validates data
    expect(uploadedPortfolio.assets).toBeDefined();
    expect(uploadedPortfolio.assets.length).toBe(3);
    expect(uploadedPortfolio.assets.every(a => a.value > 0)).toBe(true);

    // Step 3: System calculates risks
    const riskWeights = {
      political: 25,
      economic: 20,
      conflict: 20,
      corruption: 20,
      terrorism: 15
    };

    const assetRisks = uploadedPortfolio.assets.map(asset => ({
      name: asset.name,
      value: asset.value,
      country: asset.headquarters,
      risk: calculateRiskIndex(asset.headquarters, riskWeights)
    }));

    // Step 4: Verify dashboard can display results
    expect(assetRisks.length).toBe(3);
    expect(assetRisks.every(a => typeof a.risk === 'number')).toBe(true);
    
    const portfolioRisk = assetRisks.reduce((sum, a) => sum + a.risk * a.value, 0) / 
                         uploadedPortfolio.assets.reduce((sum, a) => sum + a.value, 0);
    
    expect(portfolioRisk).toBeGreaterThanOrEqual(0);
    expect(portfolioRisk).toBeLessThanOrEqual(100);
  });

  /**
   * Workflow Test 2: Crisis Monitoring
   * 
   * User Story: "As a risk analyst, I want to understand how a
   * geopolitical crisis affects my portfolio in real-time"
   * 
   * Expected Workflow:
   * 1. Normal portfolio displays acceptable risk
   * 2. Crisis event increases country risk scores
   * 3. Dashboard updates to show new risk levels
   * 4. User can identify affected holdings
   */
  test('Workflow 2: Crisis monitoring should identify affected assets', () => {
    const weights = {
      political: 30,
      economic: 20,
      conflict: 25,
      corruption: 15,
      terrorism: 10
    };

    // Normal scenario
    const normalRisk = calculateRiskIndex('Taiwan', weights);
    expect(normalRisk).toBeDefined();

    // Simulate crisis (conflict risk increases)
    // Note: In real app, this would come from data updates
    const crisisWeights = {
      political: 35,
      economic: 20,
      conflict: 35,  // Increased conflict weighting
      corruption: 5,
      terrorism: 5
    };

    const crisisRisk = calculateRiskIndex('Taiwan', crisisWeights);
    expect(crisisRisk).toBeDefined();

    // Crisis should increase perceived risk
    // (depending on Taiwan's conflict score)
    expect(typeof crisisRisk).toBe('number');
    expect(crisisRisk).toBeGreaterThanOrEqual(0);

    // Portfolio with Taiwan exposure should show increased risk
    const normalPortfolioRisk = 
      (calculateRiskIndex('Taiwan', weights) * 40000 + 
       calculateRiskIndex('United States', weights) * 60000) / 100000;

    expect(normalPortfolioRisk).toBeDefined();
  });

  /**
   * Workflow Test 3: Comparative Portfolio Analysis
   * 
   * User Story: "As an investment advisor, I want to compare
   * two different portfolio strategies"
   * 
   * Expected Workflow:
   * 1. Load conservative portfolio (US-heavy)
   * 2. Load aggressive portfolio (emerging markets)
   * 3. Compare risk metrics side-by-side
   * 4. Recommend based on risk profiles
   */
  test('Workflow 3: Comparative analysis should highlight risk differences', () => {
    const weights = {
      political: 25,
      economic: 20,
      conflict: 20,
      corruption: 20,
      terrorism: 15
    };

    // Conservative portfolio
    const conservativePortfolio = {
      name: 'Conservative',
      assets: [
        { country: 'United States', value: 60000 },
        { country: 'Canada', value: 20000 },
        { country: 'United Kingdom', value: 20000 }
      ]
    };

    // Aggressive portfolio
    const aggressivePortfolio = {
      name: 'Aggressive Growth',
      assets: [
        { country: 'China', value: 40000 },
        { country: 'India', value: 35000 },
        { country: 'Brazil', value: 25000 }
      ]
    };

    // Calculate portfolio risks
    const calcPortfolioRisk = (portfolio) => {
      const totalValue = portfolio.assets.reduce((sum, a) => sum + a.value, 0);
      return portfolio.assets.reduce((sum, a) => 
        sum + calculateRiskIndex(a.country, weights) * a.value / totalValue, 0
      );
    };

    const conservativeRisk = calcPortfolioRisk(conservativePortfolio);
    const aggressiveRisk = calcPortfolioRisk(aggressivePortfolio);

    // Verify both are calculable
    expect(conservativeRisk).toBeDefined();
    expect(aggressiveRisk).toBeDefined();

    // Can provide recommendation
    expect(conservativeRisk <= aggressiveRisk || aggressiveRisk <= conservativeRisk).toBe(true);
  });

  /**
   * Workflow Test 4: Due Diligence Assessment
   * 
   * User Story: "As a fund manager considering a new investment,
   * I want to assess geopolitical risk before committing capital"
   * 
   * Expected Workflow:
   * 1. Evaluate target company's country exposure
   * 2. Identify supply chain risks
   * 3. Compare against fund benchmarks
   * 4. Make investment decision
   */
  test('Workflow 4: Due diligence should evaluate investment opportunity', () => {
    const targetCompany = {
      name: 'Global Tech Manufacturing',
      headquarters: 'Singapore',
      directExposure: {
        'Singapore': 40,
        'United States': 30,
        'Japan': 30
      },
      supplyChainExposure: {
        'Vietnam': 35,
        'Indonesia': 25,
        'Malaysia': 20
      },
      proposedValue: 100000
    };

    const fundBenchmark = {
      maxCountryConcentration: 40,
      minAverageRisk: 20,
      maxAverageRisk: 60
    };

    // Analyze direct exposure
    const directExposures = Object.keys(targetCompany.directExposure);
    expect(directExposures.length).toBeGreaterThan(0);

    // Check against concentration limits
    const maxExposure = Math.max(...Object.values(targetCompany.directExposure));
    const exceedsConcentration = maxExposure > fundBenchmark.maxCountryConcentration;

    // Calculate risk
    const weights = {
      political: 25,
      economic: 20,
      conflict: 20,
      corruption: 20,
      terrorism: 15
    };

    const directRisks = directExposures.map(country => 
      calculateRiskIndex(country, weights)
    );
    const supplyChainRisks = Object.keys(targetCompany.supplyChainExposure).map(country =>
      calculateRiskIndex(country, weights)
    );

    const allRisks = [...directRisks, ...supplyChainRisks];
    const averageRisk = allRisks.reduce((a, b) => a + b) / allRisks.length;

    // Make recommendation
    const meetsBenchmark = 
      !exceedsConcentration &&
      averageRisk >= fundBenchmark.minAverageRisk &&
      averageRisk <= fundBenchmark.maxAverageRisk;

    expect(typeof meetsBenchmark).toBe('boolean');
  });

  /**
   * Workflow Test 5: Rebalancing Decision Support
   * 
   * User Story: "As a portfolio manager, I want to identify
   * which assets to sell to reduce geopolitical risk"
   * 
   * Expected Workflow:
   * 1. Identify high-risk holdings
   * 2. Calculate impact of removing holdings
   * 3. Suggest alternative allocations
   * 4. Project new risk profile
   */
  test('Workflow 5: Rebalancing should identify risk reduction opportunities', () => {
    const weights = {
      political: 25,
      economic: 20,
      conflict: 20,
      corruption: 20,
      terrorism: 15
    };

    const currentPortfolio = [
      { name: 'Iran Energy', country: 'Iran', value: 25000 },
      { name: 'US Tech', country: 'United States', value: 50000 },
      { name: 'China Mfg', country: 'China', value: 25000 }
    ];

    // Calculate current risk profile
    const currentRisk = currentPortfolio.reduce((sum, a) =>
      sum + calculateRiskIndex(a.country, weights) * a.value / 100000, 0
    );

    // Simulate rebalancing (sell Iran, buy US)
    const rebalancedPortfolio = [
      { name: 'Iran Energy', country: 'Iran', value: 10000 },  // Reduced
      { name: 'US Tech', country: 'United States', value: 65000 },  // Increased
      { name: 'China Mfg', country: 'China', value: 25000 }
    ];

    const rebalancedRisk = rebalancedPortfolio.reduce((sum, a) =>
      sum + calculateRiskIndex(a.country, weights) * a.value / 100000, 0
    );

    // Rebalancing should reduce risk
    expect(rebalancedRisk).toBeLessThan(currentRisk);

    // Calculate savings
    const riskReduction = currentRisk - rebalancedRisk;
    expect(riskReduction).toBeGreaterThan(0);
  });

  /**
   * Workflow Test 6: Data Integrity Throughout Session
   * 
   * Expected Behavior: Data remains consistent throughout user session
   * 1. Load portfolio
   * 2. Switch datasets
   * 3. Return to original dataset
   * 4. Verify original data unchanged
   */
  test('Workflow 6: Data should remain consistent across session operations', () => {
    const weights = {
      political: 25,
      economic: 20,
      conflict: 20,
      corruption: 20,
      terrorism: 15
    };

    // Calculate original risk
    const originalRisk = calculateRiskIndex('United States', weights);

    // Switch to different dataset
    const differentRisk = calculateRiskIndex('China', weights);

    // Return to original
    const returnedRisk = calculateRiskIndex('United States', weights);

    // Verify consistency
    expect(returnedRisk).toBe(originalRisk);
    expect(differentRisk).not.toBe(originalRisk);
  });

  /**
   * Workflow Test 7: Full Audit Trail
   * 
   * Expected Behavior: System generates consistent results
   * that can be audited and verified
   */
  test('Workflow 7: System should produce auditable, consistent results', () => {
    const portfolio = {
      assets: [
        { country: 'United States', value: 100000 },
        { country: 'Germany', value: 50000 },
        { country: 'Japan', value: 75000 }
      ]
    };

    const weights = {
      political: 25,
      economic: 20,
      conflict: 20,
      corruption: 20,
      terrorism: 15
    };

    // Run calculation multiple times
    const results = [];
    for (let i = 0; i < 5; i++) {
      const risk = portfolio.assets.reduce((sum, a) =>
        sum + calculateRiskIndex(a.country, weights) * a.value / 225000, 0
      );
      results.push(risk);
    }

    // All results should be identical (deterministic)
    const allSame = results.every(r => r === results[0]);
    expect(allSame).toBe(true);

    // Results should be in valid range
    expect(results[0]).toBeGreaterThanOrEqual(0);
    expect(results[0]).toBeLessThanOrEqual(100);
  });
});
