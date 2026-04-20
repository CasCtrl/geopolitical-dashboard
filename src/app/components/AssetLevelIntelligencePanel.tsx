import { useMemo } from 'react';
import { Card } from './ui/card';
import { RiskScoreInfo } from './RiskScoreInfo';
import { Asset } from '../data/portfolioData';
import {
  buildAssetHedgingSuggestion,
  calculateTopCorrelationPairs,
} from '../utils/riskIntelligence';

interface AssetLevelIntelligencePanelProps {
  portfolio: Asset[];
  riskData: { [country: string]: number };
}

export function AssetLevelIntelligencePanel({ portfolio, riskData }: AssetLevelIntelligencePanelProps) {
  const hedgingSuggestions = useMemo(
    () =>
      portfolio
        .map((asset) => ({
          ticker: asset.ticker,
          suggestion: buildAssetHedgingSuggestion(asset, riskData),
        }))
        .slice(0, 8),
    [portfolio, riskData]
  );

  const topCorrelations = useMemo(() => calculateTopCorrelationPairs(portfolio), [portfolio]);

  return (
    <Card className="p-4 bg-zinc-950 border border-zinc-800">
      <div className="mb-2 flex items-center gap-1.5">
        <h3 className="text-sm font-semibold text-zinc-100">Asset-Level Intelligence</h3>
        <RiskScoreInfo
          meaning="Provides per-asset hedging ideas and concentration overlap signals across holdings."
          calculation="Suggestions are derived from highest weighted country risk dependency per asset; overlap uses weighted dependency-set similarity between holding pairs."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-xs text-zinc-300 font-medium">Hedging Suggestions</p>
          {hedgingSuggestions.map((item) => (
            <div key={item.ticker} className="p-2 rounded border border-zinc-800 bg-zinc-900/60 text-xs">
              <p className="text-zinc-200 font-medium">{item.ticker}</p>
              <p className="text-zinc-400 mt-1">{item.suggestion}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-xs text-zinc-300 font-medium">Highest Correlated Holdings</p>
          {topCorrelations.length > 0 ? (
            topCorrelations.map((item) => (
              <div key={item.pair} className="p-2 rounded border border-zinc-800 bg-zinc-900/60 text-xs flex justify-between">
                <span className="text-zinc-200">{item.pair}</span>
                <span className="text-amber-300">{Math.round(item.overlap * 100)}% overlap</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-zinc-500">No significant concentration overlaps detected.</p>
          )}
          <p className="text-xs text-zinc-500 pt-1">
            Diversification opportunity: reduce exposure where overlap exceeds 50% by shifting weight into lower-correlation holdings.
          </p>
        </div>
      </div>
    </Card>
  );
}