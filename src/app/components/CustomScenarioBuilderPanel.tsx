import { useState } from 'react';
import { Plus, Trash2, Play, Copy, Settings } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { RiskScoreInfo } from './RiskScoreInfo';
import {
  createCustomScenario,
  getCustomScenarios,
  deleteCustomScenario,
  testCustomScenario,
  generateFromTemplate,
  SCENARIO_TEMPLATES,
  getScenarioStats,
  type CustomScenario,
} from '../data/customScenarioBuilder';

interface CustomScenarioBuilderPanelProps {
  baselineCountryRisks: { [country: string]: number };
  portfolioExposures: Array<{ country: string; riskContribution: number; name: string }>;
  currentRisk: number;
  onScenarioTest?: (result: ReturnType<typeof testCustomScenario>) => void;
}

export function CustomScenarioBuilderPanel({
  baselineCountryRisks,
  portfolioExposures,
  currentRisk,
  onScenarioTest,
}: CustomScenarioBuilderPanelProps) {
  const [scenarios, setScenarios] = useState(() => getCustomScenarios());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<CustomScenario | null>(null);
  const [testResult, setTestResult] = useState<ReturnType<typeof testCustomScenario> | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSeverity, setFormSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [formMultipliers, setFormMultipliers] = useState<{ [country: string]: number }>({});
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedMultiplier, setSelectedMultiplier] = useState(1.5);

  const handleAddMultiplier = () => {
    if (selectedCountry && selectedMultiplier > 0) {
      setFormMultipliers({
        ...formMultipliers,
        [selectedCountry]: selectedMultiplier,
      });
      setSelectedCountry('');
      setSelectedMultiplier(1.5);
    }
  };

  const handleCreateScenario = () => {
    if (formName && formDescription && Object.keys(formMultipliers).length > 0) {
      const newScenario = createCustomScenario(
        formName,
        formDescription,
        formMultipliers,
        Object.keys(formMultipliers),
        formSeverity
      );

      setScenarios([...scenarios, newScenario]);
      setFormName('');
      setFormDescription('');
      setFormMultipliers({});
      setShowCreateForm(false);
    }
  };

  const handleDeleteScenario = (id: string) => {
    deleteCustomScenario(id);
    setScenarios(scenarios.filter((s) => s.id !== id));
    if (selectedScenario?.id === id) {
      setSelectedScenario(null);
      setTestResult(null);
    }
  };

  const handleTestScenario = (scenario: CustomScenario) => {
    const result = testCustomScenario(scenario, baselineCountryRisks, portfolioExposures, currentRisk);
    setTestResult(result);
    setSelectedScenario(scenario);
    if (onScenarioTest) onScenarioTest(result);
  };

  const handleUseTemplate = (templateId: string) => {
    const template = SCENARIO_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      const newScenario = generateFromTemplate(template, {});
      setScenarios([...scenarios, newScenario]);
      setShowTemplates(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'high':
        return 'text-orange-400';
      case 'critical':
        return 'text-red-400';
      default:
        return 'text-zinc-400';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Header & Controls */}
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Settings size={16} className="text-indigo-400" />
            Custom Scenario Builder
            <RiskScoreInfo
              meaning="Create and test portfolio stress scenarios with custom country risk multipliers."
              calculation="Applies your multiplier inputs to baseline country risks and recomputes stressed portfolio outcomes."
            />
          </h3>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 h-8 px-3"
            >
              <Copy size={12} className="mr-1" />
              Templates
            </Button>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="text-xs bg-blue-600 hover:bg-blue-700 h-8 px-3"
            >
              <Plus size={12} className="mr-1" />
              New
            </Button>
          </div>
        </div>

        {/* Templates Grid */}
        {showTemplates && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-zinc-900 rounded border border-zinc-800">
            {SCENARIO_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleUseTemplate(template.id)}
                className="p-2 text-left text-xs bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors"
              >
                <div className="font-semibold text-zinc-200 mb-0.5">{template.name}</div>
                <div className="text-zinc-500 text-[10px]">{template.description}</div>
              </button>
            ))}
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="space-y-3 p-3 bg-zinc-900 rounded border border-zinc-800">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Scenario Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100 placeholder-zinc-600"
                placeholder="e.g., US-China Escalation"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Description</label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100 placeholder-zinc-600"
                placeholder="What happens in this scenario?"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Severity</label>
              <select
                value={formSeverity}
                onChange={(e) =>
                  setFormSeverity(e.target.value as 'low' | 'medium' | 'high' | 'critical')
                }
                className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-2 block">Add Risk Multipliers</label>
              <div className="flex gap-2 mb-2">
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="flex-1 text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100"
                >
                  <option value="">Select country...</option>
                  {Object.keys(baselineCountryRisks).map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={selectedMultiplier}
                  onChange={(e) => setSelectedMultiplier(parseFloat(e.target.value))}
                  className="w-16 text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100"
                />
                <button
                  onClick={handleAddMultiplier}
                  className="px-3 py-1 text-xs bg-green-700 hover:bg-green-600 rounded text-white"
                >
                  Add
                </button>
              </div>

              {/* Added Multipliers */}
              <div className="space-y-1 mb-3">
                {Object.entries(formMultipliers).map(([country, mult]) => (
                  <div key={country} className="flex items-center justify-between p-1.5 bg-zinc-800 rounded text-xs">
                    <span className="text-zinc-300">{country}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 font-bold">×{mult.toFixed(1)}</span>
                      <button
                        onClick={() => {
                          const updated = { ...formMultipliers };
                          delete updated[country];
                          setFormMultipliers(updated);
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreateScenario}
                disabled={!formName || !formDescription || Object.keys(formMultipliers).length === 0}
                className="flex-1 px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white font-medium"
              >
                Create Scenario
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 px-3 py-2 text-xs bg-zinc-700 hover:bg-zinc-600 rounded text-white font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Saved Scenarios */}
      <div className="space-y-3">
        {scenarios.length > 0 && (
          <div className="flex items-center gap-1 px-1">
            <p className="text-xs font-semibold text-zinc-300">Saved Scenarios</p>
            <RiskScoreInfo
              meaning="Previously created custom stress scenarios available for retesting."
              calculation="Stored scenario definitions with severity and per-country multipliers."
            />
          </div>
        )}
        {scenarios.length === 0 ? (
          <Card className="p-4 bg-zinc-950 border border-zinc-800 text-center text-xs text-zinc-500">
            No custom scenarios yet. Create one or use a template to get started.
          </Card>
        ) : (
          scenarios.map((scenario) => {
            const stats = getScenarioStats(scenario);
            return (
              <Card
                key={scenario.id}
                className={`p-3 bg-zinc-950 border ${selectedScenario?.id === scenario.id ? 'border-blue-700' : 'border-zinc-800'} cursor-pointer hover:border-zinc-700 transition-colors`}
                onClick={() => setSelectedScenario(scenario)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold text-zinc-100 mb-0.5">{scenario.name}</h4>
                    <p className="text-[10px] text-zinc-500">{scenario.description}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <span className={`text-xs font-bold ${getSeverityColor(scenario.severity)}`}>
                      {scenario.severity.toUpperCase()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestScenario(scenario);
                      }}
                      className="p-1 bg-green-700 hover:bg-green-600 rounded text-white"
                      title="Test scenario"
                    >
                      <Play size={10} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScenario(scenario.id);
                      }}
                      className="p-1 bg-red-700 hover:bg-red-600 rounded text-white"
                      title="Delete scenario"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-[10px]">
                  <div className="text-center">
                    <div className="text-zinc-500">Avg Mult</div>
                    <div className="font-bold text-yellow-400">×{stats.averageMultiplier.toFixed(1)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-zinc-500">Max Mult</div>
                    <div className="font-bold text-orange-400">×{stats.maxMultiplier.toFixed(1)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-zinc-500">Countries</div>
                    <div className="font-bold text-blue-400">{stats.affectedCountries}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-zinc-500">Created</div>
                    <div className="font-bold text-zinc-300">
                      {new Date(scenario.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Test Results */}
      {testResult && selectedScenario && (
        <Card className="p-4 bg-zinc-950 border border-zinc-800">
          <div className="mb-3 flex items-center gap-1">
            <h3 className="text-sm font-semibold text-zinc-100">Test Results: {selectedScenario.name}</h3>
            <RiskScoreInfo
              meaning="Outcome of applying this custom scenario to your current portfolio profile."
              calculation="Compares baseline vs stressed risk and flags whether your alert threshold would have triggered."
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-zinc-900 rounded p-2 border border-zinc-800 text-center text-xs">
              <div className="text-zinc-400 mb-1">Baseline Risk</div>
              <div className="text-lg font-bold text-zinc-200">{testResult.baselineRisk}</div>
            </div>
            <div className="bg-zinc-900 rounded p-2 border border-zinc-800 text-center text-xs">
              <div className="text-zinc-400 mb-1">Stressed Risk</div>
              <div className="text-lg font-bold text-orange-400">{testResult.stressedRisk}</div>
            </div>
            <div className="bg-zinc-900 rounded p-2 border border-zinc-800 text-center text-xs">
              <div className="text-zinc-400 mb-1">Increase</div>
              <div className="text-lg font-bold text-red-400">+{testResult.percentageIncrease}%</div>
            </div>
            <div className="bg-zinc-900 rounded p-2 border border-zinc-800 text-center text-xs">
              <div className="text-zinc-400 mb-1">Alert Status</div>
              <div className={`text-lg font-bold ${testResult.wouldHaveFired ? 'text-red-400' : 'text-green-400'}`}>
                {testResult.wouldHaveFired ? '🚨 YES' : '✓ NO'}
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-900/20 border border-blue-800 rounded text-xs text-blue-200 mb-3">
            {testResult.recommendation}
          </div>

          {testResult.affectedHoldings.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1">
                <p className="text-xs font-semibold text-zinc-300">Most Affected Holdings</p>
                <RiskScoreInfo
                  meaning="Holdings with the largest risk increase under this custom scenario."
                  calculation="Ranks holdings by stressed risk minus baseline risk after scenario multipliers are applied."
                />
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {testResult.affectedHoldings.slice(0, 5).map((holding, idx: number) => (
                  <div key={idx} className="text-xs p-2 bg-zinc-900 rounded flex justify-between">
                    <span className="text-zinc-300">{holding.name}</span>
                    <span className="text-orange-400">+{holding.stressedRisk - holding.baseRisk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
