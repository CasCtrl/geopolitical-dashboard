/**
 * Short Interest Live Data Route
 *
 * Fetches real-time price and short-interest metrics for the Top 25 Most Shorted
 * Stocks via Yahoo Finance v7/finance/quote (batched single request).
 *
 * Fields returned per ticker:
 *   price                     – regularMarketPrice
 *   changePercent             – regularMarketChangePercent
 *   shortPercentOfFloat       – % of float sold short
 *   sharesShort               – absolute shares short
 *   shortRatio                – days to cover (short ratio)
 *   source                    – "live" | "static"
 *
 * Cache TTL: 5 minutes.
 * Static fallback used when Yahoo Finance is unavailable (e.g. cloud IPs).
 */

import express from 'express';
import https from 'https';

const router = express.Router();

const CACHE_TTL_MS = 5 * 60 * 1000;
let siCache = null;
let siCacheTime = 0;

const SHORT25_TICKERS = [
  'GME','AMC','BYND','LCID','RIVN','PLUG','NKLA','FCEL',
  'UPST','CVNA','HOOD','COIN','SPCE','NIO','XPEV','OPEN',
  'SOFI','CLNE','WKHS','CLOV','MSTR','BBAI','SNDL','NOVA','JOBY',
];

// ─── Static fallback ─────────────────────────────────────────────────────────
// Representative values; clearly marked source:"static" in response.
const STATIC_DATA = [
  { ticker:'GME',  name:'GameStop Corp.',             price:23.41, changePercent:-1.82, shortPercentOfFloat:21.4, sharesShort:59800000,  shortRatio:2.1 },
  { ticker:'AMC',  name:'AMC Entertainment Holdings', price:3.87,  changePercent:-2.14, shortPercentOfFloat:18.9, sharesShort:97200000,  shortRatio:1.8 },
  { ticker:'BYND', name:'Beyond Meat Inc.',            price:5.12,  changePercent:-0.97, shortPercentOfFloat:39.7, sharesShort:22100000,  shortRatio:4.3 },
  { ticker:'LCID', name:'Lucid Group Inc.',            price:2.78,  changePercent:-1.44, shortPercentOfFloat:17.2, sharesShort:481000000, shortRatio:3.6 },
  { ticker:'RIVN', name:'Rivian Automotive Inc.',      price:11.34, changePercent:0.89,  shortPercentOfFloat:15.8, sharesShort:163000000, shortRatio:2.9 },
  { ticker:'PLUG', name:'Plug Power Inc.',             price:2.41,  changePercent:-3.21, shortPercentOfFloat:28.6, sharesShort:198000000, shortRatio:3.4 },
  { ticker:'NKLA', name:'Nikola Corporation',          price:0.74,  changePercent:-4.11, shortPercentOfFloat:32.1, sharesShort:58400000,  shortRatio:2.7 },
  { ticker:'FCEL', name:'FuelCell Energy Inc.',        price:0.81,  changePercent:-2.56, shortPercentOfFloat:24.8, sharesShort:43100000,  shortRatio:2.1 },
  { ticker:'UPST', name:'Upstart Holdings Inc.',       price:41.22, changePercent:1.34,  shortPercentOfFloat:26.3, sharesShort:22700000,  shortRatio:5.1 },
  { ticker:'CVNA', name:'Carvana Co.',                 price:183.47,changePercent:2.08,  shortPercentOfFloat:22.7, sharesShort:44300000,  shortRatio:4.8 },
  { ticker:'HOOD', name:'Robinhood Markets Inc.',      price:22.18, changePercent:0.63,  shortPercentOfFloat:9.4,  sharesShort:78800000,  shortRatio:1.6 },
  { ticker:'COIN', name:'Coinbase Global Inc.',        price:228.91,changePercent:3.47,  shortPercentOfFloat:11.2, sharesShort:26700000,  shortRatio:2.3 },
  { ticker:'SPCE', name:'Virgin Galactic Holdings',    price:1.94,  changePercent:-1.02, shortPercentOfFloat:19.6, sharesShort:21900000,  shortRatio:1.9 },
  { ticker:'NIO',  name:'NIO Inc.',                    price:4.63,  changePercent:-0.43, shortPercentOfFloat:8.1,  sharesShort:126000000, shortRatio:1.4 },
  { ticker:'XPEV', name:'XPeng Inc.',                  price:12.87, changePercent:0.31,  shortPercentOfFloat:7.3,  sharesShort:38900000,  shortRatio:2.2 },
  { ticker:'OPEN', name:'Opendoor Technologies Inc.',  price:2.13,  changePercent:-1.85, shortPercentOfFloat:16.4, sharesShort:89600000,  shortRatio:2.8 },
  { ticker:'SOFI', name:'SoFi Technologies Inc.',      price:12.44, changePercent:0.97,  shortPercentOfFloat:9.8,  sharesShort:101000000, shortRatio:2.1 },
  { ticker:'CLNE', name:'Clean Energy Fuels Corp.',    price:3.82,  changePercent:-0.78, shortPercentOfFloat:12.7, sharesShort:17400000,  shortRatio:3.1 },
  { ticker:'WKHS', name:'Workhorse Group Inc.',        price:0.63,  changePercent:-5.97, shortPercentOfFloat:29.4, sharesShort:11200000,  shortRatio:2.3 },
  { ticker:'CLOV', name:'Clover Health Investments',   price:1.47,  changePercent:-2.65, shortPercentOfFloat:14.8, sharesShort:21300000,  shortRatio:1.7 },
  { ticker:'MSTR', name:'MicroStrategy Inc.',          price:382.14,changePercent:4.23,  shortPercentOfFloat:22.1, sharesShort:13400000,  shortRatio:3.9 },
  { ticker:'BBAI', name:'BigBear.ai Holdings Inc.',    price:3.14,  changePercent:1.28,  shortPercentOfFloat:18.3, sharesShort:31700000,  shortRatio:4.2 },
  { ticker:'SNDL', name:'SNDL Inc.',                   price:1.87,  changePercent:-0.53, shortPercentOfFloat:11.6, sharesShort:28900000,  shortRatio:2.6 },
  { ticker:'NOVA', name:'Sunnova Energy International',price:1.24,  changePercent:-3.41, shortPercentOfFloat:31.8, sharesShort:47600000,  shortRatio:5.7 },
  { ticker:'JOBY', name:'Joby Aviation Inc.',          price:6.83,  changePercent:1.19,  shortPercentOfFloat:10.4, sharesShort:68100000,  shortRatio:3.3 },
];

// ─── Yahoo Finance fetch helper (Node https — not global fetch) ───────────────
function httpsGet(urlStr) {
  return new Promise((resolve) => {
    const url = new URL(urlStr);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Referer': 'https://finance.yahoo.com/',
        'Connection': 'keep-alive',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, data: JSON.parse(data) }); }
        catch { resolve({ ok: false, data: null }); }
      });
    });
    req.on('error', () => resolve({ ok: false, data: null }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, data: null }); });
    req.end();
  });
}

// ─── Fetch all 25 tickers in one batched call ─────────────────────────────────
async function fetchLiveShortData() {
  const symbols = SHORT25_TICKERS.join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=symbol,shortName,regularMarketPrice,regularMarketChangePercent,shortPercentOfFloat,sharesShort,shortRatio`;
  try {
    const { ok, data } = await httpsGet(url);
    if (!ok || !data) return null;
    const quotes = data?.quoteResponse?.result;
    if (!Array.isArray(quotes) || quotes.length === 0) return null;

    return quotes.map(q => ({
      ticker: q.symbol,
      name: q.shortName || q.symbol,
      price: parseFloat((q.regularMarketPrice ?? 0).toFixed(2)),
      changePercent: parseFloat((q.regularMarketChangePercent ?? 0).toFixed(2)),
      shortPercentOfFloat: q.shortPercentOfFloat != null
        ? parseFloat((q.shortPercentOfFloat * 100).toFixed(1))
        : null,
      sharesShort: q.sharesShort ?? null,
      shortRatio: q.shortRatio != null ? parseFloat(q.shortRatio.toFixed(1)) : null,
    }));
  } catch {
    return null;
  }
}

// ─── GET /api/short-interest ──────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const now = Date.now();

    // Serve from cache if still fresh
    if (siCache && now - siCacheTime < CACHE_TTL_MS) {
      return res.json(siCache);
    }

    // Attempt live fetch
    const liveData = await fetchLiveShortData();

    if (liveData && liveData.length > 0) {
      // Merge: live data first; fill any missing tickers from static fallback
      const liveMap = new Map(liveData.map(d => [d.ticker, d]));
      const merged = SHORT25_TICKERS.map(ticker => {
        const live = liveMap.get(ticker);
        if (live) return { ...live, source: 'live' };
        const fallback = STATIC_DATA.find(s => s.ticker === ticker);
        return fallback ? { ...fallback, source: 'static' } : null;
      }).filter(Boolean);

      siCache = { data: merged, fetchedAt: new Date().toISOString(), source: 'live' };
      siCacheTime = now;
      return res.json(siCache);
    }

    // Full static fallback
    const staticResult = {
      data: STATIC_DATA.map(d => ({ ...d, source: 'static' })),
      fetchedAt: new Date().toISOString(),
      source: 'static',
    };
    siCache = staticResult;
    siCacheTime = now;
    return res.json(staticResult);

  } catch (err) {
    console.error('[short-interest] Error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch short interest data' });
  }
});

export default router;
