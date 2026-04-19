import React, { useMemo, useState } from 'react';
import { TrendingUp, BarChart3, Zap } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { runMonteCarloSimulation, getRiskDistribution, getPercentileDistribution, type MonteCarloResults } from '../data/monteCarloEngine';
import { TrendDataPoint } from '../data/historicalSnapshotManager';

interface MonteCarloSimulationPanelProps {
  trendData: TrendDataPoint[];
  currentRisk: number;
}

export function MonteCarloSimulationPanel({ trendData, currentRisk }: MonteCarloSimulationPanelProps) {
  const [showDistribution, setShowDistribution] = useState(false);
  const [showPercentiles, setShowPercentiles] = useState(false);

  const mcResults = useMemo(
    () => runMonteCarloSimulation(currentRisk, trendData, 10000, 30, showDistribution || showPercentiles),
    [currentRisk, trendData, showDistribution, showPercentiles]
  );

  const distribution = useMemo(() => (showDistribution ? getRiskDistribution(mcResults) : []), [mcResults, showDistribution]);
  const percentiles = useMemo(() => (showPercentiles ? getPercentileDistribution(mcResults) : []), [mcResults, showPercentiles]);

  const getRiskColor = (risk: number) => {
    if (risk < 30) return 'text-green-500';
    if (risk < 50) return 'text-yellow-500';
    if (risk < 70) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="w-full space-y-4">
      {/* Summary */}
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <h3 className="text-sm font-semibold mb-4 text-zinc-100 flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-400" />
          Monte Carlo Simulation (10,000 Paths)
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Current Risk</div>
            <div className={`text-lg font-bold ${getRiskColor(mcResults.currentRisk)}`}>
              {mcResults.currentRisk}
            </div>
          </div>

          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Expected (30d)</div>
            <div className={`text-lg font-bold ${getRiskColor(mcResults.meanEndingRisk)}`}>
              {mcResults.meanEndingRisk}
            </div>
          </div>

          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Median</div>
            <div className={`text-lg font-bold ${getRiskColor(mcResults.medianEndingRisk)}`}>
              {mcResults.medianEndingRisk}
            </div>
          </div>

          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Std Dev</div>
            <div className="text-lg font-bold text-zinc-200">{mcResults.stdDeviation}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-zinc-800">
          <div>
            <div className="text-xs text-zinc-400">VaR (95%)</div>
            <div className={`text-sm font-semibold ${getRiskColor(mcResults.var95)}`}>{mcResults.var95}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">CVaR (95%)</div>
            <div className={`text-sm font-semibold ${getRiskColor(mcResults.cvar95)}`}>{mcResults.cvar95}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Best Case</div>
            <div className="text-sm font-semibold text-green-400">{mcResults.bestCase}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Worst Case</div>
            <div className="text-sm font-semibold text-red-400">{mcResults.worstCase}</div>
          </div>
        </div>
      </Card>

      {/* Risk Probabilities */}
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <h3 className="text-sm font-semibold mb-3 text-zinc-100">Risk Probabilities (30-day horizon)</h3>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-400">Risk Increases</span>
              <span className="text-xs font-semibold text-zinc-200">{mcResults.riskIncreaseProbability}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all"
                style={{ width: `${mcResults.riskIncreaseProbability}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-400">Critical Risk (&gt;70)</span>
              <span className="text-xs font-semibold text-zinc-200">{mcResults.criticalRiskProbability}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${mcResults.criticalRiskProbability}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded">
          <p className="text-xs text-blue-200">
            {mcResults.riskIncreaseProbability > 50
              ? '⚠️ More likely than not that risk increases over 30 days'
              : '✓ More likely than not that risk decreases or stays stable'}
          </p>
        </div>
      </Card>

      {/* Distribution & Percentiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-zinc-950 border border-zinc-800">
          <button
            onClick={() => setShowDistribution(!showDistribution)}
            className="w-full text-left flex items-center justify-between hover:bg-zinc-900/50 p-2 -m-2 rounded"
          >
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <BarChart3 size={14} />
              Risk Distribution
            </h3>
            <span className="text-xs text-zinc-400">{showDistribution ? '▼' : '▶'}</span>
          </button>

          {showDistribution && distribution.length > 0 && (
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
              {distribution.map((bin, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className="w-12 text-zinc-400">{bin.range}</span>
                  <div className="flex-1 h-5 bg-zinc-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-600 to-red-600 transition-all"
                      style={{ width: `${Math.min(100, (bin.count / mcResults.numPaths) * 500)}%` }}
                    />
                  </div>
                  <span className="text-zinc-400 w-8 text-right">{bin.percentage}%</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4 bg-zinc-950 border border-zinc-800">
          <button
            onClick={() => setShowPercentiles(!showPercentiles)}
            className="w-full text-left flex items-center justify-between hover:bg-zinc-900/50 p-2 -m-2 rounded"
          >
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Zap size={14} />
              Percentile Range
            </h3>
            <span className="text-xs text-zinc-400">{showPercentiles ? '▼' : '▶'}</span>
          </button>

          {showPercentiles && percentiles.length > 0 && (
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
              {percentiles.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 bg-zinc-900 rounded">
                  <span className="text-zinc-400">{item.percentile}th percentile</span>
                  <span className={`font-semibold ${getRiskColor(item.risk)}`}>{item.risk}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Interpretation */}
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <h3 className="text-sm font-semibold mb-2 text-zinc-100">Interpretation</h3>
        <div className="text-xs text-zinc-300 space-y-2">
          <p>
            <strong>What this shows:</strong> 10,000 simulated 30-day portfolio paths based on historical volatility
          </p>
          <p>
            <strong>Mean vs Median:</strong> If mean &gt; median, there are outlier high-risk scenarios pulling the average
            up (negative tail risk)
          </p>
          <p>
            <strong>VaR 95%:</strong> There's a 5% chance your risk reaches or exceeds this level in the next 30 days
          </p>
          <p>
            <strong>Critical probability:</strong> Likelihood that risk exceeds your alert threshold (70)
          </p>
        </div>
      </Card>
    </div>
  );
}
