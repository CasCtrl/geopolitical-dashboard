import { useMemo, useState } from 'react';
import { Network, TrendingUp, Lightbulb } from 'lucide-react';
import { Card } from './ui/card';
import {
  buildCorrelationMatrix,
  analyzeRegionalCorrelations,
  findDiversificationOpportunities,
  analyzeRiskWithCorrelations,
} from '../data/correlationAnalysis';

interface CorrelationAnalysisPanelProps {
  countryRisks: { [country: string]: number };
  trendData: { [country: string]: number[] };
  weights: { [country: string]: number };
  currentPortfolioCountries: string[];
}

export function CorrelationAnalysisPanel({
  countryRisks,
  trendData,
  weights,
  currentPortfolioCountries,
}: CorrelationAnalysisPanelProps) {
  const [showMatrix, setShowMatrix] = useState(false);
  const [showRegions, setShowRegions] = useState(false);
  const [showDiversification, setShowDiversification] = useState(false);

  const correlationMatrix = useMemo(() => {
    // Build correlation matrix from available trend data
    const data: { [country: string]: number[] } = {};
    for (const country in trendData) {
      if (trendData[country] && trendData[country].length > 0) {
        data[country] = trendData[country];
      }
    }

    // If no trend data, use mock data based on risk scores
    if (Object.keys(data).length === 0) {
      for (const country in countryRisks) {
        data[country] = Array(30).fill(countryRisks[country]);
      }
    }

    return buildCorrelationMatrix(data);
  }, [countryRisks, trendData]);

  const regionalCorrelations = useMemo(
    () => analyzeRegionalCorrelations(correlationMatrix),
    [correlationMatrix]
  );

  const diversificationOps = useMemo(
    () => findDiversificationOpportunities(correlationMatrix, currentPortfolioCountries),
    [correlationMatrix, currentPortfolioCountries]
  );

  const riskAnalysis = useMemo(
    () => analyzeRiskWithCorrelations(countryRisks, weights, correlationMatrix),
    [countryRisks, weights, correlationMatrix]
  );

  const getCorrelationColor = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 0.8) return 'bg-red-700';
    if (abs >= 0.6) return 'bg-orange-600';
    if (abs >= 0.4) return 'bg-yellow-600';
    if (abs >= 0.2) return 'bg-blue-600';
    return 'bg-zinc-700';
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'very strong':
        return 'text-red-400';
      case 'strong':
        return 'text-orange-400';
      case 'moderate':
        return 'text-yellow-400';
      case 'weak':
        return 'text-blue-400';
      default:
        return 'text-zinc-400';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Summary */}
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <h3 className="text-sm font-semibold mb-4 text-zinc-100 flex items-center gap-2">
          <Network size={16} className="text-purple-400" />
          Correlation & Diversification Analysis
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Diversification Ratio</div>
            <div className={`text-lg font-bold ${riskAnalysis.diversificationRatio > 1.3 ? 'text-green-400' : riskAnalysis.diversificationRatio > 1.1 ? 'text-yellow-400' : 'text-red-400'}`}>
              {riskAnalysis.diversificationRatio.toFixed(2)}x
            </div>
          </div>

          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Effective Diversification</div>
            <div className="text-lg font-bold text-zinc-200">
              {riskAnalysis.effectiveDiversification.toFixed(0)}%
            </div>
          </div>

          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Risk Concentration</div>
            <div className={`text-lg font-bold ${riskAnalysis.riskConcentration < 30 ? 'text-green-400' : riskAnalysis.riskConcentration < 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {riskAnalysis.riskConcentration.toFixed(0)}%
            </div>
          </div>

          <div className="bg-zinc-900 rounded p-3 border border-zinc-800">
            <div className="text-xs text-zinc-400 mb-1">Pair Correlations</div>
            <div className="text-lg font-bold text-zinc-200">{correlationMatrix.pairs.length}</div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded">
          <p className="text-xs text-blue-200">{riskAnalysis.recommendation}</p>
        </div>
      </Card>

      {/* Correlation Matrix */}
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <button
          onClick={() => setShowMatrix(!showMatrix)}
          className="w-full text-left flex items-center justify-between hover:bg-zinc-900/50 p-2 -m-2 rounded"
        >
          <h3 className="text-sm font-semibold text-zinc-100">Strong Correlations</h3>
          <span className="text-xs text-zinc-400">{showMatrix ? '▼' : '▶'}</span>
        </button>

        {showMatrix && correlationMatrix.pairs.length > 0 && (
          <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
            {correlationMatrix.pairs.slice(0, 15).map((pair, idx) => (
              <div key={idx} className="p-2 bg-zinc-900 rounded border border-zinc-800 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-zinc-300 font-medium truncate">{pair.country1}</span>
                    <span className="text-zinc-500">↔</span>
                    <span className="text-zinc-300 font-medium truncate">{pair.country2}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded overflow-hidden">
                    <div
                      className={`h-full transition-all ${getCorrelationColor(pair.correlation)}`}
                      style={{ width: `${Math.abs(pair.correlation) * 100}%` }}
                    />
                  </div>
                  <span className={`font-bold w-12 text-right ${getStrengthColor(pair.strength)}`}>
                    {pair.correlation.toFixed(2)}
                  </span>
                </div>
                <div className="text-zinc-500 mt-1">{pair.strength}</div>
              </div>
            ))}

            {correlationMatrix.pairs.length > 15 && (
              <div className="p-2 text-xs text-zinc-500 text-center">
                +{correlationMatrix.pairs.length - 15} more pairs
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Regional Analysis */}
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <button
          onClick={() => setShowRegions(!showRegions)}
          className="w-full text-left flex items-center justify-between hover:bg-zinc-900/50 p-2 -m-2 rounded"
        >
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <TrendingUp size={14} />
            Regional Cohesion
          </h3>
          <span className="text-xs text-zinc-400">{showRegions ? '▼' : '▶'}</span>
        </button>

        {showRegions && (
          <div className="mt-3 space-y-3">
            {regionalCorrelations.map((region, idx) => (
              <div key={idx} className="p-3 bg-zinc-900 rounded border border-zinc-800 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-zinc-200">{region.region}</span>
                  <span className="font-bold text-zinc-300">{region.internalCorrelation.toFixed(2)}</span>
                </div>

                <div className="space-y-1 mb-2">
                  {region.toOtherRegions.slice(0, 3).map((other, oidx) => (
                    <div key={oidx} className="flex items-center justify-between text-zinc-500 text-[10px]">
                      <span>to {other.region}</span>
                      <span>{other.correlation.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <p className={`text-[10px] ${region.internalCorrelation > 0.4 ? 'text-orange-400' : 'text-green-400'}`}>
                  {region.internalCorrelation > 0.4
                    ? 'Countries move together'
                    : 'Countries move independently'}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Diversification Opportunities */}
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <button
          onClick={() => setShowDiversification(!showDiversification)}
          className="w-full text-left flex items-center justify-between hover:bg-zinc-900/50 p-2 -m-2 rounded"
        >
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Lightbulb size={14} />
            Diversification Ideas
          </h3>
          <span className="text-xs text-zinc-400">{showDiversification ? '▼' : '▶'}</span>
        </button>

        {showDiversification && diversificationOps.length > 0 && (
          <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
            {diversificationOps.map((opp, idx) => (
              <div key={idx} className="p-3 bg-zinc-900 rounded border border-zinc-800 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-zinc-200">{opp.country}</span>
                  <span className={`font-bold ${opp.avgCorrelation < 0.3 ? 'text-green-400' : opp.avgCorrelation < 0.5 ? 'text-yellow-400' : 'text-orange-400'}`}>
                    Corr: {opp.avgCorrelation.toFixed(2)}
                  </span>
                </div>
                <p className="text-zinc-400">{opp.benefit}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Information */}
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <h3 className="text-sm font-semibold mb-2 text-zinc-100">Understanding These Metrics</h3>
        <div className="text-xs text-zinc-300 space-y-2">
          <p>
            <strong>Diversification Ratio:</strong> How much risk reduction you get from diversification. &gt;1.3 is
            excellent.
          </p>
          <p>
            <strong>Effective Diversification:</strong> % of risk that's been eliminated through diversification.
          </p>
          <p>
            <strong>Correlation:</strong> Ranges from -1 (opposite) to +1 (together). Low correlations = good
            diversifiers.
          </p>
          <p>
            <strong>Regional Cohesion:</strong> How tightly countries within a region move together.
          </p>
        </div>
      </Card>
    </div>
  );
}
