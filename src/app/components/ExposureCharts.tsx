import { Card } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { sectors } from "../data/sectorData";

interface ExposureChartsProps {
  countryExposure: { [country: string]: number };
  sectorRisk: { [sector: string]: number };
  riskData: { [key: string]: number };
}

export function ExposureCharts({
  countryExposure,
  sectorRisk,
  riskData,
}: ExposureChartsProps) {
  // Top country exposures
  const countryData = Object.entries(countryExposure)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([country, exposure]) => ({
      country: country.length > 15 ? country.substring(0, 15) + "..." : country,
      exposure: Math.round(exposure * 10) / 10,
      risk: riskData[country] || 30,
    }));

  // Sector breakdown
  const sectorData = Object.entries(sectorRisk).map(([sectorKey, risk]) => ({
    sector: sectors[sectorKey]?.name || sectorKey,
    risk: Math.round(risk * 10) / 10,
  }));

  const getColorByRisk = (risk: number) => {
    if (risk > 80) return "#991b1b";
    if (risk > 60) return "#dc2626";
    if (risk > 40) return "#f59e0b";
    if (risk > 20) return "#fbbf24";
    if (risk > 5) return "#fef3c7";
    return "#84cc16";
  };

  const COLORS = [
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
    "#f43f5e",
    "#6366f1",
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Country Exposure */}
      <Card className="p-6 bg-white">
        <h3 className="text-lg mb-4 text-slate-900">
          Top Country Exposures
        </h3>
        {countryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={countryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="country"
                tick={{ fill: "#64748b", fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 12 }}
                label={{
                  value: "Exposure %",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#64748b", fontSize: 12 },
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                }}
                formatter={(value: any, name: string) => {
                  if (name === "exposure") return [`${value}%`, "Exposure"];
                  return [value, name];
                }}
              />
              <Bar dataKey="exposure" radius={[8, 8, 0, 0]}>
                {countryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColorByRisk(entry.risk)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-slate-400">
            No portfolio data yet
          </div>
        )}
      </Card>

      {/* Sector Risk Distribution */}
      <Card className="p-6 bg-white">
        <h3 className="text-lg mb-4 text-slate-900">
          Sector Risk Distribution
        </h3>
        {sectorData.length > 0 ? (
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ sector, risk }) => `${sector}: ${risk.toFixed(1)}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="risk"
                >
                  {sectorData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(value: any) => [`${value.toFixed(1)}`, "Risk Score"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-slate-400">
            No portfolio data yet
          </div>
        )}
      </Card>
    </div>
  );
}
