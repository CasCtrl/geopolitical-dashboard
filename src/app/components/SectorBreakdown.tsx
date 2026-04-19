import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from './ui/card';
import { calculateSectorData, HoldingAsset } from '../utils/portfolioFilters';

interface SectorBreakdownProps {
  assets: HoldingAsset[];
  countryRisks: Record<string, number>;
}

export function SectorBreakdown({ assets, countryRisks }: SectorBreakdownProps) {
  const sectorData = calculateSectorData(assets, countryRisks);
  const totalPortfolioValue = sectorData.reduce((sum, s) => sum + s.totalValue, 0);

  const getRiskColor = (risk: number) => {
    if (risk < 30) return 'text-green-400';
    if (risk < 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRiskBgColor = (risk: number) => {
    if (risk < 30) return 'bg-green-950';
    if (risk < 60) return 'bg-yellow-950';
    return 'bg-red-950';
  };

  return (
    <div className="w-full space-y-4">
      <Card className="p-6 bg-zinc-950 border border-zinc-800">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">Sector-Level Risk Breakdown</h3>

        {sectorData.length === 0 ? (
          <p className="text-center text-zinc-400 text-sm py-8">
            No holdings data available. Upload or select a portfolio first.
          </p>
        ) : (
          <div className="space-y-3">
            {sectorData.map((sector, index) => {
              const allocation = totalPortfolioValue > 0 ? (sector.totalValue / totalPortfolioValue) * 100 : 0;
              
              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border border-zinc-700 ${getRiskBgColor(sector.averageRisk)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-zinc-100">{sector.sector}</h4>
                      <p className="text-xs text-zinc-400">{sector.assetCount} assets</p>
                    </div>
                    <div className={`text-right font-semibold ${getRiskColor(sector.averageRisk)}`}>
                      {sector.averageRisk.toFixed(1)}
                    </div>
                  </div>

                  {/* Allocation Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-zinc-400">Portfolio Allocation</span>
                      <span className="text-sm font-medium text-zinc-200">${sector.totalValue.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getRiskBgColor(sector.averageRisk)} rounded-full`}
                        style={{ width: `${allocation}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400 mt-1">{allocation.toFixed(1)}% of portfolio</span>
                  </div>

                  {/* Risk Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2 bg-zinc-900/50 rounded border border-zinc-700">
                      <p className="text-zinc-400">Avg Risk Score</p>
                      <p className={`font-semibold ${getRiskColor(sector.averageRisk)}`}>
                        {sector.averageRisk.toFixed(1)}/100
                      </p>
                    </div>
                    <div className="p-2 bg-zinc-900/50 rounded border border-zinc-700">
                      <p className="text-zinc-400">Sector Risk Index</p>
                      <p className={`font-semibold ${getRiskColor(sector.riskScore)}`}>
                        {sector.riskScore.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  {/* Risk Trend */}
                  <div className="mt-3 pt-3 border-t border-zinc-700 flex items-center justify-between">
                    {sector.averageRisk > 60 ? (
                      <>
                        <span className="text-xs text-red-300">High Risk Exposure</span>
                        <TrendingUp size={14} className="text-red-400" />
                      </>
                    ) : sector.averageRisk > 30 ? (
                      <>
                        <span className="text-xs text-yellow-300">Moderate Risk</span>
                        <TrendingUp size={14} className="text-yellow-400" />
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-green-300">Lower Risk</span>
                        <TrendingDown size={14} className="text-green-400" />
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Summary */}
            <div className="mt-4 p-4 bg-zinc-900 border border-zinc-700 rounded-lg">
              <h4 className="font-medium text-zinc-100 mb-2">Portfolio Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Total Value:</span>
                  <span className="font-medium text-zinc-100">${totalPortfolioValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Average Risk:</span>
                  <span className={`font-medium ${getRiskColor(
                    sectorData.reduce((sum, s) => sum + s.averageRisk, 0) / sectorData.length || 0
                  )}`}>
                    {(sectorData.reduce((sum, s) => sum + s.averageRisk, 0) / sectorData.length || 0).toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Sectors Covered:</span>
                  <span className="font-medium text-zinc-100">{sectorData.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
