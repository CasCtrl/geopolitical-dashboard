import express from 'express';

const router = express.Router();

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

router.get('/news', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '30', 10), 100);

  try {
    const responses = await Promise.allSettled(
      BLOOMBERG_FEEDS.map((url) => fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }))
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

    res.json({
      source: 'Bloomberg RSS',
      count: sorted.length,
      timestamp: new Date().toISOString(),
      articles: sorted,
    });
  } catch (error) {
    console.error('Failed to fetch Bloomberg news:', error);
    res.status(502).json({
      source: 'Bloomberg RSS',
      count: 0,
      timestamp: new Date().toISOString(),
      articles: [],
      error: 'Unable to fetch Bloomberg news feed',
    });
  }
});

export default router;
