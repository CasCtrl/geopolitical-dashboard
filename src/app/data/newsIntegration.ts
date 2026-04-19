/**
 * News API Integration
 * Fetches geopolitical news and converts to risk events
 */

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  image: string;
  publishedAt: string;
  countries: string[];
  riskKeywords: string[];
  riskScore: number; // 0-100
  category: 'political' | 'economic' | 'conflict' | 'corruption' | 'terrorism' | 'other';
}

export interface NewsRiskEvent {
  articleId: string;
  title: string;
  affectedCountries: string[];
  riskAdjustment: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

type SourceArticle = {
  title?: string;
  description?: string;
  content?: string;
  source?: { name?: string };
  url?: string;
  urlToImage?: string;
  publishedAt?: string;
};

const STORAGE_KEY_NEWS = 'geopolitical_news_cache';
const NEWS_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Risk keywords mapping
const RISK_KEYWORDS: { [key: string]: string } = {
  // Political
  'military': 'political',
  'conflict': 'conflict',
  'war': 'conflict',
  'invasion': 'conflict',
  'coup': 'political',
  'government': 'political',
  'election': 'political',
  'sanctions': 'political',
  'tension': 'conflict',
  'border': 'conflict',

  // Economic
  'recession': 'economic',
  'inflation': 'economic',
  'trade': 'economic',
  'tariff': 'economic',
  'bankruptcy': 'economic',
  'currency': 'economic',
  'debt': 'economic',
  'crisis': 'economic',

  // Corruption
  'corruption': 'corruption',
  'bribery': 'corruption',
  'fraud': 'corruption',
  'scandal': 'corruption',

  // Terrorism
  'terrorism': 'terrorism',
  'attack': 'terrorism',
  'bombing': 'terrorism',
  'hostage': 'terrorism',

  // Supply chain
  'supply': 'economic',
  'chain': 'economic',
  'export': 'economic',
  'import': 'economic',
};

// Country keywords
const COUNTRY_KEYWORDS: { [key: string]: string[] } = {
  'United States': ['US', 'USA', 'America', 'American'],
  China: ['China', 'Chinese', 'Beijing'],
  Russia: ['Russia', 'Russian', 'Putin'],
  'Middle East': ['Middle East', 'Iran', 'Saudi Arabia', 'Israel'],
  Europe: ['Europe', 'EU', 'European'],
  India: ['India', 'Indian', 'Delhi'],
  Japan: ['Japan', 'Japanese', 'Tokyo'],
  Taiwan: ['Taiwan', 'Taipei'],
  'South Korea': ['South Korea', 'Korea', 'Seoul'],
  Ukraine: ['Ukraine', 'Ukrainian', 'Kyiv'],
  'United Kingdom': ['UK', 'Britain', 'British'],
  Germany: ['Germany', 'German', 'Berlin'],
  France: ['France', 'French', 'Paris'],
  Brazil: ['Brazil', 'Brazilian'],
  Mexico: ['Mexico', 'Mexican'],
  Canada: ['Canada', 'Canadian'],
};

/**
 * Parse news article for risk information
 */
export function parseNewsForRisk(article: unknown): NewsArticle | null {
  const sourceArticle = (article as SourceArticle) || {};
  const title = sourceArticle.title || '';
  const description = sourceArticle.description || sourceArticle.content || '';
  const fullText = `${title} ${description}`.toLowerCase();

  // Extract countries
  const countries: string[] = [];
  for (const [country, keywords] of Object.entries(COUNTRY_KEYWORDS)) {
    for (const keyword of keywords as string[]) {
      if (fullText.includes(keyword.toLowerCase())) {
        if (!countries.includes(country)) {
          countries.push(country);
        }
      }
    }
  }

  if (countries.length === 0) return null;

  // Extract risk keywords and category
  const riskKeywords: string[] = [];
  let category: NewsArticle['category'] = 'other';
  let maxScore = 0;

  for (const [keyword, cat] of Object.entries(RISK_KEYWORDS)) {
    if (fullText.includes(keyword)) {
      riskKeywords.push(keyword);
      // Score increases based on keyword occurrence
      const occurrences = (fullText.match(new RegExp(keyword, 'g')) || []).length;
      const score = Math.min(100, occurrences * 10);
      if (score > maxScore) {
        maxScore = score;
        category = cat as NewsArticle['category'];
      }
    }
  }

  // Require at least one risk keyword
  if (riskKeywords.length === 0) return null;

  // Calculate risk score (0-100)
  let riskScore = Math.min(100, riskKeywords.length * 15 + (countries.length > 1 ? 10 : 0));

  // Boost for critical keywords
  if (title.includes('attack') || title.includes('war') || title.includes('crisis')) {
    riskScore = Math.min(100, riskScore + 20);
  }

  return {
    id: `news-${Date.now()}-${Math.random()}`,
    title,
    description: description.substring(0, 200),
    source: sourceArticle.source?.name || 'Unknown Source',
    url: sourceArticle.url || '',
    image: sourceArticle.urlToImage || '',
    publishedAt: sourceArticle.publishedAt || new Date().toISOString(),
    countries,
    riskKeywords,
    riskScore,
    category,
  };
}

/**
 * Convert news article to risk event
 */
export function newsToRiskEvent(article: NewsArticle): NewsRiskEvent {
  // Determine urgency based on risk score
  let urgency: NewsRiskEvent['urgency'] = 'low';
  if (article.riskScore >= 80) urgency = 'critical';
  else if (article.riskScore >= 60) urgency = 'high';
  else if (article.riskScore >= 40) urgency = 'medium';

  // Calculate risk adjustment (0-20 points)
  const riskAdjustment = Math.round((article.riskScore / 100) * 20 * 10) / 10;

  return {
    articleId: article.id,
    title: article.title,
    affectedCountries: article.countries,
    riskAdjustment,
    urgency,
    category: article.category,
  };
}

/**
 * Mock news fetching (for demo without API key)
 */
export function generateMockNews(): NewsArticle[] {
  const mockArticles = [
    {
      title: 'Trade tensions escalate between US and China',
      description: 'New tariffs imposed on technology imports',
      countries: ['United States', 'China'],
      riskScore: 65,
      category: 'economic',
    },
    {
      title: 'European markets rally on economic recovery signals',
      description: 'EU economic growth exceeds expectations',
      countries: ['Europe', 'Germany', 'France'],
      riskScore: 15,
      category: 'economic',
    },
    {
      title: 'Regional military tensions near Taiwan',
      description: 'Increased military activity reported',
      countries: ['China', 'Taiwan', 'United States'],
      riskScore: 75,
      category: 'conflict',
    },
    {
      title: 'Russian energy exports face new restrictions',
      description: 'Additional sanctions on oil and gas sectors',
      countries: ['Russia', 'Europe'],
      riskScore: 70,
      category: 'political',
    },
    {
      title: 'Emerging markets gain investor interest',
      description: 'India and Brazil show strong growth',
      countries: ['India', 'Brazil'],
      riskScore: 20,
      category: 'economic',
    },
  ];

  return mockArticles.map((article, idx) => ({
    id: `mock-news-${idx}`,
    title: article.title,
    description: article.description,
    source: 'Mock News Source',
    url: '#',
    image: '',
    publishedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
    countries: article.countries,
    riskKeywords: ['military', 'trade', 'tension', 'sanctions'].slice(0, Math.floor(Math.random() * 3) + 1),
    riskScore: article.riskScore,
    category: article.category as NewsArticle['category'],
  }));
}

/**
 * Fetch news with API (requires NewsAPI key)
 * Fallback to mock news if API not available
 */
export async function fetchGeopoliticalNews(useCache: boolean = true): Promise<NewsArticle[]> {
  try {
    // Check cache first
    if (useCache) {
      const cached = localStorage.getItem(STORAGE_KEY_NEWS);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < NEWS_CACHE_DURATION) {
          console.log('[News] Using cached articles');
          return data;
        }
      }
    }

    // Try to fetch from NewsAPI (would need API key in production)
    // For now, return mock news
    const news = generateMockNews();

    // Cache results
    try {
      localStorage.setItem(
        STORAGE_KEY_NEWS,
        JSON.stringify({
          data: news,
          timestamp: Date.now(),
        })
      );
    } catch {
      console.warn('[News] Failed to cache articles');
    }

    return news;
  } catch (error) {
    console.error('[News] Failed to fetch news:', error);
    // Fallback to mock news
    return generateMockNews();
  }
}

/**
 * Get recent high-risk news articles
 */
export function getHighRiskNews(articles: NewsArticle[], threshold: number = 60): NewsArticle[] {
  return articles
    .filter((a) => a.riskScore >= threshold)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 10);
}

/**
 * Get news by category
 */
export function getNewsByCategory(
  articles: NewsArticle[],
  category: NewsArticle['category']
): NewsArticle[] {
  return articles
    .filter((a) => a.category === category)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

/**
 * Get news affecting specific country
 */
export function getNewsForCountry(articles: NewsArticle[], country: string): NewsArticle[] {
  return articles
    .filter((a) => a.countries.includes(country))
    .sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Calculate aggregate risk from news
 */
export function calculateNewsRiskAggregate(articles: NewsArticle[]): {
  averageRisk: number;
  criticalArticles: number;
  affectedCountries: Set<string>;
  topThreats: string[];
} {
  const averageRisk = articles.length > 0 ? articles.reduce((a, b) => a + b.riskScore, 0) / articles.length : 0;
  const criticalArticles = articles.filter((a) => a.riskScore >= 75).length;

  const affectedCountries = new Set<string>();
  const categoryCount: { [key: string]: number } = {};

  articles.forEach((article) => {
    article.countries.forEach((c) => affectedCountries.add(c));
    categoryCount[article.category] = (categoryCount[article.category] || 0) + 1;
  });

  const topThreats = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category);

  return {
    averageRisk: Math.round(averageRisk * 10) / 10,
    criticalArticles,
    affectedCountries,
    topThreats,
  };
}

/**
 * Clear news cache
 */
export function clearNewsCache(): void {
  localStorage.removeItem(STORAGE_KEY_NEWS);
  console.log('[News] Cleared cache');
}
