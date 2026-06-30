/**
 * S&P 500 Daily Top Performers Route
 *
 * Fetches today's top gainers via Yahoo Finance v8/chart using Node's built-in
 * https module (not global fetch — Yahoo blocks it).  Falls back to a curated
 * static list when Yahoo Finance is unavailable.
 *
 * Cache TTL: 15 minutes.
 */

import express from 'express';
import https from 'https';

const router = express.Router();

const CACHE_TTL_MS = 15 * 60 * 1000;
let spCache = null;
let spCacheTime = 0;

// ─── S&P 500 universe to scan ─────────────────────────────────────────────────
const SP500_UNIVERSE = [
  'AAPL','MSFT','NVDA','AMZN','META','GOOGL','TSLA','BRK-B','LLY',
  'V','AVGO','JPM','UNH','WMT','MA','XOM','PG','COST','HD',
  'JNJ','ABBV','BAC','MRK','CRM','CVX','AMD','NFLX','PEP','ORCL',
  'KO','TMO','ACN','CSCO','ADBE','WFC','MCD','ABT','DIS','LIN',
  'GE','CAT','INTU','AMGN','PM','NOW','QCOM','TXN','HON','NKE',
  'RTX','LOW','UNP','SPGI','MS','BLK','ELV','DE','AMAT','ADI',
  'AXP','GS','SYK','ISRG','PANW','REGN','SBUX','CI','BMY','GILD',
  'KLAC','VRTX','ETN','MU','LRCX','PGR','ZTS','CME','TJX','NOC',
  'NEE','DUK','SO','PWR',
];

// ─── Sector lookup ─────────────────────────────────────────────────────────────
const TICKER_SECTOR = {
  AAPL:'Technology', MSFT:'Technology', NVDA:'Technology', AMZN:'Consumer Cyclical',
  META:'Communication Services', GOOGL:'Communication Services', GOOG:'Communication Services',
  TSLA:'Consumer Cyclical', 'BRK-B':'Financial Services', LLY:'Healthcare',
  V:'Financial Services', AVGO:'Technology', JPM:'Financial Services', UNH:'Healthcare',
  WMT:'Consumer Defensive', MA:'Financial Services', XOM:'Energy', PG:'Consumer Defensive',
  COST:'Consumer Defensive', HD:'Consumer Cyclical', JNJ:'Healthcare', ABBV:'Healthcare',
  BAC:'Financial Services', MRK:'Healthcare', CRM:'Technology', CVX:'Energy',
  AMD:'Technology', NFLX:'Communication Services', PEP:'Consumer Defensive', ORCL:'Technology',
  KO:'Consumer Defensive', TMO:'Healthcare', ACN:'Technology', CSCO:'Technology',
  ADBE:'Technology', WFC:'Financial Services', MCD:'Consumer Cyclical', ABT:'Healthcare',
  DIS:'Communication Services', LIN:'Basic Materials', GE:'Industrials', CAT:'Industrials',
  INTU:'Technology', AMGN:'Healthcare', PM:'Consumer Defensive', NOW:'Technology',
  QCOM:'Technology', TXN:'Technology', HON:'Industrials', NKE:'Consumer Cyclical',
  RTX:'Industrials', LOW:'Consumer Cyclical', UNP:'Industrials', SPGI:'Financial Services',
  MS:'Financial Services', BLK:'Financial Services', ELV:'Healthcare', DE:'Industrials',
  AMAT:'Technology', ADI:'Technology', AXP:'Financial Services', GS:'Financial Services',
  SYK:'Healthcare', ISRG:'Healthcare', PANW:'Technology', REGN:'Healthcare',
  SBUX:'Consumer Cyclical', CI:'Healthcare', BMY:'Healthcare', GILD:'Healthcare',
  KLAC:'Technology', VRTX:'Healthcare', ETN:'Industrials', MU:'Technology',
  LRCX:'Technology', PGR:'Financial Services', ZTS:'Healthcare', CME:'Financial Services',
  TJX:'Consumer Cyclical', NOC:'Industrials', NEE:'Utilities', DUK:'Utilities',
  SO:'Utilities', PWR:'Industrials',
};

// ─── Static fallback (plausible sample — NOT live) ────────────────────────────
const STATIC_PERFORMERS = [
  {symbol:'NVDA', shortName:'NVIDIA Corporation',         sector:'Technology',             regularMarketChangePercent:4.82, regularMarketPrice:138.20, marketCap:3.38e12},
  {symbol:'AMD',  shortName:'Advanced Micro Devices',     sector:'Technology',             regularMarketChangePercent:3.91, regularMarketPrice:167.45, marketCap:2.71e11},
  {symbol:'PANW', shortName:'Palo Alto Networks',         sector:'Technology',             regularMarketChangePercent:3.45, regularMarketPrice:354.10, marketCap:2.31e11},
  {symbol:'NOW',  shortName:'ServiceNow Inc.',            sector:'Technology',             regularMarketChangePercent:3.12, regularMarketPrice:942.30, marketCap:1.91e11},
  {symbol:'AVGO', shortName:'Broadcom Inc.',              sector:'Technology',             regularMarketChangePercent:2.98, regularMarketPrice:192.80, marketCap:9.05e11},
  {symbol:'META', shortName:'Meta Platforms Inc.',        sector:'Communication Services', regularMarketChangePercent:2.75, regularMarketPrice:621.40, marketCap:1.57e12},
  {symbol:'MSFT', shortName:'Microsoft Corporation',      sector:'Technology',             regularMarketChangePercent:2.41, regularMarketPrice:465.20, marketCap:3.45e12},
  {symbol:'CRM',  shortName:'Salesforce Inc.',            sector:'Technology',             regularMarketChangePercent:2.28, regularMarketPrice:318.60, marketCap:3.11e11},
  {symbol:'ISRG', shortName:'Intuitive Surgical Inc.',    sector:'Healthcare',             regularMarketChangePercent:2.14, regularMarketPrice:492.30, marketCap:1.74e11},
  {symbol:'LLY',  shortName:'Eli Lilly and Company',      sector:'Healthcare',             regularMarketChangePercent:2.03, regularMarketPrice:893.50, marketCap:8.48e11},
  {symbol:'AMAT', shortName:'Applied Materials Inc.',     sector:'Technology',             regularMarketChangePercent:1.98, regularMarketPrice:189.40, marketCap:2.43e11},
  {symbol:'GS',   shortName:'Goldman Sachs Group',        sector:'Financial Services',     regularMarketChangePercent:1.87, regularMarketPrice:583.20, marketCap:1.96e11},
  {symbol:'CAT',  shortName:'Caterpillar Inc.',           sector:'Industrials',            regularMarketChangePercent:1.76, regularMarketPrice:358.90, marketCap:1.76e11},
  {symbol:'GE',   shortName:'GE Aerospace',               sector:'Industrials',            regularMarketChangePercent:1.65, regularMarketPrice:197.30, marketCap:2.14e11},
  {symbol:'GOOGL',shortName:'Alphabet Inc.',              sector:'Communication Services', regularMarketChangePercent:1.54, regularMarketPrice:196.40, marketCap:2.41e12},
  {symbol:'AMZN', shortName:'Amazon.com Inc.',            sector:'Consumer Cyclical',      regularMarketChangePercent:1.48, regularMarketPrice:218.70, marketCap:2.32e12},
  {symbol:'QCOM', shortName:'QUALCOMM Incorporated',      sector:'Technology',             regularMarketChangePercent:1.41, regularMarketPrice:183.60, marketCap:1.98e11},
  {symbol:'ABBV', shortName:'AbbVie Inc.',                sector:'Healthcare',             regularMarketChangePercent:1.35, regularMarketPrice:198.40, marketCap:3.50e11},
  {symbol:'MS',   shortName:'Morgan Stanley',             sector:'Financial Services',     regularMarketChangePercent:1.28, regularMarketPrice:122.80, marketCap:2.01e11},
  {symbol:'NKE',  shortName:'Nike Inc.',                  sector:'Consumer Cyclical',      regularMarketChangePercent:1.21, regularMarketPrice:73.40,  marketCap:1.11e11},
  {symbol:'TSLA', shortName:'Tesla Inc.',                 sector:'Consumer Cyclical',      regularMarketChangePercent:1.14, regularMarketPrice:354.80, marketCap:1.13e12},
  {symbol:'JPM',  shortName:'JPMorgan Chase & Co.',       sector:'Financial Services',     regularMarketChangePercent:1.08, regularMarketPrice:249.60, marketCap:7.06e11},
  {symbol:'CVX',  shortName:'Chevron Corporation',        sector:'Energy',                 regularMarketChangePercent:0.97, regularMarketPrice:148.20, marketCap:2.77e11},
  {symbol:'XOM',  shortName:'Exxon Mobil Corporation',    sector:'Energy',                 regularMarketChangePercent:0.91, regularMarketPrice:112.30, marketCap:4.47e11},
  {symbol:'NEE',  shortName:'NextEra Energy Inc.',        sector:'Utilities',              regularMarketChangePercent:0.84, regularMarketPrice:74.80,  marketCap:1.52e11},
];

// ─── Per-company country dependency map ───────────────────────────────────────
const COMPANY_DEPS = {
  AAPL:[{country:'United States',weight:0.40,type:'direct',reason:'HQ, primary market & retail'},{country:'China',weight:0.30,type:'indirect',reason:'Manufacturing & consumer market'},{country:'Taiwan',weight:0.15,type:'indirect',reason:'TSMC chip fabrication'},{country:'India',weight:0.15,type:'indirect',reason:'Expanding manufacturing base'}],
  MSFT:[{country:'United States',weight:0.55,type:'direct',reason:'HQ, Azure & enterprise'},{country:'China',weight:0.15,type:'direct',reason:'Cloud & enterprise revenue'},{country:'Germany',weight:0.15,type:'direct',reason:'EU cloud compliance hub'},{country:'India',weight:0.15,type:'indirect',reason:'Engineering & delivery center'}],
  NVDA:[{country:'Taiwan',weight:0.40,type:'indirect',reason:'TSMC sole fab partner'},{country:'United States',weight:0.30,type:'direct',reason:'HQ & primary customer base'},{country:'China',weight:0.20,type:'direct',reason:'Data center & gaming'},{country:'South Korea',weight:0.10,type:'indirect',reason:'Memory (Samsung/SK Hynix)'}],
  AMZN:[{country:'United States',weight:0.50,type:'direct',reason:'Retail & AWS primary market'},{country:'India',weight:0.20,type:'direct',reason:'E-commerce & AWS expansion'},{country:'Germany',weight:0.15,type:'direct',reason:'Amazon.de & AWS Europe'},{country:'China',weight:0.15,type:'indirect',reason:'Supply chain & third-party sellers'}],
  META:[{country:'United States',weight:0.45,type:'direct',reason:'HQ & primary ad revenue'},{country:'India',weight:0.20,type:'direct',reason:'Largest user base globally'},{country:'Brazil',weight:0.10,type:'direct',reason:'Large user base'},{country:'Germany',weight:0.15,type:'direct',reason:'EU regulation & ad revenue'},{country:'Indonesia',weight:0.10,type:'direct',reason:'Fast-growing market'}],
  GOOGL:[{country:'United States',weight:0.55,type:'direct',reason:'HQ, ads & cloud'},{country:'India',weight:0.20,type:'direct',reason:'Large user base & engineering'},{country:'Germany',weight:0.15,type:'direct',reason:'EU ad revenue & GDPR'},{country:'China',weight:0.10,type:'macro',reason:'Regulatory environment'}],
  GOOG:[{country:'United States',weight:0.55,type:'direct',reason:'HQ, ads & cloud'},{country:'India',weight:0.20,type:'direct',reason:'Large user base & engineering'},{country:'Germany',weight:0.15,type:'direct',reason:'EU ad revenue & GDPR'},{country:'China',weight:0.10,type:'macro',reason:'Regulatory environment'}],
  TSLA:[{country:'United States',weight:0.35,type:'direct',reason:'HQ & primary market'},{country:'China',weight:0.30,type:'direct',reason:'Shanghai Gigafactory & sales'},{country:'Germany',weight:0.15,type:'direct',reason:'Berlin Gigafactory'},{country:'Chile',weight:0.10,type:'indirect',reason:'Lithium supply chain'},{country:'Australia',weight:0.10,type:'indirect',reason:'Lithium & nickel'}],
  'BRK-B':[{country:'United States',weight:0.70,type:'direct',reason:'Primary operations & investments'},{country:'Japan',weight:0.15,type:'direct',reason:'Stakes in five trading houses'},{country:'China',weight:0.10,type:'direct',reason:'BYD equity stake'},{country:'Canada',weight:0.05,type:'direct',reason:'BNSF Railway'}],
  LLY:[{country:'United States',weight:0.55,type:'direct',reason:'HQ & primary drug market'},{country:'Germany',weight:0.15,type:'direct',reason:'European operations'},{country:'Japan',weight:0.10,type:'direct',reason:'Asian market'},{country:'China',weight:0.10,type:'direct',reason:'Growing pharma market'},{country:'Ireland',weight:0.10,type:'direct',reason:'Manufacturing hub'}],
  V:[{country:'United States',weight:0.40,type:'direct',reason:'HQ & largest market'},{country:'India',weight:0.15,type:'direct',reason:'Digital payments growth'},{country:'Brazil',weight:0.10,type:'direct',reason:'Large payments market'},{country:'United Kingdom',weight:0.15,type:'direct',reason:'European hub'},{country:'Germany',weight:0.10,type:'direct',reason:'EU processing'},{country:'China',weight:0.10,type:'macro',reason:'Market access tensions'}],
  AVGO:[{country:'United States',weight:0.40,type:'direct',reason:'HQ & primary customer base'},{country:'Taiwan',weight:0.30,type:'indirect',reason:'TSMC fabrication'},{country:'China',weight:0.15,type:'direct',reason:'Significant end-market revenue'},{country:'South Korea',weight:0.10,type:'indirect',reason:'Memory partners'},{country:'Singapore',weight:0.05,type:'direct',reason:'APAC hub'}],
  JPM:[{country:'United States',weight:0.60,type:'direct',reason:'HQ & primary banking'},{country:'United Kingdom',weight:0.15,type:'direct',reason:'London IB hub'},{country:'China',weight:0.10,type:'direct',reason:'Securities JV'},{country:'India',weight:0.15,type:'indirect',reason:'Operations & tech'}],
  UNH:[{country:'United States',weight:0.80,type:'direct',reason:'Primary insurance operations'},{country:'Brazil',weight:0.10,type:'direct',reason:'Optum International'},{country:'Colombia',weight:0.05,type:'direct',reason:'LatAm healthcare'},{country:'Chile',weight:0.05,type:'direct',reason:'LatAm healthcare'}],
  WMT:[{country:'United States',weight:0.60,type:'direct',reason:'Primary retail operations'},{country:'China',weight:0.15,type:'indirect',reason:'Supply chain sourcing'},{country:'India',weight:0.10,type:'direct',reason:'Flipkart e-commerce'},{country:'Mexico',weight:0.10,type:'direct',reason:'Walmex stores'},{country:'Canada',weight:0.05,type:'direct',reason:'Canadian retail'}],
  MA:[{country:'United States',weight:0.40,type:'direct',reason:'HQ & largest market'},{country:'India',weight:0.15,type:'direct',reason:'Digital payments growth'},{country:'Brazil',weight:0.10,type:'direct',reason:'Large payments market'},{country:'United Kingdom',weight:0.15,type:'direct',reason:'European operations hub'},{country:'Germany',weight:0.10,type:'direct',reason:'EU payments'},{country:'Russia',weight:0.05,type:'macro',reason:'Sanctions impact'},{country:'South Africa',weight:0.05,type:'direct',reason:'Africa hub'}],
  XOM:[{country:'United States',weight:0.40,type:'direct',reason:'HQ & domestic operations'},{country:'Guyana',weight:0.15,type:'direct',reason:'Major offshore oil project'},{country:'Iraq',weight:0.10,type:'direct',reason:'Basra operations'},{country:'Canada',weight:0.10,type:'direct',reason:'Oil sands'},{country:'Australia',weight:0.15,type:'direct',reason:'LNG operations'},{country:'Saudi Arabia',weight:0.10,type:'indirect',reason:'OPEC pricing'}],
  PG:[{country:'United States',weight:0.40,type:'direct',reason:'HQ & primary market'},{country:'China',weight:0.15,type:'direct',reason:'Consumer products market'},{country:'Germany',weight:0.15,type:'direct',reason:'European ops hub'},{country:'India',weight:0.10,type:'direct',reason:'Consumer goods market'},{country:'Brazil',weight:0.10,type:'direct',reason:'LatAm ops'},{country:'Russia',weight:0.10,type:'macro',reason:'Market exit impact'}],
  COST:[{country:'United States',weight:0.65,type:'direct',reason:'Primary warehouse operations'},{country:'Canada',weight:0.10,type:'direct',reason:'Canadian stores'},{country:'China',weight:0.10,type:'indirect',reason:'Supply chain sourcing'},{country:'Japan',weight:0.05,type:'direct',reason:'Japan operations'},{country:'Mexico',weight:0.05,type:'direct',reason:'Mexico stores'},{country:'Australia',weight:0.05,type:'direct',reason:'Australia operations'}],
  HD:[{country:'United States',weight:0.70,type:'direct',reason:'Primary retail operations'},{country:'Canada',weight:0.15,type:'direct',reason:'Canadian stores'},{country:'Mexico',weight:0.10,type:'direct',reason:'Mexican operations'},{country:'China',weight:0.05,type:'indirect',reason:'Supply chain sourcing'}],
  JNJ:[{country:'United States',weight:0.50,type:'direct',reason:'HQ & primary market'},{country:'Germany',weight:0.10,type:'direct',reason:'European operations'},{country:'China',weight:0.15,type:'direct',reason:'Asia-Pacific market'},{country:'India',weight:0.10,type:'indirect',reason:'Pharmaceutical supply chain'},{country:'Belgium',weight:0.15,type:'direct',reason:'Janssen HQ & R&D'}],
  ABBV:[{country:'United States',weight:0.60,type:'direct',reason:'Primary market'},{country:'Germany',weight:0.15,type:'direct',reason:'European operations'},{country:'Japan',weight:0.10,type:'direct',reason:'Asia market'},{country:'Ireland',weight:0.15,type:'direct',reason:'Manufacturing & tax base'}],
  BAC:[{country:'United States',weight:0.65,type:'direct',reason:'HQ & primary banking'},{country:'United Kingdom',weight:0.15,type:'direct',reason:'European operations'},{country:'China',weight:0.10,type:'macro',reason:'Market exposure'},{country:'India',weight:0.10,type:'indirect',reason:'Tech & operations'}],
  MRK:[{country:'United States',weight:0.55,type:'direct',reason:'HQ & primary market'},{country:'Germany',weight:0.15,type:'direct',reason:'European market'},{country:'China',weight:0.10,type:'direct',reason:'Asia market'},{country:'India',weight:0.10,type:'indirect',reason:'API supply chain'},{country:'Japan',weight:0.10,type:'direct',reason:'Japan market'}],
  CRM:[{country:'United States',weight:0.55,type:'direct',reason:'HQ & primary customer base'},{country:'United Kingdom',weight:0.15,type:'direct',reason:'European HQ'},{country:'Germany',weight:0.10,type:'direct',reason:'Enterprise market'},{country:'India',weight:0.20,type:'indirect',reason:'Engineering & delivery'}],
  CVX:[{country:'United States',weight:0.45,type:'direct',reason:'HQ & domestic production'},{country:'Kazakhstan',weight:0.15,type:'direct',reason:'Tengiz oil field'},{country:'Nigeria',weight:0.10,type:'direct',reason:'Offshore production'},{country:'Australia',weight:0.15,type:'direct',reason:'LNG operations'},{country:'Venezuela',weight:0.10,type:'macro',reason:'Sanctions & asset exposure'},{country:'Saudi Arabia',weight:0.05,type:'indirect',reason:'OPEC pricing'}],
  AMD:[{country:'Taiwan',weight:0.45,type:'indirect',reason:'TSMC sole fab partner'},{country:'United States',weight:0.30,type:'direct',reason:'HQ & primary market'},{country:'China',weight:0.15,type:'direct',reason:'Gaming & data center'},{country:'South Korea',weight:0.10,type:'indirect',reason:'Memory supply chain'}],
  NFLX:[{country:'United States',weight:0.40,type:'direct',reason:'HQ & primary subscriber base'},{country:'Brazil',weight:0.10,type:'direct',reason:'LatAm growth market'},{country:'India',weight:0.10,type:'direct',reason:'Asia expansion'},{country:'United Kingdom',weight:0.15,type:'direct',reason:'European market'},{country:'Germany',weight:0.10,type:'direct',reason:'European market'},{country:'France',weight:0.10,type:'direct',reason:'European market'},{country:'Japan',weight:0.05,type:'direct',reason:'Asia market'}],
  GS:[{country:'United States',weight:0.55,type:'direct',reason:'HQ & IB operations'},{country:'United Kingdom',weight:0.20,type:'direct',reason:'London trading hub'},{country:'China',weight:0.10,type:'direct',reason:'JV & market access'},{country:'Japan',weight:0.10,type:'direct',reason:'Tokyo operations'},{country:'India',weight:0.05,type:'indirect',reason:'Operations & tech'}],
  MS:[{country:'United States',weight:0.55,type:'direct',reason:'HQ & primary market'},{country:'United Kingdom',weight:0.20,type:'direct',reason:'European hub'},{country:'Japan',weight:0.10,type:'direct',reason:'Mitsubishi UFJ JV'},{country:'China',weight:0.10,type:'direct',reason:'Securities JV'},{country:'India',weight:0.05,type:'indirect',reason:'Operations'}],
  GE:[{country:'United States',weight:0.45,type:'direct',reason:'HQ & aerospace'},{country:'France',weight:0.15,type:'direct',reason:'CFM LEAP engine JV'},{country:'China',weight:0.15,type:'direct',reason:'Aviation market'},{country:'India',weight:0.15,type:'direct',reason:'Power & aviation growth'},{country:'United Kingdom',weight:0.10,type:'direct',reason:'European aerospace'}],
  CAT:[{country:'United States',weight:0.45,type:'direct',reason:'HQ & manufacturing'},{country:'China',weight:0.20,type:'direct',reason:'Construction equipment market'},{country:'Australia',weight:0.10,type:'direct',reason:'Mining equipment'},{country:'Brazil',weight:0.10,type:'direct',reason:'Infrastructure projects'},{country:'India',weight:0.10,type:'direct',reason:'Growing market'},{country:'Chile',weight:0.05,type:'direct',reason:'Mining operations'}],
  PANW:[{country:'United States',weight:0.55,type:'direct',reason:'HQ & primary enterprise market'},{country:'United Kingdom',weight:0.15,type:'direct',reason:'European operations'},{country:'Israel',weight:0.15,type:'direct',reason:'R&D center'},{country:'India',weight:0.15,type:'indirect',reason:'Engineering'}],
  NOW:[{country:'United States',weight:0.55,type:'direct',reason:'HQ & primary enterprise market'},{country:'Germany',weight:0.15,type:'direct',reason:'European enterprise hub'},{country:'United Kingdom',weight:0.15,type:'direct',reason:'UK enterprise market'},{country:'India',weight:0.15,type:'indirect',reason:'Engineering & delivery'}],
  ISRG:[{country:'United States',weight:0.60,type:'direct',reason:'Primary surgical robot market'},{country:'Germany',weight:0.15,type:'direct',reason:'European market'},{country:'Japan',weight:0.10,type:'direct',reason:'Asia-Pacific market'},{country:'China',weight:0.15,type:'direct',reason:'Growing market'}],
  QCOM:[{country:'United States',weight:0.35,type:'direct',reason:'HQ & IP'},{country:'China',weight:0.35,type:'direct',reason:'Largest customer base'},{country:'Taiwan',weight:0.20,type:'indirect',reason:'TSMC manufacturing'},{country:'South Korea',weight:0.10,type:'indirect',reason:'Samsung manufacturing'}],
  NKE:[{country:'United States',weight:0.35,type:'direct',reason:'HQ & primary market'},{country:'China',weight:0.20,type:'direct',reason:'Manufacturing & consumer market'},{country:'Vietnam',weight:0.25,type:'indirect',reason:'Primary manufacturing base'},{country:'Indonesia',weight:0.10,type:'indirect',reason:'Footwear manufacturing'},{country:'Germany',weight:0.10,type:'direct',reason:'European market'}],
  NEE:[{country:'United States',weight:0.90,type:'direct',reason:'Florida Power & Light & wind'},{country:'Canada',weight:0.05,type:'direct',reason:'Wind projects'},{country:'Chile',weight:0.05,type:'indirect',reason:'Lithium for storage'}],
  DIS:[{country:'United States',weight:0.55,type:'direct',reason:'HQ, parks & streaming'},{country:'China',weight:0.15,type:'direct',reason:'Shanghai Disneyland'},{country:'Japan',weight:0.10,type:'direct',reason:'Tokyo Disney licensing'},{country:'France',weight:0.10,type:'direct',reason:'Disneyland Paris'},{country:'India',weight:0.10,type:'direct',reason:'Hotstar streaming'}],
  AMAT:[{country:'United States',weight:0.40,type:'direct',reason:'HQ & R&D'},{country:'Taiwan',weight:0.25,type:'direct',reason:'Chipmaker equipment customers'},{country:'South Korea',weight:0.15,type:'direct',reason:'Samsung & SK Hynix'},{country:'China',weight:0.20,type:'direct',reason:'Export-controlled market'}],
};

// ─── Sector defaults for tickers not in COMPANY_DEPS ─────────────────────────
const SECTOR_DEFAULTS = {
  Technology:[{country:'United States',weight:0.50,type:'direct',reason:'Primary market'},{country:'China',weight:0.20,type:'indirect',reason:'Manufacturing & revenue'},{country:'Taiwan',weight:0.15,type:'indirect',reason:'Semiconductor supply chain'},{country:'India',weight:0.15,type:'indirect',reason:'Tech services'}],
  'Financial Services':[{country:'United States',weight:0.60,type:'direct',reason:'Primary market'},{country:'United Kingdom',weight:0.15,type:'direct',reason:'Global finance hub'},{country:'China',weight:0.15,type:'macro',reason:'Market exposure'},{country:'India',weight:0.10,type:'indirect',reason:'Operations'}],
  Healthcare:[{country:'United States',weight:0.60,type:'direct',reason:'Primary market'},{country:'Germany',weight:0.15,type:'direct',reason:'European market'},{country:'China',weight:0.10,type:'direct',reason:'Asia-Pacific market'},{country:'India',weight:0.15,type:'indirect',reason:'API supply chain'}],
  'Consumer Cyclical':[{country:'United States',weight:0.55,type:'direct',reason:'Primary market'},{country:'China',weight:0.20,type:'indirect',reason:'Manufacturing'},{country:'Vietnam',weight:0.15,type:'indirect',reason:'Manufacturing base'},{country:'Mexico',weight:0.10,type:'indirect',reason:'Supply chain'}],
  'Consumer Defensive':[{country:'United States',weight:0.55,type:'direct',reason:'Primary market'},{country:'China',weight:0.15,type:'direct',reason:'Consumer market'},{country:'Brazil',weight:0.15,type:'direct',reason:'LatAm operations'},{country:'India',weight:0.15,type:'direct',reason:'Emerging market'}],
  Energy:[{country:'United States',weight:0.45,type:'direct',reason:'Primary market'},{country:'Saudi Arabia',weight:0.15,type:'indirect',reason:'OPEC pricing'},{country:'Canada',weight:0.15,type:'direct',reason:'Oil sands'},{country:'Nigeria',weight:0.10,type:'direct',reason:'Offshore production'},{country:'Iraq',weight:0.15,type:'direct',reason:'Production'}],
  Industrials:[{country:'United States',weight:0.50,type:'direct',reason:'Primary market'},{country:'China',weight:0.20,type:'direct',reason:'Manufacturing & market'},{country:'Germany',weight:0.15,type:'direct',reason:'Industrial base'},{country:'India',weight:0.15,type:'direct',reason:'Growing market'}],
  'Communication Services':[{country:'United States',weight:0.55,type:'direct',reason:'Primary market'},{country:'India',weight:0.15,type:'direct',reason:'Large user base'},{country:'Brazil',weight:0.10,type:'direct',reason:'LatAm market'},{country:'Germany',weight:0.10,type:'direct',reason:'EU market'},{country:'Japan',weight:0.10,type:'direct',reason:'Asia market'}],
  Utilities:[{country:'United States',weight:0.85,type:'direct',reason:'Domestic utility operations'},{country:'Chile',weight:0.10,type:'indirect',reason:'Lithium for storage'},{country:'Canada',weight:0.05,type:'direct',reason:'Energy market'}],
};

function getCountryDeps(ticker, sector) {
  if (COMPANY_DEPS[ticker]) return COMPANY_DEPS[ticker];
  const key = Object.keys(SECTOR_DEFAULTS).find(k => k.toLowerCase() === (sector || '').toLowerCase());
  return SECTOR_DEFAULTS[key] || SECTOR_DEFAULTS.Technology;
}

// ─── Yahoo Finance v8 via Node https (not global fetch — Yahoo blocks it) ─────
function httpsGet(urlStr) {
  return new Promise((resolve) => {
    const url = new URL(urlStr);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      timeout: 7000,
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

async function fetchQuote(symbol) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d&includePrePost=false`;
  try {
    const { ok, data } = await httpsGet(url);
    if (!ok || !data) return null;
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta || !meta.regularMarketPrice) return null;
    const prevClose = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPreviousClose || 0;
    const price = meta.regularMarketPrice;
    const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    return {
      symbol,
      shortName: meta.longName || meta.shortName || symbol,
      regularMarketPrice: price,
      regularMarketChangePercent: changePercent,
      marketCap: meta.marketCap || 1e11,
      sector: TICKER_SECTOR[symbol] || 'Technology',
    };
  } catch { return null; }
}

function buildResponse(rawList, source, fetchedAt) {
  const totalCap = rawList.reduce((sum, q) => sum + (q.marketCap || 1e11), 0);
  const assets = [], dependencies = [];
  rawList.forEach((quote) => {
    const ticker = quote.symbol;
    const sector = quote.sector || 'Technology';
    const weight = parseFloat(((quote.marketCap || 1e11) / totalCap * 100).toFixed(2));
    assets.push({
      ticker,
      assetName: quote.shortName || ticker,
      weight: weight || parseFloat((100 / rawList.length).toFixed(2)),
      value: Math.round((weight / 100) * 1_000_000),
      sector,
      changePercent: parseFloat((quote.regularMarketChangePercent || 0).toFixed(2)),
      price: parseFloat((quote.regularMarketPrice || 0).toFixed(2)),
    });
    for (const dep of getCountryDeps(ticker, sector)) {
      dependencies.push({ ticker, country: dep.country, dependencyWeight: dep.weight, dependencyType: dep.type, dependencyReason: dep.reason });
    }
  });
  return { source, fetchedAt, count: assets.length, assets, dependencies };
}

// ─── Route ────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    if (spCache && now - spCacheTime < CACHE_TTL_MS) {
      return res.json({ ...spCache, source: 'cache' });
    }

    const CONCURRENCY = 15;
    const quotes = [];
    let liveFailed = false;
    try {
      for (let i = 0; i < SP500_UNIVERSE.length; i += CONCURRENCY) {
        const results = await Promise.all(SP500_UNIVERSE.slice(i, i + CONCURRENCY).map(fetchQuote));
        quotes.push(...results.filter(Boolean));
      }
    } catch { liveFailed = true; }

    if (!liveFailed && quotes.length >= 10) {
      const ranked = quotes.sort((a, b) => b.regularMarketChangePercent - a.regularMarketChangePercent).slice(0, 25);
      const result = buildResponse(ranked, 'yahoo_finance', new Date().toISOString());
      spCache = result;
      spCacheTime = now;
      return res.json(result);
    }

    if (spCache) return res.json({ ...spCache, source: 'stale_cache' });

    console.warn('[spPerformers] Live fetch failed — serving static fallback');
    const result = buildResponse(STATIC_PERFORMERS, 'static_fallback', new Date().toISOString());
    spCache = result;
    spCacheTime = now - CACHE_TTL_MS + 5 * 60 * 1000; // retry in 5 min
    return res.json(result);
  } catch (err) {
    console.error('[spPerformers] Unhandled error:', err.message);
    return res.json(buildResponse(STATIC_PERFORMERS, 'static_fallback', new Date().toISOString()));
  }
});

export default router;
