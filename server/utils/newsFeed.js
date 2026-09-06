// Shared Bloomberg RSS fetching/parsing used by the /api/news route and RAG ingestion.

const BLOOMBERG_FEEDS = [
  'https://feeds.bloomberg.com/markets/news.rss',
  'https://feeds.bloomberg.com/politics/news.rss',
];

const WORLD_KEYWORDS = [
  'world',
  'global',
  'geopolitical',
  'conflict',
  'war',
  'sanction',
  'trade',
  'election',
  'economy',
  'crisis',
  'tension',
  'border',
  'oil',
  'china',
  'russia',
  'europe',
  'middle east',
  'us',
];

function decodeEntities(text = '') {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function stripCdata(text = '') {
  return text
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .trim();
}

function extractTag(item, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = item.match(regex);
  return match ? decodeEntities(stripCdata(match[1])) : '';
}

function parseRssItems(xmlText) {
  const itemMatches = xmlText.match(/<item[\s\S]*?<\/item>/gi) || [];

  return itemMatches.map((item, index) => {
    const title = extractTag(item, 'title');
    const description = extractTag(item, 'description');
    const url = extractTag(item, 'link');
    const publishedAt = extractTag(item, 'pubDate');
    const guid = extractTag(item, 'guid');

    return {
      id: guid || `bloomberg-${index}-${Date.now()}`,
      title,
      description,
      source: 'Bloomberg',
      url,
      image: '',
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString(),
    };
  });
}

function scoreWorldRelevance(article) {
  const text = `${article.title} ${article.description}`.toLowerCase();
  return WORLD_KEYWORDS.reduce((score, keyword) => {
    if (!text.includes(keyword)) return score;
    return score + 1;
  }, 0);
}

// Fetches, dedupes, and world-relevance-ranks Bloomberg news. Returns the top `limit`
// articles plus a fallbackUsed flag when no articles could be retrieved.
async function fetchWorldNews({ limit = 30 } = {}) {
  const responses = await Promise.allSettled(
    BLOOMBERG_FEEDS.map((url) =>
      fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'geopolitical-dashboard/1.1 (+server)' },
      })
    )
  );

  const xmlPayloads = await Promise.all(
    responses.map(async (result) => {
      if (result.status !== 'fulfilled' || !result.value.ok) return '';
      return result.value.text();
    })
  );

  const allArticles = xmlPayloads.flatMap((xmlText) => (xmlText ? parseRssItems(xmlText) : []));

  const deduped = new Map();
  allArticles.forEach((article) => {
    const key = article.url || article.id;
    if (!key) return;
    if (!deduped.has(key)) {
      deduped.set(key, article);
    }
  });

  const sorted = Array.from(deduped.values())
    .map((article) => ({ article, score: scoreWorldRelevance(article) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.article.publishedAt).getTime() - new Date(a.article.publishedAt).getTime();
    })
    .map((entry) => entry.article)
    .slice(0, limit);

  return { articles: sorted, fallbackUsed: sorted.length === 0 };
}

export {
  BLOOMBERG_FEEDS,
  WORLD_KEYWORDS,
  decodeEntities,
  stripCdata,
  extractTag,
  parseRssItems,
  scoreWorldRelevance,
  fetchWorldNews,
};
