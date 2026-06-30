import { useState, useEffect, useMemo, useCallback } from 'react';
import { Newspaper, Loader, ExternalLink } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { generateMockNews, parseNewsForRisk, newsToRiskEvent, type NewsArticle, type NewsRiskEvent } from '../data/newsIntegration';

interface NewsFeedPanelProps {
  countryRisks: { [country: string]: number };
  portfolioCountries: string[];
  compact?: boolean;
  refreshToken?: number;
}

type NewsApiPayload = {
  articles?: unknown[];
};

type NewsApiEnvelope = {
  data?: NewsApiPayload;
};

export function NewsFeedPanel({ countryRisks: _countryRisks, portfolioCountries, compact = false, refreshToken = 0 }: NewsFeedPanelProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [riskEvents, setRiskEvents] = useState<NewsRiskEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all');
  const [showOnlyPortfolio, setShowOnlyPortfolio] = useState(true);

  const loadNews = useCallback(async () => {
    setIsLoading(true);
    try {
      let baseArticles: unknown[] = [];

      try {
        const response = await fetch('/api/news?limit=40');
        if (response.ok) {
          const rawPayload = (await response.json()) as NewsApiPayload | NewsApiEnvelope;
          const payload = 'data' in rawPayload && rawPayload.data
            ? rawPayload.data
            : (rawPayload as NewsApiPayload);
          baseArticles = payload.articles || [];
        }
      } catch {
        console.warn('[News] Bloomberg API route unavailable, using mock data');
      }

      if (baseArticles.length === 0) {
        baseArticles = generateMockNews();
      }

      // Parse articles for risk
      const parsedArticles = baseArticles
        .map((article) => {
          const parsed = parseNewsForRisk(article);
          if (parsed) {
            return parsed;
          }
          return null;
        })
        .filter((a) => a !== null) as NewsArticle[];

      // Convert to risk events
      const events = parsedArticles.map((a) => newsToRiskEvent(a));

      setArticles(parsedArticles);
      setRiskEvents(events);
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNews();
    // Refresh news every 30 minutes
    const interval = setInterval(loadNews, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadNews]);

  useEffect(() => {
    if (refreshToken > 0) {
      loadNews();
    }
  }, [refreshToken, loadNews]);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const categoryMatch = selectedCategory === 'all' || article.category === selectedCategory;

      const riskEvent = riskEvents.find((e) => e.articleId === article.id);
      const urgencyMatch =
        selectedUrgency === 'all' || (riskEvent && riskEvent.urgency === selectedUrgency);

      const portfolioMatch =
        !showOnlyPortfolio || article.countries.some((c) => portfolioCountries.includes(c));

      return categoryMatch && urgencyMatch && portfolioMatch;
    });
  }, [articles, riskEvents, selectedCategory, selectedUrgency, showOnlyPortfolio, portfolioCountries]);

  const categories = useMemo(() => {
    const cats = new Set(articles.map((a) => a.category));
    return Array.from(cats).sort();
  }, [articles]);

  const getUrgencyColor = (urgency: string) => {
    if (compact) {
      switch (urgency) {
        case 'critical':
          return 'bg-red-900/30 border-red-800 text-red-200';
        case 'high':
          return 'bg-orange-900/30 border-orange-800 text-orange-200';
        case 'medium':
          return 'bg-yellow-900/30 border-yellow-800 text-yellow-200';
        case 'low':
          return 'bg-emerald-900/30 border-emerald-800 text-emerald-200';
        default:
          return 'bg-zinc-900/30 border-zinc-800 text-zinc-200';
      }
    }
    switch (urgency) {
      case 'critical':
        return 'bg-red-900/30 border-red-800 text-red-200';
      case 'high':
        return 'bg-orange-900/30 border-orange-800 text-orange-200';
      case 'medium':
        return 'bg-yellow-900/30 border-yellow-800 text-yellow-200';
      case 'low':
        return 'bg-emerald-900/30 border-emerald-800 text-emerald-200';
      default:
        return 'bg-zinc-900/30 border-zinc-800 text-zinc-200';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    if (urgency === 'medium') return 'MODERATE';
    return urgency.toUpperCase();
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical':
      case 'high':
        return '🚨';
      case 'medium':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (compact) return 'text-zinc-200';
    if (riskScore >= 80) return 'text-red-400';
    if (riskScore >= 60) return 'text-orange-400';
    if (riskScore >= 40) return 'text-yellow-400';
    return 'text-blue-400';
  };

  const getCategoryColor = (category: string) => {
    if (compact) {
      return 'bg-zinc-900/50 text-zinc-300 border-zinc-800';
    }
    switch (category) {
      case 'political':
        return 'bg-purple-900/30 text-purple-200 border-purple-800';
      case 'economic':
        return 'bg-green-900/30 text-green-200 border-green-800';
      case 'conflict':
        return 'bg-red-900/30 text-red-200 border-red-800';
      case 'corruption':
        return 'bg-pink-900/30 text-pink-200 border-pink-800';
      case 'terrorism':
        return 'bg-orange-900/30 text-orange-200 border-orange-800';
      default:
        return 'bg-zinc-900/30 text-zinc-200 border-zinc-800';
    }
  };

  const portfolioImpactedCount = useMemo(() => {
    return articles.filter((a) => a.countries.some((c) => portfolioCountries.includes(c))).length;
  }, [articles, portfolioCountries]);

  const getSourceFallbackUrl = (source: string) => {
    const sourceName = (source || '').toLowerCase();
    if (sourceName.includes('bloomberg')) return 'https://www.bloomberg.com/markets';
    if (sourceName.includes('reuters')) return 'https://www.reuters.com/world/';
    if (sourceName.includes('associated press') || sourceName === 'ap') return 'https://apnews.com/world-news';
    if (sourceName.includes('bbc')) return 'https://www.bbc.com/news/world';
    if (sourceName.includes('al jazeera')) return 'https://www.aljazeera.com/news/';
    return '';
  };

  const getArticleUrl = (article: NewsArticle) => {
    const rawUrl = (article.url || '').trim();
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return rawUrl;
    }
    const sourceFallbackUrl = getSourceFallbackUrl(article.source);
    if (sourceFallbackUrl) {
      return sourceFallbackUrl;
    }

    const searchQuery = encodeURIComponent(`${article.title} ${article.source || ''}`.trim());
    return `https://news.google.com/search?q=${searchQuery}`;
  };

  return (
    <div className={`w-full ${compact ? 'space-y-2' : 'space-y-4'}`}>
      {/* Header */}
      {!compact && (
      <Card className="p-4 bg-zinc-950 border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Newspaper size={16} className="text-blue-400" />
            Geopolitical News Feed
          </h3>
          {isLoading && <Loader size={14} className="animate-spin text-blue-400" />}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-zinc-900 rounded p-2 border border-zinc-800 text-center">
            <div className="text-[10px] text-zinc-400">Total Articles</div>
            <div className="text-lg font-bold text-zinc-200">{articles.length}</div>
          </div>

          <div className="bg-zinc-900 rounded p-2 border border-zinc-800 text-center">
            <div className="text-[10px] text-zinc-400">Portfolio Impact</div>
            <div className="text-lg font-bold text-orange-400">{portfolioImpactedCount}</div>
          </div>

          <div className="bg-zinc-900 rounded p-2 border border-zinc-800 text-center">
            <div className="text-[10px] text-zinc-400">High Risk</div>
            <div className="text-lg font-bold text-red-400">
              {riskEvents.filter((e) => e.urgency === 'high' || e.urgency === 'critical').length}
            </div>
          </div>

          <div className="bg-zinc-900 rounded p-2 border border-zinc-800 text-center">
            <div className="text-[10px] text-zinc-400">Last Updated</div>
            <div className="text-xs font-bold text-blue-400">Just now</div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-2 bg-zinc-900 rounded border border-zinc-800">
          <div>
            <label className="text-[10px] text-zinc-400 mb-1 block">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 mb-1 block">Urgency</label>
            <select
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value)}
              className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100"
            >
              <option value="all">All Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 mb-1 block">Show</label>
            <select
              value={showOnlyPortfolio ? 'portfolio' : 'all'}
              onChange={(e) => setShowOnlyPortfolio(e.target.value === 'portfolio')}
              className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100"
            >
              <option value="all">All News</option>
              <option value="portfolio">Portfolio Countries</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 mb-1 block">&nbsp;</label>
            <Button
              onClick={loadNews}
              className="w-full text-xs bg-blue-600 hover:bg-blue-700 h-7"
            >
              Refresh
            </Button>
          </div>
        </div>
      </Card>
      )}

      {compact && (
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-zinc-900/60 border border-zinc-800 rounded">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full text-[10px] bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-zinc-200"
          >
            <option value="all">All</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={selectedUrgency}
            onChange={(e) => setSelectedUrgency(e.target.value)}
            className="w-full text-[10px] bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-zinc-200"
          >
            <option value="all">Urgency</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Moderate</option>
            <option value="low">Low</option>
          </select>
          <button
            onClick={() => setShowOnlyPortfolio((prev) => !prev)}
            className="text-[10px] bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            {showOnlyPortfolio ? 'Portfolio' : 'All News'}
          </button>
        </div>
      )}

      {/* Articles List */}
      <div className={`${compact ? 'space-y-1.5 max-h-[260px]' : 'space-y-3 max-h-[600px]'} overflow-y-auto pr-1 [scrollbar-gutter:stable]`}>
        {isLoading ? (
          <Card className="p-8 bg-zinc-950 border border-zinc-800 text-center">
            <Loader size={24} className="animate-spin mx-auto mb-2 text-blue-400" />
            <p className="text-xs text-zinc-400">Loading news articles...</p>
          </Card>
        ) : filteredArticles.length === 0 ? (
          <Card className="p-4 bg-zinc-950 border border-zinc-800 text-center">
            <p className="text-xs text-zinc-500">No articles match your filters</p>
          </Card>
        ) : (
          filteredArticles.map((article) => {
            const riskEvent = riskEvents.find((e) => e.articleId === article.id);
            const articleUrl = getArticleUrl(article);

            return (
              <Card
                key={article.id}
                className={`${compact ? 'p-2' : 'p-3'} bg-zinc-950 border ${getUrgencyColor(riskEvent?.urgency || 'low').split(' ')[1]}`}
              >
                <div className="space-y-2">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-zinc-100 leading-tight mb-1 line-clamp-2">
                        {articleUrl ? (
                          <a
                            href={articleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-300 transition-colors"
                          >
                            {!compact && `${getUrgencyIcon(riskEvent?.urgency || 'low')} `}{article.title}
                          </a>
                        ) : (
                          <>{!compact && `${getUrgencyIcon(riskEvent?.urgency || 'low')} `}{article.title}</>
                        )}
                      </h4>
                      <p className="text-[10px] text-zinc-500 line-clamp-2">
                        <span className="text-zinc-400">Summary:</span> {article.description}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className={`${compact ? 'text-xs' : 'text-sm'} font-bold ${getRiskColor(article.riskScore)}`}>
                        {article.riskScore}
                      </div>
                      <div className="text-[10px] text-zinc-500">Risk</div>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-400">
                    <span>{article.source}</span>
                    <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                  </div>

                  {/* Categories & Countries */}
                  <div className="flex flex-wrap gap-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getCategoryColor(article.category)}`}
                    >
                      {article.category}
                    </span>

                    {riskEvent && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getUrgencyColor(riskEvent.urgency).split(' ').slice(0, -1).join(' ')} ${
                          ['low', 'medium', 'high'].includes(riskEvent.urgency) ? 'text-white' : 'text-red-100'
                        }`}
                      >
                        {getUrgencyLabel(riskEvent.urgency)}
                      </span>
                    )}
                  </div>

                  {/* Affected Countries */}
                  <div className="flex flex-wrap gap-1">
                    {article.countries.map((country) => {
                      const isInPortfolio = portfolioCountries.includes(country);
                      return (
                        <span
                          key={country}
                          className={`px-1.5 py-0.5 rounded text-[10px] border ${
                            compact
                              ? 'bg-zinc-900/50 border-zinc-800 text-zinc-400'
                              : isInPortfolio
                              ? 'bg-amber-900/30 border-amber-800 text-amber-300'
                              : 'bg-zinc-800/50 border-zinc-700 text-zinc-400'
                          }`}
                        >
                          {country}
                        </span>
                      );
                    })}
                  </div>

                  {/* Action */}
                  {articleUrl && (
                    <a
                      href={articleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 mt-1"
                    >
                      <ExternalLink size={10} />
                      Read Full Article
                    </a>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Legend */}
      {!compact && (
      <Card className="p-3 bg-zinc-950 border border-zinc-800">
        <p className="text-xs text-zinc-400 mb-2 font-semibold">Risk Score Guide</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="text-[10px]">
            <span className="text-red-400 font-bold">80-100</span>
            <span className="text-zinc-500"> = Critical</span>
          </div>
          <div className="text-[10px]">
            <span className="text-orange-400 font-bold">60-79</span>
            <span className="text-zinc-500"> = High</span>
          </div>
          <div className="text-[10px]">
            <span className="text-yellow-400 font-bold">40-59</span>
            <span className="text-zinc-500"> = Medium</span>
          </div>
          <div className="text-[10px]">
            <span className="text-blue-400 font-bold">0-39</span>
            <span className="text-zinc-500"> = Low</span>
          </div>
        </div>
      </Card>
      )}
    </div>
  );
}
