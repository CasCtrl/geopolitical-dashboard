import React, { useState } from 'react';
import { Filter, RotateCcw, AlertCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  screenAssets,
  getSectorsFromAssets,
  getCountriesFromAssets,
  ScreeningCriteria,
  HoldingAsset,
} from '../utils/portfolioFilters';

interface AssetScreenerProps {
  assets: HoldingAsset[];
  countryRisks: Record<string, number>;
  onScreenedAssetsChange?: (assets: HoldingAsset[]) => void;
}

export function AssetScreener({ assets, countryRisks, onScreenedAssetsChange }: AssetScreenerProps) {
  const [criteria, setCriteria] = useState<ScreeningCriteria>({});
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [minAssetValue, setMinAssetValue] = useState<number>(0);
  const [maxAssetValue, setMaxAssetValue] = useState<number>(1000000);
  const [showResults, setShowResults] = useState(false);

  const sectors = getSectorsFromAssets(assets);
  const countries = getCountriesFromAssets(assets);
  const screened = screenAssets(assets, countryRisks, {
    ...criteria,
    sectors: selectedSectors.length > 0 ? selectedSectors : undefined,
    countries: selectedCountries.length > 0 ? selectedCountries : undefined,
    assetValue: { min: minAssetValue, max: maxAssetValue },
  });

  const handleApplyScreening = () => {
    setCriteria({
      minRisk: criteria.minRisk,
      maxRisk: criteria.maxRisk,
      sectors: selectedSectors.length > 0 ? selectedSectors : undefined,
      countries: selectedCountries.length > 0 ? selectedCountries : undefined,
      assetValue: { min: minAssetValue, max: maxAssetValue },
    });
    onScreenedAssetsChange?.(screened);
    setShowResults(true);
  };

  const handleReset = () => {
    setCriteria({});
    setSelectedSectors([]);
    setSelectedCountries([]);
    setMinAssetValue(0);
    setMaxAssetValue(1000000);
    setShowResults(false);
  };

  const getRiskColor = (risk: number) => {
    if (risk < 30) return 'bg-green-950 text-green-300';
    if (risk < 60) return 'bg-yellow-950 text-yellow-300';
    return 'bg-red-950 text-red-300';
  };

  return (
    <div className="w-full space-y-4">
      <Card className="p-6 bg-zinc-950 border border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-zinc-300" />
          <h3 className="text-lg font-semibold text-zinc-100">Screen Assets by Risk Criteria</h3>
        </div>

        {/* Risk Range Sliders */}
        <div className="mb-6 p-4 bg-zinc-900 border border-zinc-700 rounded-lg space-y-4">
          <h4 className="font-medium text-zinc-100 text-sm">Risk Range</h4>

          <div>
            <label className="text-xs text-zinc-400 block mb-2">
              Minimum Risk: {criteria.minRisk ?? 0}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={criteria.minRisk ?? 0}
              onChange={(e) =>
                setCriteria({
                  ...criteria,
                  minRisk: parseInt(e.target.value),
                })
              }
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-2">
              Maximum Risk: {criteria.maxRisk ?? 100}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={criteria.maxRisk ?? 100}
              onChange={(e) =>
                setCriteria({
                  ...criteria,
                  maxRisk: parseInt(e.target.value),
                })
              }
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Sector Filter */}
        <div className="mb-6">
          <h4 className="font-medium text-zinc-100 text-sm mb-2">Sectors</h4>
          <div className="grid grid-cols-2 gap-2">
            {sectors.map((sector) => (
              <label key={sector} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-zinc-900">
                <input
                  type="checkbox"
                  checked={selectedSectors.includes(sector)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSectors([...selectedSectors, sector]);
                    } else {
                      setSelectedSectors(selectedSectors.filter((s) => s !== sector));
                    }
                  }}
                  className="w-4 h-4 rounded border-zinc-600 cursor-pointer"
                />
                <span className="text-sm text-zinc-300">{sector}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Country Filter */}
        <div className="mb-6">
          <h4 className="font-medium text-zinc-100 text-sm mb-2">Countries</h4>
          <div className="max-h-40 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {countries.map((country) => (
                <label
                  key={country}
                  className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-zinc-900 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedCountries.includes(country)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCountries([...selectedCountries, country]);
                      } else {
                        setSelectedCountries(selectedCountries.filter((c) => c !== country));
                      }
                    }}
                    className="w-4 h-4 rounded border-zinc-600 cursor-pointer"
                  />
                  <span className="text-zinc-300">{country}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Asset Value Range */}
        <div className="mb-6 p-4 bg-zinc-900 border border-zinc-700 rounded-lg space-y-3">
          <h4 className="font-medium text-zinc-100 text-sm">Asset Value Range</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Min Value</label>
              <input
                type="number"
                value={minAssetValue}
                onChange={(e) => setMinAssetValue(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full p-2 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Max Value</label>
              <input
                type="number"
                value={maxAssetValue}
                onChange={(e) => setMaxAssetValue(parseFloat(e.target.value) || 1000000)}
                className="w-full p-2 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded text-sm"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleApplyScreening}
            className="flex-1 bg-blue-700 hover:bg-blue-600 text-white py-2 rounded-lg font-medium text-sm"
          >
            <Filter size={16} className="mr-2" />
            Apply Screening
          </Button>
          <Button
            onClick={handleReset}
            className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 py-2 rounded-lg font-medium text-sm"
          >
            <RotateCcw size={16} className="mr-2" />
            Reset
          </Button>
        </div>

        {/* Results */}
        {showResults && (
          <div className="mt-6 p-4 bg-zinc-900 border border-zinc-700 rounded-lg">
            <h4 className="font-medium text-zinc-100 mb-3">
              Screening Results: {screened.length} of {assets.length} assets
            </h4>

            {screened.length === 0 ? (
              <div className="flex items-center gap-2 text-yellow-300 text-sm">
                <AlertCircle size={16} />
                <span>No assets match the selected criteria</span>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {screened.map((asset, i) => {
                  const riskScore = countryRisks[asset.country] || 50;
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded border border-zinc-700 ${getRiskColor(riskScore)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{asset.name}</p>
                          <p className="text-xs text-zinc-400">
                            {asset.country} • {asset.sector}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">${asset.value.toLocaleString()}</p>
                          <p className="text-xs">Risk: {riskScore.toFixed(0)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
