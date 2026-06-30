import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Asset } from "../data/portfolioData";

interface SecuritySearchProps {
  assets: Asset[];
  assetRiskScores: { [ticker: string]: number };
  /** Optional map of ticker → dataset name to label results from other datasets */
  assetDatasetLabels?: { [ticker: string]: string };
  /** The name of the currently active dataset — results from other datasets show a badge */
  activeDatasetName?: string;
  /** The currently focused asset (controlled from parent) */
  selectedAsset: Asset | null;
  /** Called when user picks an asset or clears the search */
  onSelect: (asset: Asset | null) => void;
  /** When true the input is visually de-emphasized */
  dimmed?: boolean;
}

export function SecuritySearch({
  assets,
  assetRiskScores,
  assetDatasetLabels = {},
  activeDatasetName,
  selectedAsset,
  onSelect,
  dimmed = false,
}: SecuritySearchProps) {
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const results =
    q.length >= 1
      ? assets.filter(
          (a) => a.ticker.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
        )
      : [];

  const handlePick = (asset: Asset) => {
    setQuery("");
    setDropdownOpen(false);
    onSelect(asset);
  };

  const handleClear = () => {
    setQuery("");
    setDropdownOpen(false);
    onSelect(null);
    inputRef.current?.focus();
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setDropdownOpen(results.length > 0);
  }, [results.length]);

  return (
    <div ref={containerRef} className={`relative transition-opacity ${dimmed ? "opacity-40 pointer-events-none" : ""}`}>
      {/* Selected badge OR search input */}
      {selectedAsset ? (
        <div className="flex items-center h-9 rounded-lg border border-blue-600 bg-blue-950/40 px-2.5 gap-2 min-w-[11rem]">
          <Search className="size-3.5 text-blue-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-blue-200 flex-1 min-w-0 truncate">
            {selectedAsset.ticker}
            <span className="font-normal text-blue-400 ml-1">· {selectedAsset.name}</span>
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="text-blue-400 hover:text-blue-100 transition-colors flex-shrink-0"
            aria-label="Clear security selection"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center h-9 w-48 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 gap-1.5 focus-within:border-zinc-600 transition-colors">
          <Search className="size-3.5 text-zinc-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search security…"
            className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 outline-none min-w-0"
            aria-label="Search securities"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      )}

      {/* Dropdown */}
      {dropdownOpen && results.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
          <p className="px-3 py-1.5 text-[10px] text-zinc-500 border-b border-zinc-800/60 uppercase tracking-wider">
            {results.length} result{results.length !== 1 ? "s" : ""} across all datasets
          </p>
          <ul className="max-h-56 overflow-y-auto">
            {results.map((asset) => {
              const score = assetRiskScores[asset.ticker] ?? 0;
              const riskColor =
                score >= 75
                  ? "text-red-400"
                  : score >= 51
                  ? "text-orange-400"
                  : score >= 26
                  ? "text-yellow-400"
                  : "text-green-400";
              const datasetLabel = assetDatasetLabels[asset.ticker];
              const isOtherDataset = datasetLabel && activeDatasetName && datasetLabel !== activeDatasetName;
              return (
                <li key={asset.ticker}>
                  <button
                    type="button"
                    onMouseDown={() => handlePick(asset)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-800/70 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-100">{asset.ticker}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{asset.name}</p>
                      {isOtherDataset && (
                        <p className="text-[9px] text-blue-400/70 mt-0.5">{datasetLabel}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end ml-3 flex-shrink-0">
                      <span className={`text-xs font-bold ${riskColor}`}>{score.toFixed(1)}</span>
                      <span className="text-[9px] text-zinc-600">{asset.sector}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {dropdownOpen && q.length >= 1 && results.length === 0 && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl z-50 px-3 py-3 space-y-0.5">
          <p className="text-xs text-zinc-500">
            No match for <span className="text-zinc-300">"{query}"</span>
          </p>
          <p className="text-[10px] text-zinc-600">
            All loaded datasets searched. Risk scores use World Bank WGI data where available.
          </p>
        </div>
      )}
    </div>
  );
}
