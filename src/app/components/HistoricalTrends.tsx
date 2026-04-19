import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getPortfolioRiskTrend, getCountryTrend, getLatestSnapshot, getPreviousSnapshot, compareSnapshots, type CountryTrend } from '../data/historicalSnapshotManager';

interface HistoricalTrendsProps {
  availableCountries?: string[];
  onSelectCountry?: (country: string) => void;
}

export function HistoricalTrends({ availableCountries = [], onSelectCountry }: HistoricalTrendsProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>(availableCountries[0] || '');
  const [timeRange, setTimeRange] = useState<number>(7); // days
  const [comparisonMode, setComparisonMode] = useState(false);

  const portfolioTrend = useMemo(() => {
    return getPortfolioRiskTrend(timeRange);
  }, [timeRange]);

  const countryTrends = useMemo(() => {
    if (!selectedCountry) return [];
    const trend = getCountryTrend(selectedCountry, timeRange);
    return trend ? [trend] : [];
  }, [selectedCountry, timeRange]);

  const comparison = useMemo(() => {
    const latest = getLatestSnapshot();
    const previous = getPreviousSnapshot(latest || undefined);
    return latest && previous ? compareSnapshots(previous, latest) : null;
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  return (
    <div className="w-full space-y-4">
      {/* Portfolio Trend */}
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-100">Portfolio Risk Trend</h3>
          <div className="flex gap-2">
            {[7, 30, 90].map((days) => (
              <Button
                key={days}
                variant={timeRange === days ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(days)}
                className={`text-xs ${
                  timeRange === days
                    ? 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600'
                    : 'bg-zinc-900 text-zinc-300 border border-zinc-700 hover:bg-zinc-800'
                }`}
              >
                {days}d
              </Button>
            ))}
          </div>
        </div>

        {portfolioTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={portfolioTrend}>
              <defs>
                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="timestamp" tickFormatter={formatDate} tick={{ fill: '#a1a1aa' }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#a1a1aa' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                labelStyle={{ color: '#e4e4e7' }}
                itemStyle={{ color: '#f4f4f5' }}
                formatter={(value) => [`${Math.round(value as number)}`, 'Risk Score']}
                labelFormatter={formatTime}
              />
              <Area type="monotone" dataKey="value" stroke="#ef4444" fill="url(#colorRisk)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-zinc-400">
            No historical data yet
          </div>
        )}
      </Card>

      {/* Recent Changes */}
      {comparison && (
        <Card className="p-4 bg-zinc-950 border border-zinc-800">
          <h3 className="text-sm font-semibold mb-3 text-zinc-100">Recent Changes</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Portfolio Risk Change:</span>
              <span
                className={`font-semibold ${
                  comparison.portfolioRiskChange > 0 ? 'text-red-500' : 'text-green-500'
                }`}
              >
                {comparison.portfolioRiskChange > 0 ? '+' : ''}
                {comparison.portfolioRiskChange.toFixed(1)}
              </span>
            </div>

            {comparison.countries.slice(0, 5).map((country) => (
              <div key={country.country} className="flex justify-between items-center text-xs p-2 bg-zinc-900 rounded border border-zinc-800">
                <span className="text-zinc-300">{country.country}</span>
                <span
                  className={`font-semibold ${
                    country.direction === 'up'
                      ? 'text-red-500'
                      : country.direction === 'down'
                      ? 'text-green-500'
                      : 'text-yellow-500'
                  }`}
                >
                  {country.direction === 'up' ? (
                    <ArrowUp size={12} className="inline mr-1" />
                  ) : country.direction === 'down' ? (
                    <ArrowDown size={12} className="inline mr-1" />
                  ) : null}
                  {country.change > 0 ? '+' : ''}
                  {country.change}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Country Trends */}
      {availableCountries.length > 0 && (
        <Card className="p-4 bg-zinc-950 border border-zinc-800">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">Country Risk Trends</h3>
              <Select value={selectedCountry} onValueChange={(country) => {
                setSelectedCountry(country);
                onSelectCountry?.(country);
              }}>
                <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700 text-zinc-100">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {availableCountries.map((country) => (
                    <SelectItem key={country} value={country} className="text-zinc-100">
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country Trend Charts */}
            {countryTrends.length > 0 ? (
              <div className="mt-4 space-y-4">
                {countryTrends.map((trend) => (
                  <div key={trend.country} className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs font-semibold text-zinc-100">{trend.country}</p>
                        <div className="flex gap-3 text-xs text-zinc-400 mt-1">
                          <span>Avg: {trend.averageRisk}</span>
                          <span>High: {trend.highestRisk}</span>
                          <span>Low: {trend.lowestRisk}</span>
                        </div>
                      </div>
                      <div
                        className={`flex items-center gap-1 text-xs font-semibold ${
                          trend.trend === 'improving'
                            ? 'text-green-500'
                            : trend.trend === 'declining'
                            ? 'text-red-500'
                            : 'text-yellow-500'
                        }`}
                      >
                        {trend.trend === 'improving' ? (
                          <>
                            <TrendingDown size={14} /> Improving
                          </>
                        ) : trend.trend === 'declining' ? (
                          <>
                            <TrendingUp size={14} /> Declining
                          </>
                        ) : (
                          <>
                            <ArrowUp size={14} /> Stable
                          </>
                        )}
                      </div>
                    </div>

                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={trend.dataPoints}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                        <XAxis dataKey="timestamp" tickFormatter={formatDate} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', fontSize: 12 }}
                          labelStyle={{ color: '#e4e4e7' }}
                          itemStyle={{ color: '#f4f4f5' }}
                          formatter={(value, name, props) => {
                            const data = props.payload;
                            const change = data.change ? ` (${data.change > 0 ? '+' : ''}${Math.round(data.change * 10) / 10})` : '';
                            return [`${Math.round(value as number)}${change}`, 'Risk'];
                          }}
                          labelFormatter={formatTime}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={
                            trend.trend === 'improving'
                              ? '#22c55e'
                              : trend.trend === 'declining'
                              ? '#ef4444'
                              : '#eab308'
                          }
                          dot={false}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-zinc-400 border border-dashed border-zinc-700 rounded">
                No historical data available for {selectedCountry}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
