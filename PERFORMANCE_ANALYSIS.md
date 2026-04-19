# Geopolitical Dashboard - Performance Analysis Report

**Date:** April 19, 2026  
**Status:** 🔴 **CRITICAL ISSUES FOUND** - Multiple performance bottlenecks identified

---

## Executive Summary

The application has **8 major performance issues** that could cause freezing/crashing:

1. **CRITICAL: Synchronous CSV Parsing in Frontend** - Blocking thread with potentially large data
2. **CRITICAL: Inefficient WorldMap Component** - Renders every country in loop with no memoization
3. **HIGH: Multiple Missing useCallback Dependencies** - Causes unnecessary re-renders
4. **HIGH: GeoJSON Loading on Every Mount** - No caching, fetches large external file repeatedly
5. **MEDIUM: Inefficient Database Query Pattern** - Multiple sequential queries without optimization
6. **MEDIUM: No Pagination/Virtualization** - Large datasets loaded entirely in memory
7. **MEDIUM: Heavy Computations Not Memoized** - Risk calculations run on every state change
8. **MEDIUM: Dual Vite Config Files** - Conflicting configurations causing build issues

---

## Critical Issues

### 1. **CRITICAL: Synchronous CSV Parsing Blocks Main Thread** 
**File:** `src/app/data/csvLoader.ts` (Lines 28-115)
**Severity:** 🔴 **CRITICAL**

**Problem:**
```typescript
const lines = csvText.split("\n").filter((line) => line.trim());
// ... iterates through all lines in a loop
for (let i = 1; i < lines.length; i++) {
  const values = parseCSVLine(lines[i]);  // Heavy parsing in main thread
  // ... creating objects synchronously
}
```

**Impact:**
- If CSV has thousands of rows, the main thread **blocks completely**
- UI freezes until entire CSV is parsed
- No progress indication to user
- Can cause "Not Responding" errors

**Root Cause:** 
- Synchronous parsing of entire CSV in JS main thread
- Heavy object creation in loop
- No chunking or web worker usage

**Recommended Fix:**
```typescript
// Use Web Worker for CSV parsing
// OR chunk the data into smaller batches
// OR use streaming CSV parser like `csv-stream` or `fast-csv`
```

---

### 2. **CRITICAL: WorldMap Component Has No Memoization**
**File:** `src/app/components/WorldMap.tsx` (Lines 72-100)
**Severity:** 🔴 **CRITICAL**

**Problem:**
```typescript
{countries.map((country, index) => {
  const countryName = country.properties?.name || "Unknown";
  const risk = riskData[countryName] !== undefined ? riskData[countryName] : defaultRisk;
  const pathData = coordinatesToPath(...);  // Recalculates for EVERY country on every render
  
  return (
    <path key={`country-${index}`} ... />  // BAD KEY! Using index, not country name
  );
})}
```

**Impact:**
- **Recalculates paths for 195+ countries on every render**
- `coordinatesToPath()` does complex coordinate math for each country
- Using `index` as key causes React to re-render all paths unnecessarily
- Tooltip updates cause entire map to re-render
- Can freeze UI when interacting with map

**Issues:**
1. No memoization of country path calculations
2. Bad key strategy (index-based instead of country name)
3. Expensive `coordinatesToPath()` called on every render
4. GeoJSON fetched on mount but never cached

**Recommended Fixes:**
```typescript
// Memoize the country path calculation
const memoizedCountries = useMemo(() => {
  return countries.map(country => ({
    ...country,
    pathData: coordinatesToPath(...)
  }));
}, [countries]);

// Use proper keys
<path key={`country-${countryName}`} ... />

// Memoize path rendering component
const CountryPath = React.memo(({ country, ... }) => (
  <path ... />
));
```

---

### 3. **HIGH: GeoJSON Loaded on Every Component Mount - No Caching**
**File:** `src/app/components/WorldMap.tsx` (Lines 33-40)
**Severity:** 🟠 **HIGH**

**Problem:**
```typescript
useEffect(() => {
  fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson")
    .then((response) => response.json())
    .then((data) => {
      setCountries(data.features || []);
      setLoading(false);
    })
}, []);  // Empty dependency array is good, but no caching
```

**Impact:**
- Fetches 10+ MB GeoJSON from external GitHub on every app reload
- Network latency blocks map rendering
- No error recovery if network fails
- Could cause app to hang on slow connections

**Recommended Fix:**
```typescript
// Cache in localStorage or import as static file
// Use smaller TopoJSON format instead of GeoJSON
// Cache with service worker
const [countries, setCountries] = useState(() => {
  const cached = localStorage.getItem('geo-countries');
  return cached ? JSON.parse(cached) : [];
});
```

---

## High Priority Issues

### 4. **HIGH: API Endpoint Called Without Error Handling**
**File:** `src/app/App.tsx` (Lines 39-52)
**Severity:** 🟠 **HIGH**

**Problem:**
```typescript
useEffect(() => {
  const loadDatasets = async () => {
    try {
      const datasetsRes = await fetch("http://localhost:5000/api/datasets");
      if (!datasetsRes.ok) throw new Error("Failed to fetch datasets");
      const apiDatasets = await datasetsRes.json();
      
      // Multiple sequential API calls without Promise.all
      for (const dataset of apiDatasets) {
        const assetsRes = await fetch(...);      // ⚠️ Sequential - slow!
        const depsRes = await fetch(...);        // ⚠️ Sequential - slow!
      }
```

**Impact:**
- Sequential API calls N×2 (assets + dependencies for each dataset)
- 10 datasets = 20 sequential network requests
- Each request waits for previous one to complete
- Could cause 30+ second load times

**Recommended Fix:**
```typescript
// Use Promise.all for parallel requests
const promises = apiDatasets.map(dataset => 
  Promise.all([
    fetch(`/api/assets/${dataset.datasetId}`).then(r => r.json()),
    fetch(`/api/dependencies/${dataset.datasetId}`).then(r => r.json())
  ])
);
const results = await Promise.all(promises);
```

---

### 5. **HIGH: Risk Calculations Not Properly Memoized**
**File:** `src/app/App.tsx` (Lines 128-133)
**Severity:** 🟠 **HIGH**

**Problem:**
```typescript
const riskData = useMemo(() => {
  const data: { [key: string]: number } = {};
  Object.keys(baseRiskData).forEach((country) => {
    data[country] = calculateRiskIndex(country, weights);  // Recalculates for ALL countries
  });
  return data;
}, [weights]);  // Only depends on weights, but Object.keys iteration is expensive
```

**Impact:**
- Recalculates risk for 195+ countries every time weights change
- No caching of individual country calculations
- `calculateRiskIndex()` does heavy math for each country
- UI locks up when user adjusts sliders

**Recommended Fix:**
- Cache individual country risk calculations
- Use incremental updates instead of recalculating all

---

## Medium Priority Issues

### 6. **MEDIUM: Missing useCallback on Event Handlers**
**File:** `src/app/App.tsx` (Lines 133-137)
**Severity:** 🟡 **MEDIUM**

**Problem:**
```typescript
const updateWeight = (category: keyof typeof weights, value: number) => {
  setWeights((prev) => ({ ...prev, [category]: value }));
};

const resetToDefaults = () => {
  setWeights(getDefaultWeights());
};
// ^ These functions are recreated on every render
// ^ Passed to child components causing unnecessary re-renders
```

**Impact:**
- Child components (RiskSlider) re-render even when nothing changes
- RiskSlider re-renders 5 times per slider interaction instead of 1

**Recommended Fix:**
```typescript
const updateWeight = useCallback((category: keyof typeof weights, value: number) => {
  setWeights((prev) => ({ ...prev, [category]: value }));
}, []);

const resetToDefaults = useCallback(() => {
  setWeights(getDefaultWeights());
}, []);
```

---

### 7. **MEDIUM: Inefficient Database Query Pattern in Backend**
**File:** `server/routes/assets.js` (Lines 69-101)
**Severity:** 🟡 **MEDIUM**

**Problem:**
```javascript
// Get assets
const assetsResult = await request.query(`SELECT ... FROM Assets WHERE datasetId = @datasetId`);

// Get dependencies - SEPARATE query
const dependenciesResult = await request.query(`SELECT ... FROM CountryDependencies WHERE datasetId = @datasetId`);

// Get countries - THIRD query (not even filtered!)
const countriesResult = await pool.query('SELECT name, baseRiskScore FROM Countries');
```

**Impact:**
- 3+ separate database round trips for one portfolio fetch
- Network latency multiplied
- Countries query is unoptimized (no WHERE clause)
- Could return entire Countries table (195+ rows) every time

**Recommended Fix:**
```sql
-- Use JOIN to fetch everything in one query
SELECT 
  a.ticker, a.assetName, a.weight, a.value, a.sector,
  cd.country, cd.dependencyWeight, cd.dependencyType,
  c.baseRiskScore
FROM Assets a
LEFT JOIN CountryDependencies cd ON a.datasetId = cd.datasetId AND a.ticker = cd.ticker
LEFT JOIN Countries c ON cd.country = c.name
WHERE a.datasetId = @datasetId
```

---

### 8. **MEDIUM: HoldingsTable Has No Virtualization**
**File:** `src/app/components/HoldingsTable.tsx` (Lines 11-40)
**Severity:** 🟡 **MEDIUM**

**Problem:**
```typescript
{assets.map((asset) => {
  const assetContribution = assetContributions.find((c) => c.ticker === asset.ticker);
  // Renders ALL assets at once, no matter how many
  return (
    <tr key={asset.ticker}>...</tr>
  );
})}
```

**Impact:**
- Renders entire holdings table even if 1000+ assets
- DOM gets huge, memory usage increases
- Table scrolling becomes laggy
- No virtual scrolling

**Recommended Fix:**
```typescript
// Use react-window or react-virtualized
// OR use react-table with virtualization
import { FixedSizeList } from 'react-window';
```

---

### 9. **MEDIUM: Dual Vite Config Files Causing Conflicts**
**Files:** 
- `vite.config.ts` (Lines 1-27)
- `vite.config.js` (Lines 1-9)

**Severity:** 🟡 **MEDIUM**

**Problem:**
```typescript
// vite.config.ts has proper config with aliases
export default defineConfig({
  plugins: [react()],
  root: './',
  resolve: {
    alias: { ... }  // Path aliases defined
  },
  server: { port: 3000, open: true }
})

// vite.config.js is minimal
export default defineConfig({
  plugins: [react()],
  server: { port: 3000, open: true }
})
```

**Impact:**
- Vite might load wrong config file
- Path aliases might not work
- Build inconsistency between dev and prod
- TypeScript path resolution conflicts

**Recommended Fix:**
- Delete `vite.config.js` 
- Keep only `vite.config.ts`

---

## Low Priority Issues (Performance Concerns)

### 10. **LOW: No Error Boundaries**
**File:** `src/app/App.tsx` - No error boundary wrapper
**Severity:** 🔵 **LOW**

**Issue:** If any component crashes, entire app crashes. No fallback UI.

---

### 11. **LOW: Unused Dependencies**
**File:** `package.json`

Potentially unused packages that increase bundle size:
- `canvas-confetti` - not used
- `react-router` v7 - imported but app doesn't use routing
- `react-simple-maps` - unused
- `react-dnd` + `react-dnd-html5-backend` - unused
- `figma-js` - only in demo component

---

### 12. **LOW: No Loading Skeleton/Placeholder**
**File:** `src/app/App.tsx`
**Issue:** Loading state shows "Loading..." text instead of skeleton, causing visual jank

---

## TypeScript/ESLint Findings

✅ **Good News:** No compilation errors detected  
✅ **Good:** Strict TypeScript mode enabled  
✅ **Good:** No unused variables or parameters (checked)

---

## Recommended Priority Actions

### Phase 1 - Critical (Do First!)
1. **Fix CSV Parsing** - Use Web Worker or chunking
2. **Memoize WorldMap** - Add React.memo and fix keys
3. **Parallel API Calls** - Use Promise.all for datasets

### Phase 2 - High
4. **Add useCallback** - Wrap event handlers
5. **Optimize Database Queries** - Use JOINs instead of multiple queries
6. **Cache GeoJSON** - localStorage or import as static file

### Phase 3 - Medium
7. **Add Virtualization** - Use react-window for tables
8. **Remove Duplicate Config** - Delete vite.config.js
9. **Optimize Imports** - Remove unused dependencies

### Phase 4 - Low (Nice to Have)
10. Add Error Boundaries
11. Add loading skeletons
12. Tree-shake unused packages

---

## Summary of Findings

| Issue | Severity | Impact | Fix Time |
|-------|----------|--------|----------|
| CSV Parsing | 🔴 CRITICAL | App freezes on load | 1-2 hrs |
| WorldMap | 🔴 CRITICAL | Map freezes on interact | 1 hr |
| API Calls | 🟠 HIGH | 20-30 sec load time | 30 min |
| useCallback | 🟠 HIGH | Unnecessary re-renders | 30 min |
| DB Queries | 🟡 MEDIUM | Slow API responses | 1 hr |
| GeoJSON Cache | 🟡 MEDIUM | Slow on reload | 30 min |
| Vite Config | 🟡 MEDIUM | Build inconsistency | 5 min |
| Virtualization | 🟡 MEDIUM | Large tables lag | 1-2 hrs |

**Estimated Total Fix Time:** 6-8 hours  
**Quick Win (30 min):** Fix API calls + useCallback + vite config

---

## Detailed Recommendation

Start with the **Critical** issues as they directly cause freezing/crashing. The WorldMap component and CSV parsing are the most likely culprits for the freezing behavior you're experiencing.
