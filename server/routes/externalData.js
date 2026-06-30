/**
 * External Data Routes
 * Proxies the World Bank Worldwide Governance Indicators (WGI) API.
 * Free, no auth required — https://api.worldbank.org
 *
 * WGI indicators used (GOV_WGI_ prefix required as of 2025 WB API update):
 *   GOV_WGI_GE.EST  Government Effectiveness      → Political dimension
 *   GOV_WGI_VA.EST  Voice & Accountability        → Political dimension (averaged with GE)
 *   GOV_WGI_PV.EST  Political Stability/No Violence → Conflict + Terrorism dimensions
 *   GOV_WGI_CC.EST  Control of Corruption         → Corruption dimension
 *   GOV_WGI_RL.EST  Rule of Law                   → Economic governance proxy
 *
 * All WGI scores range roughly -2.5 (worst) to 2.5 (best).
 * Normalized to risk 0-100: risk = round(((2.5 - score) / 5) * 100)
 */

import express from 'express';

const router = express.Router();

// In-memory cache (6-hour TTL — WGI data is annual)
let wgiCache = null;
let wgiCacheTime = 0;
const WGI_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Mapping from World Bank ISO2 code → dashboard country name
const ISO2_TO_COUNTRY = {
  US: 'United States', CA: 'Canada', MX: 'Mexico', BR: 'Brazil',
  AR: 'Argentina', CO: 'Colombia', VE: 'Venezuela', CL: 'Chile',
  PE: 'Peru', GB: 'United Kingdom', FR: 'France', DE: 'Germany',
  ES: 'Spain', IT: 'Italy', RU: 'Russia', UA: 'Ukraine',
  PL: 'Poland', TR: 'Turkey', GR: 'Greece', NL: 'Netherlands',
  BE: 'Belgium', SE: 'Sweden', NO: 'Norway', FI: 'Finland',
  CH: 'Switzerland', AT: 'Austria', PT: 'Portugal', RO: 'Romania',
  HU: 'Hungary', BY: 'Belarus', SY: 'Syria', IQ: 'Iraq',
  IR: 'Iran', IL: 'Israel', SA: 'Saudi Arabia', YE: 'Yemen',
  AE: 'United Arab Emirates', JO: 'Jordan', LB: 'Lebanon',
  EG: 'Egypt', ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya',
  ET: 'Ethiopia', SO: 'Somalia', SD: 'Sudan', LY: 'Libya',
  DZ: 'Algeria', MA: 'Morocco', TN: 'Tunisia', CN: 'China',
  IN: 'India', JP: 'Japan', KR: 'South Korea', KP: 'North Korea',
  PK: 'Pakistan', AF: 'Afghanistan', BD: 'Bangladesh', ID: 'Indonesia',
  VN: 'Vietnam', TH: 'Thailand', MY: 'Malaysia', SG: 'Singapore',
  PH: 'Philippines', HK: 'Hong Kong', MM: 'Myanmar', KH: 'Cambodia',
  LK: 'Sri Lanka', KZ: 'Kazakhstan', UZ: 'Uzbekistan', MN: 'Mongolia',
  NP: 'Nepal', AU: 'Australia', NZ: 'New Zealand', PG: 'Papua New Guinea',
  TW: 'Taiwan',
};

/**
 * Normalize a WGI score (-2.5 → 2.5) to a 0-100 risk value.
 * Higher WGI score = better governance = lower risk.
 */
function normalizeWGI(score) {
  if (score === null || score === undefined) return null;
  return Math.max(0, Math.min(100, Math.round(((2.5 - score) / 5) * 100)));
}

async function fetchWGIIndicator(indicator) {
  const url =
    `https://api.worldbank.org/v2/country/all/indicator/${indicator}` +
    `?format=json&mrv=1&per_page=300`;
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`World Bank API returned ${response.status} for ${indicator}`);
  const body = await response.json();
  // WB API returns [metadata, dataArray]
  return Array.isArray(body) && Array.isArray(body[1]) ? body[1] : [];
}

/**
 * GET /api/external/governance
 * Returns normalized 0-100 risk scores per dimension for all mapped countries.
 * Results are cached for 6 hours.
 */
router.get('/governance', async (req, res) => {
  try {
    const now = Date.now();

    // Return cached data if still fresh
    if (wgiCache && now - wgiCacheTime < WGI_CACHE_TTL_MS) {
      return res.json({
        source: 'cache',
        cachedAt: new Date(wgiCacheTime).toISOString(),
        data: wgiCache,
      });
    }

    // Fetch all 5 WGI indicators in parallel (GOV_WGI_ prefix required since 2025 WB API update)
    const [geData, vaData, pvData, ccData, rlData] = await Promise.all([
      fetchWGIIndicator('GOV_WGI_GE.EST'),
      fetchWGIIndicator('GOV_WGI_VA.EST'),
      fetchWGIIndicator('GOV_WGI_PV.EST'),
      fetchWGIIndicator('GOV_WGI_CC.EST'),
      fetchWGIIndicator('GOV_WGI_RL.EST'),
    ]);

    // Collect raw WGI scores per country
    const raw = {};
    const indicatorSets = [
      { key: 'ge', data: geData },
      { key: 'va', data: vaData },
      { key: 'pv', data: pvData },
      { key: 'cc', data: ccData },
      { key: 'rl', data: rlData },
    ];

    for (const { key, data } of indicatorSets) {
      for (const entry of data) {
        if (entry.value === null || entry.value === undefined) continue;
        const iso2 = entry.country?.id;
        if (!iso2 || !ISO2_TO_COUNTRY[iso2]) continue;
        const countryName = ISO2_TO_COUNTRY[iso2];
        if (!raw[countryName]) raw[countryName] = {};
        raw[countryName][key] = normalizeWGI(entry.value);
      }
    }

    // Build final per-dimension risk object for each country
    const result = {};
    for (const [country, scores] of Object.entries(raw)) {
      // Political: average of Government Effectiveness + Voice & Accountability
      const political =
        scores.ge != null && scores.va != null
          ? Math.round((scores.ge + scores.va) / 2)
          : (scores.ge ?? scores.va ?? null);

      // Economic: Rule of Law as governance proxy
      const economic = scores.rl ?? null;

      // Conflict: Political Stability / Absence of Violence
      const conflict = scores.pv ?? null;

      // Corruption: Control of Corruption
      const corruption = scores.cc ?? null;

      // Terrorism: same Political Stability indicator (covers violence/terrorism)
      const terrorism = scores.pv ?? null;

      result[country] = { political, economic, conflict, corruption, terrorism };
    }

    wgiCache = result;
    wgiCacheTime = now;

    res.json({
      source: 'worldbank',
      fetchedAt: new Date().toISOString(),
      countriesLoaded: Object.keys(result).length,
      data: result,
    });
  } catch (err) {
    console.error('[externalData] WGI fetch error:', err.message);
    res.status(503).json({
      error: 'World Bank API unavailable',
      message: err.message,
    });
  }
});

/**
 * GET /api/external/status
 * Quick connectivity check against the World Bank API.
 */
router.get('/status', async (req, res) => {
  try {
    const start = Date.now();
    const response = await fetch(
      'https://api.worldbank.org/v2/country/US/indicator/GE.EST?format=json&mrv=1',
      { signal: AbortSignal.timeout(6000) }
    );
    res.json({
      connected: response.ok,
      latencyMs: Date.now() - start,
      provider: 'World Bank WGI',
      url: 'https://api.worldbank.org',
    });
  } catch (err) {
    res.json({
      connected: false,
      error: err.message,
      provider: 'World Bank WGI',
      url: 'https://api.worldbank.org',
    });
  }
});

export default router;
