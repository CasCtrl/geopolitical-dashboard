import { Card } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { PortfolioExposure } from "../data/portfolioData";

interface RegionalExposureChartProps {
  countryExposures: PortfolioExposure[];
}

const REGION_MAP: { [key: string]: string } = {
  "United States": "North America",
  "Canada": "North America",
  "Mexico": "North America",
  "China": "East Asia",
  "Taiwan": "East Asia",
  "Japan": "East Asia",
  "South Korea": "East Asia",
  "India": "South Asia",
  "Saudi Arabia": "Middle East",
  "United Arab Emirates": "Middle East",
  "Iraq": "Middle East",
  "Iran": "Middle East",
  "Germany": "Europe",
  "United Kingdom": "Europe",
  "France": "Europe",
  "Russia": "Europe/Asia",
};

export function RegionalExposureChart({ countryExposures }: RegionalExposureChartProps) {
  // Aggregate by region
  const regionMap = new Map<string, number>();

  countryExposures.forEach((exposure) => {
    const region = REGION_MAP[exposure.country] || "Other";
    regionMap.set(region, (regionMap.get(region) || 0) + exposure.totalExposure);
  });

  const sortedData = Array.from(regionMap.entries())
    .map(([region, exposure]) => ({
      region,
      exposure: Math.round(exposure * 10) / 10,
    }))
    .sort((a, b) => b.exposure - a.exposure);

  // Re-index after sorting to ensure unique keys
  const data = sortedData.map((item, index) => ({
    ...item,
    id: `region-${index}`,
  }));

  const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

  return (
    <Card className="p-6 bg-white">
      <h3 className="text-lg mb-4 text-slate-900">Regional Exposure</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              tick={{ fill: "#64748b", fontSize: 12 }}
              label={{
                value: "Exposure %",
                position: "insideBottom",
                offset: -5,
                style: { fill: "#64748b", fontSize: 12 },
              }}
            />
            <YAxis
              type="category"
              dataKey="region"
              tick={{ fill: "#64748b", fontSize: 12 }}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
              }}
              formatter={(value: any) => [`${value}%`, "Exposure"]}
            />
            <Bar dataKey="exposure" radius={[0, 8, 8, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${entry.region}-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-slate-400">
          No regional data
        </div>
      )}
    </Card>
  );
}