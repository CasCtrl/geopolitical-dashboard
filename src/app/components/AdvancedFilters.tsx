import { useState } from 'react';
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
  showPortfolioTab?: boolean;
  showUploadTab?: boolean;
  showSectorsTab?: boolean;
  showScreeningTab?: boolean;
}

export function AdvancedFilters({
  countryRisks,
  defaultAssets = [],
  showPortfolioTab = true,
  showUploadTab = true,
  showSectorsTab = true,
  showScreeningTab = true,
}: AdvancedFiltersProps) {
  const [currentAssets, setCurrentAssets] = useState<HoldingAsset[]>(
    defaultAssets.map(convertPortfolioAssetToHolding)
  );

  const tabs = [
    { key: 'upload', label: 'CSV Upload', enabled: showUploadTab },
    { key: 'portfolio', label: 'Portfolios', enabled: showPortfolioTab },
    { key: 'sectors', label: 'Sectors', enabled: showSectorsTab },
    { key: 'screening', label: 'Screening', enabled: showScreeningTab },
  ].filter((tab) => tab.enabled);

  const defaultTab = tabs[0]?.key ?? 'portfolio';

  return (
    <div className="w-full">
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList
          className="grid w-full bg-zinc-900 border border-zinc-800 rounded-lg p-1"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, tabs.length)}, minmax(0, 1fr))` }}
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="text-xs sm:text-sm data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Portfolio Manager */}
        {showPortfolioTab && (
        <TabsContent value="portfolio" className="mt-4">
          <PortfolioManager
            currentPortfolio={currentAssets}
            onPortfolioSelect={(assets) => setCurrentAssets(assets)}
          />
        </TabsContent>
        )}

        {/* CSV Upload */}
        {showUploadTab && (
        <TabsContent value="upload" className="mt-4">
          <CSVUploadTool
            onAssetsLoaded={(assets) => setCurrentAssets(assets)}
          />
        </TabsContent>
        )}

        {/* Sector Breakdown */}
        {showSectorsTab && (
        <TabsContent value="sectors" className="mt-4">
          <SectorBreakdown
            assets={currentAssets}
            countryRisks={countryRisks}
          />
        </TabsContent>
        )}

        {/* Asset Screening */}
        {showScreeningTab && (
        <TabsContent value="screening" className="mt-4">
          <AssetScreener
            assets={currentAssets}
            countryRisks={countryRisks}
            onScreenedAssetsChange={(assets) => setCurrentAssets(assets)}
          />
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
