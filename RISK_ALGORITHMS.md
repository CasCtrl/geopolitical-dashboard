# Risk Algorithms & Logic

## Overview

The Geopolitical Risk Dashboard calculates portfolio risk exposure using a sophisticated multi-dimensional risk framework. This document details the algorithms, formulas, and logic used to assess geopolitical risk across five primary dimensions and aggregate them into actionable portfolio metrics.

---

## 1. Five-Dimensional Risk Framework

### 1.1 Risk Dimensions

The dashboard assesses risk across five independent but interconnected dimensions:

#### Political Risk
**Definition:** Instability in government institutions, regulatory changes, policy uncertainty, and political transitions.

**Factors:**
- Government stability and legitimacy
- Regulatory predictability
- Policy continuity across administrations
- Political transition mechanisms
- Democratic institutions strength

**Scale:** 0-100
- 0-20: Stable, predictable governance
- 21-40: Minor political tensions or reforms
- 41-60: Significant political uncertainty
- 61-80: Severe political instability
- 81-100: Critical political crisis

**Example:** United States (15) vs. Syria (85)

#### Economic Risk
**Definition:** Macroeconomic vulnerabilities, currency instability, debt crises, and trade disruptions.

**Factors:**
- Currency stability and forex reserves
- Debt-to-GDP ratio and credit risk
- Economic growth volatility
- Trade dependency and diversification
- Inflation and monetary policy credibility

**Scale:** 0-100
- 0-20: Strong, stable economy
- 21-40: Minor economic challenges
- 41-60: Moderate economic uncertainty
- 61-80: Severe economic distress
- 81-100: Economic crisis or collapse

**Example:** Germany (12) vs. Venezuela (92)

#### Conflict Risk
**Definition:** Military conflicts, border disputes, insurgency, and security threats.

**Factors:**
- Active military conflicts
- Border disputes or territorial claims
- Insurgent or extremist activity
- Military capability imbalances
- Historical conflict patterns

**Scale:** 0-100
- 0-20: Peaceful, no military tensions
- 21-40: Occasional border tensions
- 41-60: Active regional conflicts or insurgency
- 61-80: Significant military conflict
- 81-100: Major war or invasion

**Example:** Canada (5) vs. Yemen (88)

#### Corruption Risk
**Definition:** Institutional corruption, lack of rule of law, and governance failures.

**Factors:**
- Perceptions Index (CPI) scores
- Judicial independence
- Law enforcement effectiveness
- Bureaucratic transparency
- Anti-corruption enforcement

**Scale:** 0-100
- 0-20: Transparent governance, strong institutions
- 21-40: Minor corruption concerns
- 41-60: Significant corruption issues
- 61-80: Pervasive corruption
- 81-100: Systemic institutional failure

**Example:** Denmark (9) vs. Somalia (88)

#### Terrorism Risk
**Definition:** Terrorist attacks, extremist activity, and security incidents.

**Factors:**
- Frequency and severity of attacks
- Active terrorist organizations
- Extremist recruitment activity
- Security force effectiveness
- Border security and control

**Scale:** 0-100
- 0-20: Minimal terrorist activity
- 21-40: Occasional incidents or groups
- 41-60: Regular terrorist activity
- 61-80: Frequent or high-impact attacks
- 81-100: Active terrorist campaign or insurgency

**Example:** United States (25) vs. Syria (82)

---

## 2. Risk Calculation Formulas

### 2.1 Individual Country Risk Index

**Formula:**
```
Country Risk Index = (P + E + C + Co + T) / 5

Where:
  P  = Political Risk Score (0-100)
  E  = Economic Risk Score (0-100)
  C  = Conflict Risk Score (0-100)
  Co = Corruption Risk Score (0-100)
  T  = Terrorism Risk Score (0-100)
```

**Result:** Average of all five dimensions, producing a 0-100 score

**Example Calculation:**
```
Country: Japan
Political Risk:     10
Economic Risk:      15
Conflict Risk:       5
Corruption Risk:    18
Terrorism Risk:     12

Country Risk Index = (10 + 15 + 5 + 18 + 12) / 5 = 60 / 5 = 12.0
```

### 2.2 Weighted Risk Index

Individual risk scores are often insufficient for portfolio decisions. The weighted risk index allows portfolio managers to emphasize certain risk dimensions based on investment thesis and risk tolerance.

**Formula:**
```
Weighted Risk Index = Σ(Country Risk Dimension × Weight) / Σ(Weights)

Where:
  Country Risk Dimension = Individual score (Political, Economic, etc.)
  Weight = User-assigned weight (0-100) for each dimension
```

**Example with Conservative Weights:**
```
Country: China
Political Risk:        50    × Weight: 30 = 1500
Economic Risk:         35    × Weight: 25 = 875
Conflict Risk:         40    × Weight: 20 = 800
Corruption Risk:       42    × Weight: 15 = 630
Terrorism Risk:        25    × Weight: 10 = 250

Weighted Risk = (1500 + 875 + 800 + 630 + 250) / (30 + 25 + 20 + 15 + 10)
              = 4055 / 100
              = 40.55
```

**Weight Distribution Presets:**

| Profile | Political | Economic | Conflict | Corruption | Terrorism |
|---------|-----------|----------|----------|------------|-----------|
| **Balanced** | 20 | 20 | 20 | 20 | 20 |
| **Conservative** | 30 | 25 | 20 | 15 | 10 |
| **Growth-Focused** | 15 | 30 | 15 | 25 | 15 |
| **ESG-Focused** | 25 | 20 | 15 | 35 | 5 |
| **Conflict-Sensitive** | 20 | 15 | 40 | 15 | 10 |

---

## 3. Portfolio Risk Aggregation

### 3.1 Portfolio Risk Score

Once individual asset risks are calculated, they are aggregated into a single portfolio risk metric using weighted averaging.

**Formula:**
```
Portfolio Risk Score = Σ(Asset Risk × Asset Weight) / Σ(Asset Weights)

Where:
  Asset Risk = Weighted risk score for the asset's country
  Asset Weight = Market value or allocation percentage of asset
```

**Example Portfolio Calculation:**
```
Portfolio: Tech-Heavy
Total Value: $100,000

Asset 1: Apple (USA)
  Risk Score: 15
  Value: $30,000
  Contribution: 15 × (30000/100000) = 4.5

Asset 2: TSMC (Taiwan)
  Risk Score: 28
  Value: $35,000
  Contribution: 28 × (35000/100000) = 9.8

Asset 3: Samsung (South Korea)
  Risk Score: 22
  Value: $35,000
  Contribution: 22 × (35000/100000) = 7.7

Portfolio Risk = (4.5 + 9.8 + 7.7) / 1.0 = 22.0
```

### 3.2 Risk Distribution Analysis

The portfolio risk is further decomposed to show contribution by dimension:

**Formula:**
```
Dimension Contribution = Σ(Asset Dimension Risk × Asset Weight) / Portfolio Value

Where:
  Asset Dimension Risk = Risk score for one dimension
  Asset Weight = Allocation to that asset
```

**Example:**
```
Political Risk Contribution = (50×0.30 + 35×0.35 + 42×0.35) / 1.0 = 41.95%
Economic Risk Contribution = (35×0.30 + 20×0.35 + 25×0.35) / 1.0 = 26.25%
Conflict Risk Contribution = (40×0.30 + 15×0.35 + 20×0.35) / 1.0 = 24.50%
Corruption Risk Contribution = (42×0.30 + 18×0.35 + 28×0.35) / 1.0 = 28.00%
Terrorism Risk Contribution = (25×0.30 + 10×0.35 + 12×0.35) / 1.0 = 14.50%
```

---

## 4. Country Exposure Analysis

### 4.1 Direct Country Exposure

Direct exposure represents the percentage of portfolio value with operations or headquarters in a given country.

**Formula:**
```
Direct Country Exposure = Σ(Asset Value where Headquarters = Country) / Portfolio Value

Where:
  Asset Value = Market value of individual security
  Portfolio Value = Total portfolio value
```

**Example:**
```
Portfolio Value: $100,000

Assets with USA Headquarters:
  - Apple: $30,000
  - Microsoft: $15,000
  - Tesla: $10,000

USA Direct Exposure = (30000 + 15000 + 10000) / 100000 = 55%
```

### 4.2 Indirect Country Exposure (Supply Chain Risk)

Indirect exposure captures geopolitical risk through supply chains, component sourcing, and business operations beyond headquarters country.

**Formula:**
```
Indirect Country Exposure = Σ(Supply Chain Risk × Asset Weight)

Where:
  Supply Chain Risk = Percentage of supply chain activity in country
  Asset Weight = Allocation to that asset
```

**Example:**
```
TSMC Exposure Analysis:
- Headquarters: Taiwan (Direct: 100%)
- Component Sourcing:
  * Japan: 35% of supply
  * South Korea: 20% of supply
  * Netherlands: 15% of supply
  * Singapore: 20% of supply
  * Taiwan: 10% of supply

Asset Value: $35,000 (35% of portfolio)

Taiwan Indirect Contribution = 10% × 35% = 3.5%
Japan Indirect Contribution = 35% × 35% = 12.25%
South Korea Indirect Contribution = 20% × 35% = 7%
Netherlands Indirect Contribution = 15% × 35% = 5.25%
Singapore Indirect Contribution = 20% × 35% = 7%
```

### 4.3 Total Country Exposure

Total exposure combines direct and indirect exposures:

**Formula:**
```
Total Country Exposure = Direct Country Exposure + Indirect Country Exposure
```

---

## 5. Risk Gauge Calculation

### 5.1 Risk Gauge Scale

The risk gauge visually represents portfolio risk using a color-coded scale:

**Formula:**
```
Risk Level = Portfolio Risk Score (0-100)

Color Mapping:
  0-25:   Green   (Low Risk)
  26-50:  Yellow  (Moderate Risk)
  51-75:  Orange  (High Risk)
  76-100: Red     (Critical Risk)
```

**Gauge Range Interpretation:**

| Range | Level | Color | Action |
|-------|-------|-------|--------|
| 0-15 | Very Low | 🟢 Green | Minimal monitoring required |
| 16-30 | Low | 🟢 Green | Standard monitoring |
| 31-50 | Moderate | 🟡 Yellow | Monitor for changes |
| 51-70 | High | 🟠 Orange | Active risk management |
| 71-85 | Very High | 🔴 Red | Urgent mitigation needed |
| 86-100 | Critical | 🔴 Red | Immediate action required |

### 5.2 Risk Score Calculation

**Formula:**
```
Risk Score = Portfolio Risk Score rounded to 1 decimal place

Risk Gauge Display = 
  - Needle position on 0-100 scale
  - Color indicator (Green → Yellow → Orange → Red)
  - Percentage display
  - Risk level label
```

---

## 6. Risk Change Analysis

### 6.1 Period-over-Period Change

Track risk evolution over time to identify trends:

**Formula:**
```
Risk Change (%) = ((Current Risk - Previous Risk) / Previous Risk) × 100
Risk Change (pts) = Current Risk - Previous Risk
```

**Interpretation:**
- Positive change = Increased risk
- Negative change = Decreased risk

**Example:**
```
Portfolio Risk (Week 1): 25.0
Portfolio Risk (Week 2): 28.5

Change (pts) = 28.5 - 25.0 = +3.5 points
Change (%) = (3.5 / 25.0) × 100 = +14%

Interpretation: Portfolio risk increased by 14% or 3.5 percentage points
```

### 6.2 Volatility Analysis

Risk volatility measures stability of the portfolio's risk profile:

**Formula:**
```
Risk Volatility = Standard Deviation of Risk Scores over period

Calculation:
1. Collect risk scores for n periods
2. Calculate mean: μ = Σ(Risk) / n
3. Calculate variance: σ² = Σ((Risk - μ)²) / n
4. Calculate std deviation: σ = √(σ²)
```

**Interpretation:**
- Low volatility (σ < 5): Stable risk profile
- Moderate volatility (σ 5-15): Normal fluctuations
- High volatility (σ > 15): Unstable, rapidly changing risk

---

## 7. Risk Comparison & Benchmarking

### 7.1 Portfolio vs. Benchmark

Compare portfolio risk against industry benchmarks or competitor portfolios:

**Formula:**
```
Risk Relative to Benchmark (%) = ((Portfolio Risk - Benchmark Risk) / Benchmark Risk) × 100

Outperformance / Underperformance = Benchmark Risk - Portfolio Risk
```

**Example:**
```
Portfolio Risk: 28.0
Tech Sector Benchmark Risk: 32.0

Outperformance = 32.0 - 28.0 = +4.0 points
Relative Performance = ((28.0 - 32.0) / 32.0) × 100 = -12.5%

Interpretation: Portfolio has 12.5% lower risk than benchmark (better)
```

### 7.2 Country Risk Ranking

Rank countries by risk for decision-making:

**Formula:**
```
Country Rank = Position when all countries sorted by risk score (descending)

Percentile Rank (%) = (Countries Riskier than X / Total Countries) × 100
```

---

## 8. Risk Normalization & Scaling

### 8.1 Score Normalization

Raw risk data often requires normalization to account for different scales:

**Min-Max Normalization:**
```
Normalized Score = ((Raw Score - Min) / (Max - Min)) × 100

Where:
  Raw Score = Original data value
  Min = Minimum value in dataset
  Max = Maximum value in dataset
  Range = 0-100
```

**Example:**
```
Raw Political Risk Scores:
  Country A: 35
  Country B: 62
  Country C: 48
  Min: 35, Max: 62, Range: 27

Normalized Scores:
  Country A: ((35-35)/(62-35)) × 100 = 0
  Country B: ((62-35)/(62-35)) × 100 = 100
  Country C: ((48-35)/(62-35)) × 100 = 48.1
```

### 8.2 Z-Score Standardization

Alternative normalization for comparing across dimensions:

**Formula:**
```
Z-Score = (Raw Score - Mean) / Standard Deviation

Interpretation:
  Z > 0: Above average risk
  Z < 0: Below average risk
  |Z| > 2: Outlier (unusual risk level)
```

---

## 9. Scenario Analysis

### 9.1 Stress Testing Formula

Model portfolio response to geopolitical shocks:

**Formula:**
```
Stressed Risk = Base Risk + (Shock Magnitude × Sensitivity Factor)

Where:
  Base Risk = Current portfolio risk
  Shock Magnitude = Change in risk dimension (e.g., +20 points)
  Sensitivity Factor = Portfolio sensitivity to that dimension
```

**Example Scenarios:**

**Scenario 1: Taiwan Conflict Escalation**
```
Base Portfolio Risk: 28.0
Taiwan Exposure: 35%
Conflict Risk Shock: +30 points
Portfolio Sensitivity to Taiwan: 0.35

Stressed Risk = 28.0 + (30 × 0.35) = 28.0 + 10.5 = 38.5
Risk Increase: +10.5 points (+37.5%)
```

**Scenario 2: China Economic Crisis**
```
Base Portfolio Risk: 28.0
China Exposure: 25%
Economic Risk Shock: +25 points
Portfolio Sensitivity to China: 0.25

Stressed Risk = 28.0 + (25 × 0.25) = 28.0 + 6.25 = 34.25
Risk Increase: +6.25 points (+22.3%)
```

### 9.2 Recovery Modeling

Model risk reduction after crisis resolution:

**Formula:**
```
Recovery Risk = Current Risk × (1 - Recovery Factor)

Where:
  Recovery Factor = Expected reduction in risk dimension post-crisis
  Time Horizon = Expected recovery timeframe
```

---

## 10. Algorithm Implementation Details

### 10.1 Risk Calculation Service

**Location:** `src/app/data/countryRiskData.ts`

**Key Functions:**
```typescript
calculateRiskIndex(country: string, weights: RiskWeights): number
  - Input: Country name, weight distribution
  - Output: Weighted risk score (0-100)
  - Logic: Weighted average of 5 dimensions

getRiskColor(riskScore: number): RiskLevel
  - Input: Risk score (0-100)
  - Output: Color and risk level
  - Logic: Returns Green/Yellow/Orange/Red based on ranges

calculatePortfolioRisk(assets: Asset[], weights: RiskWeights): number
  - Input: Array of assets, weight distribution
  - Output: Aggregated portfolio risk (0-100)
  - Logic: Weighted average by asset value
```

### 10.2 Portfolio Aggregation Service

**Location:** `src/app/data/portfolioData.ts`

**Key Functions:**
```typescript
getPortfolioRiskMetrics(portfolio: Portfolio): RiskMetrics
  - Calculates total risk, dimension breakdown, country exposure
  - Returns comprehensive risk analysis

calculateCountryExposure(assets: Asset[]): CountryExposure[]
  - Sums direct and indirect exposure per country
  - Returns ranked list of country concentrations

getTopCountryExposures(portfolio: Portfolio, limit: number): Exposure[]
  - Returns top N countries by exposure
  - Supports filtering and sorting
```

### 10.3 Validation Rules

All calculations include validation:

```typescript
// Bounds checking
0 ≤ risk_score ≤ 100

// Null handling
null/undefined → default to 0 or skip

// Weight validation
Σ(weights) > 0  (prevent division by zero)

// Asset value validation
value ≥ 0  (prevent negative allocations)
```

---

## 11. Risk Algorithm Accuracy & Limitations

### 11.1 Data Sources & Reliability

**Primary Data Sources:**
- Country risk scores: World Bank, IMF, Economist Intelligence Unit
- Conflict data: Uppsala Conflict Data Program
- Terrorism data: START Consortium
- Corruption: Transparency International CPI
- Economic indicators: IMF World Economic Outlook

**Update Frequency:**
- Political/Corruption: Quarterly
- Economic: Monthly
- Conflict/Terrorism: Real-time event-based updates

### 11.2 Known Limitations

1. **Data Lag:** Risk scores may be 1-3 months behind current events
2. **Aggregate Risk:** Five dimensions are independent; real correlations may vary
3. **Country-Level:** Sub-national regional variations not captured
4. **Supply Chain:** Indirect exposures estimated; actual flows may differ
5. **Weighting Subjectivity:** Weight distributions reflect user assumptions
6. **Black Swan Events:** Models don't account for unprecedented crises

### 11.3 Confidence Intervals

Risk scores include implicit confidence ranges:

```
Score Range: 0-100
Confidence: ±5 percentage points (at 95% confidence level)

Example:
  Reported Risk: 28.0
  Actual Risk Range: 23.0 - 33.0 (95% confidence)
```

---

## 12. Best Practices for Risk Assessment

### 12.1 Using Risk Weights Effectively

1. **Align with Investment Thesis:** Choose weights that reflect actual risk concerns
2. **Quarterly Review:** Reassess weights as geopolitical situation evolves
3. **Avoid Extreme Weights:** Use 0-40 range for each dimension
4. **Document Assumptions:** Record rationale for weight choices

### 12.2 Interpreting Results

1. **Single Metric is Insufficient:** Use risk score plus dimension breakdown
2. **Trends Matter More Than Absolutes:** Monitor changes over time
3. **Scenario Test:** Model impact of plausible crises
4. **Compare Across Time:** Track portfolio risk evolution

### 12.3 Risk Management Actions

**Green Zone (0-25):** Routine monitoring, standard due diligence
**Yellow Zone (26-50):** Enhanced monitoring, quarterly reviews
**Orange Zone (51-75):** Active management, monthly rebalancing consideration
**Red Zone (76-100):** Immediate mitigation, consider hedging or reduction

---

## Appendix A: Reference Risk Scores

**Low Risk Countries (< 20):**
- Denmark: 8
- Canada: 9
- Norway: 11
- Australia: 12
- New Zealand: 14
- Singapore: 16
- United States: 18

**Moderate Risk Countries (20-50):**
- Germany: 22
- Japan: 24
- France: 28
- South Korea: 31
- Mexico: 35
- Brazil: 42
- India: 48

**High Risk Countries (50-75):**
- Turkey: 52
- Russia: 58
- Philippines: 62
- Thailand: 65
- Pakistan: 68
- Iraq: 72

**Very High Risk Countries (> 75):**
- Syria: 85
- Yemen: 88
- Somalia: 91
- Afghanistan: 92
- Venezuela: 94

---

## Appendix B: Formula Summary

| Metric | Formula | Range |
|--------|---------|-------|
| Country Risk | (P+E+C+Co+T)/5 | 0-100 |
| Weighted Risk | Σ(Risk×Weight)/Σ(Weight) | 0-100 |
| Portfolio Risk | Σ(Asset Risk × Asset %)/100 | 0-100 |
| Country Exposure | Σ(Asset Value where Country)/Portfolio Value | 0-100% |
| Risk Change | (Current - Previous)/Previous × 100 | -∞ to +∞ |
| Risk Volatility | σ(Risk scores over period) | 0-50+ |

---

## Conclusion

The risk algorithms provide a comprehensive, quantitative framework for assessing geopolitical exposure. By combining five independent risk dimensions with flexible weighting and portfolio aggregation, the dashboard enables evidence-based portfolio management in an uncertain geopolitical environment. Understanding the underlying formulas and assumptions is critical for interpreting results and making informed investment decisions.



## Version 1.1 Update (April 19, 2026)

- Latest Version: 1.1
- Build: 1.1
- Last Updated: April 19, 2026
- Core risk formulas and scoring logic are unchanged in v1.1.
- v1.1 adds presentation and operational improvements for how risk outputs are exported and monitored.
- Map-based risk outputs can now be captured as PNG snapshots for analyst reporting.
- Daily update freshness indicators improve interpretation of risk output recency.
