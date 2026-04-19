import { useMemo, useState } from 'react';
import { Zap, TrendingDown, Trash2, Play, BarChart3 } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { RiskScoreInfo } from './RiskScoreInfo';
import { Asset } from '../data/portfolioData';
import {
  applyCrisisScenario,
  testRemoveAsset,
  getAllScenarios,
  deleteScenario,
  getCrisisScenarioTemplates,
  getRebalancingSuggestions,
  type PortfolioScenario,
} from '../data/scenarioAnalysisManager';

interface ScenarioAnalysisProps {
  portfolio: Asset[];
  currentCountryRisks: { [country: string]: number };
  currentPortfolioRisk: number;
}

export function ScenarioAnalysis({
  portfolio,
  currentCountryRisks,
  currentPortfolioRisk,
}: ScenarioAnalysisProps) {
  const [scenarios, setScenarios] = useState<PortfolioScenario[]>(getAllScenarios());
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scenarios' | 'crisis' | 'suggestions'>('scenarios');

  const crisisTemplates = useMemo(() => getCrisisScenarioTemplates(), []);
  const selectedScenario = useMemo(
    () => scenarios.find((s) => s.id === selectedScenarioId) || null,
    [scenarios, selectedScenarioId]
  );

  const suggestions = useMemo(
    () => getRebalancingSuggestions(portfolio, currentCountryRisks),
    [portfolio, currentCountryRisks]
  );

  const handleApplyCrisis = (crisisId: string) => {
    const crisis = crisisTemplates.find((c) => c.id === crisisId);
    if (crisis) {
      const scenario = applyCrisisScenario(portfolio, crisis, currentCountryRisks);
      setScenarios([...scenarios, scenario]);
      setSelectedScenarioId(scenario.id);
    }
  };

  const handleRemoveAsset = (ticker: string) => {
    const scenario = testRemoveAsset(portfolio, ticker, currentCountryRisks);
    setScenarios([...scenarios, scenario]);
    setSelectedScenarioId(scenario.id);
  };

  const handleDeleteScenario = (id: string) => {
    if (deleteScenario(id)) {
      setScenarios(scenarios.filter((s) => s.id !== id));
      if (selectedScenarioId === id) {
        setSelectedScenarioId(null);
      }
    }
  };

  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${(Math.round(change * 10) / 10).toFixed(1)}`;
  };

  const getRiskColor = (value: number) => {
    if (value < 30) return 'text-green-500';
    if (value < 50) return 'text-yellow-500';
    if (value < 70) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="w-full space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-zinc-800">
        <Button
          variant={activeTab === 'scenarios' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('scenarios')}
          className="text-xs"
        >
          <BarChart3 size={14} className="mr-1" /> Scenarios
        </Button>
        <Button
          variant={activeTab === 'crisis' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('crisis')}
          className="text-xs"
        >
          <Zap size={14} className="mr-1" /> Crisis
        </Button>
        <Button
          variant={activeTab === 'suggestions' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('suggestions')}
          className="text-xs"
        >
          💡 Suggestions
        </Button>
      </div>

      {/* Scenarios Tab */}
      {activeTab === 'scenarios' && (
        <div className="space-y-3">
          {/* Quick Actions */}
          <Card className="p-3 bg-zinc-950 border-zinc-800">
            <div className="mb-2 flex items-center gap-1">
              <p className="text-xs font-semibold">Test Asset Changes</p>
              <RiskScoreInfo
                meaning="Simulate the effect of removing individual holdings on portfolio risk."
                calculation="Creates what-if scenarios by excluding a selected asset and recomputing portfolio risk."
              />
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {portfolio.slice(0, 5).map((asset) => (
                <Button
                  key={asset.ticker}
                  size="sm"
                  variant="outline"
                  onClick={() => handleRemoveAsset(asset.ticker)}
                  className="text-xs w-full justify-start"
                >
                  <TrendingDown size={12} className="mr-2" /> Remove {asset.ticker}
                </Button>
              ))}
            </div>
          </Card>

          {/* Saved Scenarios */}
          {scenarios.length > 0 && (
            <Card className="p-3 bg-zinc-950 border-zinc-800">
              <div className="mb-2 flex items-center gap-1">
                <p className="text-xs font-semibold text-white">Saved Scenarios ({scenarios.length})</p>
                <RiskScoreInfo
                  meaning="Scenario runs you've created and can revisit."
                  calculation="Shows baseline, scenario result, and percentage change for each saved scenario."
                />
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className={`p-2 rounded-lg border transition-all cursor-pointer ${
                      selectedScenarioId === scenario.id
                        ? 'bg-blue-950 border-blue-800'
                        : 'bg-zinc-900 border-zinc-700 hover:border-zinc-600'
                    }`}
                    onClick={() => setSelectedScenarioId(scenario.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-white">{scenario.name}</p>
                        <div className="flex gap-2 text-xs text-zinc-400 mt-1">
                          <span>Baseline: {Math.round(scenario.baselineRisk)}</span>
                          <span
                            className={`font-semibold ${
                              scenario.scenarioRisk > scenario.baselineRisk
                                ? 'text-red-500'
                                : 'text-green-500'
                            }`}
                          >
                            → {Math.round(scenario.scenarioRisk)}
                          </span>
                          <span className="text-zinc-500">
                            ({formatChange(scenario.riskChange)}%)
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteScenario(scenario.id);
                        }}
                        className="text-xs text-red-500 hover:bg-red-900/20"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Scenario Details */}
          {selectedScenario && (
            <Card className="p-4 bg-zinc-950 border-zinc-800">
              <h3 className="text-sm font-semibold mb-3 text-white">{selectedScenario.name}</h3>
              <div className="space-y-3">
                {/* Risk Comparison */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-zinc-900 rounded text-center border border-zinc-800">
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-xs text-zinc-400">Baseline</p>
                      <RiskScoreInfo
                        meaning="Portfolio risk before applying this scenario."
                        calculation="Current model score using baseline country risk assumptions."
                      />
                    </div>
                    <p className={`text-lg font-bold ${getRiskColor(selectedScenario.baselineRisk)}`}>
                      {Math.round(selectedScenario.baselineRisk)}
                    </p>
                  </div>
                  <div className="p-2 bg-zinc-900 rounded text-center flex items-center justify-center border border-zinc-800">
                    <TrendingDown size={16} className="text-zinc-500" />
                  </div>
                  <div className="p-2 bg-zinc-900 rounded text-center border border-zinc-800">
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-xs text-zinc-400">Scenario</p>
                      <RiskScoreInfo
                        meaning="Portfolio risk after this scenario is applied."
                        calculation="Recomputed score under scenario-adjusted country risk conditions."
                      />
                    </div>
                    <p className={`text-lg font-bold ${getRiskColor(selectedScenario.scenarioRisk)}`}>
                      {Math.round(selectedScenario.scenarioRisk)}
                    </p>
                  </div>
                </div>

                {/* Risk Change */}
                <div className="p-2 bg-zinc-900 rounded border border-zinc-800">
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-zinc-400">Risk Change</p>
                    <RiskScoreInfo
                      meaning="Percent difference between scenario risk and baseline risk."
                      calculation="Computed as ((scenario risk - baseline risk) / baseline risk) x 100."
                    />
                  </div>
                  <p
                    className={`text-lg font-bold ${
                      selectedScenario.riskChange > 0 ? 'text-red-500' : 'text-green-500'
                    }`}
                  >
                    {formatChange(selectedScenario.riskChange)}%
                  </p>
                </div>

                {/* Impacted Countries */}
                {selectedScenario.impactedCountries.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-1">
                      <p className="text-xs font-semibold text-white">Impacted Countries</p>
                      <RiskScoreInfo
                        meaning="Countries whose risk values changed under this scenario."
                        calculation="Lists impacted countries and the magnitude of risk adjustment for each one."
                      />
                    </div>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {selectedScenario.impactedCountries.slice(0, 8).map((country) => (
                        <div key={country.country} className="flex justify-between items-center text-xs">
                          <span className="text-zinc-300">{country.country}</span>
                          <span
                            className={
                              country.change > 0 ? 'text-red-500 font-semibold' : 'text-green-500'
                            }
                          >
                            {country.change > 0 ? '+' : ''}
                            {(Math.round(country.change * 10) / 10).toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Crisis Tab */}
      {activeTab === 'crisis' && (
        <div className="space-y-3">
          <Card className="p-3 bg-zinc-950 border-zinc-800">
            <div className="mb-2 flex items-center gap-1">
              <p className="text-xs font-semibold text-white">Crisis Scenarios</p>
              <RiskScoreInfo
                meaning="Predefined geopolitical shocks for rapid stress testing."
                calculation="Each template applies a curated set of country risk shocks to estimate portfolio impact."
              />
            </div>
            <p className="text-xs text-zinc-400 mb-3">
              Test how your portfolio would perform under major geopolitical crises
            </p>
            <div className="space-y-2">
              {crisisTemplates.map((crisis) => (
                <Button
                  key={crisis.id}
                  size="sm"
                  variant="outline"
                  onClick={() => handleApplyCrisis(crisis.id)}
                  className="text-xs w-full justify-start"
                >
                  <Play size={12} className="mr-2" /> {crisis.name}
                </Button>
              ))}
            </div>
          </Card>

          {selectedScenario?.type === 'crisis' && (
            <Card className="p-4 bg-red-950 border-red-900">
              <h3 className="text-sm font-semibold text-red-400 mb-2">
                ⚠️ {selectedScenario.name}
              </h3>
              <p className="text-xs text-zinc-300 mb-3">{selectedScenario.description}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-zinc-400">Current Risk</p>
                    <RiskScoreInfo
                      meaning="Present portfolio risk before crisis shock assumptions."
                      calculation="Current baseline portfolio risk score from active holdings and exposures."
                    />
                  </div>
                  <p className="font-bold text-lg text-yellow-500">
                    {Math.round(currentPortfolioRisk)}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-zinc-400">Crisis Risk</p>
                    <RiskScoreInfo
                      meaning="Projected portfolio risk under the selected crisis template."
                      calculation="Risk recomputation after crisis-specific regional and country stress multipliers."
                    />
                  </div>
                  <p className="font-bold text-lg text-red-500">
                    {Math.round(selectedScenario.scenarioRisk)}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Suggestions Tab */}
      {activeTab === 'suggestions' && (
        <div className="space-y-3">
          {suggestions.suggestions.length > 0 ? (
            <>
              <Card className="p-3 bg-green-950 border-green-900">
                <div className="mb-2 flex items-center gap-1">
                  <p className="text-xs font-semibold text-green-400">📊 Rebalancing Recommendations</p>
                  <RiskScoreInfo
                    meaning="Suggested portfolio changes aimed at lowering geopolitical risk."
                    calculation="Generated by testing candidate remove/add actions against current country risk exposures."
                  />
                </div>
                <p className="text-xs text-zinc-300">
                  Follow these suggestions to reduce geopolitical risk exposure
                </p>
              </Card>

              <div className="space-y-2">
                {suggestions.suggestions.map((suggestion, idx) => (
                  <Card key={idx} className="p-3 bg-zinc-950 border-zinc-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-white">
                          {suggestion.action === 'remove' ? '❌ Remove' : '✅ Add'} {suggestion.asset}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">{suggestion.reason}</p>
                        <p className="text-xs font-semibold text-green-500 mt-2">
                          Potential Risk Reduction: {suggestion.potentialRiskReduction.toFixed(1)}%
                        </p>
                      </div>
                      {suggestion.action === 'remove' && suggestion.asset && (
                        <Button
                          size="sm"
                          onClick={() => handleRemoveAsset(suggestion.asset!)}
                          className="text-xs"
                        >
                          <Play size={12} />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {suggestions.bestScenario && (
                <Card className="p-3 bg-purple-950 border-purple-900">
                  <div className="mb-2 flex items-center gap-1">
                    <p className="text-xs font-semibold text-purple-300">Best Outcome</p>
                    <RiskScoreInfo
                      meaning="Lowest-risk result among generated rebalancing options."
                      calculation="Selects the suggestion scenario with the smallest projected resulting portfolio risk."
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-zinc-300 flex items-center gap-1">
                        <p>Current Risk: <span className="font-bold">{Math.round(currentPortfolioRisk)}</span></p>
                        <RiskScoreInfo
                          meaning="Starting portfolio risk before applying suggested rebalancing actions."
                          calculation="Current baseline risk used as the comparison anchor for improvement."
                        />
                      </div>
                      <div className="text-xs text-zinc-300 mt-1 flex items-center gap-1">
                        <p>With Changes: <span className="font-bold text-green-500">
                          {Math.round(suggestions.bestScenario.scenarioRisk)}
                        </span></p>
                        <RiskScoreInfo
                          meaning="Projected risk after applying the best suggested changes."
                          calculation="Scenario risk output from the top-ranked rebalancing recommendation set."
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-400 flex items-center gap-1 justify-end">
                        <p>Risk Reduction</p>
                        <RiskScoreInfo
                          meaning="Percent improvement versus the current baseline risk."
                          calculation="((current risk - projected risk) / current risk) x 100."
                        />
                      </div>
                      <p className="text-lg font-bold text-green-500">
                        {((currentPortfolioRisk - suggestions.bestScenario.scenarioRisk) / currentPortfolioRisk * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card className="p-4 bg-zinc-950 border-zinc-800 text-center">
              <p className="text-xs text-zinc-400">
                No rebalancing suggestions at this time. Your portfolio looks well-diversified.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
