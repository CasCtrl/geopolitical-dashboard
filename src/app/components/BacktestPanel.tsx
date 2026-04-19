import React, { useMemo, useState } from 'react';
import { AlertTriangle, TrendingUp, Check, X } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  runAllBacktests,
  getBacktestSummary,
  HISTORICAL_SCENARIOS,
  type BacktestResult,
} from '../data/backtestingEngine';

interface BacktestPanelProps {
  baselineCountryRisks: { [country: string]: number };
  portfolioExposures: Array<{ country: string; riskContribution: number; name: string }>;
  currentRisk: number;
}

export function BacktestPanel({
  baselineCountryRisks,
  portfolioExposures,
  currentRisk,
}: BacktestPanelProps) {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(
    HISTORICAL_SCENARIOS[0]?.id || null
  );

  const backtestResults = useMemo(
    () =>
      runAllBacktests(baselineCountryRisks, portfolioExposures, currentRisk),
    [baselineCountryRisks, portfolioExposures, currentRisk]
  );

  const summary = useMemo(() => getBacktestSummary(backtestResults), [backtestResults]);

  const selectedResult = backtestResults.find((r) => r.scenario.id === selectedScenario);

  const getRiskColor = (risk: number) => {
    if (risk < 30) return 'text-green-500';
    if (risk < 50) return 'text-yellow-500';
    if (risk < 70) return 'text-orange-500';
    return 'text-red-500';
  };

  const getResilienceColor = (resilience: number) => {
    if (resilience >= 70) return 'text-green-500';
    if (resilience >= 50) return 'text-yellow-500';
    if (resilience >= 30) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="w-full space-y-4">
      {/* Summary Card */}
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <h3 className="text-sm font-semibold mb-4 text-zinc-100 flex items-center gap-2">
          <AlertTriangle size={16} className="text-orange-400" />
          Stress Test Summary
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Scenarios Tested</div>
            <div className="text-xl font-bold text-zinc-100">{summary.totalScenarios}</div>
          </div>

          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Would Alert Fire</div>
            <div className="flex items-center gap-2">
              <div className="text-xl font-bold text-red-500">{summary.wouldHaveFired}</div>
              <div className="text-xs text-zinc-500">scenarios</div>
            </div>
          </div>

          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Max Risk Increase</div>
            <div className={`text-xl font-bold ${getRiskColor(summary.maxRiskIncrease)}`}>
              +{summary.maxRiskIncrease}
            </div>
          </div>

          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Portfolio Resilience</div>
            <div className={`text-xl font-bold ${getResilienceColor(summary.resilience)}`}>
              {summary.resilience.toFixed(0)}%
            </div>
          </div>
        </div>
      </Card>

      {/* Scenario Details */}
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <h3 className="text-sm font-semibold mb-4 text-zinc-100">Scenario Analysis</h3>

        {/* Scenario Selector */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-zinc-300 mb-2">Select Scenario</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {backtestResults.map((result) => (
              <button
                key={result.scenario.id}
                onClick={() => setSelectedScenario(result.scenario.id)}
                className={`p-3 rounded border text-left transition-colors ${
                  selectedScenario === result.scenario.id
                    ? 'bg-blue-900/30 border-blue-700'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="text-xs font-semibold text-zinc-100 mb-1">
                  {result.scenario.name}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-sm font-bold ${getRiskColor(result.stressedRisk)}`}>
                    {result.stressedRisk}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {result.wouldHaveFired ? (
                      <span className="text-red-400">🚨 Would Alert</span>
                    ) : (
                      <span className="text-green-400">✓ Safe</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Scenario Details */}
        {selectedResult && (
          <div className="mt-6 pt-6 border-t border-zinc-800 space-y-4">
            <div>
              <p className="text-xs text-zinc-400 mb-1">Scenario Description</p>
              <p className="text-sm text-zinc-200">{selectedResult.scenario.description}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
                <div className="text-xs text-zinc-400">Baseline Risk</div>
                <div className="text-lg font-bold text-zinc-100">{selectedResult.baselineRisk}</div>
              </div>

              <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
                <div className="text-xs text-zinc-400">Stressed Risk</div>
                <div className={`text-lg font-bold ${getRiskColor(selectedResult.stressedRisk)}`}>
                  {selectedResult.stressedRisk}
                </div>
              </div>

              <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
                <div className="text-xs text-zinc-400">Risk Increase</div>
                <div className="text-lg font-bold text-orange-500">
                  +{selectedResult.riskIncrease} ({selectedResult.percentageIncrease}%)
                </div>
              </div>

              <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
                <div className="text-xs text-zinc-400">Alert Status</div>
                <div
                  className={`text-lg font-bold ${
                    selectedResult.wouldHaveFired ? 'text-red-500' : 'text-green-500'
                  }`}
                >
                  {selectedResult.wouldHaveFired ? '🚨 YES' : '✓ NO'}
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="bg-blue-900/20 border border-blue-800 rounded p-3">
              <p className="text-xs font-semibold text-blue-200 mb-1">Recommendation</p>
              <p className="text-xs text-blue-100">{selectedResult.recommendation}</p>
            </div>

            {/* Affected Holdings */}
            {selectedResult.affectedHoldings.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-300 mb-2">Most Affected Holdings</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedResult.affectedHoldings.slice(0, 8).map((holding, idx) => (
                    <div
                      key={idx}
                      className="bg-zinc-900 rounded p-2 border border-zinc-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-zinc-200">{holding.name}</p>
                        <p className="text-zinc-500">Exposure: {holding.exposure}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-zinc-300">
                          {holding.baseRisk} → <span className="text-orange-500">{holding.stressedRisk}</span>
                        </div>
                        <div className="text-zinc-500">
                          +{holding.stressedRisk - holding.baseRisk}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affected Regions */}
            <div>
              <p className="text-xs font-semibold text-zinc-300 mb-2">Affected Regions</p>
              <div className="flex flex-wrap gap-2">
                {selectedResult.scenario.affectedRegions.map((region) => (
                  <span
                    key={region}
                    className="px-2 py-1 bg-red-900/20 border border-red-800 rounded text-xs text-red-300"
                  >
                    {region}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Scenario Comparison Table */}
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <h3 className="text-sm font-semibold mb-3 text-zinc-100">All Scenarios</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-2 px-2 text-zinc-400">Scenario</th>
                <th className="text-right py-2 px-2 text-zinc-400">Baseline</th>
                <th className="text-right py-2 px-2 text-zinc-400">Stressed</th>
                <th className="text-right py-2 px-2 text-zinc-400">Change</th>
                <th className="text-right py-2 px-2 text-zinc-400">Alert?</th>
              </tr>
            </thead>
            <tbody>
              {backtestResults.map((result) => (
                <tr key={result.scenario.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="py-2 px-2">
                    <button
                      onClick={() => setSelectedScenario(result.scenario.id)}
                      className="text-zinc-300 hover:text-blue-400 font-medium text-left"
                    >
                      {result.scenario.name}
                    </button>
                  </td>
                  <td className="text-right py-2 px-2 text-zinc-400">{result.baselineRisk}</td>
                  <td className={`text-right py-2 px-2 font-semibold ${getRiskColor(result.stressedRisk)}`}>
                    {result.stressedRisk}
                  </td>
                  <td className="text-right py-2 px-2 text-orange-500">
                    +{result.riskIncrease} ({result.percentageIncrease}%)
                  </td>
                  <td className="text-right py-2 px-2">
                    {result.wouldHaveFired ? (
                      <span className="text-red-500 font-bold">🚨</span>
                    ) : (
                      <span className="text-green-500 font-bold">✓</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
