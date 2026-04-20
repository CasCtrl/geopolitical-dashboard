import { useMemo } from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { Card } from './ui/card';
import { 
  calculateAllMetrics, 
  analyzeRiskAttribution, 
  compareToBenchmark,
} from '../data/advancedMetrics';
import { TrendDataPoint } from '../data/historicalSnapshotManager';
import { RiskScoreInfo } from './RiskScoreInfo';

interface RiskMetricsPanelProps {
  trendData: TrendDataPoint[];
  countryRisks: { [country: string]: number };
  weights: {
    political: number;
    economic: number;
    conflict: number;
    corruption: number;
    terrorism: number;
  };
  portfolioRisk: number;
  portfolioExposures: Array<{ country: string; riskContribution: number }>;
  showAdvancedMetrics?: boolean;
  showRiskAttribution?: boolean;
  showBenchmarkComparison?: boolean;
}

export function RiskMetricsPanel({
  trendData,
  countryRisks,
  weights,
  portfolioRisk,
  portfolioExposures,
  showAdvancedMetrics = true,
  showRiskAttribution = true,
  showBenchmarkComparison = true,
}: RiskMetricsPanelProps) {
  const metricsTrendData = useMemo(() => {
    if (trendData.length === 0) {
      return [{ timestamp: new Date().toISOString(), value: portfolioRisk }];
    }

    const lastPoint = trendData[trendData.length - 1];
    if (Math.round(lastPoint.value) === Math.round(portfolioRisk)) {
      return trendData;
    }

    return [
      ...trendData,
      { timestamp: new Date().toISOString(), value: portfolioRisk },
    ];
  }, [trendData, portfolioRisk]);

  const metrics = useMemo(() => calculateAllMetrics(metricsTrendData), [metricsTrendData]);
  const attribution = useMemo(
    () => analyzeRiskAttribution(countryRisks, weights, portfolioExposures),
    [countryRisks, weights, portfolioExposures]
  );
  const benchmark = useMemo(
    () => compareToBenchmark(portfolioRisk),
    [portfolioRisk]
  );

  const getMetricColor = (value: number, metric: string) => {
    if (metric === 'sharpeRatio' || metric === 'sortinoRatio') {
      // Higher is better
      if (value >= 1) return 'text-green-500';
      if (value >= 0) return 'text-yellow-500';
      return 'text-red-500';
    }
    if (metric === 'maxDrawdown' || metric === 'volatility' || metric === 'valueAtRisk95') {
      // Lower is better
      if (value <= 20) return 'text-green-500';
      if (value <= 40) return 'text-yellow-500';
      return 'text-red-500';
    }
    return 'text-zinc-400';
  };

  return (
    <div className="w-full space-y-4">
      {/* Risk Metrics */}
      {showAdvancedMetrics && (
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <h3 className="text-sm font-semibold mb-4 text-zinc-100 flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-400" />
          Advanced Risk Metrics
          <RiskScoreInfo
            meaning="Quantitative indicators describing portfolio risk quality, downside exposure, and return-adjusted performance."
            calculation="Calculated from historical risk trend snapshots (e.g., volatility, VaR, drawdown, Sharpe/Sortino) and current portfolio risk context."
          />
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {/* Sharpe Ratio */}
          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="mb-1 flex items-center gap-1">
              <div className="text-xs text-zinc-400">Sharpe Ratio</div>
              <RiskScoreInfo
                meaning="Return per unit of total risk volatility."
                calculation="Average excess return divided by standard deviation of returns."
              />
            </div>
            <div className={`text-lg font-bold ${getMetricColor(metrics.sharpeRatio, 'sharpeRatio')}`}>
              {metrics.sharpeRatio.toFixed(2)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">
              Risk-adj Return {metrics.sharpeRatio >= 1 ? '✓' : '⚠'}
            </div>
          </div>

          {/* Value at Risk (95%) */}
          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="mb-1 flex items-center gap-1">
              <div className="text-xs text-zinc-400">VaR (95%)</div>
              <RiskScoreInfo
                meaning="Estimated loss threshold not exceeded 95% of the time."
                calculation="95th percentile one-period downside estimate from historical distribution."
              />
            </div>
            <div className={`text-lg font-bold ${getMetricColor(metrics.valueAtRisk95, 'valueAtRisk95')}`}>
              {metrics.valueAtRisk95.toFixed(2)}%
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">
              1-day worst case
            </div>
          </div>

          {/* Max Drawdown */}
          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="mb-1 flex items-center gap-1">
              <div className="text-xs text-zinc-400">Max Drawdown</div>
              <RiskScoreInfo
                meaning="Largest observed peak-to-trough decline in the series."
                calculation="Maximum percentage drop from a local peak to subsequent trough."
              />
            </div>
            <div className={`text-lg font-bold ${getMetricColor(metrics.maxDrawdown, 'maxDrawdown')}`}>
              {metrics.maxDrawdown.toFixed(1)}%
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">
              Peak-to-trough
            </div>
          </div>

          {/* Sortino Ratio */}
          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="mb-1 flex items-center gap-1">
              <div className="text-xs text-zinc-400">Sortino Ratio</div>
              <RiskScoreInfo
                meaning="Return per unit of downside-only volatility."
                calculation="Average excess return divided by downside deviation below target return."
              />
            </div>
            <div className={`text-lg font-bold ${getMetricColor(metrics.sortinoRatio, 'sortinoRatio')}`}>
              {metrics.sortinoRatio.toFixed(2)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">
              Downside risk-adj
            </div>
          </div>

          {/* Volatility */}
          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="mb-1 flex items-center gap-1">
              <div className="text-xs text-zinc-400">Volatility</div>
              <RiskScoreInfo
                meaning="Degree of variation in risk values over time."
                calculation="Standard deviation of historical risk changes."
              />
            </div>
            <div className={`text-lg font-bold ${getMetricColor(metrics.volatility, 'volatility')}`}>
              {metrics.volatility.toFixed(1)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">
              Std deviation
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-zinc-800">
          <div>
            <div className="text-xs text-zinc-400 flex items-center gap-1">CVaR (95%)
              <RiskScoreInfo
                meaning="Expected average loss in the worst 5% of outcomes."
                calculation="Mean loss conditional on being beyond the VaR 95% threshold."
              />
            </div>
            <div className="text-sm font-semibold text-zinc-200">{metrics.conditionalVaR95.toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400 flex items-center gap-1">Downside Dev
              <RiskScoreInfo
                meaning="Volatility measured only for downside moves."
                calculation="Standard deviation of negative deviations below target return level."
              />
            </div>
            <div className="text-sm font-semibold text-zinc-200">{metrics.downsideDeviation.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400 flex items-center gap-1">Skewness
              <RiskScoreInfo
                meaning="Asymmetry of the risk-return distribution."
                calculation="Third standardized moment of the series distribution."
              />
            </div>
            <div className={`text-sm font-semibold ${metrics.skewness < 0 ? 'text-red-400' : 'text-green-400'}`}>
              {metrics.skewness.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-400 flex items-center gap-1">Kurtosis
              <RiskScoreInfo
                meaning="Tail-heaviness and extremity of outcome distribution."
                calculation="Fourth standardized moment indicating propensity for outliers."
              />
            </div>
            <div className={`text-sm font-semibold ${metrics.kurtosis > 3 ? 'text-orange-400' : 'text-zinc-200'}`}>
              {metrics.kurtosis.toFixed(2)}
            </div>
          </div>
        </div>
      </Card>
      )}

      {/* Risk Attribution */}
      {showRiskAttribution && (
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <h3 className="text-sm font-semibold mb-3 text-zinc-100">Risk Attribution</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* By Factor */}
          <div>
            <p className="text-xs font-semibold text-zinc-300 mb-2">By Risk Factor</p>
            <div className="space-y-2">
              {Object.entries(attribution.byRiskFactor).map(([factor, percentage]) => (
                <div key={factor} className="flex items-center justify-between">
                  <div className="text-xs text-zinc-400 capitalize">
                    {factor === 'political' ? '🏛' : factor === 'economic' ? '💰' : factor === 'conflict' ? '⚔' : factor === 'corruption' ? '🔓' : '💣'}
                    {' '}{factor}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-zinc-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-red-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-xs font-semibold text-zinc-300 w-8 text-right">
                      {percentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Contributors */}
          <div>
            <p className="text-xs font-semibold text-zinc-300 mb-2">Top Contributors</p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {attribution.topContributors.slice(0, 6).map((contributor, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 truncate">
                    {contributor.type === 'factor' ? '⚙' : '🌍'} {contributor.name}
                  </span>
                  <span className="font-semibold text-zinc-300">
                    {contributor.contribution.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
      )}

      {/* Benchmarking */}
      {showBenchmarkComparison && (
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <div className="mb-3 flex items-center gap-1">
          <h3 className="text-sm font-semibold text-zinc-100">Benchmark Comparison</h3>
          <RiskScoreInfo
            meaning="Compares your portfolio risk against a broad market reference."
            calculation="Positions portfolio score versus benchmark level and percentile mapping."
          />
        </div>
        
        <div className="bg-zinc-900 rounded p-4 border border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="mb-1 flex items-center gap-1">
                <p className="text-xs text-zinc-400">Your Portfolio Risk</p>
                <RiskScoreInfo
                  meaning="Current total geopolitical risk score for your portfolio."
                  calculation="Weighted aggregation of country dependency risk across all holdings, normalized to a 0-100 score."
                />
              </div>
              <p className="text-2xl font-bold text-zinc-100">{benchmark.portfolioRisk}</p>
            </div>
            <div className="text-right">
              <div className="mb-1 flex items-center gap-1 justify-end">
                <p className="text-xs text-zinc-400">S&P 500 Average</p>
                <RiskScoreInfo
                  meaning="Reference geopolitical risk level for a broad-market benchmark proxy."
                  calculation="Static or model benchmark score used for relative risk positioning."
                />
              </div>
              <p className="text-2xl font-bold text-zinc-500">{benchmark.benchmarkRisk}</p>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-600 to-red-600 transition-all"
                  style={{ width: `${Math.min(100, (benchmark.portfolioRisk / 100) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-zinc-300 w-12 text-right">
                {benchmark.percentile.toFixed(0)}th %ile
              </span>
            </div>
            <p className="text-xs text-zinc-400">{benchmark.percentileDescription}</p>
          </div>

          <div className="bg-blue-900/20 border border-blue-800 rounded p-3">
            <p className="text-xs text-blue-200 flex items-start gap-2">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{benchmark.recommendation}</span>
            </p>
          </div>
        </div>
      </Card>
      )}
    </div>
  );
}
