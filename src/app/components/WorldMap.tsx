import { useState, useEffect, memo, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { getCountryIntelligence } from "../utils/riskIntelligence";

interface WorldMapProps {
  riskData: { [key: string]: number };
  countryExposures?: { country: string; riskContribution: number; contributingAssets: string[] }[];
  dataFreshnessLabel?: string;
  isStaleData?: boolean;
  weights: {
    political: number;
    economic: number;
    conflict: number;
    corruption: number;
    terrorism: number;
  };
}

interface CountryFeature {
  type: string;
  properties: {
    name: string;
  };
  geometry: {
    type: string;
    coordinates: unknown;
  };
}

type GeoPoint = [number, number];
type GeoRing = GeoPoint[];
type GeoPolygon = GeoRing[];
type GeoMultiPolygon = GeoPolygon[];

// GeoJSON cache to avoid refetching
let geoJSONCache: { features: CountryFeature[] } | null = null;

const NO_STOCK_COLOR = "#3f3f46"; // zinc-700 - gray for countries without an associated stock

// GeoJSON (datasets/geo-countries) uses official ISO-style names that differ from
// the short names used in our datasets/CSV (e.g. "United States" vs
// "United States of America"). Map GeoJSON names -> canonical dataset names so
// risk-score and stock-exposure lookups resolve correctly on the heat map.
const GEO_NAME_ALIASES: Record<string, string> = {
  "United States of America": "United States",
  "USA": "United States",
  "Russian Federation": "Russia",
  "Republic of Korea": "South Korea",
  "Korea, Republic of": "South Korea",
  "Korea (Republic of)": "South Korea",
  "Dem. Rep. Korea": "North Korea",
  "Democratic People's Republic of Korea": "North Korea",
  "Iran (Islamic Republic of)": "Iran",
  "Iran, Islamic Republic of": "Iran",
  "Syrian Arab Republic": "Syria",
  "Viet Nam": "Vietnam",
  "Lao People's Democratic Republic": "Laos",
  "Brunei Darussalam": "Brunei",
  "Czechia": "Czech Republic",
  "Slovak Republic": "Slovakia",
  "Republic of Moldova": "Moldova",
  "United Republic of Tanzania": "Tanzania",
  "Tanzania, United Republic of": "Tanzania",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  "Democratic Republic of the Congo": "DR Congo",
  "Congo, Democratic Republic of the": "DR Congo",
  "Republic of the Congo": "Congo",
  "Congo": "Congo",
  "Myanmar": "Myanmar",
  "Burma": "Myanmar",
  "Cabo Verde": "Cape Verde",
  "Eswatini": "Swaziland",
  "Bolivia (Plurinational State of)": "Bolivia",
  "Venezuela (Bolivarian Republic of)": "Venezuela",
  "Macedonia": "North Macedonia",
  "The former Yugoslav Republic of Macedonia": "North Macedonia",
  "Palestine, State of": "Palestine",
  "Taiwan, Province of China": "Taiwan",
  "Hong Kong": "Hong Kong",
  "United Kingdom of Great Britain and Northern Ireland": "United Kingdom",
};

const resolveCountryName = (name: string): string => GEO_NAME_ALIASES[name] ?? name;

const getColor = (risk: number) => {
  if (risk >= 75) return "#dc2626"; // Critical - Red
  if (risk >= 51) return "#ea580c"; // High - Orange
  if (risk >= 26) return "#eab308"; // Medium - Yellow
  return "#84cc16"; // Low - Green (restored previous shade)
};

// Memoize coordinate path calculation
const coordinatesToPath = (coordinates: unknown, type: string): string => {
  if (!coordinates) return "";
  
  try {
    if (type === "Polygon") {
      return (coordinates as GeoPolygon).map((ring: GeoRing) => {
        return ring.map((coord: GeoPoint, i: number) => {
          const x = (coord[0] + 180) * (1000 / 360);
          const y = (90 - coord[1]) * (500 / 180);
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ') + ' Z';
      }).join(' ');
    } else if (type === "MultiPolygon") {
      return (coordinates as GeoMultiPolygon).map((polygon: GeoPolygon) => {
        return polygon.map((ring: GeoRing) => {
          return ring.map((coord: GeoPoint, i: number) => {
            const x = (coord[0] + 180) * (1000 / 360);
            const y = (90 - coord[1]) * (500 / 180);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ') + ' Z';
        }).join(' ');
      }).join(' ');
    }
  } catch (e) {
    console.error("Error converting coordinates:", e);
    return "";
  }
  
  return "";
};

// Memoized country path component
interface CountryPathProps {
  country: CountryFeature;
  index: number;
  riskData: { [key: string]: number };
  countryExposures?: { country: string; riskContribution: number; contributingAssets: string[] }[];
  countriesWithStocks: Set<string>;
  weights: WorldMapProps['weights'];
  onTooltipChange: (content: string | null, position: { x: number; y: number }) => void;
  onCountryHighlight: (country: string) => void;
}

const CountryPath = memo(function CountryPath({
  country,
  index,
  riskData,
  countryExposures,
  countriesWithStocks,
  weights,
  onTooltipChange,
  onCountryHighlight,
}: CountryPathProps) {
  const countryName = country.properties?.name || "Unknown";
  const lookupName = resolveCountryName(countryName);
  const totalWeight = weights.political + weights.economic + weights.conflict + weights.corruption + weights.terrorism;
  const defaultRisk = totalWeight === 0 ? 0 : 30;
  const risk = riskData[lookupName] !== undefined
    ? riskData[lookupName]
    : (riskData[countryName] !== undefined ? riskData[countryName] : defaultRisk);
  const hasStock = countriesWithStocks.has(lookupName) || countriesWithStocks.has(countryName);
  const fillColor = hasStock ? getColor(risk) : NO_STOCK_COLOR;
  const pathData = useMemo(() => 
    coordinatesToPath(country.geometry?.coordinates, country.geometry?.type),
    [country.geometry?.coordinates, country.geometry?.type]
  );

  const handleMouseEnter = useCallback((e: React.MouseEvent<SVGPathElement>) => {
    const intelligence = getCountryIntelligence(countryName, weights);
    const exposure = countryExposures?.find(ce => ce.country === lookupName || ce.country === countryName);
    let tooltip = `${countryName}\nRisk Score: ${risk.toFixed(0)}`;
    tooltip += `\nConfidence: ${intelligence.confidence}%`;
    tooltip += `\nUpdated: ${new Date(intelligence.lastUpdated).toLocaleDateString()}`;
    if (exposure && exposure.riskContribution > 0) {
      tooltip += `\nExposure: ${exposure.riskContribution.toFixed(2)}%`;
      if (exposure.contributingAssets.length > 0) {
        tooltip += `\nAssets: ${exposure.contributingAssets.slice(0, 3).join(', ')}${exposure.contributingAssets.length > 3 ? '...' : ''}`;
      }
    }
    onCountryHighlight(countryName);
    onTooltipChange(tooltip, { x: e.clientX, y: e.clientY });
  }, [countryName, risk, countryExposures, onTooltipChange, onCountryHighlight, weights]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGPathElement>) => {
    // Update position only by passing null as content
    onTooltipChange(null, { x: e.clientX, y: e.clientY });
  }, [onTooltipChange]);

  const handleMouseLeave = useCallback(() => {
    onTooltipChange("", { x: 0, y: 0 });
  }, [onTooltipChange]);

  const handleFocus = useCallback((e: React.FocusEvent<SVGPathElement>) => {
    const intelligence = getCountryIntelligence(countryName, weights);
    const exposure = countryExposures?.find(ce => ce.country === lookupName || ce.country === countryName);
    let tooltip = `${countryName}\nRisk Score: ${risk.toFixed(0)}`;
    tooltip += `\nConfidence: ${intelligence.confidence}%`;
    tooltip += `\nUpdated: ${new Date(intelligence.lastUpdated).toLocaleDateString()}`;
    if (exposure && exposure.riskContribution > 0) {
      tooltip += `\nExposure: ${exposure.riskContribution.toFixed(2)}%`;
    }
    onCountryHighlight(countryName);
    const bounds = e.currentTarget.getBoundingClientRect();
    onTooltipChange(tooltip, { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 });
  }, [countryExposures, countryName, onTooltipChange, onCountryHighlight, risk, weights]);

  const handleBlur = useCallback(() => {
    onTooltipChange("", { x: 0, y: 0 });
  }, [onTooltipChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<SVGPathElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const bounds = e.currentTarget.getBoundingClientRect();
      onTooltipChange(`${countryName}\nRisk Score: ${risk.toFixed(0)}`, {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      });
    }
  }, [countryName, onTooltipChange, risk]);

  if (!pathData) return null;

  return (
    <path
      key={`country-${index}`}
      d={pathData}
      fill={fillColor}
      stroke="#18181b"
      strokeWidth="0.5"
      className="transition-all hover:opacity-80 cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label={hasStock ? `${countryName} risk score ${risk.toFixed(0)}` : `${countryName} no associated stocks`}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
});

function WorldMapComponent({ riskData, countryExposures, dataFreshnessLabel, isStaleData = false, weights }: WorldMapProps) {
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [highlightedCountry, setHighlightedCountry] = useState<string>("United States");

  useEffect(() => {
    // Load GeoJSON once and cache it
    if (geoJSONCache) {
      setCountries(geoJSONCache.features);
      setLoading(false);
      setLoadError(null);
      return;
    }

    fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson")
      .then((response) => response.json())
      .then((data) => {
        geoJSONCache = data;
        setCountries(data.features || []);
        setLoading(false);
        setLoadError(null);
      })
      .catch((error) => {
        console.error("Error loading map data:", error);
        setLoading(false);
        setLoadError("Could not load map data. Please retry in a moment.");
      });
  }, []);

  const handleTooltipChange = useCallback((content: string | null, position: { x: number; y: number }) => {
    // If content is null, update position only (for mouse move)
    if (content === null) {
      setTooltipPosition(position);
    } else {
      // If content is provided, update both
      setTooltipContent(content);
      setTooltipPosition(position);
    }
  }, []);

  const highlightedIntelligence = useMemo(
    () => getCountryIntelligence(highlightedCountry, weights),
    [highlightedCountry, weights]
  );

  // Countries with at least one associated stock (contributing asset).
  // Countries not in this set are rendered gray on the map.
  const countriesWithStocks = useMemo(() => {
    const set = new Set<string>();
    countryExposures?.forEach((exposure) => {
      if (exposure.contributingAssets && exposure.contributingAssets.length > 0) {
        set.add(exposure.country);
      }
    });
    return set;
  }, [countryExposures]);

  if (loading) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center gap-2 bg-zinc-950 rounded-lg border border-zinc-800" role="status" aria-live="polite">
        <div className="text-zinc-300 text-sm">Loading map data...</div>
        <div className="text-zinc-500 text-xs">Fetching country boundaries and risk overlays</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center gap-2 bg-zinc-950 rounded-lg border border-red-900/50" role="alert" aria-live="assertive">
        <div className="text-red-300 text-sm">Map unavailable</div>
        <div className="text-red-400/80 text-xs">{loadError}</div>
      </div>
    );
  }

  if (countries.length === 0) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center gap-2 bg-zinc-950 rounded-lg border border-zinc-800" role="status" aria-live="polite">
        <div className="text-zinc-300 text-sm">No map features available</div>
        <div className="text-zinc-500 text-xs">Country geometry did not return usable data</div>
      </div>
    );
  }

  return (
    <div className="relative bg-zinc-950">
      {dataFreshnessLabel && (
        <div className="mb-2 inline-flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-[11px]">
          <span className={isStaleData ? "text-amber-300" : "text-emerald-300"}>{isStaleData ? "Stale" : "Fresh"}</span>
          <span className="text-zinc-400">{dataFreshnessLabel}</span>
        </div>
      )}
      <svg
        viewBox="0 0 1000 500"
        className="w-full h-auto"
        style={{ maxHeight: "400px" }}
        role="img"
        aria-label="Global geopolitical risk heat map"
      >
        {/* Ocean background */}
        <rect width="1000" height="500" fill="#09090b" />
        
        {/* Countries */}
        {countries.map((country, index) => (
          <CountryPath
            key={`country-${index}`}
            country={country}
            index={index}
            riskData={riskData}
            countryExposures={countryExposures}
            countriesWithStocks={countriesWithStocks}
            weights={weights}
            onTooltipChange={handleTooltipChange}
            onCountryHighlight={setHighlightedCountry}
          />
        ))}
      </svg>

      <div className="mt-3 rounded border border-zinc-800 bg-zinc-900/50 p-2 text-[11px] text-zinc-300">
        <p className="font-medium text-zinc-100">Data Quality & Sensitivity: {highlightedCountry}</p>
        <p className="text-zinc-400 mt-1">Source: {highlightedIntelligence.source}</p>
        <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-1">
          <p><span className="text-zinc-500">Confidence:</span> {highlightedIntelligence.confidence}%</p>
          <p><span className="text-zinc-500">Historical Accuracy:</span> {highlightedIntelligence.predictionAccuracy}%</p>
          <p><span className="text-zinc-500">Last Country Update:</span> {new Date(highlightedIntelligence.lastUpdated).toLocaleDateString()}</p>
          <p>
            <span className="text-zinc-500">Top Drivers:</span>{" "}
            {highlightedIntelligence.topFactors.map((factor) => factor.label).join(", ")}
          </p>
        </div>
      </div>

      {tooltipContent && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed pointer-events-none bg-zinc-900 text-white px-3 py-2 rounded-lg text-xs shadow-lg z-50 border border-cyan-700/50 bg-gradient-to-br from-zinc-900 to-zinc-950"
          style={{
            left: tooltipPosition.x + 12,
            top: tooltipPosition.y + 12,
          }}
        >
          <div className="whitespace-nowrap space-y-1">
            {tooltipContent.split('\n').map((line, i) => (
              <div key={i} className={i === 0 ? "font-semibold text-cyan-300" : "text-zinc-300"}>
                {line}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export const WorldMap = memo(WorldMapComponent);