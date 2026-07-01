import { Suspense, lazy, useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Toaster, toast } from "sonner";
import { WorldMap } from "./components/WorldMap";
import { RiskSlider } from "./components/RiskSlider";
import { HoldingsTable } from "./components/HoldingsTable";
import { DatasetSelector } from "./components/DatasetSelector";
import { Summary } from "./components/Summary";
import { calculateRiskIndex, baseRiskData, CountryRisk } from "./data/countryRiskData";
import { defaultPortfolio, calculatePortfolioRisk, Asset, CountryDependency } from "./data/portfolioData";
import { loadDatasetsFromCSV, DatasetMetadata } from "./data/csvLoader";
import { getDefaultWeights, getSnapshotDescription, isDefaultWeights } from "./data/globalSnapshot";
import { 
  initializeDailyUpdate, 
  getUpdateStatus, 
  getTimeUntilNextUpdate,
  forceUpdate 
} from "./data/dailyUpdateManager";
import { recordSnapshot, getLatestSnapshot, initializeHistoricalData, getPortfolioRiskTrend, getSnapshotsByDateRange, SeedHistoryPoint } from "./data/historicalSnapshotManager";
import { checkThresholds } from "./data/alertsManager";
import { RiskMetricsPanel } from "./components/RiskMetricsPanel";
import { generateMockNews, parseNewsForRisk, newsToRiskEvent } from "./data/newsIntegration";
import { initializeRealtimeUpdates, stopRealtimeUpdates } from "./data/realtimeUpdateManager";
import {
  Activity,
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
  Download,
  Newspaper,
  Check,
  Settings,
  BookOpen,
  Search,
  PlugZap,
  Unplug,
  LayoutList,
} from "lucide-react";
import { Card } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { RiskGaugeCompact } from "./components/RiskGaugeCompact";
import { RiskScoreInfo } from "./components/RiskScoreInfo";
import { RiskLegend } from "./components/RiskLegend";
import { RiskMethodologyModal } from "./components/RiskMethodologyModal";
import { SecuritySearch } from "./components/SecuritySearch";
import { RiskAlertDetailDialog, RiskAlertDetail } from "./components/RiskAlertDetailDialog";
import { putWorkspaceState } from "./data/workspaceStateApi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const PORTFOLIO_VALUE_PLACEHOLDER_USD = 337500;
const MIN_ALERT_RISK_SCORE = 25;
const HIGH_RISK_SCORE_THRESHOLD = 51;
const CRITICAL_RISK_SCORE_THRESHOLD = 75;
const TIME_ZONE_STORAGE_KEY = "dashboard.timezone";
const WEIGHTS_STORAGE_KEY = "dashboard.weights";
const TAB_STORAGE_KEY = "dashboard.currentTab";
const DATASET_STORAGE_KEY = "dashboard.datasetId";
const ADVANCED_PREFS_VERSION_KEY = "dashboard.advancedPrefsVersion";

type RiskHorizon = "daily" | "7d" | "30d" | "90d";

type CountryExposureRiskClasses = {
  card: string;
  countryName: string;
  contributingAssets: string;
  riskScore: string;
  impactWeight: string;
};

const getCountryExposureRiskClasses = (_riskScore: number): CountryExposureRiskClasses => {
  return {
    card: "bg-zinc-900/80 border-zinc-800",
    countryName: "text-white",
    contributingAssets: "text-zinc-500",
    riskScore: "text-white",
    impactWeight: "text-zinc-500",
  };
};

const getAdvancedPrefsVersion = (): number | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  const raw = localStorage.getItem(ADVANCED_PREFS_VERSION_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
};

const setAdvancedPrefsVersion = (version: number | null): void => {
  if (typeof window === "undefined" || typeof version !== "number") {
    return;
  }

  localStorage.setItem(ADVANCED_PREFS_VERSION_KEY, String(version));
};

const readStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const value = localStorage.getItem(key);
    if (!value) {
      return fallback;
    }
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const readStorageString = (key: string, fallback: string): string => {
  if (typeof window === "undefined") {
    return fallback;
  }

  return localStorage.getItem(key) || fallback;
};

type EndpointHealth = {
  ok: boolean;
  status: string;
  latencyMs: number | null;
  error?: string;
};

type BasicHealthMetrics = {
  loading: boolean;
  lastChecked: string;
  health: EndpointHealth;
  ready: EndpointHealth;
  metrics: {
    ok: boolean;
    uptimeSeconds: number | null;
    heapUsedMb: number | null;
    databaseConnected: boolean | null;
    error?: string;
  };
  observability: {
    ok: boolean;
    totalRequests: number | null;
    errorRatePct: number | null;
    p95LatencyMs: number | null;
    activeAlerts: number;
    error?: string;
  };
};

type ApiDataset = {
  datasetId: string;
  datasetName: string;
  datasetDescription: string;
};

type ApiAsset = {
  ticker: string;
  assetName: string;
  weight: number;
  value: number;
  sector: string;
};

type ApiDependency = {
  ticker: string;
  country: string;
  dependencyWeight: number;
  dependencyType: string;
  dependencyReason: string;
};

const DEFAULT_COUNTRY_RISK = {
  political: 0,
  economic: 0,
  conflict: 0,
  corruption: 0,
  terrorism: 0,
};

const parseApiJson = async <T,>(response: Response): Promise<T> => {
  const payload = await response.json();

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
};

const normalizeDependencyType = (value: string): CountryDependency["type"] => {
  if (value === "direct" || value === "indirect" || value === "macro") {
    return value;
  }

  return "indirect";
};

const AlertsAndNotifications = lazy(() =>
  import("./components/AlertsAndNotifications").then((module) => ({ default: module.AlertsAndNotifications }))
);
const ExportReports = lazy(() =>
  import("./components/ExportReports").then((module) => ({ default: module.ExportReports }))
);
const AdvancedFilters = lazy(() =>
  import("./components/AdvancedFilters").then((module) => ({ default: module.AdvancedFilters }))
);
const BacktestPanel = lazy(() =>
  import("./components/BacktestPanel").then((module) => ({ default: module.BacktestPanel }))
);
const CorrelationAnalysisPanel = lazy(() =>
  import("./components/CorrelationAnalysisPanel").then((module) => ({ default: module.CorrelationAnalysisPanel }))
);
const CustomScenarioBuilderPanel = lazy(() =>
  import("./components/CustomScenarioBuilderPanel").then((module) => ({ default: module.CustomScenarioBuilderPanel }))
);
const MonteCarloPanel = lazy(() =>
  import("./components/MonteCarloPanel").then((module) => ({ default: module.MonteCarloPanel }))
);
const SupplyChainExposureMappingPanel = lazy(() =>
  import("./components/SupplyChainExposureMappingPanel").then((module) => ({ default: module.SupplyChainExposureMappingPanel }))
);
const NewsFeedPanel = lazy(() =>
  import("./components/NewsFeedPanel").then((module) => ({ default: module.NewsFeedPanel }))
);

const tabLoadingFallback = (
  <Card className="p-4 bg-zinc-950 border-zinc-900 text-xs text-zinc-400" role="status" aria-live="polite">
    Loading panel...
  </Card>
);

export default function App() {
  const [weights, setWeights] = useState(() => readStorage(WEIGHTS_STORAGE_KEY, getDefaultWeights()));
  const [currentTab, setCurrentTab] = useState(() => readStorageString(TAB_STORAGE_KEY, "dashboard"));
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);
  const [focusedSecurity, setFocusedSecurity] = useState<Asset | null>(null);
  const [showUpdateStatus, setShowUpdateStatus] = useState(false);
  const [showAlertsWindow, setShowAlertsWindow] = useState(false);
  const [showNewsFeedPanel, setShowNewsFeedPanel] = useState(false);
  const [alertsRefreshToken, setAlertsRefreshToken] = useState(0);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [healthMetrics, setHealthMetrics] = useState<BasicHealthMetrics>({
    loading: false,
    lastChecked: "Never",
    health: { ok: false, status: "unknown", latencyMs: null },
    ready: { ok: false, status: "unknown", latencyMs: null },
    metrics: {
      ok: false,
      uptimeSeconds: null,
      heapUsedMb: null,
      databaseConnected: null,
    },
    observability: {
      ok: false,
      totalRequests: null,
      errorRatePct: null,
      p95LatencyMs: null,
      activeAlerts: 0,
    },
  });
  const [newsRefreshToken, setNewsRefreshToken] = useState(0);
  const [newsAlertCount, setNewsAlertCount] = useState(0);
  const [updateStatusTick, setUpdateStatusTick] = useState(0);
  const [liveDataConnected, setLiveDataConnected] = useState(false);
  const [wbApiConnected, setWbApiConnected] = useState<boolean | null>(null); // null = checking
  // WB per-dimension overrides: { [country]: { political, economic, conflict, corruption, terrorism } }
  const [wbRiskOverrides, setWbRiskOverrides] = useState<Record<string, Partial<CountryRisk>>>({});

  const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [selectedTimeZone, setSelectedTimeZone] = useState(() => {
    if (typeof window === "undefined") {
      return "UTC";
    }
    return localStorage.getItem(TIME_ZONE_STORAGE_KEY) || (Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  });

  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState(() => readStorageString(DATASET_STORAGE_KEY, "default"));
  const [assetsByDataset, setAssetsByDataset] = useState<{
    [datasetId: string]: Asset[];
  }>({});
  const [datasetHistorySeed, setDatasetHistorySeed] = useState<Record<string, SeedHistoryPoint[]>>({});
  const [datasetHistorySeedLoaded, setDatasetHistorySeedLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRiskHorizon, setSelectedRiskHorizon] = useState<RiskHorizon>("daily");
  const initialSelectedDatasetId = useRef(selectedDatasetId);

  const availableTimeZones = useMemo(() => {
    const zones = [
      detectedTimeZone,
      "UTC",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Toronto",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Asia/Tokyo",
      "Asia/Singapore",
      "Asia/Hong_Kong",
      "Australia/Sydney",
    ];
    return Array.from(new Set(zones));
  }, [detectedTimeZone]);

  // Get the current portfolio based on selected dataset
  const portfolio = assetsByDataset[selectedDatasetId] || defaultPortfolio;

  // Per-dimension blended data (baseRiskData + wbRiskOverrides) — used by RiskMetricsPanel,
  // HoldingDetailDialog, RiskAlertDetailDialog, and intelligence/alert summary utils
  const blendedCountryDimensions = useMemo((): Record<string, CountryRisk> => {
    const result: Record<string, CountryRisk> = {};
    for (const [country, base] of Object.entries(baseRiskData)) {
      const wb = wbRiskOverrides[country];
      result[country] = wb
        ? {
            political: wb.political ?? base.political,
            economic: wb.economic ?? base.economic,
            conflict: wb.conflict ?? base.conflict,
            corruption: wb.corruption ?? base.corruption,
            terrorism: wb.terrorism ?? base.terrorism,
          }
        : { ...base };
    }
    return result;
  }, [wbRiskOverrides]);

  // All assets across every loaded dataset, deduplicated (active dataset first)
  const allSearchableAssets = useMemo(() => {    const seen = new Set<string>();
    const all: Asset[] = [];
    for (const asset of portfolio) {
      if (!seen.has(asset.ticker)) { seen.add(asset.ticker); all.push(asset); }
    }
    for (const [dsId, assets] of Object.entries(assetsByDataset)) {
      if (dsId === selectedDatasetId) continue;
      for (const asset of assets) {
        if (!seen.has(asset.ticker)) { seen.add(asset.ticker); all.push(asset); }
      }
    }
    return all;
  }, [portfolio, assetsByDataset, selectedDatasetId]);

  // Dataset name label per ticker (for search result badges)
  const assetDatasetLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    const nameMap = Object.fromEntries(datasets.map((d) => [d.id, d.name]));
    for (const [dsId, assets] of Object.entries(assetsByDataset)) {
      const label = nameMap[dsId] ?? dsId;
      for (const asset of assets) {
        if (!labels[asset.ticker]) labels[asset.ticker] = label;
      }
    }
    return labels;
  }, [assetsByDataset, datasets]);

  const riskData = useMemo(() => {
    const data: { [key: string]: number } = {};
    Object.keys(baseRiskData).forEach((country) => {
      // Blend WB overrides into the base dimensions for this country
      const wb = wbRiskOverrides[country];
      const base = baseRiskData[country];
      const blended = wb
        ? {
            political: wb.political ?? base.political,
            economic: wb.economic ?? base.economic,
            conflict: wb.conflict ?? base.conflict,
            corruption: wb.corruption ?? base.corruption,
            terrorism: wb.terrorism ?? base.terrorism,
          }
        : base;

      const totalWeight =
        weights.political + weights.economic + weights.conflict +
        weights.corruption + weights.terrorism;
      if (totalWeight === 0) { data[country] = 0; return; }
      data[country] = Math.round(
        (blended.political * weights.political +
          blended.economic * weights.economic +
          blended.conflict * weights.conflict +
          blended.corruption * weights.corruption +
          blended.terrorism * weights.terrorism) /
        500
      );
    });
    return data;
  }, [weights, wbRiskOverrides]);

  const horizonDays = useMemo(() => {
    if (selectedRiskHorizon === "7d") return 7;
    if (selectedRiskHorizon === "30d") return 30;
    if (selectedRiskHorizon === "90d") return 90;
    return null;
  }, [selectedRiskHorizon]);

  const dashboardRiskData = useMemo(() => {
    if (horizonDays === null) {
      return riskData;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - horizonDays + 1);

    const snapshots = getSnapshotsByDateRange(startDate, endDate, selectedDatasetId);
    if (snapshots.length === 0) {
      return riskData;
    }

    const aggregated: { [key: string]: number } = {};

    Object.keys(riskData).forEach((country) => {
      const values = snapshots
        .map((snapshot) => snapshot.countryRisks[country])
        .filter((countryRisk) => Boolean(countryRisk))
        .map((countryRisk) => {
          return (
            (countryRisk.political * weights.political +
              countryRisk.economic * weights.economic +
              countryRisk.conflict * weights.conflict +
              countryRisk.corruption * weights.corruption +
              countryRisk.terrorism * weights.terrorism) /
            500
          );
        });

      if (values.length > 0) {
        aggregated[country] = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
      } else {
        aggregated[country] = riskData[country];
      }
    });

    return aggregated;
  }, [horizonDays, riskData, selectedDatasetId, weights]);

  const portfolioAnalysis = useMemo(() => {
    return calculatePortfolioRisk(portfolio, riskData);
  }, [portfolio, riskData]);

  const dashboardPortfolio = portfolio;

  const dashboardPortfolioAnalysis = useMemo(() => {
    return calculatePortfolioRisk(dashboardPortfolio, dashboardRiskData);
  }, [dashboardPortfolio, dashboardRiskData]);

  // Risk scores for ALL assets across ALL datasets (uses riskData which includes WB blending)
  const allAssetRiskScores = useMemo(() => {
    const scores: Record<string, number> = {};
    // Seed with active portfolio scores from portfolio analysis
    for (const contrib of dashboardPortfolioAnalysis.assetContributions) {
      scores[contrib.ticker] = contrib.riskScore;
    }
    // Compute for assets in other datasets using riskData + WB overrides
    for (const [dsId, assets] of Object.entries(assetsByDataset)) {
      if (dsId === selectedDatasetId) continue;
      for (const asset of assets) {
        if (scores[asset.ticker] !== undefined) continue;
        const deps = asset.countryDependencies;
        if (deps.length === 0) { scores[asset.ticker] = 0; continue; }
        const totalWeight = deps.reduce((sum, d) => sum + d.weight, 0);
        if (totalWeight === 0) { scores[asset.ticker] = 0; continue; }
        scores[asset.ticker] = Math.round(
          deps.reduce((sum, d) => sum + (riskData[d.country] ?? 50) * d.weight, 0) / totalWeight
        );
      }
    }
    return scores;
  }, [dashboardPortfolioAnalysis.assetContributions, assetsByDataset, selectedDatasetId, riskData]);

  // When a security is focused, build country exposures for just that asset
  const activeCountryExposures = useMemo(() => {
    if (!focusedSecurity) return dashboardPortfolioAnalysis.countryExposures;
    return focusedSecurity.countryDependencies.map((dep) => ({
      country: dep.country,
      exposureType: dep.type ?? 'direct',
      riskContribution: (dashboardRiskData[dep.country] ?? 50) * dep.weight,
      contributingAssets: [focusedSecurity.ticker],
    }));
  }, [focusedSecurity, dashboardPortfolioAnalysis.countryExposures, dashboardRiskData]);

  useEffect(() => {
    const loadDatasetHistorySeed = async () => {
      try {
        const response = await fetch("/dataset-history-90d.csv");
        if (!response.ok) {
          setDatasetHistorySeedLoaded(true);
          return;
        }

        const csvText = await response.text();
        const lines = csvText.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
        if (lines.length < 2) {
          setDatasetHistorySeedLoaded(true);
          return;
        }

        const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
        const datasetIdIndex = headers.indexOf("datasetid");
        const dateIndex = headers.indexOf("date");
        const portfolioRiskIndex = headers.indexOf("portfoliorisk");
        const averageCountryRiskIndex = headers.indexOf("averagecountryrisk");
        const riskOffsetIndex = headers.indexOf("riskoffset");

        if (datasetIdIndex < 0 || dateIndex < 0 || portfolioRiskIndex < 0) {
          setDatasetHistorySeedLoaded(true);
          return;
        }

        const parsed: Record<string, SeedHistoryPoint[]> = {};

        lines.slice(1).forEach((line) => {
          const values = line.split(",").map((value) => value.trim());
          const datasetId = values[datasetIdIndex];
          const date = values[dateIndex];
          const portfolioRisk = Number(values[portfolioRiskIndex]);
          const averageCountryRisk =
            averageCountryRiskIndex >= 0 ? Number(values[averageCountryRiskIndex]) : undefined;
          const riskOffset = riskOffsetIndex >= 0 ? Number(values[riskOffsetIndex]) : undefined;

          if (!datasetId || !date || Number.isNaN(portfolioRisk)) {
            return;
          }

          if (!parsed[datasetId]) {
            parsed[datasetId] = [];
          }

          parsed[datasetId].push({
            date,
            portfolioRisk,
            averageCountryRisk: typeof averageCountryRisk === "number" && !Number.isNaN(averageCountryRisk)
              ? averageCountryRisk
              : undefined,
            riskOffset: typeof riskOffset === "number" && !Number.isNaN(riskOffset) ? riskOffset : undefined,
          });
        });

        Object.keys(parsed).forEach((datasetId) => {
          parsed[datasetId].sort((a, b) => a.date.localeCompare(b.date));
        });

        setDatasetHistorySeed(parsed);
      } catch (error) {
        console.warn("Failed to load dataset history seed CSV:", error);
      } finally {
        setDatasetHistorySeedLoaded(true);
      }
    };

    loadDatasetHistorySeed();
  }, []);

  const getRegionFromCountry = useCallback((country: string): string => {
    if (
      country.includes("United States") ||
      country.includes("Canada") ||
      country.includes("Mexico") ||
      country.includes("Brazil") ||
      country.includes("Argentina") ||
      country.includes("Chile")
    ) {
      return "Americas";
    }

    if (
      country.includes("China") ||
      country.includes("India") ||
      country.includes("Japan") ||
      country.includes("South Korea") ||
      country.includes("Taiwan") ||
      country.includes("Singapore")
    ) {
      return "Asia";
    }

    if (
      country.includes("Germany") ||
      country.includes("France") ||
      country.includes("UK") ||
      country.includes("Europe")
    ) {
      return "Europe";
    }

    if (country.includes("Middle East")) {
      return "Middle East";
    }

    return "Africa";
  }, []);

  useEffect(() => {
    if (!datasetHistorySeedLoaded || datasets.length === 0 || Object.keys(riskData).length === 0) {
      return;
    }

    const countries = Object.keys(riskData);

    datasets.forEach((dataset) => {
      const datasetPortfolio = assetsByDataset[dataset.id] || [];
      if (datasetPortfolio.length === 0) {
        return;
      }

      const datasetAnalysis = calculatePortfolioRisk(datasetPortfolio, riskData);
      const exposureByRegion: { [region: string]: number } = {};

      datasetAnalysis.countryExposures.forEach((exposure) => {
        const region = getRegionFromCountry(exposure.country);
        exposureByRegion[region] = (exposureByRegion[region] || 0) + exposure.riskContribution;
      });

      initializeHistoricalData(
        countries,
        riskData,
        dataset.id,
        90,
        datasetAnalysis.totalRiskScore,
        exposureByRegion,
        datasetAnalysis.topRiskCountries.map((country) => ({
          country,
          risk: riskData[country] || 50,
        })),
        datasetHistorySeed[dataset.id]
      );
    });
  }, [assetsByDataset, datasetHistorySeed, datasetHistorySeedLoaded, datasets, getRegionFromCountry, riskData]);

  // Load datasets from API on mount with paralleled requests
  useEffect(() => {
    const loadDatasets = async () => {
      const SP_DATASET_ID = 'sp-daily-performers';
      try {
        // Fetch datasets + S&P performers in parallel
        const [datasetsRes, spData] = await Promise.all([
          fetch(`${API_BASE_URL}/api/datasets`),
          fetch(`${API_BASE_URL}/api/external/sp-performers`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);
        if (!datasetsRes.ok) throw new Error("Failed to fetch datasets");
        const apiDatasets = await parseApiJson<ApiDataset[]>(datasetsRes);
        setLiveDataConnected(true);

        // Map API datasets to our format
        const mappedDatasets: DatasetMetadata[] = apiDatasets.map(
          (d) => ({
            id: d.datasetId,
            name: d.datasetName,
            description: d.datasetDescription,
          })
        );

        // Parallelize all API calls for assets and dependencies
        const assetsByDatasetMap: { [datasetId: string]: Asset[] } = {};

        // ── S&P Daily Top Performers (prepend as first/default dataset) ──
        if (spData?.assets?.length > 0) {
          const spAssetMap = new Map<string, Asset>();
          for (const a of spData.assets) {
            spAssetMap.set(a.ticker, {
              ticker: a.ticker,
              name: a.assetName,
              weight: a.weight,
              value: a.value || 0,
              sector: a.sector,
              countryDependencies: [],
            });
          }
          for (const dep of spData.dependencies) {
            const asset = spAssetMap.get(dep.ticker);
            if (asset) {
              asset.countryDependencies.push({
                country: dep.country,
                weight: dep.dependencyWeight,
                type: normalizeDependencyType(dep.dependencyType),
                reason: dep.dependencyReason,
              });
            }
          }
          assetsByDatasetMap[SP_DATASET_ID] = Array.from(spAssetMap.values());
          const fetchTime = spData.fetchedAt
            ? new Date(spData.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : null;
          const isStaticFallback = spData.source === 'static_fallback';
          mappedDatasets.unshift({
            id: SP_DATASET_ID,
            name: 'S&P Daily Top Performers',
            description: isStaticFallback
              ? `Top ${spData.count} S&P 500 leaders · Sample data (market closed) · Geopolitical risk by World Bank WGI`
              : fetchTime
              ? `Top ${spData.count} S&P 500 gainers today · Updated ${fetchTime} · Geopolitical risk by World Bank WGI`
              : `Top ${spData.count} S&P 500 daily gainers · Geopolitical risk by World Bank WGI`,
          });
        }

        setDatasets(mappedDatasets);

        // Fetch all assets and dependencies in parallel
        const promises = apiDatasets.map(async (dataset) => {
          try {
            const [assetsRes, depsRes] = await Promise.all([
              fetch(`${API_BASE_URL}/api/assets/${dataset.datasetId}`),
              fetch(`${API_BASE_URL}/api/dependencies/${dataset.datasetId}`),
            ]);

            if (!assetsRes.ok) throw new Error(`Failed to fetch assets for ${dataset.datasetId}`);
            if (!depsRes.ok) throw new Error(`Failed to fetch dependencies for ${dataset.datasetId}`);

            const [assets, deps] = await Promise.all([
              parseApiJson<ApiAsset[]>(assetsRes),
              parseApiJson<ApiDependency[]>(depsRes),
            ]);

            // Map to Asset objects
            const assetMap = new Map<string, Asset>();
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
                  type: normalizeDependencyType(dep.dependencyType),
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
          const prior = initialSelectedDatasetId.current;
          const selectedExists = mappedDatasets.some((dataset) => dataset.id === prior);
          // Always land on S&P performers by default (or if prior selection was
          // "default" / "sp-daily-performers"). Only keep a different prior
          // selection if the user had explicitly switched to another dataset.
          const spAvailable = !!assetsByDatasetMap[SP_DATASET_ID];
          const priorIsDefaultish = !prior || prior === "default" || prior === SP_DATASET_ID;
          if (spAvailable && priorIsDefaultish) {
            setSelectedDatasetId(SP_DATASET_ID);
          } else {
            setSelectedDatasetId(selectedExists ? prior : (spAvailable ? SP_DATASET_ID : mappedDatasets[0].id));
          }
        }
      } catch (error) {
        console.warn("API not available, falling back to CSV:", error);
        setLiveDataConnected(false);
        // Fall back to CSV loader
        try {
          const { datasets: loadedDatasets, assetsByDataset: loadedAssets } =
            await loadDatasetsFromCSV("/datasets.csv");
          setDatasets(loadedDatasets);
          setAssetsByDataset(loadedAssets);
          if (loadedDatasets.length > 0) {
            const selectedExists = loadedDatasets.some((dataset) => dataset.id === initialSelectedDatasetId.current);
            setSelectedDatasetId(selectedExists ? initialSelectedDatasetId.current : loadedDatasets[0].id);
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

  const checkLiveDataStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      setLiveDataConnected(response.ok);
    } catch {
      setLiveDataConnected(false);
    }
  }, []);

  // Fetch World Bank governance data and blend into risk scores
  const fetchWBGovernanceData = useCallback(async () => {
    setWbApiConnected(null); // show loading state immediately
    try {
      const res = await fetch(`${API_BASE_URL}/api/external/governance`);
      if (!res.ok) { setWbApiConnected(false); return; }
      const json = await res.json();
      if (json?.data && typeof json.data === "object") {
        setWbRiskOverrides(json.data);
        setWbApiConnected(true);
      } else {
        setWbApiConnected(false);
      }
    } catch {
      setWbApiConnected(false);
    }
  }, []);

  // Fetch WB data on mount (after backend is up)
  useEffect(() => {
    fetchWBGovernanceData();
  }, [fetchWBGovernanceData]);

  const checkBasicHealthMetrics = useCallback(async () => {
    const timedFetch = async (url: string, init?: RequestInit) => {
      const startedAt = performance.now();
      try {
        const response = await fetch(url, init);
        const latencyMs = Math.round(performance.now() - startedAt);
        const data = await response.json().catch(() => null);
        return { ok: response.ok, latencyMs, data };
      } catch (error) {
        return {
          ok: false,
          latencyMs: null,
          data: null,
          error: error instanceof Error ? error.message : "Request failed",
        };
      }
    };

    setHealthMetrics((prev) => ({ ...prev, loading: true }));

    const [healthRes, readyRes, metricsRes, observabilityRes, alertsRes] = await Promise.all([
      timedFetch(`${API_BASE_URL}/health`),
      timedFetch(`${API_BASE_URL}/ready`),
      timedFetch(`${API_BASE_URL}/api/admin/metrics`, {
        headers: { "x-user-role": "admin" },
      }),
      timedFetch(`${API_BASE_URL}/api/admin/observability`, {
        headers: { "x-user-role": "admin" },
      }),
      timedFetch(`${API_BASE_URL}/api/admin/alerts`, {
        headers: { "x-user-role": "admin" },
      }),
    ]);

    setHealthMetrics({
      loading: false,
      lastChecked: new Date().toLocaleString(undefined, {
        timeZone: selectedTimeZone,
        dateStyle: "medium",
        timeStyle: "short",
      }),
      health: {
        ok: healthRes.ok,
        status: healthRes.data?.status || (healthRes.ok ? "ok" : "error"),
        latencyMs: healthRes.latencyMs,
        error: healthRes.error,
      },
      ready: {
        ok: readyRes.ok,
        status: readyRes.data?.status || (readyRes.ok ? "ready" : "degraded"),
        latencyMs: readyRes.latencyMs,
        error: readyRes.error,
      },
      metrics: {
        ok: metricsRes.ok,
        uptimeSeconds: typeof metricsRes.data?.uptimeSeconds === "number" ? metricsRes.data.uptimeSeconds : null,
        heapUsedMb:
          typeof metricsRes.data?.memory?.heapUsed === "number"
            ? Number((metricsRes.data.memory.heapUsed / (1024 * 1024)).toFixed(1))
            : null,
        databaseConnected:
          typeof metricsRes.data?.databaseConnected === "boolean"
            ? metricsRes.data.databaseConnected
            : null,
        error: metricsRes.error || (!metricsRes.ok ? "Metrics endpoint unavailable" : undefined),
      },
      observability: {
        ok: observabilityRes.ok,
        totalRequests:
          typeof observabilityRes.data?.requests?.total === "number"
            ? observabilityRes.data.requests.total
            : null,
        errorRatePct:
          typeof observabilityRes.data?.requests?.errorRatePct === "number"
            ? Number(observabilityRes.data.requests.errorRatePct.toFixed(2))
            : null,
        p95LatencyMs:
          typeof observabilityRes.data?.latency?.p95Ms === "number"
            ? Number(observabilityRes.data.latency.p95Ms.toFixed(1))
            : null,
        activeAlerts:
          Array.isArray(alertsRes.data?.alerts)
            ? alertsRes.data.alerts.filter((alert: { active?: boolean }) => alert.active).length
            : 0,
        error:
          observabilityRes.error ||
          (!observabilityRes.ok ? "Observability endpoint unavailable" : undefined),
      },
    });
  }, [selectedTimeZone]);

  const formatUptime = useCallback((uptimeSeconds: number | null) => {
    if (uptimeSeconds === null) return "N/A";
    const total = Math.floor(uptimeSeconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  }, []);

  // Check backend connectivity periodically to keep live-data status current.
  useEffect(() => {
    checkLiveDataStatus();
    const intervalId = window.setInterval(checkLiveDataStatus, 60000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [checkLiveDataStatus]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TIME_ZONE_STORAGE_KEY, selectedTimeZone);
    }
  }, [selectedTimeZone]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(weights));
    }
  }, [weights]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TAB_STORAGE_KEY, currentTab);
    }
  }, [currentTab]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(DATASET_STORAGE_KEY, selectedDatasetId);
    }
  }, [selectedDatasetId]);

  const saveAdvancedPrefsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (saveAdvancedPrefsTimer.current) clearTimeout(saveAdvancedPrefsTimer.current);
    saveAdvancedPrefsTimer.current = setTimeout(() => {
      void putWorkspaceState("advancedPrefs", "dashboard", {
        selectedTimeZone,
        weights,
        currentTab,
        selectedDatasetId,
        selectedRiskHorizon,
      }, getAdvancedPrefsVersion()).then(setAdvancedPrefsVersion);
    }, 600);
    return () => {
      if (saveAdvancedPrefsTimer.current) clearTimeout(saveAdvancedPrefsTimer.current);
    };
  }, [
    selectedTimeZone,
    weights,
    currentTab,
    selectedDatasetId,
    selectedRiskHorizon,
  ]);

  useEffect(() => {
    if (!showSettingsModal) return;

    checkBasicHealthMetrics();
    const intervalId = window.setInterval(checkBasicHealthMetrics, 60000);
    return () => window.clearInterval(intervalId);
  }, [showSettingsModal, checkBasicHealthMetrics]);

  useEffect(() => {
    const postCrash = (payload: Record<string, unknown>) => {
      void fetch(`${API_BASE_URL}/api/telemetry/frontend-crash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Best-effort telemetry: ignore network failures.
      });
    };

    const onWindowError = (event: ErrorEvent) => {
      postCrash({
        message: event.message || "Unhandled frontend error",
        route: window.location.pathname,
        release: "1.2",
        stack: event.error?.stack || null,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = typeof reason === "string"
        ? reason
        : reason?.message || "Unhandled frontend promise rejection";

      postCrash({
        message,
        route: window.location.pathname,
        release: "1.2",
        stack: reason?.stack || null,
      });
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  // Initialize daily update and real-time updates on app startup
  useEffect(() => {
    const checkAndUpdate = async () => {
      try {
        await initializeDailyUpdate();
      } catch (error) {
        console.warn("Daily update check failed:", error);
      }
    };

    checkAndUpdate();
    initializeRealtimeUpdates();

    // Cleanup real-time updates on unmount
    return () => stopRealtimeUpdates();
  }, []);

  // Record historical snapshots and check alert thresholds
  useEffect(() => {
    if (portfolioAnalysis && Object.keys(riskData).length > 0) {
      // Convert riskData to CountryRisk format for snapshot
      const countryRisks: Record<string, typeof DEFAULT_COUNTRY_RISK> = {};
      Object.keys(riskData).forEach((country) => {
        countryRisks[country] = baseRiskData[country] || DEFAULT_COUNTRY_RISK;
      });

      // Calculate region exposures
      const exposureByRegion: { [region: string]: number } = {};
      portfolioAnalysis.countryExposures.forEach((exposure) => {
        const region = getRegionFromCountry(exposure.country);
        exposureByRegion[region] = (exposureByRegion[region] || 0) + exposure.riskContribution;
      });

      // Record snapshot monthly (to avoid excessive storage)
      const lastSnapshot = getLatestSnapshot(selectedDatasetId);
      const now = new Date();
      const shouldRecord =
        !lastSnapshot ||
        now.getTime() - new Date(lastSnapshot.timestamp).getTime() > 30 * 24 * 60 * 60 * 1000; // 30 days

      if (shouldRecord) {
        recordSnapshot(
          countryRisks,
          portfolioAnalysis.totalRiskScore,
          exposureByRegion,
          portfolioAnalysis.topRiskCountries.map((c) => ({
            country: c,
            risk: riskData[c] || 50,
          })),
          selectedDatasetId
        );
      }

      // Check alert thresholds for portfolio
      checkThresholds("portfolio", portfolioAnalysis.totalRiskScore, "portfolio");

      // Check alert thresholds for top country exposures
      portfolioAnalysis.countryExposures.slice(0, 5).forEach((exposure) => {
        const countryRisk = riskData[exposure.country] || 50;
        checkThresholds(exposure.country, countryRisk, "country");
      });
    }
  }, [getRegionFromCountry, portfolioAnalysis, riskData, selectedDatasetId]);

  const updateWeight = useCallback((category: keyof typeof weights, value: number) => {
    setWeights((prev) => ({ ...prev, [category]: value }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setWeights(getDefaultWeights());
  }, []);

  const isUsingDefaults = isDefaultWeights(weights);

  const averageRisk = useMemo(() => {
    const values = Object.values(riskData);
    return values.length > 0
      ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
      : 0;
  }, [riskData]);

  const activeRiskAlerts = useMemo(() => {
    return activeCountryExposures
      .map((exposure) => ({
        ...exposure,
        riskScore: dashboardRiskData[exposure.country] || 50,
      }))
      .filter((exposure) => exposure.riskScore > MIN_ALERT_RISK_SCORE)
      .sort((a, b) => b.riskScore - a.riskScore || b.riskContribution - a.riskContribution);
  }, [activeCountryExposures, dashboardRiskData]);

  const alertCount = activeRiskAlerts.length;

  const [selectedAlert, setSelectedAlert] = useState<RiskAlertDetail | null>(null);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertsVisibleCount, setAlertsVisibleCount] = useState(8);
  const [alertsPage, setAlertsPage] = useState(0);
  const ALERTS_PAGE_SIZE = 8;
  const [showWatchlistPopover, setShowWatchlistPopover] = useState(false);
  const [countriesPage, setCountriesPage] = useState(0);
  const COUNTRIES_PAGE_SIZE = 6;
  const [countriesSort, setCountriesSort] = useState<{ by: 'risk' | 'stocks'; dir: 'desc' | 'asc' }>({ by: 'risk', dir: 'desc' });
  const handleAlertClick = useCallback((alert: RiskAlertDetail) => {
    setSelectedAlert(alert);
    setAlertDialogOpen(true);
  }, []);

  const homePortfolioValueDisplay = useMemo(() => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });

    // Calculate actual portfolio value from loaded assets
    const actualPortfolioValue = portfolio.reduce((sum, asset) => sum + asset.value, 0);
    const displayValue = actualPortfolioValue > 0 ? actualPortfolioValue : PORTFOLIO_VALUE_PLACEHOLDER_USD;
    return `${formatter.format(displayValue)} USD`;
  }, [portfolio]);

  const downloadMapSnapshot = useCallback(async (mapElementId: string) => {
    try {
      const mapElement = document.getElementById(mapElementId);
      if (!mapElement) {
        toast.error("Map snapshot failed");
        return;
      }

      const fileName = `global_risk_heatmap_${new Date().toISOString().split("T")[0]}.png`;

      // Prefer SVG-native export for reliability and crisp output.
      const svgElement = mapElement.querySelector("svg");
      if (svgElement) {
        const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
        const viewBox = svgElement.getAttribute("viewBox")?.split(" ").map(Number) || [0, 0, 1000, 500];
        const width = Math.max(1, Math.round(svgElement.clientWidth || viewBox[2] || 1000));
        const height = Math.max(1, Math.round(svgElement.clientHeight || viewBox[3] || 500));

        clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clonedSvg.setAttribute("width", String(width));
        clonedSvg.setAttribute("height", String(height));

        const svgString = new XMLSerializer().serializeToString(clonedSvg);
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const svgUrl = URL.createObjectURL(svgBlob);

        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = width * 2;
              canvas.height = height * 2;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
              }

              ctx.fillStyle = "#09090b";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.scale(2, 2);
              ctx.drawImage(img, 0, 0, width, height);

              const link = document.createElement("a");
              link.href = canvas.toDataURL("image/png");
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              toast.success("Map snapshot downloaded");
              resolve();
            } catch (err) {
              reject(err);
            } finally {
              URL.revokeObjectURL(svgUrl);
            }
          };
          img.onerror = (err) => {
            URL.revokeObjectURL(svgUrl);
            reject(err);
          };
          img.src = svgUrl;
        });
        return;
      }

      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(mapElement, {
        backgroundColor: "#09090b",
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Map snapshot downloaded");
    } catch (error) {
      console.error("Failed to capture map snapshot:", error);
      toast.error("Map snapshot failed");
    }
  }, []);

  const portfolioCountriesSet = useMemo(
    () => new Set(portfolioAnalysis.countryExposures.map((exp) => exp.country)),
    [portfolioAnalysis.countryExposures]
  );

  const loadNewsAlertCount = useCallback(async () => {
    try {
      let baseArticles: unknown[] = [];

      try {
        const response = await fetch(`${API_BASE_URL}/api/news?limit=40`);
        if (response.ok) {
          const rawPayload = await response.json();
          const payload = rawPayload && typeof rawPayload === 'object' && 'data' in rawPayload
            ? (rawPayload as { data: { articles?: unknown[] } }).data
            : (rawPayload as { articles?: unknown[] });
          baseArticles = payload.articles || [];
        }
      } catch {
        // Fall back to mock data when API is unavailable.
      }

      if (baseArticles.length === 0) {
        baseArticles = generateMockNews();
      }

      const parsedArticles = baseArticles
        .map((article) => parseNewsForRisk(article))
        .filter((article): article is NonNullable<typeof article> => article !== null);

      const events = parsedArticles.map((article) => newsToRiskEvent(article));
      const count = events.filter(
        (event) =>
          (event.urgency === "high" || event.urgency === "critical") &&
          event.affectedCountries.some((country) => portfolioCountriesSet.has(country))
      ).length;

      setNewsAlertCount(count);
    } catch {
      setNewsAlertCount(0);
    }
  }, [portfolioCountriesSet]);

  useEffect(() => {
    loadNewsAlertCount();
    const interval = setInterval(loadNewsAlertCount, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadNewsAlertCount]);

  useEffect(() => {
    if (newsRefreshToken > 0) {
      loadNewsAlertCount();
    }
  }, [newsRefreshToken, loadNewsAlertCount]);

  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateStatusTick((prev) => prev + 1);
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const updateStatus = useMemo(() => getUpdateStatus(), [updateStatusTick, showUpdateStatus]);
  const refreshNeedsAttention = updateStatus.needsUpdate;
  const refreshIsCurrent = !updateStatus.needsUpdate && updateStatus.lastUpdated !== 'Never';
  const corePanelFreshnessLabel = useMemo(() => {
    if (updateStatus.lastUpdated === 'Never') {
      return 'No daily refresh has completed yet';
    }

    return `Last updated ${new Date(updateStatus.lastUpdated).toLocaleString(undefined, {
      timeZone: selectedTimeZone,
      dateStyle: 'medium',
      timeStyle: 'short',
    })}`;
  }, [selectedTimeZone, updateStatus.lastUpdated]);

  return (
    <div className="min-h-screen bg-black">
      <Toaster
        position="bottom-right"
        theme="dark"
        richColors
        closeButton={false}
        duration={1600}
      />
      <RiskAlertDetailDialog
        alert={selectedAlert}
        weights={weights}
        countryDimensions={blendedCountryDimensions}
        open={alertDialogOpen}
        onOpenChange={setAlertDialogOpen}
      />
      {/* Methodology Modal */}
      <RiskMethodologyModal open={showMethodologyModal} onClose={() => setShowMethodologyModal(false)} />
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
              <Tabs defaultValue="guide" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-zinc-900/70 border border-zinc-800 h-auto">
                  <TabsTrigger value="guide" className="text-xs py-2">User Guide</TabsTrigger>
                  <TabsTrigger value="release-notes" className="text-xs py-2">Release Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="guide" className="mt-3">
                  <div className="space-y-3 text-xs text-zinc-300">
                <div>
                  <h3 className="font-semibold text-white mb-1">What is this app?</h3>
                  <p className="text-[11px]">
                    This Geopolitical Risk Dashboard helps you analyze and monitor geopolitical risks across your investment portfolio. It evaluates how different risk factors (political instability, economic challenges, conflicts, corruption, and terrorism) impact your holdings in various countries.
                  </p>
                </div>
                <div className="bg-zinc-900/60 border border-zinc-800 rounded p-2">
                  <h3 className="font-semibold text-white mb-1">Version Information</h3>
                  <p className="text-[11px] text-zinc-300">
                    <span className="font-semibold text-white">Latest Version:</span> 1.4
                  </p>
                  <p className="text-[11px] text-zinc-300">
                    <span className="font-semibold text-white">Build:</span> 1.4
                  </p>
                  <p className="text-[11px] text-zinc-300">
                    <span className="font-semibold text-white">Last Updated:</span> July 1, 2026
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
                <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                  <h3 className="font-semibold text-white">How Risk Weights Are Calculated</h3>
                  <p className="text-[11px] text-zinc-300">
                    Each country has a base factor score (0-100) for Political, Economic, Conflict, Corruption, and Terrorism. The app multiplies each base factor by your slider weight, sums those results, then normalizes by 500:
                  </p>
                  <p className="text-[11px] text-zinc-200 font-mono bg-zinc-950/70 border border-zinc-800 rounded px-2 py-1">
                    countryRisk = round((P*wP + E*wE + C*wC + Cor*wCor + T*wT) / 500)
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Note: if all five sliders are set to 0, the model returns a risk score of 0 by design.
                  </p>
                  <div>
                    <p className="text-[11px] font-semibold text-white mb-1">What The Scores Mean</p>
                    <ul className="space-y-0.5 list-disc list-inside text-[11px] text-zinc-300">
                      <li><span className="font-semibold text-zinc-100">0-25:</span> Low risk</li>
                      <li><span className="font-semibold text-zinc-100">26-50:</span> Elevated but below high-risk alert threshold</li>
                      <li><span className="font-semibold text-zinc-100">51-74:</span> High risk</li>
                      <li><span className="font-semibold text-zinc-100">75-100:</span> Critical risk</li>
                    </ul>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Alert logic: countries are included in alerts when score &gt; {MIN_ALERT_RISK_SCORE}, tagged high at {HIGH_RISK_SCORE_THRESHOLD}+, and critical at {CRITICAL_RISK_SCORE_THRESHOLD}+.
                    </p>
                  </div>
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
                    Get actionable insights and recommendations for managing your portfolio's geopolitical risks, including specific suggestions for rebalancing and diversification. Also includes:
                  </p>
                  <ul className="space-y-0.5 list-disc list-inside text-[11px] mt-1">
                    <li><span className="font-semibold">Correlation Analysis:</span> Analyze how different countries' risks move together. Identify strong correlations and regional cohesion patterns to find better diversification opportunities.</li>
                    <li><span className="font-semibold">Custom Scenarios:</span> Build custom crisis scenarios to test your portfolio's resilience. Test how specific geopolitical events would impact your holdings with real-time risk projections.</li>
                    <li><span className="font-semibold">Monte Carlo Simulation:</span> Run thousands of possible risk scenarios using historical volatility. See probability distributions, worst-case outcomes, and risk metrics (VaR, CVaR).</li>
                    <li><span className="font-semibold">News Feed:</span> Real-time geopolitical news filtered by risk level and portfolio impact. Automatically categorizes events and estimates their effect on your holdings.</li>
                    <li><span className="font-semibold">Backtesting:</span> Test how your portfolio would have performed during historical crisis events. Understand the actual impact of major geopolitical disruptions.</li>
                    <li><span className="font-semibold">Risk Metrics:</span> Advanced risk calculations including concentration analysis and diversification metrics.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Alerts Tab</h3>
                  <p className="text-[11px]">
                    Monitor active alerts for your portfolio in real-time. Receive notifications when assets exceed risk thresholds, countries experience significant changes, or portfolio risk metrics cross critical levels. Dismiss individual alerts or clear all once reviewed.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Export Reports</h3>
                  <p className="text-[11px]">
                    Click "Export Reports" in the header to generate PDF, Excel, or CSV exports. Use "Select Reporting Pages" to include only the sections you want, then generate the report with current dashboard data, charts, and risk analytics.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Daily Updates</h3>
                  <p className="text-[11px]">
                    Risk scores automatically update daily to reflect the latest geopolitical conditions. The refresh icon now includes live status: a green check means data was refreshed within 24 hours, and an alert badge means refresh is overdue. Click it to view details and use "Refresh Now" anytime.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Map Snapshot Download</h3>
                  <p className="text-[11px]">
                    In the Global Risk Heat Map card, use the download icon in the top-right corner to save a PNG snapshot of the currently rendered map. A toast confirms success or failure after each capture.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Single Security Search</h3>
                  <p className="text-[11px]">
                    Use the search box in the header (to the left of the dataset dropdown) to look up any holding by ticker or company name. Selecting a security scopes the entire dashboard — map, country exposure cards, risk alerts, and holdings table — to that single asset. Click the × on the badge or "Clear" on the map banner to return to full portfolio view.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Risk Score Methodology</h3>
                  <p className="text-[11px]">
                    Click the book icon in the header (next to the Help button) to open the Risk Score Methodology modal. It explains the 5-dimension framework (Political, Economic, Conflict, Corruption, Terrorism), the weighted calculation formulas, risk tier bands (Low/Medium/High/Critical), and all five weight preset profiles. Also accessible from the Risk Score Legend and the Portfolio Snapshot card.
                  </p>
                </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">Tools Tab</h3>
                      <p className="text-[11px] mb-2 font-semibold text-blue-300">Advanced Portfolio Management Features:</p>
                      <ul className="space-y-1 text-[11px] list-disc list-inside">
                        <li><span className="font-semibold">Portfolio Manager:</span> Create, edit, and manage custom portfolios. Save multiple portfolio configurations and export them as JSON files for backup or sharing.</li>
                        <li><span className="font-semibold">CSV Upload:</span> Bulk-import holdings directly from a CSV file. Download a template to get started. The tool validates your data and provides instant feedback on what was imported.</li>
                        <li><span className="font-semibold">Sector Breakdown:</span> Analyze your portfolio by sector with detailed risk metrics. See total portfolio value, average risk scores, and allocation percentages for each sector. Risk levels are color-coded (green, yellow, red) for quick assessment.</li>
                        <li><span className="font-semibold">Asset Screener:</span> Filter assets using multiple criteria including risk ranges, specific sectors, countries, and asset value thresholds. Find assets matching your portfolio criteria in seconds.</li>
                        <li><span className="font-semibold">Advanced Filters:</span> Apply focused country, sector, and risk-threshold filters to quickly isolate exposures and identify concentration risk.</li>
                        <li><span className="font-semibold">Backtesting:</span> Replay historical stress periods to evaluate how your portfolio profile would have behaved under prior geopolitical shocks.</li>
                        <li><span className="font-semibold">Correlation & Scenarios:</span> Explore cross-country risk relationships and test custom what-if scenarios before making allocation changes.</li>
                      </ul>
                    </div>
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
                      <p className="text-[11px] text-zinc-200 font-semibold">Created by</p>
                      <p className="text-[11px] text-zinc-300 mt-1">This app was built by Casandra Cain</p>
                      <p className="text-[11px] text-zinc-400 mt-1">Inspired by Ian Bremmer's political podcast, G-Zero World.</p>
                      <a
                        href="https://cascain.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-[11px] text-blue-300 hover:text-blue-200 underline underline-offset-2"
                      >
                        cascain.io
                      </a>
                      <p className="text-[10px] text-zinc-500 mt-2">Copyright © 2026 Casandra Cain.</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="release-notes" className="mt-3">
                  <div className="space-y-3 text-xs text-zinc-300">
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
                  <h3 className="font-semibold text-white mb-1">Version 1.4 Quick Summary</h3>
                      <p className="text-[11px] text-zinc-300 mb-2">
                        <span className="font-semibold text-white">Build:</span> 1.4 | <span className="font-semibold text-white">Last Updated:</span> July 1, 2026
                      </p>
                      <div className="grid grid-cols-1 gap-3 text-[11px]">
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                          <p className="font-semibold text-white">Country Risk &amp; Heat Map</p>
                          <p>✅ All country cards in <em>Country Risk vs Portfolio Contribution</em> are now clickable — opens the risk detail dialog for any country regardless of alert status.</p>
                          <p>✅ Every country card now shows a severity chip (LOW / MEDIUM / HIGH / CRITICAL) in the appropriate colour.</p>
                          <p>✅ Added pagination (6 per page) with Prev / Next controls to the country cards panel so all countries are reachable.</p>
                          <p>✅ Added sort controls to the country panel — sort by Risk score or by number of Stocks, ascending or descending.</p>
                          <p>✅ Clicking any country on the Global Risk Heat Map now opens the same risk detail dialog.</p>
                          <p>✅ Added info tooltips (ⓘ) next to <em>Country Risk vs Portfolio Contribution</em>, <em>Global Risk Heat Map</em>, and <em>Risk Factor Weights</em> headings.</p>
                        </div>
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                          <p className="font-semibold text-white">Risk Alert Detail Dialog</p>
                          <p>✅ Completely redesigned — replaced the wall-of-text paragraph with a structured layout: quick-facts grid (portfolio share, risk level, confidence, last updated), flagged holdings chips, a per-factor impact bar chart, and a one-line action tip.</p>
                        </div>
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                          <p className="font-semibold text-white">Holdings Risk Analysis</p>
                          <p>✅ Table now shows all holdings (no 10-row cap) inside a tall scrollable container.</p>
                          <p>✅ Added a <em>Download CSV</em> button in the table header — exports all sorted rows with ticker, sector, risk scores, value, allocation, potential loss, and top drivers.</p>
                        </div>
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                          <p className="font-semibold text-white">Watchlist Popover</p>
                          <p>✅ Added a list icon (⊞) next to the dataset selector — clicking it opens a popover showing all tickers in the active watchlist as chips.</p>
                          <p>✅ Clicking any ticker in the popover instantly scopes the dashboard to that security.</p>
                        </div>
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                          <p className="font-semibold text-white">Navigation &amp; Layout</p>
                          <p>✅ Sticky header — the top bar stays pinned while scrolling.</p>
                          <p>✅ Added a footer with app description, feature list, version, and contact details (cas@cascain.com).</p>
                          <p>✅ Removed the <em>No stocks / N/A</em> entry from the risk score legend.</p>
                          <p>✅ Active risk alerts panel is paginated (8 per page) with always-visible Prev / Next controls.</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
                      <p className="text-[11px] text-zinc-300 mb-2">
                        <span className="font-semibold text-white">Build:</span> 1.3 | <span className="font-semibold text-white">Last Updated:</span> June 30, 2026
                      </p>
                      <div className="grid grid-cols-1 gap-3 text-[11px]">
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                          <p className="font-semibold text-white">S&amp;P Daily Top Performers</p>
                          <p>✅ Added a new default watchlist — <span className="font-semibold text-zinc-200">S&amp;P Daily Top Performers</span> — that loads automatically on startup.</p>
                          <p>✅ Displays the top 25 S&amp;P 500 daily gainers ranked by daily % change, each enriched with per-company country dependency maps.</p>
                          <p>✅ Live data is fetched via Yahoo Finance v8/chart on the server. When markets are closed or the feed is unavailable, a curated sample list loads automatically and the dataset label shows "Sample data (market closed)" — the dashboard never shows an empty watchlist.</p>
                          <p>✅ Dataset description shows the fetch timestamp and count when live, or a "Sample data" label when using the static fallback.</p>
                        </div>
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                          <p className="font-semibold text-white">World Bank Live Data</p>
                          <p>✅ Added a live data indicator pill in the header — shows a blue "Live" badge when connected to the World Bank Governance Indicators (WGI) API, or "Offline" when disconnected.</p>
                          <p>✅ The WGI API enriches all five risk dimensions (Political, Economic, Conflict, Corruption, Terrorism) with real governance scores for every country in your portfolio.</p>
                          <p>✅ Settings → APIs tab shows a Disconnect / Reconnect bar at the top so you can toggle live data enrichment at any time.</p>
                          <p>✅ All dashboard panels (Risk Metrics, Holding Detail, Alert Detail) use the blended WB data when connected.</p>
                        </div>
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                          <p className="font-semibold text-white">Risk Methodology</p>
                          <p>✅ Added a full Risk Score Methodology modal, accessible via the BookOpen icon in the header.</p>
                          <p>✅ Explains the 5-dimension framework, the weighted calculation chain, risk tier bands (Low / Medium / High / Critical), and all weight preset profiles.</p>
                          <p>✅ Also accessible from the Risk Score Legend and the Portfolio Snapshot card.</p>
                        </div>
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                          <p className="font-semibold text-white">Single Security View &amp; Cross-Dataset Search</p>
                          <p>✅ Added a security search input in the header — search any holding across all loaded datasets by ticker or company name.</p>
                          <p>✅ Selecting a security scopes the entire dashboard to that holding: map, country exposures, holdings table, and alerts all update to reflect only that security's risk profile.</p>
                          <p>✅ Results from non-active datasets show a dataset label badge so you always know which watchlist a result comes from.</p>
                          <p>✅ A blue banner above the map shows the focused security with a one-click "Clear" to return to full portfolio view.</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
                      <h3 className="font-semibold text-white mb-1">Version 1.2 Quick Summary</h3>
                      <p className="text-[11px] text-zinc-300 mb-2">
                        <span className="font-semibold text-white">Build:</span> 1.2 | <span className="font-semibold text-white">Last Updated:</span> April 25, 2026
                      </p>
                      <div className="grid grid-cols-1 gap-3 text-[11px]">
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                          <p className="font-semibold text-white">Risk Alerts</p>
                          <p>✅ Active risk alerts in the dashboard sidebar are now clickable and open a detailed dialog with a plain-English explanation of why each alert was raised.</p>
                          <p>✅ Added an inline "Why is this flagged?" expandable summary on each alert card in the Alerts tab, showing severity, portfolio risk contribution, and the top contributing factors driven by your current weight sliders.</p>
                          <p>✅ New shared <span className="font-mono">riskAlertSummary</span> utility derives the narrative from country base factors, weights, severity bands, and contributing assets — keeping the dashboard and Alerts tab in sync.</p>
                          <p>✅ Alert cards now show a "stocks impacted" badge and confidence/last-updated metadata sourced from the country intelligence model.</p>
                          <p>✅ Improved keyboard and screen-reader support on alert rows (button semantics, aria-label, focus ring, aria-expanded summaries).</p>
                        </div>
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                          <p className="font-semibold text-white">Global Risk Heat Map</p>
                          <p>✅ Countries with no associated stocks in the active portfolio are now rendered in neutral gray instead of being colored by a default risk score, so the map only shows risk for exposures you actually hold.</p>
                          <p>✅ Added a new "No stocks" entry to the map legend covering the gray fill state.</p>
                          <p>✅ Map tooltips and aria-labels now distinguish between "risk score X" countries and "no associated stocks" countries.</p>
                        </div>
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                          <p className="font-semibold text-white">Holdings & Navigation</p>
                          <p>✅ Holdings risk analysis table rows now open a Holding Detail dialog with a plain-English breakdown of why a position is weighted the way it is (top country, dependency type, dominant risk factor).</p>
                          <p>✅ Removed the legacy Trends tab from the main navigation; historical trend visuals now live inside the relevant dashboard cards.</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
                      <h3 className="font-semibold text-white mb-1">Version 1.1 Quick Summary</h3>
                      <p className="text-[11px] text-zinc-300 mb-2">
                        <span className="font-semibold text-white">Build:</span> 1.1 | <span className="font-semibold text-white">Last Updated:</span> April 19, 2026
                      </p>
                      <div className="grid grid-cols-1 gap-3 text-[11px]">
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                          <p className="font-semibold text-white">Product & UX</p>
                          <p>✅ Added Global Risk Heat Map PNG snapshot download with stronger capture reliability.</p>
                          <p>✅ Added toast feedback for snapshot success and error states.</p>
                          <p>✅ Added refresh-status indicators: checkmark for data refreshed within 24 hours, alert when overdue.</p>
                          <p>✅ Updated alert functionality so the Alerts modal "Active Alerts" summary now matches the high-risk alert count shown in the header badge/stat.</p>
                          <p>✅ Added a top-header live data status badge (green/red) near the dashboard title.</p>
                          <p>✅ Added a new Settings icon and modal with API connection guidance and basic app information.</p>
                          <p>✅ Added a persisted time zone selector in Settings for localized status timestamps.</p>
                          <p>✅ Expanded Help content for exports, snapshot flow, daily updates, and advanced tools.</p>
                        </div>
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                          <p className="font-semibold text-white">Data & Runtime</p>
                          <p>✅ Added live API connector feed/status in Settings (APIs tab), including connected/disconnected indicators and manual recheck.</p>
                          <p>✅ Updated local backend runtime baseline to port 5001 with improved DB bootstrap reliability.</p>
                        </div>
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                          <p className="font-semibold text-white">Security Hardening</p>
                          <p>✅ Added server hardening with Helmet headers, API rate limiting, and CORS allowlist controls.</p>
                          <p>✅ Added optional token-based API protection and role-guarded admin metrics route.</p>
                        </div>
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                          <p className="font-semibold text-white">Observability & Operations</p>
                          <p>✅ Added structured JSON logging for startup, requests, and failures with request ID tracing.</p>
                          <p>✅ Added health/readiness coverage with versioned /health and DB-aware /ready endpoints.</p>
                          <p>✅ Added process-level handling for unhandled rejections and uncaught exceptions.</p>
                          <p>✅ Added a new Basic Health Metrics card in Settings (APIs tab) with endpoint status, latency, uptime, memory, DB state, and last-checked time.</p>
                        </div>
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                          <p className="font-semibold text-white">Developer Experience</p>
                          <p>✅ Updated lint pipeline to cover app and server code with TypeScript-aware rules.</p>
                          <p>✅ Fixed CSS import ordering to reduce PostCSS dev/build warnings.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
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

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
          <Card className="bg-zinc-950 border-zinc-800 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Settings className="size-4 text-zinc-200" />
                  Settings
                </h2>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-1 rounded hover:bg-zinc-800 transition-colors"
                >
                  <X className="size-4 text-zinc-400" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              <Tabs defaultValue="apis" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-zinc-900/70 border border-zinc-800 h-auto">
                  <TabsTrigger value="apis" className="text-xs py-2">APIs</TabsTrigger>
                  <TabsTrigger value="general" className="text-xs py-2">General</TabsTrigger>
                  <TabsTrigger value="timezone" className="text-xs py-2">Time Zone</TabsTrigger>
                </TabsList>

                <TabsContent value="apis" className="mt-3 space-y-3 text-xs text-zinc-300">
                  {/* World Bank disconnect / reconnect */}
                  <div className="flex items-center justify-between gap-3 bg-zinc-900/80 border border-zinc-800 rounded p-3">
                    <div className="flex items-center gap-2">
                      {wbApiConnected
                        ? <PlugZap className="size-4 text-blue-400 flex-shrink-0" />
                        : <Unplug className="size-4 text-zinc-500 flex-shrink-0" />
                      }
                      <div>
                        <p className="text-[11px] text-white font-medium">
                          World Bank API — {wbApiConnected === null ? "Checking…" : wbApiConnected ? `Connected · ${Object.keys(wbRiskOverrides).length} countries` : "Disconnected"}
                        </p>
                        <p className="text-[10px] text-zinc-500">Risk scores use live WGI governance data when connected</p>
                      </div>
                    </div>
                    {wbApiConnected
                      ? <button
                          onClick={() => { setWbApiConnected(false); setWbRiskOverrides({}); }}
                          className="flex-shrink-0 px-2.5 py-1.5 bg-red-900/30 hover:bg-red-900/50 border border-red-700/40 rounded text-red-300 text-[10px] font-medium transition-colors"
                        >
                          Disconnect
                        </button>
                      : <button
                          onClick={fetchWBGovernanceData}
                          disabled={wbApiConnected === null}
                          className="flex-shrink-0 px-2.5 py-1.5 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-700/40 rounded text-blue-300 text-[10px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {wbApiConnected === null ? "Connecting…" : "Reconnect"}
                        </button>
                    }
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                    <h3 className="font-semibold text-white">Current Connected APIs</h3>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] text-white font-medium">Backend Health API</p>
                        <p className="text-[11px] text-zinc-400">{API_BASE_URL}/api/health</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${liveDataConnected ? "bg-emerald-900/30 text-emerald-300 border-emerald-700/40" : "bg-red-900/30 text-red-300 border-red-700/40"}`}>
                        <span className={`size-1.5 rounded-full ${liveDataConnected ? "bg-emerald-400" : "bg-red-400"}`} />
                        {liveDataConnected ? "Connected" : "Disconnected"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] text-white font-medium">News API (via backend)</p>
                        <p className="text-[11px] text-zinc-400">{API_BASE_URL}/api/news</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${liveDataConnected ? "bg-emerald-900/30 text-emerald-300 border-emerald-700/40" : "bg-red-900/30 text-red-300 border-red-700/40"}`}>
                        <span className={`size-1.5 rounded-full ${liveDataConnected ? "bg-emerald-400" : "bg-red-400"}`} />
                        {liveDataConnected ? "Connected" : "Disconnected"}
                      </span>
                    </div>
                    <button
                      onClick={checkLiveDataStatus}
                      className="mt-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-white text-[11px] font-medium transition-colors"
                    >
                      Recheck API Status
                    </button>
                  </div>

                  {/* World Bank External Data */}
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] text-white font-medium flex items-center gap-1.5">
                          {wbApiConnected
                            ? <PlugZap className="size-3 text-blue-400" />
                            : <Unplug className="size-3 text-zinc-500" />
                          }
                          World Bank Governance API
                        </p>
                        <p className="text-[11px] text-zinc-400">api.worldbank.org · WGI indicators · Free, no auth</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          Enriches Political, Economic, Conflict, Corruption &amp; Terrorism scores with live governance data.
                          {wbApiConnected && ` ${Object.keys(wbRiskOverrides).length} countries loaded.`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${
                          wbApiConnected === null
                            ? "bg-zinc-900/60 text-zinc-500 border-zinc-700"
                            : wbApiConnected
                            ? "bg-blue-900/30 text-blue-300 border-blue-700/40"
                            : "bg-red-900/30 text-red-300 border-red-700/40"
                        }`}>
                          <span className={`size-1.5 rounded-full ${
                            wbApiConnected === null ? "bg-zinc-500 animate-pulse" : wbApiConnected ? "bg-blue-400" : "bg-red-400"
                          }`} />
                          {wbApiConnected === null ? "Checking…" : wbApiConnected ? "Connected" : "Unavailable"}
                        </span>
                        <button
                          onClick={fetchWBGovernanceData}
                          className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-white text-[10px] font-medium transition-colors"
                        >
                          Refresh
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-white flex items-center gap-1.5">
                        <Activity className="size-3.5 text-emerald-300" />
                        Basic Health Metrics
                      </h3>
                      <button
                        onClick={checkBasicHealthMetrics}
                        className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-white text-[10px] font-medium transition-colors"
                      >
                        {healthMetrics.loading ? "Checking..." : "Refresh"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="bg-zinc-950/70 border border-zinc-800 rounded p-2">
                        <p className="text-zinc-400">/health</p>
                        <p className={`font-semibold ${healthMetrics.health.ok ? "text-emerald-300" : "text-red-300"}`}>
                          {healthMetrics.health.status}
                        </p>
                        <p className="text-zinc-500">{healthMetrics.health.latencyMs ?? "-"} ms</p>
                      </div>
                      <div className="bg-zinc-950/70 border border-zinc-800 rounded p-2">
                        <p className="text-zinc-400">/ready</p>
                        <p className={`font-semibold ${healthMetrics.ready.ok ? "text-emerald-300" : "text-amber-300"}`}>
                          {healthMetrics.ready.status}
                        </p>
                        <p className="text-zinc-500">{healthMetrics.ready.latencyMs ?? "-"} ms</p>
                      </div>
                      <div className="bg-zinc-950/70 border border-zinc-800 rounded p-2">
                        <p className="text-zinc-400">DB Connection</p>
                        <p className={`font-semibold ${healthMetrics.metrics.databaseConnected ? "text-emerald-300" : "text-amber-300"}`}>
                          {healthMetrics.metrics.databaseConnected === null
                            ? "Unknown"
                            : healthMetrics.metrics.databaseConnected
                            ? "Connected"
                            : "Disconnected"}
                        </p>
                        <p className="text-zinc-500">Admin metrics</p>
                      </div>
                    </div>

                    <div className="bg-zinc-950/70 border border-zinc-800 rounded p-2 text-[11px] space-y-1">
                      <p><span className="text-zinc-400">Service Uptime:</span> {formatUptime(healthMetrics.metrics.uptimeSeconds)}</p>
                      <p><span className="text-zinc-400">Heap Used:</span> {healthMetrics.metrics.heapUsedMb === null ? "N/A" : `${healthMetrics.metrics.heapUsedMb} MB`}</p>
                      <p><span className="text-zinc-400">Request Volume:</span> {healthMetrics.observability.totalRequests ?? "N/A"}</p>
                      <p><span className="text-zinc-400">Error Rate:</span> {healthMetrics.observability.errorRatePct === null ? "N/A" : `${healthMetrics.observability.errorRatePct}%`}</p>
                      <p><span className="text-zinc-400">P95 Latency:</span> {healthMetrics.observability.p95LatencyMs === null ? "N/A" : `${healthMetrics.observability.p95LatencyMs} ms`}</p>
                      <p><span className="text-zinc-400">Active Server Alerts:</span> {healthMetrics.observability.activeAlerts}</p>
                      <p><span className="text-zinc-400">Last Checked:</span> {healthMetrics.lastChecked}</p>
                      <p className="text-zinc-500">This panel includes basic health checks plus lightweight observability trend indicators.</p>
                      {(healthMetrics.health.error || healthMetrics.ready.error || healthMetrics.metrics.error || healthMetrics.observability.error) && (
                        <p className="text-amber-300">
                          Note: {healthMetrics.health.error || healthMetrics.ready.error || healthMetrics.metrics.error || healthMetrics.observability.error}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                    <h3 className="font-semibold text-white">Connect Your Own APIs</h3>
                    <ul className="space-y-1 text-[11px] list-disc list-inside">
                      <li>Update server connection details in server/.env (DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD, SERVER_PORT).</li>
                      <li>Add or edit backend endpoints in server/routes/*.js for your external data providers.</li>
                      <li>Point frontend fetch calls to your API base URL and endpoint routes.</li>
                      <li>Restart backend after changes and use "Recheck API Status" to confirm connectivity.</li>
                    </ul>
                  </div>
                </TabsContent>

                <TabsContent value="general" className="mt-3 space-y-3 text-xs text-zinc-300">
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-1">
                    <h3 className="font-semibold text-white mb-1">App Information</h3>
                    <p className="text-[11px]"><span className="text-zinc-400">Version:</span> 1.4</p>
                    <p className="text-[11px]"><span className="text-zinc-400">Build:</span> 1.3</p>
                    <p className="text-[11px]"><span className="text-zinc-400">Live Data Mode:</span> {liveDataConnected ? "Connected" : "Offline / Fallback"}</p>
                    <p className="text-[11px]"><span className="text-zinc-400">World Bank Data:</span> {wbApiConnected === null ? "Checking…" : wbApiConnected ? `Connected · ${Object.keys(wbRiskOverrides).length} countries` : "Unavailable"}</p>
                    <p className="text-[11px]"><span className="text-zinc-400">Loaded Datasets:</span> {datasets.length}</p>
                    <p className="text-[11px]"><span className="text-zinc-400">Selected Dataset:</span> {datasets.find((d) => d.id === selectedDatasetId)?.name || "Loading..."}</p>
                  </div>
                </TabsContent>

                <TabsContent value="timezone" className="mt-3 space-y-3 text-xs text-zinc-300">
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
                    <h3 className="font-semibold text-white">Time Zone Selector</h3>
                    <p className="text-[11px] text-zinc-400">Choose a time zone for status timestamps shown in settings.</p>
                    <select
                      value={selectedTimeZone}
                      onChange={(e) => setSelectedTimeZone(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-[11px] text-zinc-100"
                    >
                      {availableTimeZones.map((zone) => (
                        <option key={zone} value={zone}>{zone}</option>
                      ))}
                    </select>
                    <p className="text-[11px]">
                      <span className="text-zinc-400">Current time in selected zone:</span>{" "}
                      {new Date().toLocaleString(undefined, {
                        timeZone: selectedTimeZone,
                        dateStyle: "full",
                        timeStyle: "long",
                      })}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="p-4 border-t border-zinc-800 flex-shrink-0">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-white text-xs font-medium transition-colors"
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
                  <span className="font-semibold text-white">Last Updated:</span> {updateStatus.lastUpdated === 'Never' ? 'App startup' : updateStatus.lastUpdated}
                </p>
                <p className="text-xs text-zinc-400">
                  <span className="font-semibold text-white">Next Update:</span> {getTimeUntilNextUpdate()}
                </p>
                {refreshNeedsAttention && (
                  <p className="text-xs text-amber-300 bg-amber-900/20 border border-amber-800/40 rounded px-2 py-1.5 mt-2">
                    Refresh required: last update is older than 24 hours.
                  </p>
                )}
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
                  setUpdateStatusTick((prev) => prev + 1);
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
      <header className="sticky top-0 z-40 bg-zinc-950 border-b border-zinc-900 px-3 md:px-4 py-3 md:py-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 md:gap-3">
            <Shield className="size-4 md:size-5 text-zinc-600 flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                <h1 className="text-xs md:text-sm font-semibold text-white">
                  Geopolitical Risk Dashboard
                </h1>
                {/* Live data plug icon */}
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] md:text-[10px] font-medium transition-colors ${
                    liveDataConnected
                      ? "bg-emerald-900/30 text-emerald-300 border-emerald-700/40 hover:bg-emerald-900/50"
                      : "bg-zinc-900/60 text-zinc-500 border-zinc-700/40 hover:bg-zinc-800/60"
                  }`}
                  title={
                    liveDataConnected
                      ? `Backend connected${wbApiConnected ? " · World Bank data loaded" : wbApiConnected === null ? " · Loading WB data…" : " · World Bank unavailable"} — click for settings`
                      : "Backend offline — click to open settings"
                  }
                >
                  {liveDataConnected
                    ? <PlugZap className="size-3" />
                    : <Unplug className="size-3" />
                  }
                  {liveDataConnected ? "Live" : "Offline"}
                  {wbApiConnected && (
                    <span className="size-1.5 rounded-full bg-blue-400" title="World Bank data active" />
                  )}
                </button>
              </div>
              <p className="text-[9px] md:text-[10px] text-zinc-600">
                {datasets.find((d) => d.id === selectedDatasetId)?.description || "Loading..."}
              </p>
            </div>
          </div>
          <div className="flex items-end gap-2 w-full md:w-auto justify-end">
            <div className="flex items-center gap-1.5">
              {/* Security search / Portfolio dataset — mutually exclusive map views */}
              <div className="flex items-center gap-1.5">
                <SecuritySearch
                  assets={allSearchableAssets}
                  assetRiskScores={allAssetRiskScores}
                  assetDatasetLabels={assetDatasetLabels}
                  activeDatasetName={datasets.find((d) => d.id === selectedDatasetId)?.name}
                  selectedAsset={focusedSecurity}
                  onSelect={setFocusedSecurity}
                  dimmed={focusedSecurity === null ? false : false}
                />
                <span className="text-[10px] text-zinc-600 font-medium select-none px-0.5">or</span>
                <div className={`transition-opacity ${focusedSecurity ? "opacity-40 pointer-events-none" : ""}`}>
                  {!isLoading && datasets.length > 0 && (
                    <div className="flex items-center gap-1">
                      <DatasetSelector
                        datasets={datasets}
                        selectedDataset={selectedDatasetId}
                        onDatasetChange={(id) => {
                          setFocusedSecurity(null);
                          setSelectedDatasetId(id);
                        }}
                      />
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowWatchlistPopover((p) => !p)}
                          className={`h-9 w-9 flex items-center justify-center rounded border transition-colors ${
                            showWatchlistPopover
                              ? 'bg-zinc-700 border-zinc-600 text-zinc-100'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                          }`}
                          title="View watchlist stocks"
                          aria-label="View all stocks in current watchlist"
                        >
                          <LayoutList className="size-4" />
                        </button>
                        {showWatchlistPopover && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowWatchlistPopover(false)} />
                            <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-zinc-900 border border-zinc-800 rounded shadow-xl">
                              <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
                                <p className="text-xs font-medium text-zinc-200">
                                  {datasets.find((d) => d.id === selectedDatasetId)?.name ?? 'Watchlist'}
                                </p>
                                <span className="text-[10px] text-zinc-500">{portfolio.length} stocks</span>
                              </div>
                              <div className="max-h-64 overflow-y-auto p-2">
                                {portfolio.length === 0 ? (
                                  <p className="text-xs text-zinc-500 text-center py-4">No stocks in this watchlist.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {portfolio.map((asset) => (
                                      <button
                                        key={asset.ticker}
                                        type="button"
                                        onClick={() => {
                                          setFocusedSecurity(asset);
                                          setShowWatchlistPopover(false);
                                        }}
                                        title={`${asset.name} · ${asset.weight}%`}
                                        className="px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 font-mono hover:bg-zinc-700 hover:text-white transition-colors"
                                      >
                                        {asset.ticker}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNewsFeedPanel((prev) => !prev);
                    setShowAlertsWindow(false);
                  }}
                  className={`relative h-9 w-9 flex items-center justify-center rounded-lg transition-colors ${
                    showNewsFeedPanel
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                  title="News Feed"
                  aria-label="Open news feed"
                >
                  <Newspaper className="size-5" />
                  {newsAlertCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 font-semibold text-center border border-zinc-950">
                      {newsAlertCount > 99 ? "99+" : newsAlertCount}
                    </span>
                  )}
                </button>

                {showNewsFeedPanel && (
                  <Card className="absolute right-0 top-full mt-2 w-[340px] max-w-[85vw] bg-zinc-950 border-zinc-800 shadow-xl z-50">
                    <div className="p-2.5 border-b border-zinc-800 flex items-center justify-between">
                      <div>
                        <h2 className="text-xs font-semibold text-white flex items-center gap-2">
                          <Newspaper className="size-3.5 text-blue-400" />
                          News Feed
                        </h2>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {new Date().toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setNewsRefreshToken((prev) => prev + 1)}
                          className="p-1 rounded hover:bg-zinc-800 transition-colors"
                          title="Refresh news feed"
                        >
                          <RefreshCw className="size-3.5 text-zinc-400" />
                        </button>
                        <button
                          onClick={() => setShowNewsFeedPanel(false)}
                          className="p-1 rounded hover:bg-zinc-800 transition-colors"
                          title="Close news feed"
                        >
                          <X className="size-3.5 text-zinc-400" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[320px] overflow-hidden p-2">
                      <Suspense fallback={tabLoadingFallback}>
                        <NewsFeedPanel
                          countryRisks={Object.keys(baseRiskData).reduce((acc, country) => {
                            acc[country] = riskData[country] || 50;
                            return acc;
                          }, {} as { [country: string]: number })}
                          portfolioCountries={portfolioAnalysis.countryExposures.map((exp) => exp.country)}
                          compact={true}
                          refreshToken={newsRefreshToken}
                        />
                      </Suspense>
                    </div>
                  </Card>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => {
                    setShowAlertsWindow((prev) => !prev);
                    setShowNewsFeedPanel(false);
                  }}
                  className={`relative h-9 w-9 flex items-center justify-center rounded-lg transition-colors ${
                    showAlertsWindow
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                  title="Alerts & Updates"
                  aria-label="Open alerts and updates"
                >
                  <AlertTriangle className="size-5" />
                  {alertCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 font-semibold text-center border border-zinc-950">
                      {alertCount > 99 ? "99+" : alertCount}
                    </span>
                  )}
                </button>

                {showAlertsWindow && (
                  <Card className="absolute right-0 top-full mt-2 w-[380px] max-w-[90vw] bg-zinc-950 border-zinc-800 shadow-xl z-50">
                    <div className="p-2.5 border-b border-zinc-800 flex items-center justify-between">
                      <div>
                        <h2 className="text-xs font-semibold text-white flex items-center gap-2">
                          <AlertTriangle className="size-3.5 text-orange-400" />
                          Alerts & Updates
                        </h2>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {new Date().toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setAlertsRefreshToken((prev) => prev + 1)}
                          className="p-1 rounded hover:bg-zinc-800 transition-colors"
                          title="Refresh alerts"
                        >
                          <RefreshCw className="size-3.5 text-zinc-400" />
                        </button>
                        <button
                          onClick={() => setShowAlertsWindow(false)}
                          className="p-1 rounded hover:bg-zinc-800 transition-colors"
                          title="Close alerts"
                        >
                          <X className="size-3.5 text-zinc-400" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[360px] overflow-y-auto p-2">
                      <Suspense fallback={tabLoadingFallback}>
                        <AlertsAndNotifications
                          key={alertsRefreshToken}
                          activeAlertCount={alertCount}
                          activeRiskAlerts={activeRiskAlerts}
                          weights={weights}
                        />
                      </Suspense>
                    </div>
                  </Card>
                )}
              </div>
              <button
                onClick={() => setShowUpdateStatus(!showUpdateStatus)}
                className={`relative h-9 w-9 flex items-center justify-center rounded-lg transition-colors ${
                  refreshNeedsAttention
                    ? "text-amber-400 hover:bg-zinc-800 hover:text-amber-300"
                    : refreshIsCurrent
                    ? "text-emerald-400 hover:bg-zinc-800 hover:text-emerald-300"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
                title={refreshNeedsAttention ? "Refresh needed (older than 24h)" : "Daily update status"}
                  aria-label="Open daily update status"
              >
                <RefreshCw className="size-5" />
                {refreshIsCurrent && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] leading-4 font-semibold text-center border border-zinc-950 flex items-center justify-center">
                    <Check className="size-2.5" />
                  </span>
                )}
                {refreshNeedsAttention && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-zinc-900 text-[10px] leading-4 font-semibold text-center border border-zinc-950 flex items-center justify-center">
                    <AlertTriangle className="size-2.5" />
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowMethodologyModal(true)}
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200"
                title="Risk score methodology"
                aria-label="Open risk score methodology"
              >
                <BookOpen className="size-5" />
              </button>
              <button
                onClick={() => setShowHelpModal(true)}
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200"
                title="Help · Build 1.3"
                aria-label="Open help (Build 1.3)"
              >
                <HelpCircle className="size-5" />
              </button>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200"
                title="Settings"
                aria-label="Open settings"
              >
                <Settings className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full md:w-auto">
            <TabsList className="grid w-full max-w-3xl grid-cols-5 bg-zinc-900 border border-zinc-800">
              <TabsTrigger value="dashboard" className="text-xs md:text-sm">
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="summary" className="text-xs md:text-sm">
                Summary
              </TabsTrigger>
              <TabsTrigger value="advanced-metrics" className="text-xs md:text-sm">
                Metrics
              </TabsTrigger>
              <TabsTrigger value="scenarios" className="text-xs md:text-sm">
                Scenarios
              </TabsTrigger>
              <TabsTrigger value="tools" className="text-xs md:text-sm">
                Tools
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <button
            onClick={() => setCurrentTab("exports")}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors flex items-center justify-center gap-2 shrink-0"
            title="Open export reports"
          >
            <Download className="size-4" />
            Export
          </button>
        </div>

      </header>

      <div className="flex flex-col lg:flex-row">
        {/* Left Sidebar - Always visible */}
        <aside className="w-full lg:w-56 lg:basis-56 lg:flex-none bg-zinc-950 border-b lg:border-b-0 lg:border-r border-zinc-900 p-3 flex flex-col">
          {/* Portfolio Stats - Order 1 on mobile */}
          <div className="order-1 lg:order-none">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-1 gap-2 mb-4 lg:mb-0">
              <Card className="p-1.5 bg-zinc-900/60 border-zinc-800">
                <p className="text-[10px] text-zinc-500 leading-none">Portfolio Value</p>
                <p className="text-sm font-bold text-white leading-tight">
                  {homePortfolioValueDisplay}
                </p>
              </Card>
              <Card className="p-1.5 bg-zinc-900/60 border-zinc-800">
                <p className="text-[10px] text-zinc-500 leading-none">Assets</p>
                <p className="text-sm font-bold text-white leading-tight">{portfolio.length}</p>
              </Card>
              <Card className="p-1.5 bg-zinc-900/60 border-zinc-800">
                <div className="flex items-center gap-1 leading-none">
                  <p className="text-[10px] text-zinc-500">Avg Global Risk</p>
                  <RiskScoreInfo
                    meaning="Average risk level across all countries in the loaded global risk model."
                    calculation="Calculated as the mean of the current country risk scores used by the dashboard."
                  />
                </div>
                <p className="text-sm font-bold text-white leading-tight">{averageRisk}</p>
              </Card>
              <Card className="p-1.5 bg-zinc-900/60 border-zinc-800">
                <p className="text-[10px] text-zinc-500 leading-none">Risk Alerts</p>
                <p className="text-sm font-bold text-amber-400 leading-tight">{alertCount}</p>
              </Card>
            </div>
          </div>

          {/* Risk Factor Weights - Order 3 on mobile */}
          <div className="order-3 lg:order-none lg:pt-6">
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-1">
                  <h3 className="text-xs text-zinc-400 uppercase tracking-wide">
                    Risk Factor Weights
                  </h3>
                  <RiskScoreInfo
                    meaning="Controls how much each geopolitical risk dimension contributes to the overall country and portfolio risk scores."
                    calculation="Weights must sum to 100%. Each factor (Political, Economic, Conflict, Corruption, Terrorism) scales its raw country score proportionally before aggregation into the final risk index."
                  />
                </div>
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
                📊 {getSnapshotDescription(updateStatus.lastUpdated)}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2 md:gap-3">
                <RiskSlider
                  label="Political"
                  value={weights.political}
                  onChange={(value) => updateWeight("political", value)}
                  icon={<AlertTriangle className="size-3" />}
                  description="Government stability, policy shifts, sanctions, and geopolitical relations affecting markets."
                />
                <RiskSlider
                  label="Economic"
                  value={weights.economic}
                  onChange={(value) => updateWeight("economic", value)}
                  icon={<TrendingDown className="size-3" />}
                  description="Inflation, growth, debt, currency pressure, and macroeconomic stress across key regions."
                />
                <RiskSlider
                  label="Conflict"
                  value={weights.conflict}
                  onChange={(value) => updateWeight("conflict", value)}
                  icon={<Swords className="size-3" />}
                  description="War, military escalation, and regional instability that can disrupt supply chains and operations."
                />
                <RiskSlider
                  label="Corruption"
                  value={weights.corruption}
                  onChange={(value) => updateWeight("corruption", value)}
                  icon={<Scale className="size-3" />}
                  description="Institutional weakness, bribery risk, and governance quality affecting business reliability."
                />
                <RiskSlider
                  label="Terrorism"
                  value={weights.terrorism}
                  onChange={(value) => updateWeight("terrorism", value)}
                  icon={<Bomb className="size-3" />}
                  description="Terror-related disruption risk to infrastructure, logistics, and overall market confidence."
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
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <h2 className="text-xs text-zinc-400 uppercase tracking-wide font-medium">
                      Global Risk Heat Map
                    </h2>
                    <RiskScoreInfo
                      meaning="A choropleth map colouring each country by its current geopolitical risk score."
                      calculation="Country risk scores are derived from political stability, economic fragility, active conflicts, corruption, and terrorism indices, blended using the current weight settings."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded border border-zinc-800 overflow-hidden">
                      {[
                        { key: "daily", label: "Daily" },
                        { key: "7d", label: "7D" },
                        { key: "30d", label: "30D" },
                        { key: "90d", label: "90D" },
                      ].map((option) => (
                        <button
                          key={`mobile-${option.key}`}
                          type="button"
                          onClick={() => setSelectedRiskHorizon(option.key as RiskHorizon)}
                          className={`px-2 py-1 text-[10px] border-r last:border-r-0 border-zinc-800 transition-colors ${
                            selectedRiskHorizon === option.key
                              ? "bg-zinc-700 text-white"
                              : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadMapSnapshot("global-risk-map-mobile")}
                      className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                      title="Download map snapshot"
                      aria-label="Download mobile map snapshot"
                    >
                      <Download className="size-3.5" />
                    </button>
                  </div>
                </div>
                <div id="global-risk-map-mobile">
                  {focusedSecurity && (
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-950/40 border-b border-blue-900/50">
                      <Search className="size-3 text-blue-400 flex-shrink-0" />
                      <p className="text-[10px] text-blue-200">
                        Showing <span className="font-semibold">{focusedSecurity.ticker}</span> · {focusedSecurity.name} country exposure
                      </p>
                      <button type="button" onClick={() => setFocusedSecurity(null)} className="ml-auto text-blue-400 hover:text-blue-100 text-[10px] underline">Clear</button>
                    </div>
                  )}
                  <WorldMap
                    riskData={dashboardRiskData}
                    countryExposures={activeCountryExposures}
                    dataFreshnessLabel={corePanelFreshnessLabel}
                    isStaleData={refreshNeedsAttention}
                    weights={weights}
                    onCountryClick={(country, riskScore, riskContribution, contributingAssets) =>
                      handleAlertClick({ country, riskScore, riskContribution, contributingAssets })
                    }
                  />
                </div>
              </Card>
            </div>

            {/* Map and Portfolio Risk Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
              {/* Left Column - Map and Country Exposures */}
              <div className="lg:col-span-4 space-y-3">
                {/* Country Exposures - Above Map */}
                <Card className="p-2 bg-zinc-950 border-zinc-900">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1">
                      <h3 className="text-xs text-zinc-400 uppercase tracking-wide font-medium">
                        {focusedSecurity
                          ? `${focusedSecurity.ticker} · Country Exposure`
                          : "Country Risk Vs Portfolio Contribution"}
                      </h3>
                      <RiskScoreInfo
                        meaning="Shows how each country contributes to the overall portfolio geopolitical risk."
                        calculation="Each country's risk score is weighted by the combined allocation of holdings with dependencies on that country, then normalised to a 0–100 contribution scale."
                      />
                    </div>
                    {focusedSecurity && (
                      <button
                        type="button"
                        onClick={() => setFocusedSecurity(null)}
                        className="text-[10px] text-blue-400 hover:text-blue-200 underline"
                      >
                        ← Back to portfolio
                      </button>
                    )}
                    {!focusedSecurity && (
                      <div className="flex items-center gap-1">
                        {(['risk', 'stocks'] as const).map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setCountriesSort((prev) =>
                                prev.by === key
                                  ? { by: key, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
                                  : { by: key, dir: 'desc' }
                              );
                              setCountriesPage(0);
                            }}
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                              countriesSort.by === key
                                ? 'bg-zinc-700 border-zinc-600 text-zinc-200'
                                : 'bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                            }`}
                          >
                            {key === 'risk' ? 'Risk' : 'Stocks'}
                            {countriesSort.by === key && (
                              <span>{countriesSort.dir === 'desc' ? ' ↓' : ' ↑'}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {activeCountryExposures.length === 0 ? (
                    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-center" role="status" aria-live="polite">
                      <p className="text-sm text-zinc-300">No country exposures available for this selection.</p>
                      <p className="text-xs text-zinc-500 mt-1">Try changing dataset or clearing dashboard filters.</p>
                    </div>
                  ) : (
                  <div className="flex flex-col gap-1.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
                    {[...activeCountryExposures]
                    .sort((a, b) => {
                      const riskA = dashboardRiskData[a.country] || 50;
                      const riskB = dashboardRiskData[b.country] || 50;
                      const val = countriesSort.by === 'risk'
                        ? riskB - riskA
                        : b.contributingAssets.length - a.contributingAssets.length;
                      return countriesSort.dir === 'desc' ? val : -val;
                    })
                    .slice(countriesPage * COUNTRIES_PAGE_SIZE, (countriesPage + 1) * COUNTRIES_PAGE_SIZE)
                    .map((exposure) => {
                      const risk = dashboardRiskData[exposure.country] || 50;
                      const riskClasses = getCountryExposureRiskClasses(risk);
                      return (
                        <div
                          key={exposure.country}
                          className={`p-1.5 border ${riskClasses.card} cursor-pointer hover:border-zinc-600 transition-colors`}
                          onClick={() => handleAlertClick({ country: exposure.country, riskScore: risk, riskContribution: exposure.riskContribution, contributingAssets: exposure.contributingAssets })}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleAlertClick({ country: exposure.country, riskScore: risk, riskContribution: exposure.riskContribution, contributingAssets: exposure.contributingAssets }); }}
                          aria-label={`View details for ${exposure.country}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="mb-0.5 flex items-center gap-1.5 flex-wrap">
                                <p className={`text-xs ${riskClasses.countryName}`}>
                                  {exposure.country}
                                </p>
                                {risk >= CRITICAL_RISK_SCORE_THRESHOLD && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] border bg-red-900/40 border-red-800 text-red-200 leading-none">
                                    CRITICAL
                                  </span>
                                )}
                                {risk >= HIGH_RISK_SCORE_THRESHOLD && risk < CRITICAL_RISK_SCORE_THRESHOLD && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] border bg-orange-900/40 border-orange-800 text-orange-200 leading-none">
                                    HIGH
                                  </span>
                                )}
                                {risk > MIN_ALERT_RISK_SCORE && risk < HIGH_RISK_SCORE_THRESHOLD && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] border bg-yellow-900/40 border-yellow-800 text-yellow-200 leading-none">
                                    MEDIUM
                                  </span>
                                )}
                                {risk <= MIN_ALERT_RISK_SCORE && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] border bg-emerald-900/40 border-emerald-800 text-emerald-200 leading-none">
                                    LOW
                                  </span>
                                )}
                              </div>
                              <p className={`text-[10px] ${riskClasses.contributingAssets}`}>
                                {exposure.contributingAssets.join(", ")}
                              </p>
                            </div>
                            <div className="text-right ml-2">
                              <p className={`text-[10px] ${riskClasses.riskScore}`}>
                                Country Risk
                              </p>
                              <p className={`text-xs ${riskClasses.riskScore}`}>
                                {risk.toFixed(0)}
                              </p>
                              <p className={`text-[10px] ${riskClasses.impactWeight}`}>
                                Contribution: {exposure.riskContribution.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {activeCountryExposures.length > COUNTRIES_PAGE_SIZE && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setCountriesPage((p) => Math.max(0, p - 1))}
                        disabled={countriesPage === 0}
                        className="px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800/60 transition-colors rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ← Prev
                      </button>
                      <span className="text-[10px] text-zinc-500">
                        {countriesPage + 1} / {Math.ceil(activeCountryExposures.length / COUNTRIES_PAGE_SIZE)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCountriesPage((p) => Math.min(Math.ceil(activeCountryExposures.length / COUNTRIES_PAGE_SIZE) - 1, p + 1))}
                        disabled={(countriesPage + 1) * COUNTRIES_PAGE_SIZE >= activeCountryExposures.length}
                        className="px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800/60 transition-colors rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                  </div>
                  )}
                </Card>

                {/* DESKTOP ONLY - Large Map */}
                <Card className="p-3 bg-zinc-950 border-zinc-900 hidden lg:block">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <h2 className="text-xs text-zinc-400 uppercase tracking-wide font-medium">
                        Global Risk Heat Map
                      </h2>
                      <RiskScoreInfo
                        meaning="A choropleth map colouring each country by its current geopolitical risk score."
                        calculation="Country risk scores are derived from political stability, economic fragility, active conflicts, corruption, and terrorism indices, blended using the current weight settings."
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex rounded border border-zinc-800 overflow-hidden">
                        {[
                          { key: "daily", label: "Daily" },
                          { key: "7d", label: "7D" },
                          { key: "30d", label: "30D" },
                          { key: "90d", label: "90D" },
                        ].map((option) => (
                          <button
                            key={`desktop-${option.key}`}
                            type="button"
                            onClick={() => setSelectedRiskHorizon(option.key as RiskHorizon)}
                            className={`px-2 py-1 text-[10px] border-r last:border-r-0 border-zinc-800 transition-colors ${
                              selectedRiskHorizon === option.key
                                ? "bg-zinc-700 text-white"
                                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadMapSnapshot("global-risk-map-desktop")}
                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                        title="Download map snapshot"
                        aria-label="Download desktop map snapshot"
                      >
                        <Download className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <div id="global-risk-map-desktop">
                    {focusedSecurity && (
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-950/40 border-b border-blue-900/50">
                        <Search className="size-3 text-blue-400 flex-shrink-0" />
                        <p className="text-[10px] text-blue-200">
                          Showing <span className="font-semibold">{focusedSecurity.ticker}</span> · {focusedSecurity.name} country exposure
                        </p>
                        <button type="button" onClick={() => setFocusedSecurity(null)} className="ml-auto text-blue-400 hover:text-blue-100 text-[10px] underline">Clear</button>
                      </div>
                    )}
                    <WorldMap
                      riskData={dashboardRiskData}
                      countryExposures={activeCountryExposures}
                      dataFreshnessLabel={corePanelFreshnessLabel}
                      isStaleData={refreshNeedsAttention}
                      weights={weights}
                      onCountryClick={(country, riskScore, riskContribution, contributingAssets) =>
                        handleAlertClick({ country, riskScore, riskContribution, contributingAssets })
                      }
                    />
                  </div>
                </Card>
              </div>

              {/* Total Portfolio Risk Score - Vertical Layout - Right Column */}
              <Card className="p-3 bg-zinc-950 border-zinc-900 lg:col-span-1 h-full">
                <div className="flex h-full flex-col gap-4">
                  {/* Gauge */}
                  <div>
                    <div className="mb-2 flex items-center justify-center gap-1">
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wide font-medium">
                        Total Portfolio Risk
                      </p>
                      <RiskScoreInfo
                        meaning="Overall geopolitical risk score for the portfolio shown on a 0-100 gauge."
                        calculation="Computed from country-risk dependencies per asset, weighted by allocation, and aggregated into a normalized portfolio score."
                      />
                    </div>
                    <RiskGaugeCompact value={dashboardPortfolioAnalysis.totalRiskScore} />
                    <p className="text-[10px] text-zinc-600 text-center mt-1 uppercase">
                      {(() => {
                        const score = dashboardPortfolioAnalysis.totalRiskScore;
                        if (score >= CRITICAL_RISK_SCORE_THRESHOLD) return "CRITICAL";
                        if (score >= HIGH_RISK_SCORE_THRESHOLD) return "HIGH";
                        if (score >= 26) return "MEDIUM";
                        return "LOW";
                      })()}
                    </p>
                    <div className="mt-2">
                      <RiskLegend compact={true} showTitle={false} />
                    </div>
                  </div>

                  {/* Active Risk Alerts */}
                  <div className="pt-3 border-t border-zinc-900 flex-1 min-h-0 flex flex-col">
                    <div className="flex items-center gap-2 text-amber-400 mb-2">
                      <AlertTriangle className="size-3" />
                      <p className="text-[10px] uppercase tracking-wide">
                        {alertCount} Risk {alertCount === 1 ? "Alert" : "Alerts"}
                      </p>
                    </div>
                    <p className="text-[10px] text-zinc-500 mb-2">
                      Logic: alerts include portfolio-exposed countries with country risk score &gt; {MIN_ALERT_RISK_SCORE}. High risk is {HIGH_RISK_SCORE_THRESHOLD}-74. Critical starts at {CRITICAL_RISK_SCORE_THRESHOLD}+.
                    </p>

                    {alertCount === 0 ? (
                      <p className="text-[10px] text-zinc-500">No active risk alerts.</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className="space-y-1">
                          {activeRiskAlerts.slice(alertsPage * ALERTS_PAGE_SIZE, (alertsPage + 1) * ALERTS_PAGE_SIZE).map((alert, index) => (
                          <button
                            type="button"
                            key={`${alert.country}-${(alert as {exposureType?: string}).exposureType ?? index}-${index}`}
                            onClick={() => handleAlertClick(alert as RiskAlertDetail)}
                            className="w-full text-left flex items-start justify-between gap-2 bg-zinc-900/70 border border-zinc-800 px-2 py-1.5 hover:bg-zinc-800/70 hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-cyan-600/60 cursor-pointer transition-colors"
                            aria-label={`Open risk alert details for ${alert.country}`}
                          >
                            <div className="min-w-0">
                              <p className="text-[10px] text-zinc-300 truncate">{alert.country}</p>
                              <p className="text-[10px] text-zinc-500 truncate">
                                Stocks: {alert.contributingAssets.length > 0 ? alert.contributingAssets.join(", ") : "No mapped holdings"}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                  alert.riskScore >= CRITICAL_RISK_SCORE_THRESHOLD
                                    ? 'bg-red-900/40 border-red-800 text-red-200'
                                    : alert.riskScore >= HIGH_RISK_SCORE_THRESHOLD
                                    ? 'bg-orange-900/40 border-orange-800 text-orange-200'
                                    : alert.riskScore >= 26
                                    ? 'bg-yellow-900/40 border-yellow-800 text-yellow-200'
                                    : 'bg-emerald-900/40 border-emerald-800 text-emerald-200'
                                }`}
                              >
                                {alert.riskScore >= CRITICAL_RISK_SCORE_THRESHOLD
                                  ? 'CRITICAL'
                                  : alert.riskScore >= HIGH_RISK_SCORE_THRESHOLD
                                  ? 'HIGH'
                                  : alert.riskScore >= 26
                                  ? 'MEDIUM'
                                  : 'LOW'}
                              </span>
                              <p
                                className={`text-[10px] ${
                                  alert.riskScore >= CRITICAL_RISK_SCORE_THRESHOLD
                                    ? 'text-red-200'
                                    : alert.riskScore >= HIGH_RISK_SCORE_THRESHOLD
                                    ? 'text-orange-200'
                                    : alert.riskScore >= 26
                                    ? 'text-yellow-200'
                                    : 'text-emerald-200'
                                }`}
                              >
                                {alert.riskScore.toFixed(0)}
                              </p>
                            </div>
                          </button>
                        ))}
                        </div>
                        {activeRiskAlerts.length > ALERTS_PAGE_SIZE && (
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
                            <button
                              type="button"
                              onClick={() => setAlertsPage((p) => Math.max(0, p - 1))}
                              disabled={alertsPage === 0}
                              className="px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800/60 transition-colors rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              ← Prev
                            </button>
                            <span className="text-[10px] text-zinc-500">
                              {alertsPage + 1} / {Math.ceil(activeRiskAlerts.length / ALERTS_PAGE_SIZE)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setAlertsPage((p) => Math.min(Math.ceil(activeRiskAlerts.length / ALERTS_PAGE_SIZE) - 1, p + 1))}
                              disabled={(alertsPage + 1) * ALERTS_PAGE_SIZE >= activeRiskAlerts.length}
                              className="px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800/60 transition-colors rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              Next →
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Holdings Table */}
            <HoldingsTable
              assets={focusedSecurity ? [focusedSecurity] : dashboardPortfolio}
              assetContributions={focusedSecurity
                ? dashboardPortfolioAnalysis.assetContributions.filter((a) => a.ticker === focusedSecurity.ticker)
                : dashboardPortfolioAnalysis.assetContributions
              }
              dataFreshnessLabel={corePanelFreshnessLabel}
              isStaleData={refreshNeedsAttention}
              countryRisks={dashboardRiskData}
              countryDimensions={blendedCountryDimensions}
              weights={weights}
            />
            <div className="pb-12" />
          </div>
        </main>
        ) : currentTab === "summary" ? (
        /* Summary Tab Content */
        <main className="flex-1 p-3">
          <div className="max-w-[1600px] mx-auto space-y-4">
            <Summary
              portfolioAnalysis={dashboardPortfolioAnalysis}
              dataFreshnessLabel={corePanelFreshnessLabel}
              isStaleData={refreshNeedsAttention}
              riskData={dashboardRiskData}
              weights={weights}
              portfolio={dashboardPortfolio}
            />
          </div>
        </main>
        ) : currentTab === "advanced-metrics" ? (
        /* Advanced Metrics Tab Content */
        <main className="flex-1 p-3">
          <div className="max-w-[1600px] mx-auto space-y-4">
            {portfolioAnalysis.countryExposures.length > 0 && (
              <>
                <RiskMetricsPanel
                  trendData={getPortfolioRiskTrend(30, selectedDatasetId)}
                  countryRisks={blendedCountryDimensions}
                  weights={weights}
                  portfolioRisk={portfolioAnalysis.totalRiskScore}
                  portfolioExposures={portfolioAnalysis.countryExposures.map(exp => ({
                    country: exp.country,
                    riskContribution: exp.riskContribution,
                    name: exp.country
                  }))}
                  showAdvancedMetrics={true}
                  showBenchmarkComparison={true}
                  showRiskAttribution={false}
                />

                {/* Correlation & Diversification Analysis */}
                <div className="border-t border-zinc-800 pt-4">
                  <Suspense fallback={tabLoadingFallback}>
                    <CorrelationAnalysisPanel
                      countryRisks={Object.keys(baseRiskData).reduce((acc, country) => {
                        acc[country] = riskData[country] || 50;
                        return acc;
                      }, {} as { [country: string]: number })}
                      trendData={Object.keys(baseRiskData).reduce((acc, country) => {
                        acc[country] = Array(30).fill(riskData[country] || 50);
                        return acc;
                      }, {} as { [country: string]: number[] })}
                      weights={portfolioAnalysis.countryExposures.reduce((acc, exp) => {
                        acc[exp.country] = exp.riskContribution;
                        return acc;
                      }, {} as { [country: string]: number })}
                      currentPortfolioCountries={portfolioAnalysis.countryExposures.map(exp => exp.country)}
                    />
                  </Suspense>
                </div>
              </>
            )}
          </div>
        </main>
        ) : currentTab === "scenarios" ? (
        /* Scenarios Tab Content */
        <main className="flex-1 p-3">
          <div className="max-w-[1600px] mx-auto space-y-4">
            {portfolioAnalysis.countryExposures.length > 0 && (
              <Tabs defaultValue="analysis" className="space-y-4">
                <TabsList className="bg-zinc-900/70 border border-zinc-800 w-full grid grid-cols-1 md:grid-cols-3 h-auto">
                  <TabsTrigger value="analysis" className="text-xs md:text-sm py-2">
                    Analysis
                  </TabsTrigger>
                  <TabsTrigger value="custom-scenario" className="text-xs md:text-sm py-2">
                    Custom Scenario Builder
                  </TabsTrigger>
                  <TabsTrigger value="monte-carlo" className="text-xs md:text-sm py-2">
                    Monte Carlo Risk Simulation
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="analysis" className="mt-0 space-y-4">
                  {/* Backtesting Panel */}
                  <div className="border-t border-zinc-800 pt-4">
                    <Suspense fallback={tabLoadingFallback}>
                      <BacktestPanel
                        baselineCountryRisks={Object.keys(baseRiskData).reduce((acc, country) => {
                          acc[country] = riskData[country] || 50;
                          return acc;
                        }, {} as { [country: string]: number })}
                        portfolioExposures={portfolioAnalysis.countryExposures.map(exp => ({
                          country: exp.country,
                          riskContribution: exp.riskContribution,
                          name: exp.country
                        }))}
                        currentRisk={portfolioAnalysis.totalRiskScore}
                      />
                    </Suspense>
                  </div>

                  {/* Supply Chain Exposure Mapping */}
                  <div className="border-t border-zinc-800 pt-4">
                    <Suspense fallback={tabLoadingFallback}>
                      <SupplyChainExposureMappingPanel
                        portfolio={portfolio}
                        riskData={riskData}
                      />
                    </Suspense>
                  </div>

                </TabsContent>

                <TabsContent value="custom-scenario" className="mt-0">
                  <Suspense fallback={tabLoadingFallback}>
                    <CustomScenarioBuilderPanel
                      baselineCountryRisks={Object.keys(baseRiskData).reduce((acc, country) => {
                        acc[country] = riskData[country] || 50;
                        return acc;
                      }, {} as { [country: string]: number })}
                      portfolioExposures={portfolioAnalysis.countryExposures.map(exp => ({
                        country: exp.country,
                        riskContribution: exp.riskContribution,
                        name: exp.country
                      }))}
                      currentRisk={portfolioAnalysis.totalRiskScore}
                    />
                  </Suspense>
                </TabsContent>

                <TabsContent value="monte-carlo" className="mt-0">
                  <Suspense fallback={tabLoadingFallback}>
                    <MonteCarloPanel
                      currentRisk={portfolioAnalysis.totalRiskScore}
                      trendData={getPortfolioRiskTrend(90, selectedDatasetId)}
                      portfolioExposures={portfolioAnalysis.countryExposures.map(exp => ({
                        country: exp.country,
                        riskContribution: exp.riskContribution,
                        name: exp.country
                      }))}
                    />
                  </Suspense>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
        ) : currentTab === "exports" ? (
        /* Exports Tab Content */
        <main className="flex-1 p-3">
          <div className="max-w-[1600px] mx-auto">
            <Suspense fallback={tabLoadingFallback}>
              <ExportReports
                portfolioSummary={portfolioAnalysis}
                countryRisks={riskData}
                holdings={portfolio}
                trends={getPortfolioRiskTrend(90, selectedDatasetId)}
                weights={weights}
              />
            </Suspense>
          </div>
        </main>
        ) : currentTab === "tools" ? (
        /* Advanced Tools Tab Content */
        <main className="flex-1 p-3">
          <div className="max-w-[1600px] mx-auto">
            <Suspense fallback={tabLoadingFallback}>
              <AdvancedFilters
                countryRisks={riskData}
                defaultAssets={portfolio}
                showPortfolioTab={true}
                showUploadTab={true}
                showSectorsTab={false}
                showScreeningTab={false}
              />
            </Suspense>
          </div>
        </main>
        ) : null}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-zinc-100">
        <div className="flex flex-col lg:flex-row">
          {/* Sidebar spacer — matches the sidebar width so content lines up */}
          <div className="hidden lg:block lg:w-56 lg:basis-56 lg:flex-none" />
          <div className="flex-1 px-3 py-5">
            <div className="max-w-[1600px] mx-auto space-y-4 text-[11px] text-zinc-500">
              {/* Top row: about + features + version side by side */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-zinc-800 font-semibold uppercase tracking-wide text-[10px]">About</p>
                  <p className="leading-relaxed text-zinc-600">
                    Geopolitical Dashboard maps country-level geopolitical exposure across your portfolio,
                    blending political stability, economic fragility, conflict, corruption, and terrorism
                    indicators into a unified, weight-adjustable risk score.
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-zinc-800 font-semibold uppercase tracking-wide text-[10px]">Features</p>
                  <ul className="space-y-0.5 leading-relaxed text-zinc-600">
                    <li>· Country risk heat map &amp; paginated exposure cards</li>
                    <li>· Per-holding risk scoring, sortable table, CSV export</li>
                    <li>· Adjustable risk factor weights</li>
                    <li>· CSV upload &amp; custom portfolio support</li>
                    <li>· Monte Carlo &amp; scenario stress testing</li>
                    <li>· Risk alert notifications with detail dialogs</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="text-zinc-800 font-semibold uppercase tracking-wide text-[10px]">Version &amp; Contact</p>
                  <ul className="space-y-0.5 leading-relaxed text-zinc-600">
                    <li>Version <span className="text-zinc-800">1.4</span> &mdash; Last updated July 1, 2026</li>
                    <li>Data refreshed daily from geopolitical indices</li>
                    <li className="pt-1">
                      Questions or feedback?{" "}
                      <a href="mailto:cas@cascain.com" className="text-cyan-600 hover:text-cyan-800 underline transition-colors">
                        cas@cascain.com
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
              {/* Bottom strip */}
              <p className="pt-3 text-zinc-400">
                &copy; {new Date().getFullYear()} Geopolitical Dashboard. For informational purposes only. Not financial advice.
              </p>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}