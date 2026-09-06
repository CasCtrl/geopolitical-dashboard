import { useCallback, useMemo, useState } from "react";
import { Card } from "./ui/card";
import { Sparkles, Send, Loader2, AlertTriangle, FileText, Newspaper } from "lucide-react";
import { createApiClient, type RagAnswer } from "../api/sdk";

interface AskDashboardPanelProps {
  apiBaseUrl: string;
  datasetId?: string;
}

function sourceIcon(source: string) {
  if (source.startsWith("news:")) {
    return <Newspaper className="w-3.5 h-3.5 text-sky-400" />;
  }
  return <FileText className="w-3.5 h-3.5 text-zinc-400" />;
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

export function AskDashboardPanel({ apiBaseUrl, datasetId }: AskDashboardPanelProps) {
  const client = useMemo(() => createApiClient({ baseUrl: apiBaseUrl }), [apiBaseUrl]);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<RagAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = question.trim().length >= 3 && !loading;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const answer = await client.queryRag({ question: question.trim(), datasetId });
      setResult(answer);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to get an answer");
    } finally {
      setLoading(false);
    }
  }, [canSubmit, client, question, datasetId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const isEmptyIndex = result !== null && result.answer === null && (result.indexed ?? 0) === 0;
  const isBackendDown = result !== null && result.answer === null && result.indexed === null;

  return (
    <Card className="bg-zinc-900 border-zinc-700 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-violet-400" />
        <h2 className="text-white font-semibold text-sm">Ask the Dashboard</h2>
        <span className="text-zinc-500 text-xs">Grounded in your docs &amp; latest news</span>
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder="e.g. How is Value-at-Risk computed, and what news is driving energy risk this week?"
          className="w-full resize-none rounded-md bg-zinc-950 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-600 p-3 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <div className="flex items-center justify-between">
          <span className="text-zinc-600 text-xs">⌘/Ctrl + Enter to send</span>
          <button
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-violet-600 text-white hover:bg-violet-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {loading ? "Thinking…" : "Ask"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md p-2.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isEmptyIndex && (
        <div className="mt-3 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md p-2.5">
          No content is indexed yet. Run <code className="text-amber-300">npm run rag:ingest</code> to build the knowledge base.
        </div>
      )}

      {isBackendDown && (
        <div className="mt-3 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md p-2.5">
          The local model backend is unavailable. Ensure Ollama is running, then try again.
        </div>
      )}

      {result && result.answer && (
        <div className="mt-4 space-y-3">
          <div className="text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed">
            {result.answer}
          </div>

          {result.liveContextUsed && (
            <div className="text-xs text-emerald-400">Includes live portfolio holdings.</div>
          )}

          {result.sources.length > 0 && (
            <div>
              <div className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-1.5">
                Sources
              </div>
              <ol className="space-y-1">
                {result.sources.map((s, i) => {
                  const href = sourceHref(s.source, s.metadata);
                  const label = sourceLabel(s.source, s.metadata);
                  return (
                    <li key={s.id} className="flex items-center gap-2 text-xs text-zinc-300">
                      <span className="text-zinc-600">[{i + 1}]</span>
                      {sourceIcon(s.source)}
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:underline truncate"
                        >
                          {label}
                        </a>
                      ) : (
                        <span className="truncate">{label}</span>
                      )}
                      <span className="text-zinc-600 ml-auto shrink-0">
                        {(s.score * 100).toFixed(0)}%
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
