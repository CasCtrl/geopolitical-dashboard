# Global Risk Snapshot Feature

## Overview

The Global Risk Snapshot is a real-time assessment of the current geopolitical environment that automatically configures the default risk weights for the dashboard. This feature enables users to:

1. **Start with intelligent defaults** - Weights automatically reflect current global conditions
2. **Understand the geopolitical context** - See what factors are driving current default settings
3. **Customize for your thesis** - Easily adjust weights while knowing what the baseline is
4. **Return to baseline** - Reset to current defaults with one click

---

## Current Global Snapshot (April 2026)

### Snapshot Details

| Dimension | Weight | % of Total | Context |
|-----------|--------|-----------|---------|
| **Political** | 25 | 17% | Moderate political stability concerns |
| **Economic** | 28 | 19% | Elevated due to trade tensions and sanctions |
| **Conflict** | 30 | 21% | Highest priority - multiple active regional conflicts |
| **Corruption** | 12 | 8% | Lower priority relative to acute risks |
| **Terrorism** | 5 | 3% | Localized concerns, lower priority |
| **TOTAL** | 100 | 100% | |

### Snapshot Rationale

**Political Risk (25 points)**
- Key leadership transitions in major economies require monitoring
- Moderate regulatory uncertainty in developed markets
- Policy continuity remains a concern in emerging markets

**Economic Risk (28 points - ELEVATED)**
- Trade disputes creating volatility in global commerce
- Sanctions impacting specific regional economies
- Currency fluctuations driven by geopolitical tensions
- Central bank uncertainty in response to inflation

**Conflict Risk (30 points - HIGHEST)**
- Active military conflicts in Middle East and Eastern Europe
- Regional tensions in Asia-Pacific escalating
- Supply chain disruption risks from conflict zones
- Defense spending increases indicating elevated tensions

**Corruption Risk (12 points)**
- Institutional corruption moves slower than acute crises
- De-prioritized relative to conflict and economic risks
- Monitoring for major governance failures

**Terrorism Risk (5 points - LOWEST)**
- Terrorist activity generally localized
- Impact secondary to broader regional conflicts
- Strong counter-terrorism capabilities in most developed economies

### Last Updated
**April 19, 2026** - Based on latest geopolitical assessments

---

## Using the Global Snapshot

### Default Weights

When you first load the dashboard, weights are automatically set to the current global snapshot:

```
Political:  25
Economic:   28
Conflict:   30
Corruption: 12
Terrorism:   5
Total:     100
```

### Customizing Weights

You can adjust any individual weight to match your investment thesis:

1. **Click and drag** each slider to the desired value
2. The dashboard instantly recalculates portfolio risk
3. Your custom weights persist during your session
4. A "Reset" button appears when weights differ from defaults

### Reset to Defaults

To restore the current global snapshot weights:

1. Click the **↻ Reset button** in the Risk Factor Weights section
2. All sliders return to current default values
3. The button becomes disabled when defaults are active

### Understanding When to Customize

**Keep Default Weights When:**
- You want broad geopolitical risk exposure
- You're unsure which risks matter most for your portfolio
- You want to match current market consensus

**Customize Weights When:**
- Your portfolio has specific regional exposure (e.g., Taiwan tech)
- You believe certain risks are over/under-valued
- You want to stress-test specific scenarios
- You have a specific investment thesis

**Example Customizations:**

**Conservative (Emphasize all risks):**
```
Political:  30 (+5)
Economic:   30 (+2)
Conflict:   30 (same)
Corruption: 5  (-7)
Terrorism:  5  (same)
Total:     100
```

**Growth-Focused (Downplay terrorism):**
```
Political:  20  (-5)
Economic:   35  (+7)
Conflict:   25  (-5)
Corruption: 15  (+3)
Terrorism:  5   (same)
Total:     100
```

**Conflict-Sensitive (Maximize conflict monitoring):**
```
Political:  15  (-10)
Economic:   20  (-8)
Conflict:   45  (+15)
Corruption: 10  (-2)
Terrorism:  10  (+5)
Total:     100
```

---

## Preset Risk Profiles

Quick-start templates for common investment strategies:

### Balanced Profile
- Equal weight across all dimensions
- Best for: Diversified portfolios with no specific thesis
- Weights: 20 / 20 / 20 / 20 / 20

### Conservative Profile
- Emphasizes political and corruption risk
- Best for: Risk-averse investors, stable markets focus
- Weights: 30 / 25 / 20 / 15 / 10

### Growth-Focused Profile
- Emphasizes economic opportunity
- Best for: Emerging market investors, growth thesis
- Weights: 15 / 35 / 15 / 25 / 10

### ESG-Focused Profile
- Emphasizes governance and corruption
- Best for: ESG investing, responsible portfolios
- Weights: 25 / 15 / 20 / 35 / 5

### Conflict-Sensitive Profile
- Maximizes conflict and terrorism monitoring
- Best for: Defense contractors, supply chain risk
- Weights: 20 / 15 / 40 / 15 / 10

### Crisis Response Profile
- Maximum weighting on all acute risks
- Best for: Crisis periods, heightened uncertainty
- Weights: 30 / 30 / 25 / 10 / 5

---

## Understanding Weight Distribution

### Total Weight Sum

The dashboard works best when total weights equal 100, representing 100% of risk assessment:

- **Sum = 100:** Normalized weights (percentages of total risk)
- **Sum < 100:** De-emphasizing risks; unused weighting capacity
- **Sum > 100:** Over-weighting risks; relative emphasis still valid

### Relative vs Absolute Importance

Weights are **relative**, not absolute:

- **Weight of 30** doesn't mean 30% of portfolio is at risk
- It means this dimension gets 30% of influence in risk calculations
- **Comparison matters more than absolute value**

Example:
```
Custom Weights A:  P:50, E:50, C:0, Co:0, T:0  (Total: 100)
Custom Weights B:  P:25, E:25, C:0, Co:0, T:0  (Total: 50)

In both cases, Political and Economic risks are equally weighted relative
to each other. Only total weight differs, affecting overall sensitivity.
```

---

## Historical Snapshots

### March 2026
- Political: 24
- Economic: 26
- Conflict: 28
- Corruption: 13
- Terrorism: 9

*Slightly lower conflict weight; higher corruption concerns*

### February 2026
- Political: 22
- Economic: 25
- Conflict: 25
- Corruption: 15
- Terrorism: 13

*More balanced profile; higher terrorism concerns*

---

## FAQ

**Q: How often are snapshots updated?**
A: Snapshots are updated monthly or when major geopolitical events occur. Check the "Last Updated" date on the dashboard.

**Q: Can I see historical snapshots?**
A: Yes, the dashboard stores recent snapshots for comparison and trend analysis. Look for the "Historical Snapshots" section.

**Q: Do my custom weights save between sessions?**
A: Currently, custom weights persist during your session only. They reset to defaults when you reload the dashboard. Future versions may include saved profiles.

**Q: What if I set weights to different distributions?**
A: You can set weights however you want. The "Reset" button helps you quickly return to the current global snapshot.

**Q: How do weights affect portfolio risk scores?**
A: Portfolio risk is a weighted average of country risks, where each dimension is weighted according to your settings. Higher weights increase that dimension's influence on the final risk score.

**Q: Can I use zero weights?**
A: Yes, setting a dimension to 0 removes it from the calculation. This is useful for ignoring risks you don't care about.

**Q: What weight distribution should I use?**
A: That depends on your investment thesis. Start with defaults, adjust based on your concerns, test scenarios, and see how it affects your portfolio.

---

## Best Practices

### 1. Start with Current Defaults
Always start your analysis with the current global snapshot. It reflects expert assessments of the current environment.

### 2. Understand the Rationale
Read the snapshot description to understand why each weight is set. This context matters for your customizations.

### 3. Stress Test Scenarios
Create different weight profiles to stress test specific scenarios:
- What if terrorism risk spikes?
- What if a major conflict escalates?
- What if corruption becomes the primary concern?

### 4. Compare Profiles
Save multiple weight profiles and compare how your portfolio performs under different risk scenarios.

### 5. Revisit Regularly
Geopolitical situations change. Review your weight customizations monthly or when major news events occur.

### 6. Document Your Thesis
When customizing weights, document why you're making changes. This helps with portfolio review and decision justification.

---

## Technical Details

### Weight Calculation

**Formula:**
```
Portfolio Risk = Σ(Country Risk Score × Normalized Weight) / Sum of Weights

Where:
- Country Risk Score = Weighted average of 5 dimensions
- Normalized Weight = Individual weight / Total of all weights
- Result = 0-100 scale
```

**Example:**
```
Weights: Political=25, Economic=28, Conflict=30, Corruption=12, Terrorism=5
Total = 100

For USA (P:10, E:15, C:5, Co:18, T:12):
USA Risk = (10×25 + 15×28 + 5×30 + 18×12 + 12×5) / 100
         = (250 + 420 + 150 + 216 + 60) / 100
         = 1096 / 100
         = 10.96
```

### Data Sources

Global snapshots are informed by:
- **World Bank** - Political stability indices
- **IMF** - Economic risk assessments
- **Uppsala Conflict Data Program** - Active conflicts
- **Transparency International** - Corruption Perceptions Index
- **START Consortium** - Terrorism data
- **Economist Intelligence Unit** - Expert assessments

---

## Next Iterations (In Scope)

Planned improvements to the Global Snapshot feature within the current single-user baseline:

1. **Saved Weight Profiles** - Store and quickly switch custom weight distributions
2. **Portfolio-Specific Defaults** - Different defaults for different asset classes
3. **Alerts on Snapshot Changes** - Notify when default baselines shift significantly
4. **Scenario Builder Refinements** - Better controls and comparison for "what if" weight scenarios

---

## Conclusion

The Global Risk Snapshot feature bridges the gap between expert geopolitical assessment and individual portfolio management. By providing intelligent defaults while enabling customization, it helps you make informed investment decisions with confidence.

Start with the current snapshot, understand the context, customize when needed, and use the reset button to always return to baseline. This combination of structure and flexibility makes geopolitical risk assessment both powerful and intuitive.



## Version 1.1 Update (April 19, 2026)

- Latest Version: 1.1
- Build: 1.1
- Last Updated: April 19, 2026
- Global Risk Heat Map now supports snapshot export to PNG for point-in-time reporting.
- Snapshot action includes success/failure toast feedback for clearer user flow.
- Help content around snapshot and daily refresh state was expanded for operator guidance.
- Daily freshness signaling now distinguishes recently refreshed data from overdue data.
