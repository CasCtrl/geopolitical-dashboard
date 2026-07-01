import { useEffect, useState, useCallback } from "react";
import { Card } from "./ui/card";
import { ArrowUpRight, ArrowDownRight, RefreshCw, Wifi, WifiOff } from "lucide-react";

interface ShortEntry {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  shortPercentOfFloat: number | null;
  sharesShort: number | null;
  shortRatio: number | null;
  source: "live" | "static";
}

interface ShortInterestResponse {
  data: ShortEntry[];
  fetchedAt: string;
  source: "live" | "static";
}

interface ShortInterestPanelProps {
  apiBaseUrl: string;
}

function shortFloatColor(pct: number | null): string {
  if (pct === null) return "text-zinc-400";
  if (pct >= 20) return "text-red-400";
  if (pct >= 10) return "text-amber-400";
  return "text-emerald-400";
}

function shortFloatBg(pct: number | null): string {
  if (pct === null) return "bg-zinc-700";
  if (pct >= 20) return "bg-red-500/20 border border-red-500/30";
  if (pct >= 10) return "bg-amber-500/20 border border-amber-500/30";
  return "bg-emerald-500/20 border border-emerald-500/30";
}

function fmtShares(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

type SortKey = "ticker" | "price" | "changePercent" | "shortPercentOfFloat" | "shortRatio";

export function ShortInterestPanel({ apiBaseUrl }: ShortInterestPanelProps) {
  const [result, setResult] = useState<ShortInterestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("shortPercentOfFloat");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/short-interest`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ShortInterestResponse = await res.json();
      setResult(json);
      setFetchedAt(json.fetchedAt);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = result
    ? [...result.data].sort((a, b) => {
        const av = a[sortKey] ?? -Infinity;
        const bv = b[sortKey] ?? -Infinity;
        if (typeof av === "string" && typeof bv === "string") {
          return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
      })
    : [];

  const isLive = result?.source === "live";

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button
      onClick={() => handleSort(col)}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide hover:text-white transition-colors ${sortKey === col ? "text-white" : "text-zinc-400"}`}
    >
      {label}
      <span className="text-zinc-500">{sortKey === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );

  return (
    <Card className="bg-zinc-900 border-zinc-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-white font-semibold text-sm">Short Interest — Live Data</h2>
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${isLive ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}`}>
            {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isLive ? "Live" : "Static Fallback"}
          </span>
          {fetchedAt && (
            <span className="text-zinc-500 text-xs">
              Updated {new Date(fetchedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-3 text-xs text-zinc-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> ≥20% float</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> 10–20%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> &lt;10%</span>
        <span className="ml-auto text-zinc-500">Short Float% sourced from Yahoo Finance</span>
      </div>

      {error && (
        <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded p-2 mb-3">
          {error} — showing static fallback
        </div>
      )}

      {loading && !result ? (
        <div className="flex items-center justify-center py-8 text-zinc-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Fetching live data…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left">
                <th className="pb-2 pr-4"><SortBtn col="ticker" label="Ticker" /></th>
                <th className="pb-2 pr-4 hidden md:table-cell text-xs text-zinc-400 font-semibold uppercase tracking-wide">Name</th>
                <th className="pb-2 pr-4"><SortBtn col="price" label="Price" /></th>
                <th className="pb-2 pr-4"><SortBtn col="changePercent" label="Day %" /></th>
                <th className="pb-2 pr-4"><SortBtn col="shortPercentOfFloat" label="Short Float%" /></th>
                <th className="pb-2 pr-4 hidden lg:table-cell"><SortBtn col="shortRatio" label="Days to Cover" /></th>
                <th className="pb-2 hidden lg:table-cell text-xs text-zinc-400 font-semibold uppercase tracking-wide">Shares Short</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr
                  key={row.ticker}
                  className={`border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors ${i % 2 === 0 ? "" : "bg-zinc-800/20"}`}
                >
                  <td className="py-2 pr-4">
                    <span className="font-mono font-bold text-white text-xs">{row.ticker}</span>
                    {row.source === "static" && (
                      <span className="ml-1 text-zinc-600 text-xs">*</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 hidden md:table-cell text-zinc-300 text-xs max-w-[160px] truncate">{row.name}</td>
                  <td className="py-2 pr-4 text-zinc-200 font-mono text-xs">
                    ${row.price.toFixed(2)}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`flex items-center gap-0.5 text-xs font-medium ${row.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {row.changePercent >= 0
                        ? <ArrowUpRight className="w-3 h-3" />
                        : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(row.changePercent).toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${shortFloatBg(row.shortPercentOfFloat)} ${shortFloatColor(row.shortPercentOfFloat)}`}>
                      {row.shortPercentOfFloat !== null ? `${row.shortPercentOfFloat.toFixed(1)}%` : "—"}
                    </span>
                  </td>
                  <td className="py-2 pr-4 hidden lg:table-cell text-zinc-300 text-xs">
                    {row.shortRatio !== null ? `${row.shortRatio.toFixed(1)}d` : "—"}
                  </td>
                  <td className="py-2 hidden lg:table-cell text-zinc-400 text-xs font-mono">
                    {fmtShares(row.sharesShort)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.some(r => r.source === "static") && (
            <p className="text-zinc-600 text-xs mt-2">* Static fallback — Yahoo Finance unavailable for this ticker</p>
          )}
        </div>
      )}
    </Card>
  );
}
