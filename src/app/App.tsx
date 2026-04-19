import { useState, useMemo, useEffect, useCallback } from "react";
import { WorldMap } from "./components/WorldMap";
import { RiskSlider } from "./components/RiskSlider";
import { HoldingsTable } from "./components/HoldingsTable";
import { DatasetSelector } from "./components/DatasetSelector";
import { Summary } from "./components/Summary";
import { calculateRiskIndex, baseRiskData } from "./data/countryRiskData";
import { defaultPortfolio, calculatePortfolioRisk, Asset } from "./data/portfolioData";
import { loadDatasetsFromCSV, DatasetMetadata } from "./data/csvLoader";
import { getDefaultWeights, getSnapshotDescription, isDefaultWeights } from "./data/globalSnapshot";
import { 
  initializeDailyUpdate, 
  getUpdateStatus, 
  getTimeUntilNextUpdate,
  forceUpdate 
} from "./data/dailyUpdateManager";
import {
  AlertTriangle,
  TrendingDown,
  Swords,
  Scale,
  Bomb,
  Shield,
  RotateCcw,
  HelpCircle,
  X,
  RefreshCw,
} from "lucide-react";
import { Card } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { RiskGaugeCompact } from "./components/RiskGaugeCompact";

export default function App() {
  const [weights, setWeights] = useState(getDefaultWeights());
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showUpdateStatus, setShowUpdateStatus] = useState(false);

  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("default");
  const [assetsByDataset, setAssetsByDataset] = useState<{
    [datasetId: string]: Asset[];
  }>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load datasets from API on mount with paralleled requests
  useEffect(() => {
    const loadDatasets = async () => {
      try {
        // Fetch datasets from API
        const datasetsRes = await fetch("http://localhost:5000/api/datasets");
        if (!datasetsRes.ok) throw new Error("Failed to fetch datasets");
        const apiDatasets = await datasetsRes.json();

        // Map API datasets to our format
        const mappedDatasets: DatasetMetadata[] = apiDatasets.map(
          (d: any) => ({
            id: d.datasetId,
            name: d.datasetName,
            description: d.datasetDescription,
          })
        );

        setDatasets(mappedDatasets);

        // Parallelize all API calls for assets and dependencies
        const assetsByDatasetMap: { [datasetId: string]: Asset[] } = {};
        
        // Fetch all assets and dependencies in parallel
        const promises = apiDatasets.map(async (dataset: any) => {
          try {
            const [assetsRes, depsRes] = await Promise.all([
              fetch(`http://localhost:5000/api/assets/${dataset.datasetId}`),
              fetch(`http://localhost:5000/api/dependencies/${dataset.datasetId}`),
            ]);

            if (!assetsRes.ok) throw new Error(`Failed to fetch assets for ${dataset.datasetId}`);
            if (!depsRes.ok) throw new Error(`Failed to fetch dependencies for ${dataset.datasetId}`);

            const [assets, deps] = await Promise.all([
              assetsRes.json(),
              depsRes.json(),
            ]);

            // Map to Asset objects
            const assetMap = new Map();
            for (const asset of assets) {
              assetMap.set(asset.ticker, {
                ticker: asset.ticker,
                name: asset.assetName,
                weight: asset.weight,
                value: asset.value,
                sector: asset.sector,
                countryDependencies: [],
              });
            }

            // Add dependencies to assets
            for (const dep of deps) {
              const asset = assetMap.get(dep.ticker);
              if (asset) {
                asset.countryDependencies.push({
                  country: dep.country,
                  weight: dep.dependencyWeight,
                  type: dep.dependencyType as any,
                  reason: dep.dependencyReason,
                });
              }
            }

            return { datasetId: dataset.datasetId, assets: Array.from(assetMap.values()) };
          } catch (error) {
            console.error(`Error loading data for dataset ${dataset.datasetId}:`, error);
            return { datasetId: dataset.datasetId, assets: [] };
          }
        });

        const results = await Promise.all(promises);
        results.forEach(({ datasetId, assets }) => {
          assetsByDatasetMap[datasetId] = assets;
        });

        setAssetsByDataset(assetsByDatasetMap);
        if (mappedDatasets.length > 0) {
          setSelectedDatasetId(mappedDatasets[0].id);
        }
      } catch (error) {
        console.warn("API not available, falling back to CSV:", error);
        // Fall back to CSV loader
        try {
          const { datasets: loadedDatasets, assetsByDataset: loadedAssets } =
            await loadDatasetsFromCSV("/datasets.csv");
          setDatasets(loadedDatasets);
          setAssetsByDataset(loadedAssets);
          if (loadedDatasets.length > 0) {
            setSelectedDatasetId(loadedDatasets[0].id);
          }
        } catch (fallbackError) {
          console.error("Failed to load datasets from CSV:", fallbackError);
          // Fall back to default portfolio
          setDatasets([{ id: "default", name: "Default Portfolio", description: "Default portfolio" }]);
          setAssetsByDataset({ default: defaultPortfolio });
          setSelectedDatasetId("default");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadDatasets();
  }, []);

  // Initialize daily update of risk snapshot scores on app startup
  useEffect(() => {
    const checkAndUpdate = async () => {
      try {
        await initializeDailyUpdate();
      } catch (error) {
        console.warn("Daily update check failed:", error);
      }
    };

    checkAndUpdate();
  }, []);

  // Get the current portfolio based on selected dataset
  const portfolio = assetsByDataset[selectedDatasetId] || defaultPortfolio;

  const riskData = useMemo(() => {
    const data: { [key: string]: number } = {};
    Object.keys(baseRiskData).forEach((country) => {
      data[country] = calculateRiskIndex(country, weights);
    });
    return data;
  }, [weights]);

  const portfolioAnalysis = useMemo(() => {
    return calculatePortfolioRisk(portfolio, riskData);
  }, [portfolio, riskData]);

  const updateWeight = useCallback((category: keyof typeof weights, value: number) => {
    setWeights((prev) => ({ ...prev, [category]: value }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setWeights(getDefaultWeights());
  }, []);

  const handleDatasetChange = useCallback((datasetId: string) => {
    setSelectedDatasetId(datasetId);
  }, []);

  const isUsingDefaults = isDefaultWeights(weights);

  const averageRisk = useMemo(() => {
    const values = Object.values(riskData);
    return values.length > 0
      ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
      : 0;
  }, [riskData]);

  // Count high-risk alerts
  const alertCount = useMemo(() => {
    return portfolioAnalysis.countryExposures.filter(
      (e) => riskData[e.country] > 5
    ).length;
  }, [portfolioAnalysis, riskData]);

  return (
    <div className="min-h-screen bg-black">
      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
          <Card className="bg-zinc-950 border-zinc-800 w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <HelpCircle className="size-4 text-blue-400" />
                  How to Use
                </h2>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="p-1 rounded hover:bg-zinc-800 transition-colors"
                >
                  <X className="size-4 text-zinc-400" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <div className="space-y-3 text-xs text-zinc-300">
                <div>
                  <h3 className="font-semibold text-white mb-1">What is this app?</h3>
                  <p className="text-[11px]">
                    This Geopolitical Risk Dashboard helps you analyze and monitor geopolitical risks across your investment portfolio. It evaluates how different risk factors (political instability, economic challenges, conflicts, corruption, and terrorism) impact your holdings in various countries.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Getting Started</h3>
                  <ul className="space-y-0.5 list-disc list-inside text-[11px]">
                    <li>Select a dataset from the dropdown to analyze different portfolios</li>
                    <li>View the Global Risk Heat Map to see which countries are most at risk</li>
                    <li>Review your Top Country Exposures and Top Risk Assets</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Risk Factor Weights</h3>
                  <p className="text-[11px]">
                    Adjust the sliders on the left sidebar to customize how different risk factors influence the overall risk calculation. Political, Economic, Conflict, Corruption, and Terrorism factors all contribute to the overall portfolio risk.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Dashboard Tab</h3>
                  <p className="text-[11px]">
                    See a real-time visualization of your portfolio's geopolitical exposure, including risk-adjusted metrics, country exposures, and asset-level risk scores.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Summary Tab</h3>
                  <p className="text-[11px]">
                    Get actionable insights and recommendations for managing your portfolio's geopolitical risks, including specific suggestions for rebalancing and diversification.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Download Report</h3>
                  <p className="text-[11px]">
                    Click the "Report" button in the Portfolio Snapshot section to download a comprehensive summary of your analysis. The report includes your risk score, active risk factors, key insights, recommendations, top assets and countries, portfolio composition, and all risk factor weights in an easy-to-share text format.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Daily Updates</h3>
                  <p className="text-[11px]">
                    Risk scores automatically update daily to reflect the latest geopolitical conditions. Click the refresh icon in the header to view your last update timestamp and time until the next automatic update. You can also manually refresh data anytime by clicking "Refresh Now" in the update status panel.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-zinc-800 flex-shrink-0">
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Daily Update Status Modal */}
      {showUpdateStatus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
          <Card className="bg-zinc-950 border-zinc-800 w-full max-w-sm">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <RefreshCw className="size-4 text-green-400" />
                Risk Snapshot Updates
              </h2>
              <button
                onClick={() => setShowUpdateStatus(false)}
                className="p-1 rounded hover:bg-zinc-800 transition-colors"
              >
                <X className="size-4 text-zinc-400" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-2">
                <p className="text-xs text-zinc-400">
                  <span className="font-semibold text-white">Last Updated:</span> {getUpdateStatus().lastUpdated === 'Never' ? 'App startup' : getUpdateStatus().lastUpdated}
                </p>
                <p className="text-xs text-zinc-400">
                  <span className="font-semibold text-white">Next Update:</span> {getTimeUntilNextUpdate()}
                </p>
                <p className="text-xs text-zinc-300 mt-3">
                  Risk scores automatically update daily to reflect the latest geopolitical data. You can also manually refresh data whenever needed.
                </p>
              </div>
              <div className="bg-zinc-900 rounded p-3">
                <p className="text-[11px] text-zinc-400">
                  <span className="text-zinc-300 font-semibold">How it works:</span> Daily updates fetch the latest risk assessments from geopolitical data sources and recalculate your portfolio exposure based on current conditions.
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-zinc-800 flex gap-2">
              <button
                onClick={() => {
                  setShowUpdateStatus(false);
                }}
                className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-white text-xs font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  await forceUpdate();
                  setShowUpdateStatus(false);
                }}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs font-medium transition-colors flex items-center justify-center gap-1"
              >
                <RefreshCw className="size-3" />
                Refresh Now
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Header */}
      <header className="bg-zinc-950 border-b border-zinc-900 px-3 md:px-4 py-3 md:py-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 md:gap-3">
            <Shield className="size-4 md:size-5 text-zinc-600 flex-shrink-0" />
            <div>
              <h1 className="text-xs md:text-sm font-semibold text-white mb-0.5 md:mb-1">
                Geopolitical Risk Dashboard
              </h1>
              <p className="text-[9px] md:text-[10px] text-zinc-600">
                {datasets.find((d) => d.id === selectedDatasetId)?.description || "Loading..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && datasets.length > 0 && (
              <DatasetSelector
                datasets={datasets}
                selectedDataset={selectedDatasetId}
                onDatasetChange={setSelectedDatasetId}
              />
            )}
            <button
              onClick={() => setShowUpdateStatus(!showUpdateStatus)}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200"
              title="Daily update status"
            >
              <RefreshCw className="size-5" />
            </button>
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200"
              title="Help"
            >
              <HelpCircle className="size-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full max-w-xs grid-cols-2 bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="dashboard" className="text-xs md:text-sm">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-xs md:text-sm">
              Summary
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* Left Sidebar - Always visible */}
        <aside className="w-full lg:w-56 bg-zinc-950 border-b lg:border-b-0 lg:border-r border-zinc-900 p-3 flex flex-col">
          {/* Portfolio Stats - Order 1 on mobile */}
          <div className="order-1 lg:order-none">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-1 gap-2 mb-4 lg:mb-0">
              <Card className="p-1.5 bg-zinc-900/60 border-zinc-800">
                <p className="text-[10px] text-zinc-500 leading-none">Portfolio Value</p>
                <p className="text-sm font-bold text-white leading-tight">
                  ${((portfolio.reduce((sum, asset) => sum + asset.value, 0) / 1000000) * 10).toFixed(1)}M
                </p>
              </Card>
              <Card className="p-1.5 bg-zinc-900/60 border-zinc-800">
                <p className="text-[10px] text-zinc-500 leading-none">Assets</p>
                <p className="text-sm font-bold text-white leading-tight">{portfolio.length}</p>
              </Card>
              <Card className="p-1.5 bg-zinc-900/60 border-zinc-800">
                <p className="text-[10px] text-zinc-500 leading-none">Avg Global Risk</p>
                <p className="text-sm font-bold text-white leading-tight">{averageRisk}</p>
              </Card>
              <Card className="p-1.5 bg-zinc-900/60 border-zinc-800">
                <p className="text-[10px] text-zinc-500 leading-none">High Risk Alerts</p>
                <p className="text-sm font-bold text-amber-400 leading-tight">{alertCount}</p>
              </Card>
            </div>
          </div>

          {/* Risk Factor Weights - Order 3 on mobile */}
          <div className="order-3 lg:order-none lg:pt-6">
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs text-zinc-400 uppercase tracking-wide">
                  Risk Factor Weights
                </h3>
                <button
                  onClick={resetToDefaults}
                  disabled={isUsingDefaults}
                  className="p-1 rounded hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title={isUsingDefaults ? "Using default weights" : "Reset to default weights"}
                >
                  <RotateCcw className="size-3 text-zinc-400" />
                </button>
              </div>
              <div className="text-[9px] text-zinc-500 mb-3 px-1 bg-zinc-900/50 p-1.5 rounded border border-zinc-800">
                📊 {getSnapshotDescription()}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2 md:gap-3">
                <RiskSlider
                  label="Political"
                  value={weights.political}
                  onChange={(value) => updateWeight("political", value)}
                  icon={<AlertTriangle className="size-3" />}
                />
                <RiskSlider
                  label="Economic"
                  value={weights.economic}
                  onChange={(value) => updateWeight("economic", value)}
                  icon={<TrendingDown className="size-3" />}
                />
                <RiskSlider
                  label="Conflict"
                  value={weights.conflict}
                  onChange={(value) => updateWeight("conflict", value)}
                  icon={<Swords className="size-3" />}
                />
                <RiskSlider
                  label="Corruption"
                  value={weights.corruption}
                  onChange={(value) => updateWeight("corruption", value)}
                  icon={<Scale className="size-3" />}
                />
                <RiskSlider
                  label="Terrorism"
                  value={weights.terrorism}
                  onChange={(value) => updateWeight("terrorism", value)}
                  icon={<Bomb className="size-3" />}
                />
              </div>
              <div className="text-[8px] text-zinc-600 mt-3 pt-2 border-t border-zinc-800 px-1">
                <span className="text-zinc-500">Source:</span> Global Geopolitical Snapshot (April 2026)
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area - Conditional based on tab */}
        {currentTab === "dashboard" ? (
        <main className="flex-1 p-3">
          <div className="max-w-[1600px] mx-auto space-y-3">
            {/* MOBILE ONLY - Heat Map appears early */}
            <div className="lg:hidden">
              <Card className="p-3 bg-zinc-950 border-zinc-900">
                <h2 className="text-xs mb-2 text-zinc-400 uppercase tracking-wide font-medium">
                  Global Risk Heat Map
                </h2>
                <WorldMap
                  riskData={riskData}
                  countryExposures={portfolioAnalysis.countryExposures}
                  weights={weights}
                />
              </Card>
            </div>

            {/* Map and Portfolio Risk Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
              {/* Left Column - Map and Country Exposures */}
              <div className="lg:col-span-4 space-y-3">
                {/* Country Exposures - Above Map */}
                <Card className="p-3 bg-zinc-950 border-zinc-900">
                  <h3 className="text-xs mb-2 text-zinc-400 uppercase tracking-wide font-medium">
                    Top Country Exposures
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {portfolioAnalysis.countryExposures.slice(0, 6).map((exposure) => {
                      const risk = riskData[exposure.country] || 50;
                      const isHighRisk = exposure.riskContribution > 0 && risk > 60;
                      return (
                        <div
                          key={exposure.country}
                          className={`p-2 border ${
                            isHighRisk
                              ? "bg-red-950/30 border-red-900/50"
                              : "bg-zinc-900/80 border-zinc-800"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <p className={`text-xs ${isHighRisk ? "text-red-300" : "text-white"}`}>
                                  {exposure.country}
                                </p>
                                <span
                                  className={`text-[10px] px-1 py-0.5 ${
                                    isHighRisk
                                      ? "bg-red-900/50 text-red-200"
                                      : "bg-zinc-800 text-zinc-400"
                                  }`}
                                >
                                  {exposure.exposureType}
                                </span>
                              </div>
                              <p className={`text-[10px] ${isHighRisk ? "text-red-400/80" : "text-zinc-500"}`}>
                                {exposure.contributingAssets.join(", ")}
                              </p>
                            </div>
                            <div className="text-right ml-2">
                              <p className={`text-xs ${isHighRisk ? "text-red-300" : "text-white"}`}>
                                {exposure.riskContribution.toFixed(1)}
                              </p>
                              <p className={`text-[10px] ${isHighRisk ? "text-red-400" : "text-zinc-500"}`}>
                                Risk: {risk.toFixed(0)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* DESKTOP ONLY - Large Map */}
                <Card className="p-3 bg-zinc-950 border-zinc-900 hidden lg:block">
                  <h2 className="text-xs mb-2 text-zinc-400 uppercase tracking-wide font-medium">
                    Global Risk Heat Map
                  </h2>
                  <WorldMap
                    riskData={riskData}
                    countryExposures={portfolioAnalysis.countryExposures}
                    weights={weights}
                  />
                </Card>
              </div>

              {/* Total Portfolio Risk Score - Vertical Layout - Right Column */}
              <Card className="p-3 bg-zinc-950 border-zinc-900 lg:col-span-1">
                <div className="space-y-4">
                  {/* Gauge */}
                  <div>
                    <p className="text-[10px] text-zinc-600 mb-2 uppercase tracking-wide font-medium">
                      Total Portfolio Risk
                    </p>
                    <RiskGaugeCompact value={portfolioAnalysis.totalRiskScore} />
                    <p className="text-[10px] text-zinc-600 text-center mt-1 uppercase">
                      {(() => {
                        const score = portfolioAnalysis.totalRiskScore;
                        if (score >= 80) return "CRITICAL";
                        if (score >= 60) return "HIGH";
                        if (score >= 40) return "MODERATE";
                        return "LOW";
                      })()}
                    </p>
                  </div>

                  {/* Top Risk Assets */}
                  <div className="pt-3 border-t border-zinc-900">
                    <p className="text-[10px] text-zinc-600 mb-2 uppercase tracking-wide font-medium">Top Risk Assets</p>
                    <div className="space-y-1">
                      {portfolioAnalysis.topRiskAssets.slice(0, 5).map((asset, index) => (
                        <div
                          key={asset}
                          className="flex items-center gap-2 text-xs bg-zinc-900/60 px-2 py-1"
                        >
                          <span className="text-zinc-700 text-[10px] w-3">{index + 1}</span>
                          <span className="font-mono text-zinc-300 text-xs">{asset}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Risk Countries */}
                  <div className="pt-3 border-t border-zinc-900">
                    <p className="text-[10px] text-zinc-600 mb-2 uppercase tracking-wide font-medium">Top Risk Countries</p>
                    <div className="space-y-1">
                      {portfolioAnalysis.topRiskCountries.slice(0, 5).map((country, index) => (
                        <div
                          key={country}
                          className="flex items-center gap-2 text-xs bg-zinc-900/60 px-2 py-1"
                        >
                          <span className="text-zinc-700 text-[10px] w-3">{index + 1}</span>
                          <span className="text-zinc-300 text-xs">{country}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Alert Count */}
                  {alertCount > 0 && (
                    <div className="pt-3 border-t border-zinc-900">
                      <div className="flex items-center gap-2 text-amber-400">
                        <AlertTriangle className="size-3" />
                        <p className="text-[10px] uppercase tracking-wide">
                          {alertCount} Active Risk {alertCount === 1 ? "Alert" : "Alerts"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Holdings Table */}
            <HoldingsTable
              assets={portfolio}
              assetContributions={portfolioAnalysis.assetContributions}
            />
          </div>
        </main>
        ) : (
        /* Summary Tab Content */
        <main className="flex-1 p-3">
          <div className="max-w-[1600px] mx-auto">
            <Summary
              portfolioAnalysis={portfolioAnalysis}
              riskData={riskData}
              weights={weights}
              portfolio={portfolio}
            />
          </div>
        </main>
        )}
      </div>
    </div>
  );
}