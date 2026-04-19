import { useState, useEffect } from "react";
import { motion } from "motion/react";

interface WorldMapProps {
  riskData: { [key: string]: number };
  countryExposures?: { country: string; riskContribution: number; contributingAssets: string[] }[];
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
    coordinates: any;
  };
}

export function WorldMap({ riskData, countryExposures, weights }: WorldMapProps) {
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Using a GeoJSON version instead
    fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson")
      .then((response) => response.json())
      .then((data) => {
        setCountries(data.features || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading map data:", error);
        setLoading(false);
      });
  }, []);

  const getColor = (risk: number) => {
    if (risk > 80) return "#991b1b"; // Very High - Dark Red
    if (risk > 60) return "#dc2626"; // High - Red
    if (risk > 40) return "#f59e0b"; // Medium - Orange
    if (risk > 20) return "#fbbf24"; // Low - Yellow
    if (risk > 5) return "#eab308"; // Very Low Warning - Light Yellow
    return "#84cc16"; // Very Low - Green (no risk)
  };

  // Simple function to convert coordinates to SVG path
  const coordinatesToPath = (coordinates: any, type: string): string => {
    if (!coordinates) return "";
    
    try {
      if (type === "Polygon") {
        return coordinates.map((ring: any) => {
          return ring.map((coord: any, i: number) => {
            const x = (coord[0] + 180) * (1000 / 360);
            const y = (90 - coord[1]) * (500 / 180);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ') + ' Z';
        }).join(' ');
      } else if (type === "MultiPolygon") {
        return coordinates.map((polygon: any) => {
          return polygon.map((ring: any) => {
            return ring.map((coord: any, i: number) => {
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

  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-zinc-950 rounded-lg">
        <div className="text-zinc-600">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="relative bg-zinc-950">
      <svg
        viewBox="0 0 1000 500"
        className="w-full h-auto"
        style={{ maxHeight: "400px" }}
      >
        {/* Ocean background */}
        <rect width="1000" height="500" fill="#09090b" />
        
        {/* Countries */}
        {countries.map((country, index) => {
          const countryName = country.properties?.name || "Unknown";
          
          // Calculate default risk for countries not in our database
          const totalWeight = weights.political + weights.economic + weights.conflict + weights.corruption + weights.terrorism;
          const defaultRisk = totalWeight === 0 ? 0 : 30;
          
          const risk = riskData[countryName] !== undefined ? riskData[countryName] : defaultRisk;
          const pathData = coordinatesToPath(
            country.geometry?.coordinates,
            country.geometry?.type
          );

          if (!pathData) return null;

          return (
            <path
              key={`country-${index}`}
              d={pathData}
              fill={getColor(risk)}
              stroke="#18181b"
              strokeWidth="0.5"
              className="transition-all hover:opacity-80 cursor-pointer"
              onMouseEnter={(e) => {
                const exposure = countryExposures?.find(ce => ce.country === countryName);
                let tooltip = `${countryName}\nRisk Score: ${risk.toFixed(1)}`;
                if (exposure) {
                  tooltip += `\nExposure Contribution: ${exposure.riskContribution.toFixed(2)}`;
                  tooltip += `\nLinked Assets: ${exposure.contributingAssets.join(', ')}`;
                }
                setTooltipContent(tooltip);
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => {
                setTooltipContent("");
              }}
            />
          );
        })}
      </svg>

      {tooltipContent && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed pointer-events-none bg-zinc-950 text-white px-3 py-2 rounded-lg text-sm shadow-lg z-50 whitespace-pre-line border border-zinc-800"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y + 10,
          }}
        >
          {tooltipContent}
        </motion.div>
      )}
    </div>
  );
}