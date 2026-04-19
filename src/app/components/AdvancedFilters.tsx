import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { PortfolioManager } from './PortfolioManager';
import { CSVUploadTool } from './CSVUploadTool';
import { SectorBreakdown } from './SectorBreakdown';
import { AssetScreener } from './AssetScreener';
import { HoldingAsset, convertPortfolioAssetToHolding } from '../utils/portfolioFilters';
import { Asset } from '../data/portfolioData';

interface AdvancedFiltersProps {
  countryRisks: Record<string, number>;
  defaultAssets?: Asset[];
}

export function AdvancedFilters({ countryRisks, defaultAssets = [] }: AdvancedFiltersProps) {
  const [currentAssets, setCurrentAssets] = useState<HoldingAsset[]>(
    defaultAssets.map(convertPortfolioAssetToHolding)
  );

  return (
    <div className="w-full">
      <Tabs defaultValue="portfolio" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <TabsTrigger
            value="portfolio"
            className="text-xs sm:text-sm data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
          >
            Portfolios
          </TabsTrigger>
          <TabsTrigger
            value="upload"
            className="text-xs sm:text-sm data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
          >
            CSV Upload
          </TabsTrigger>
          <TabsTrigger
            value="sectors"
            className="text-xs sm:text-sm data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
          >
            Sectors
          </TabsTrigger>
          <TabsTrigger
            value="screening"
            className="text-xs sm:text-sm data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
          >
            Screening
          </TabsTrigger>
        </TabsList>

        {/* Portfolio Manager */}
        <TabsContent value="portfolio" className="mt-4">
          <PortfolioManager
            currentPortfolio={currentAssets}
            onPortfolioSelect={(assets) => setCurrentAssets(assets)}
          />
        </TabsContent>

        {/* CSV Upload */}
        <TabsContent value="upload" className="mt-4">
          <CSVUploadTool
            onAssetsLoaded={(assets) => setCurrentAssets(assets)}
          />
        </TabsContent>

        {/* Sector Breakdown */}
        <TabsContent value="sectors" className="mt-4">
          <SectorBreakdown
            assets={currentAssets}
            countryRisks={countryRisks}
          />
        </TabsContent>

        {/* Asset Screening */}
        <TabsContent value="screening" className="mt-4">
          <AssetScreener
            assets={currentAssets}
            countryRisks={countryRisks}
            onScreenedAssetsChange={(assets) => setCurrentAssets(assets)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
