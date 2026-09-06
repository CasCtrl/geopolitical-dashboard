import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Search, X, Sparkles, Loader2, FileText, Newspaper } from "lucide-react";
import { Asset } from "../data/portfolioData";
import { createApiClient, type RagSource } from "../api/sdk";

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
  /** API base URL — enables the "ask a question" (RAG) capability when provided */
  apiBaseUrl?: string;
  /** Active dataset id, passed to the RAG so answers are portfolio-aware */
  datasetId?: string;
}

interface AskState {
  loading: boolean;
  answer: string | null;
  sources: RagSource[];
  error: string | null;
}

const EMPTY_ASK: AskState = { loading: false, answer: null, sources: [], error: null };

function sourceIcon(source: string) {
  if (source.startsWith("news:")) return <Newspaper className="size-3 text-sky-400 flex-shrink-0" />;
  return <FileText className="size-3 text-zinc-400 flex-shrink-0" />;
}

function sourceLabel(source: string, metadata?: Record<string, unknown>): string {
  if (source.startsWith("news:")) {
    const title = metadata?.title;
    return typeof title === "string" && title.length > 0 ? title : source.replace("news:", "");
  }
  return source;
}

function sourceHref(source: string, metadata?: Record<string, unknown>): string | null {
  if (source.startsWith("news:")) {
    const url = metadata?.url;
    return typeof url === "string" && url.length > 0 ? url : null;
  }
  return null;
}

export function SecuritySearch({
  assets,
  assetRiskScores,
  assetDatasetLabels = {},
  activeDatasetName,
  selectedAsset,
  onSelect,
  dimmed = false,
  apiBaseUrl,
  datasetId,
}: SecuritySearchProps) {
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [ask, setAsk] = useState<AskState>(EMPTY_ASK);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const askEnabled = typeof apiBaseUrl === "string";
  const client = useMemo(
    () => (askEnabled ? createApiClient({ baseUrl: apiBaseUrl }) : null),
    [askEnabled, apiBaseUrl]
  );

  const q = query.trim().toLowerCase();
  const results =
    q.length >= 1
      ? assets.filter(
          (a) => a.ticker.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
        )
      : [];
  const canAsk = askEnabled && query.trim().length >= 3;
  const askActive = ask.loading || ask.answer !== null || ask.error !== null;

  const runAsk = useCallback(async () => {
    const question = query.trim();
    if (!client || question.length < 3) return;
    setDropdownOpen(false);
    setAsk({ loading: true, answer: null, sources: [], error: null });
    try {
      const res = await client.queryRag({ question, datasetId });
      if (res.answer === null) {
        const reason =
          res.indexed === 0
            ? "No content is indexed yet. Run npm run rag:ingest to build the knowledge base."
            : "The local model backend is unavailable. Ensure Ollama is running, then try again.";
        setAsk({ loading: false, answer: null, sources: [], error: reason });
        return;
      }
      setAsk({ loading: false, answer: res.answer, sources: res.sources, error: null });
    } catch (e: unknown) {
      setAsk({
        loading: false,
        answer: null,
        sources: [],
        error: e instanceof Error ? e.message : "Failed to get an answer",
      });
    }
  }, [client, query, datasetId]);

  const handlePick = (asset: Asset) => {
    setQuery("");
    setDropdownOpen(false);
    setAsk(EMPTY_ASK);
    onSelect(asset);
  };

  const handleClear = () => {
    setQuery("");
    setDropdownOpen(false);
    setAsk(EMPTY_ASK);
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
    setDropdownOpen(results.length > 0 && !askActive);
  }, [results.length, askActive]);

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
        <div className="flex items-center h-9 w-72 md:w-96 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 gap-1.5 focus-within:border-zinc-600 transition-colors">
          {canAsk ? (
            <Sparkles className="size-3.5 text-violet-400 flex-shrink-0" />
          ) : (
            <Search className="size-3.5 text-zinc-500 flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canAsk) {
                e.preventDefault();
                void runAsk();
              }
            }}
            placeholder={askEnabled ? "Search a security or ask a question…" : "Search security…"}
            className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 outline-none min-w-0"
            aria-label={askEnabled ? "Search securities or ask a question" : "Search securities"}
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
        <div className="absolute top-full right-0 mt-1 w-80 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
          {canAsk && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                void runAsk();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 border-b border-zinc-800/60 hover:bg-violet-600/10 transition-colors text-left"
            >
              <Sparkles className="size-3.5 text-violet-400 flex-shrink-0" />
              <span className="text-xs text-zinc-200 truncate">
                Ask the Dashboard: <span className="text-zinc-400">"{query.trim()}"</span>
              </span>
            </button>
          )}
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
        <div className="absolute top-full right-0 mt-1 w-72 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
          {canAsk && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                void runAsk();
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800/60 hover:bg-violet-600/10 transition-colors text-left"
            >
              <Sparkles className="size-3.5 text-violet-400 flex-shrink-0" />
              <span className="text-xs text-zinc-200 truncate">
                Ask the Dashboard: <span className="text-zinc-400">"{query.trim()}"</span>
              </span>
            </button>
          )}
          <div className="px-3 py-3 space-y-0.5">
            <p className="text-xs text-zinc-500">
              No security matches <span className="text-zinc-300">"{query}"</span>
            </p>
            <p className="text-[10px] text-zinc-600">
              {canAsk
                ? "Press Enter to ask the AI instead. Risk scores use World Bank WGI data where available."
                : "All loaded datasets searched. Risk scores use World Bank WGI data where available."}
            </p>
          </div>
        </div>
      )}

      {/* RAG answer / loading / error panel */}
      {askActive && (
        <div className="absolute top-full right-0 mt-1 w-96 max-w-[90vw] bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/60">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
              <Sparkles className="size-3.5 text-violet-400" /> Ask the Dashboard
            </span>
            <button
              type="button"
              onClick={() => setAsk(EMPTY_ASK)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label="Close answer"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto p-3">
            {ask.loading && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 className="size-3.5 animate-spin" /> Thinking…
              </div>
            )}

            {ask.error && (
              <p className="text-xs text-amber-400">{ask.error}</p>
            )}

            {ask.answer && (
              <div className="space-y-3">
                <p className="text-xs text-zinc-100 whitespace-pre-wrap leading-relaxed">{ask.answer}</p>
                {ask.sources.length > 0 && (
                  <div>
                    <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1">Sources</p>
                    <ol className="space-y-1">
                      {ask.sources.map((s, i) => {
                        const href = sourceHref(s.source, s.metadata);
                        const label = sourceLabel(s.source, s.metadata);
                        return (
                          <li key={s.id} className="flex items-center gap-1.5 text-[11px] text-zinc-300">
                            <span className="text-zinc-600">[{i + 1}]</span>
                            {sourceIcon(s.source)}
                            {href ? (
                              <a href={href} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline truncate">
                                {label}
                              </a>
                            ) : (
                              <span className="truncate">{label}</span>
                            )}
                            <span className="text-zinc-600 ml-auto flex-shrink-0">{(s.score * 100).toFixed(0)}%</span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
