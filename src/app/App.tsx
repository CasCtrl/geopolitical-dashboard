import { useState, useMemo, useEffect } from "react";
import { WorldMap } from "./components/WorldMap";
import { RiskSlider } from "./components/RiskSlider";
import { HoldingsTable } from "./components/HoldingsTable";
import { DatasetSelector } from "./components/DatasetSelector";
import { calculateRiskIndex, baseRiskData } from "./data/countryRiskData";
import { defaultPortfolio, calculatePortfolioRisk, Asset } from "./data/portfolioData";
import { loadDatasetsFromCSV, DatasetMetadata } from "./data/csvLoader";
import {
  AlertTriangle,
  TrendingDown,
  Swords,
  Scale,
  Bomb,
  Shield,
} from "lucide-react";
import { Card } from "./components/ui/card";
import { RiskGaugeCompact } from "./components/RiskGaugeCompact";

export default function App() {
  const [weights, setWeights] = useState({
    political: 0,
    economic: 0,
    conflict: 0,
    corruption: 0,
    terrorism: 0,
  });

  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("default");
  const [assetsByDataset, setAssetsByDataset] = useState<{
    [datasetId: string]: Asset[];
  }>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load datasets from API on mount
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

        // Load assets for each dataset
        const assetsByDatasetMap: { [datasetId: string]: Asset[] } = {};
        for (const dataset of apiDatasets) {
          const assetsRes = await fetch(
            `http://localhost:5000/api/assets/${dataset.datasetId}`
          );
          if (!assetsRes.ok) throw new Error(`Failed to fetch assets for ${dataset.datasetId}`);
          const assets = await assetsRes.json();

          // Fetch dependencies
          const depsRes = await fetch(
            `http://localhost:5000/api/dependencies/${dataset.datasetId}`
          );
          if (!depsRes.ok) throw new Error(`Failed to fetch dependencies for ${dataset.datasetId}`);
          const deps = await depsRes.json();

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

          assetsByDatasetMap[dataset.datasetId] = Array.from(assetMap.values());
        }

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

  const updateWeight = (category: keyof typeof weights, value: number) => {
    setWeights((prev) => ({ ...prev, [category]: value }));
  };

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
      {/* Header */}
      <header className="bg-zinc-950 border-b border-zinc-900 px-3 md:px-4 py-3 md:py-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
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
          {!isLoading && datasets.length > 0 && (
            <DatasetSelector
              datasets={datasets}
              selectedDataset={selectedDatasetId}
              onDatasetChange={setSelectedDatasetId}
            />
          )}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* Left Sidebar */}
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
              <h3 className="text-xs text-zinc-400 mb-3 uppercase tracking-wide px-1">
                Risk Factor Weights
              </h3>
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
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
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
      </div>
    </div>
  );
}