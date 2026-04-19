import React, { useState, useMemo } from 'react';
import { TrendingUp, AlertTriangle, BarChart3, Play } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { runMonteCarloSimulation, getRiskDistribution, getPercentileDistribution, type MonteCarloResults } from '../data/monteCarloEngine';
import { TrendDataPoint } from '../data/historicalSnapshotManager';

interface MonteCarloPanelProps {
  currentRisk: number;
  trendData: TrendDataPoint[];
  portfolioExposures: Array<{ country: string; riskContribution: number; name: string }>;
}

export function MonteCarloPanel({
  currentRisk,
  trendData,
  portfolioExposures,
}: MonteCarloPanelProps) {
  const [results, setResults] = useState<MonteCarloResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [numPaths, setNumPaths] = useState(10000);
  const [numDays, setNumDays] = useState(30);
  const [showDistribution, setShowDistribution] = useState(false);

  const handleRunSimulation = () => {
    setIsRunning(true);
    // Run simulation asynchronously
    setTimeout(() => {
      const simResults = runMonteCarloSimulation(currentRisk, trendData, numPaths, numDays, true);
      setResults(simResults);
      setIsRunning(false);
    }, 100);
  };

  const distribution = useMemo(() => {
    return results ? getRiskDistribution(results, 20) : [];
  }, [results]);

  const percentiles = useMemo(() => {
    return results ? getPercentileDistribution(results) : [];
  }, [results]);

  const getRiskColor = (risk: number) => {
    if (risk >= 80) return 'text-red-400';
    if (risk >= 60) return 'text-orange-400';
    if (risk >= 40) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getUrgencyColor = (probability: number) => {
    if (probability >= 75) return 'text-red-500 bg-red-950';
    if (probability >= 50) return 'text-orange-500 bg-orange-950';
    if (probability >= 25) return 'text-yellow-500 bg-yellow-950';
    return 'text-green-500 bg-green-950';
  };

  return (
    <div className="w-full space-y-4">
      {/* Header & Controls */}
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <TrendingUp size={16} className="text-green-400" />
            Monte Carlo Risk Simulation
          </h3>
          <div className="text-xs text-zinc-400">
            {results ? `${results.numPaths.toLocaleString()} paths, ${numDays} days` : 'Not run'}
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 p-3 bg-zinc-900 rounded border border-zinc-800">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Number of Paths</label>
            <select
              value={numPaths}
              onChange={(e) => setNumPaths(parseInt(e.target.value))}
              disabled={isRunning}
              className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100"
            >
              <option value={1000}>1,000 paths</option>
              <option value={5000}>5,000 paths</option>
              <option value={10000}>10,000 paths</option>
              <option value={50000}>50,000 paths</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Forecast Period</label>
            <select
              value={numDays}
              onChange={(e) => setNumDays(parseInt(e.target.value))}
              disabled={isRunning}
              className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleRunSimulation}
              disabled={isRunning || trendData.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <Play size={12} className="mr-1" />
              {isRunning ? 'Running...' : 'Run Simulation'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Results */}
      {results && (
        <>
          {/* Key Metrics */}
          <Card className="p-4 bg-zinc-950 border border-zinc-800">
            <h3 className="text-sm font-semibold mb-4 text-zinc-100">Simulation Results</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
                <div className="text-xs text-zinc-400 mb-1">Current Risk</div>
                <div className={`text-lg font-bold ${getRiskColor(results.currentRisk)}`}>
                  {results.currentRisk.toFixed(1)}
                </div>
              </div>

              <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
                <div className="text-xs text-zinc-400 mb-1">Mean Ending Risk</div>
                <div className={`text-lg font-bold ${getRiskColor(results.meanEndingRisk)}`}>
                  {results.meanEndingRisk.toFixed(1)}
                </div>
              </div>

              <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
                <div className="text-xs text-zinc-400 mb-1">Median Ending Risk</div>
                <div className={`text-lg font-bold ${getRiskColor(results.medianEndingRisk)}`}>
                  {results.medianEndingRisk.toFixed(1)}
                </div>
              </div>

              <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
                <div className="text-xs text-zinc-400 mb-1">Std Deviation</div>
                <div className="text-lg font-bold text-blue-400">{results.stdDeviation.toFixed(1)}</div>
              </div>
            </div>

            {/* Risk Range */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-green-900/20 border border-green-800 rounded p-3">
                <div className="text-xs text-green-300 mb-1">Best Case</div>
                <div className="text-lg font-bold text-green-400">{results.bestCase.toFixed(1)}</div>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-800 rounded p-3">
                <div className="text-xs text-yellow-300 mb-1">Worst Case (1%)</div>
                <div className="text-lg font-bold text-yellow-400">{results.worstCase.toFixed(1)}</div>
              </div>

              <div className="bg-orange-900/20 border border-orange-800 rounded p-3">
                <div className="text-xs text-orange-300 mb-1">VaR 95%</div>
                <div className="text-lg font-bold text-orange-400">{results.var95.toFixed(1)}</div>
              </div>
            </div>
          </Card>

          {/* Probabilities */}
          <Card className="p-4 bg-zinc-950 border border-zinc-800">
            <h3 className="text-sm font-semibold mb-3 text-zinc-100 flex items-center gap-2">
              <AlertTriangle size={14} className="text-orange-400" />
              Risk Probabilities
            </h3>

            <div className="space-y-3">
              <div className={`p-3 rounded border ${getUrgencyColor(results.riskIncreaseProbability).replace('text-', '').replace('bg-', 'border-')} border-current`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-zinc-100">Probability Risk Increases</span>
                  <span className={`text-sm font-bold ${getUrgencyColor(results.riskIncreaseProbability).split(' ')[0]}`}>
                    {results.riskIncreaseProbability.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-zinc-900 rounded h-2 overflow-hidden">
                  <div
                    className={`h-full ${results.riskIncreaseProbability >= 75 ? 'bg-red-600' : results.riskIncreaseProbability >= 50 ? 'bg-orange-600' : results.riskIncreaseProbability >= 25 ? 'bg-yellow-600' : 'bg-green-600'}`}
                    style={{ width: `${Math.min(100, results.riskIncreaseProbability)}%` }}
                  />
                </div>
              </div>

              <div className={`p-3 rounded border ${getUrgencyColor(results.criticalRiskProbability).replace('text-', '').replace('bg-', 'border-')} border-current`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-zinc-100">Probability Risk &gt; 70 (Critical)</span>
                  <span className={`text-sm font-bold ${getUrgencyColor(results.criticalRiskProbability).split(' ')[0]}`}>
                    {results.criticalRiskProbability.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-zinc-900 rounded h-2 overflow-hidden">
                  <div
                    className={`h-full ${results.criticalRiskProbability >= 50 ? 'bg-red-600' : results.criticalRiskProbability >= 25 ? 'bg-orange-600' : 'bg-yellow-600'}`}
                    style={{ width: `${Math.min(100, results.criticalRiskProbability)}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Distribution */}
          <Card className="p-4 bg-zinc-950 border border-zinc-800">
            <button
              onClick={() => setShowDistribution(!showDistribution)}
              className="w-full text-left flex items-center justify-between hover:bg-zinc-900/50 p-2 -m-2 rounded"
            >
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <BarChart3 size={14} />
                Risk Distribution (Ending Values)
              </h3>
              <span className="text-xs text-zinc-400">{showDistribution ? '▼' : '▶'}</span>
            </button>

            {showDistribution && distribution.length > 0 && (
              <div className="mt-3 space-y-2">
                {distribution.map((bin, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-zinc-400">{bin.range}</span>
                      <span className="text-zinc-300 font-bold">{bin.count}</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-900 rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
                        style={{ width: `${(bin.count / Math.max(...distribution.map((b) => b.count))) * 100}%` }}
                      />
                    </div>
                    <div className="text-zinc-500 mt-0.5">{bin.percentage.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Percentiles */}
          {percentiles.length > 0 && (
            <Card className="p-4 bg-zinc-950 border border-zinc-800">
              <h3 className="text-sm font-semibold mb-3 text-zinc-100">Risk Percentiles</h3>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {percentiles.map((p, idx) => (
                  <div key={idx} className="text-center p-2 bg-zinc-900 rounded border border-zinc-800">
                    <div className="text-[10px] text-zinc-400">{p.percentile}th</div>
                    <div className={`text-sm font-bold ${getRiskColor(p.risk)}`}>{p.risk.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Interpretation */}
          <Card className="p-4 bg-blue-900/20 border border-blue-800">
            <p className="text-xs text-blue-200 leading-relaxed">
              <strong>What this means:</strong> This Monte Carlo simulation runs {results.numPaths.toLocaleString()} possible scenarios over the next
              {numDays === 30 ? ' month' : ` ${numDays} days`}. The colored boxes show the probability distribution of where your portfolio
              risk could end up. Mean risk of {results.meanEndingRisk.toFixed(1)} suggests an average outcome, while the VaR 95% metric shows the
              worst 5% of scenarios. Use this to understand downside risks and prepare accordingly.
            </p>
          </Card>
        </>
      )}

      {trendData.length === 0 && (
        <Card className="p-4 bg-yellow-900/20 border border-yellow-800 text-center">
          <p className="text-xs text-yellow-200">
            Not enough historical data to run simulation. Historical data will accumulate over time.
          </p>
        </Card>
      )}
    </div>
  );
}
