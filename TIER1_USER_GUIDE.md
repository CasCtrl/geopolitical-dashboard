# Quick Reference: Tier 1 Bloomberg-Ready Features

## 🎯 Where to Find New Features

### Advanced Risk Metrics
**Location**: Dashboard → Summary Tab → Advanced Risk Metrics section (scroll down)

**What You'll See**:
- Sharpe Ratio (0-2.0 typical range)
- Value at Risk 95% (% potential 1-day loss)
- Max Drawdown (largest peak-to-trough decline)
- Sortino Ratio (downside risk-adjusted return)
- Volatility & other statistical measures

**How to Read**:
- 🟢 Green = Good metric (lower risk, higher returns)
- 🟡 Yellow = Caution (moderate concern)
- 🔴 Red = High risk (requires attention)

### Risk Attribution
**Location**: Dashboard → Summary Tab → Risk Attribution section

**What It Shows**:
- Breakdown of portfolio risk by factor (Political, Economic, Conflict, Corruption, Terrorism)
- Top 6 risk contributors (can be factors or countries)
- Visual progress bars showing relative contribution

**Use Case**: Understand which risk factors drive your portfolio's overall risk score

### Benchmarking
**Location**: Dashboard → Summary Tab → Benchmark Comparison section

**What You'll See**:
- Your portfolio risk score
- S&P 500 average baseline (35)
- Percentile ranking (where you stand vs typical investor)
- Specific recommendation based on your percentile

**Percentile Interpretation**:
- 90th+: Your portfolio is much riskier than baseline
- 50th: Your portfolio is average risk
- 10th or below: Your portfolio is very conservative

### Stress Testing (Backtesting)
**Location**: Dashboard → Summary Tab → Stress Test Summary & Analysis sections

**Available Scenarios**:
1. 🦠 COVID-19 Pandemic (2020)
2. 🪖 Russia-Ukraine War (2022)
3. 💥 2008 Financial Crisis
4. 🏝️ Taiwan Strait Crisis (Hypothetical)
5. 🛢️ Middle East Energy Crisis (Hypothetical)
6. 💻 Global Cyber Attack (Hypothetical)

**How to Use**:
1. Review the summary card showing how many scenarios would trigger alerts
2. Click on any scenario button to see detailed analysis
3. Review "Most Affected Holdings" to see which assets would suffer most
4. Read the recommendation for specific actions

**What You'll Learn**:
- If your alerts would have fired during each crisis
- Which countries/holdings are most vulnerable
- How much your portfolio risk would increase
- Overall resilience score (0-100%)

### Real-Time Updates
**Location**: Dashboard → Alerts Tab → Real-Time Update Status section

**What's Tracked**:
- Total updates since app start
- Scheduled updates (hourly automatic recalculations)
- Event-driven updates (breaking geopolitical news)
- Time until next scheduled update
- Recent updates feed with timestamps

**Controls**:
- **Refresh Stats**: Update the display immediately
- **Simulate Event**: Generate a test event to verify alert system

**Example Events**:
- Breaking: Military tensions escalate in Taiwan Strait
- Breaking: Major sanctions announced on Russian energy
- Breaking: Supply chain disruption in Middle East

---

## 📊 Reading Your Metrics

### Sharpe Ratio
**What it is**: Return per unit of risk
**Good Values**: > 1.0 is excellent, 0.5-1.0 is good, < 0 is bad
**Example**: Ratio of 1.2 means you earn 1.2% return for every 1% of risk

### Value at Risk (VaR) 95%
**What it is**: Worst-case 1-day loss at 95% confidence
**Reading**: If VaR is 8%, there's 95% chance you won't lose more than 8% in a day
**Action**: If VaR > 20%, consider reducing risk or hedging

### Max Drawdown
**What it is**: Largest peak-to-trough decline your portfolio experienced
**Good Values**: < 20% for conservative portfolios, < 40% for aggressive
**Example**: Max Drawdown of 35% means worst period lost 35% from peak

### Sortino Ratio
**What it is**: Like Sharpe, but only penalizes downside volatility
**Why it matters**: Better than Sharpe for portfolios with asymmetric returns
**Good Values**: > 1.5 is excellent

---

## 🎮 Using the Backtest Panel

### Step 1: View Summary
Look at the 4 cards at the top:
- **Scenarios Tested**: Usually 6
- **Would Alert Fire**: Count of scenarios that exceed 70 risk threshold
- **Max Risk Increase**: Largest absolute increase in any scenario
- **Portfolio Resilience**: Your overall stress resistance (%)

### Step 2: Select a Scenario
Click on any scenario button to drill down:
- See detailed risk calculations (baseline → stressed)
- View % increase in risk
- Check if alerts would have fired
- See which holdings were most affected

### Step 3: Review Affected Holdings
Each holding shows:
- Current baseline risk
- Risk under stress scenario
- Exposure amount
- Net change

### Step 4: Take Action
Based on the recommendation:
- **High increase (>50%)**: Consider hedging or reducing exposure
- **Moderate increase**: Monitor affected countries/sectors
- **Alert fired**: Verify your alert thresholds are appropriate

---

## 💡 Best Practices

### When to Use Advanced Metrics
- **Monthly Review**: Check Sharpe & Sortino vs previous month
- **New Allocation**: Before adding new holdings, backtest against scenarios
- **Risk Assessment**: Use VaR to determine position size limits
- **Attribution Analysis**: Understand if you're taking right risks

### When to Check Real-Time Updates
- **Daily Morning**: See what updates occurred overnight
- **During Crisis**: Monitor event-driven updates for breaking news
- **Before Trading**: Check if any alerts were triggered

### When to Run Backtests
- **Before Major Rebalance**: Test new allocation against historical crises
- **Quarterly Risk Review**: Verify resilience hasn't deteriorated
- **After Crisis Event**: See how portfolio would have performed
- **Due Diligence**: For institutional presentations/reports

---

## 🔗 Integration with Existing Features

### Dashboard Tab
- Still shows your main portfolio overview
- Risk gauge and country exposures
- Top risk assets and countries

### Summary Tab
- Original summary + actionable insights
- **NEW**: Advanced metrics and stress tests below
- Scroll down to access new features

### Trends Tab
- Historical risk trends (unchanged)
- Now provides data for metrics calculations

### Alerts Tab
- Alert notifications (unchanged)
- **NEW**: Real-time update status at top
- Shows what's driving changes

### Exports Tab
- Report generation (unchanged)
- Now includes metrics in detailed reports

### Tools Tab
- Portfolio management (unchanged)
- Advanced filters (unchanged)

---

## 🚀 Next Steps

### To Really Make Use of These Features:
1. ✅ Review your metrics baseline (take screenshots for comparison)
2. ✅ Run all 6 scenarios and note results
3. ✅ Identify your portfolio's weak spots (most-affected scenarios)
4. ✅ Consider hedging those specific exposures
5. ✅ Set alert thresholds based on VaR/Sharpe targets
6. ✅ Monitor real-time updates daily

### Coming Soon (When Implemented):
- Real news feed integration (instead of simulated events)
- Monte Carlo simulations (thousands of possible outcomes)
- Correlation analysis (which countries move together)
- Custom scenario builder (create your own crises)
- API integrations (real market data, not just sample data)

---

## 🛠️ Troubleshooting

### Metrics Not Showing
- Need at least 7 days of historical data (generated on first app load)
- Ensure you have country exposures in your portfolio
- Check browser console for errors (F12)

### Backtesting Showing Same Risk
- This is normal if no scenario applies to your portfolio
- Scenarios with multipliers of 1.0 (no change) show no increase
- Check the scenario details to see which countries are affected

### Real-Time Updates Not Showing
- Click "Refresh Stats" to manually update
- Click "Simulate Event" to generate a test event
- Check if your portfolio has been updated recently

### Values Seem Off
- Remember metrics are based on 30-day rolling historical window
- First 30 days will have incomplete history
- Values stabilize after ~30 days of app usage

---

## 📞 Questions?

All calculations follow institutional finance standards:
- **Sharpe Ratio**: (Return - RiskFreeRate) / Volatility
- **VaR 95%**: Historical simulation at 95th percentile
- **Max Drawdown**: Largest cumulative loss from peak
- **Risk Attribution**: Factor-weighted contribution to portfolio risk

For detailed methodology, see `TIER1_IMPLEMENTATION.md` and source code in:
- `src/app/data/advancedMetrics.ts`
- `src/app/data/backtestingEngine.ts`
- `src/app/data/realtimeUpdateManager.ts`



## Version 1.1 Update (April 19, 2026)

- Latest Version: 1.1
- Build: 1.1
- Last Updated: April 19, 2026
- You can now capture the Global Risk Heat Map as a PNG snapshot from the map card.
- Refresh control shows a check state for recent updates and an alert state when updates are overdue.
- Help guidance now covers snapshot/export flow and refresh-state behavior.
- Local API usage examples align with backend service on port 5001.
