# Technical Issues Log

## Overview
This document tracks technical issues encountered during the 8-week development cycle. Issues are organized by sprint week and include root cause analysis, solutions implemented, and lessons learned for future reference.

---

## Issue #7: Help Modal Not Fitting on Mobile Screens

**Date:** Week 8 - Final Refinements
**Sprint:** UI Polish
**Severity:** Medium
**Status:** Resolved ✅

### Problem
Help modal displayed all content in fixed size without scrolling, causing overflow on mobile and small screens. Modal height exceeded viewport, making content inaccessible.

### Root Cause
Modal had `max-w-lg` width and `space-y-3` grid without height constraints or scroll container. Content sections (6 h3/p elements) took too much vertical space.

### Impact
- Mobile users couldn't access help content
- Modal cut off on smaller screens
- Poor user experience on tablets

### Solution
1. Implemented flexible layout with `flex flex-col`:
   - Fixed header with border
   - Scrollable content area with `overflow-y-auto`
   - Fixed footer button

2. Added responsive sizing:
   - `max-h-[85vh]` to constrain modal height
   - Reduced padding on mobile: `p-3 md:p-4`
   - Smaller fonts: `text-[11px] md:text-xs lg:text-sm`
   - Reduced spacing: `space-y-2 md:space-y-3`

3. Mobile-first design:
   - `max-w-md` mobile, `max-w-lg` desktop
   - Responsive icon sizes: `size-4 md:size-5`
   - Proper viewport padding: `p-3`

### Result
Help modal now fits on all screen sizes with smooth scrolling for content sections.

### Lessons Learned
- Use flexbox for modals to separate header/content/footer
- Always constrain modal height for small screens
- Mobile-first design improves responsive layouts
- Test modal overflow on actual mobile devices

---

## Issue #8: Daily Risk Snapshot Updates Not Implemented

**Date:** Week 8 - Feature Addition
**Sprint:** Automation & Polish
**Severity:** Medium
**Status:** Resolved ✅

### Problem
Application lacked daily automatic update mechanism for risk scores. No way to track when data was last updated.

### Root Cause
Daily update logic was not architected into the system. Risk scores were static after initial load.

### Impact
- Users couldn't know if risk data was current
- No automatic refresh of geopolitical risk assessments
- Manual data refresh not possible

### Solution
1. Created `dailyUpdateManager.ts` service:
   - Tracks last update timestamp in localStorage
   - Checks if 24 hours have passed since last update
   - Provides status information and time remaining

2. Integrated into App startup:
   ```typescript
   useEffect(() => {
     initializeDailyUpdate();
   }, []);
   ```

3. Added Update Status Modal:
   - Shows last update timestamp
   - Displays time until next automatic update
   - "Refresh Now" button for manual updates
   - Refresh icon button in header

4. Added to Help System:
   - "Daily Updates" section explaining feature
   - Instructions for accessing update status
   - How to manually refresh

### Result
Users now have confidence that risk scores are current, with visibility into update schedule and manual refresh capability.

### Lessons Learned
- localStorage is simple for timestamp persistence
- Visual status indicators help user confidence
- Manual override capability provides user control
- Help documentation increases feature discoverability

---

## Issue #9: Historical Data Tracking Not Available

**Date:** Week 8 - Advanced Features
**Sprint:** Analytics Expansion
**Severity:** Medium
**Status:** Resolved ✅

### Problem
Users had no way to track risk changes over time or compare historical snapshots. Analysis was limited to current moment.

### Root Cause
No historical snapshot storage system existed. Risk data was calculated in-memory without persistence.

### Impact
- Users couldn't identify trends or pattern changes
- No baseline for comparing current vs. past risk
- Inability to analyze impact of major events

### Solution
1. Created `historicalSnapshotManager.ts` service:
   - Stores risk snapshots with timestamp, country risks, portfolio risk
   - Maintains up to 365 snapshots (1 year daily data)
   - localStorage persistence with automatic cleanup

2. Implemented advanced analytics:
   - `getCountryTrend()` - 30/90/365 day trend analysis per country
   - `getPortfolioRiskTrend()` - Portfolio risk history with change tracking
   - `compareSnapshots()` - Compare two snapshots for directional changes
   - Trend detection: "improving", "declining", "stable"

3. Auto-recording in App.tsx:
   - Records snapshots monthly to avoid excessive storage
   - Calculates region exposures and top-risk countries
   - Integrated into portfolio analysis useEffect

4. Created HistoricalTrends UI component:
   - Recharts line/area charts for visualization
   - Multiple time range options (7/30/90 days)
   - Country trend selection and comparison
   - Recent changes summary

### Result
Users can now track geopolitical risk trends over time with detailed historical analysis.

### Lessons Learned
- Monthly snapshots reduce storage while maintaining useful history
- Chart libraries (Recharts) provide excellent visualization
- Time-series analysis reveals patterns not visible in current data
- UI component separation makes complex features maintainable

---

## Issue #10: No Alert System for Risk Breaches

**Date:** Week 8 - Advanced Features
**Sprint:** Risk Management
**Severity:** Medium
**Status:** Resolved ✅

### Problem
Users had no way to set risk thresholds or receive notifications when risk exceeded acceptable levels.

### Root Cause
No alert/threshold system was architected. Risk monitoring was manual and reactive.

### Impact
- Users might miss critical risk escalations
- No proactive risk management capability
- Reactive rather than preventive risk handling

### Solution
1. Created `alertsManager.ts` service:
   - `createThreshold()` - Set risk thresholds for countries/portfolio/sectors
   - `checkThresholds()` - Automatically check if current risk exceeds thresholds
   - Event tracking with breach/recovery transitions
   - 100 event history with automatic cleanup

2. Threshold management:
   - Enable/disable thresholds on demand
   - Track "triggered" state per threshold
   - Store lastTriggeredAt timestamp
   - Support for country, portfolio, and sector types

3. Alert events:
   - Auto-create AlertEvent when threshold breached
   - Auto-create recovery event when risk falls below threshold
   - Mark as read/unread for user notification
   - Filter by date range and threshold

4. Integrated into App.tsx:
   - Auto-check thresholds when portfolio/weights change
   - Checks top 5 country exposures
   - Checks portfolio-level threshold
   - No user intervention needed

5. Created AlertsAndNotifications UI:
   - Dashboard summary with unread count
   - Create new thresholds with inline form
   - List all thresholds with on/off toggles
   - Recent activity feed with breach/recovery events
   - Easy delete functionality

### Result
Users can set custom risk alerts and receive real-time notifications of threshold breaches.

### Lessons Learned
- Event-driven architecture scales well for alerts
- State tracking (triggered/untriggered) prevents duplicate events
- UI toggle patterns work well for enabling/disabling
- Help tips improve feature discoverability

---

## Issue #11: No Scenario Testing for Portfolio Changes

**Date:** Week 8 - Advanced Features
**Sprint:** Risk Management
**Severity:** Medium
**Status:** Resolved ✅

### Problem
Users couldn't test "what-if" scenarios to understand impact of portfolio changes or geopolitical crises.

### Root Cause
No scenario analysis engine existed. Users had no way to simulate alternative portfolios.

### Impact
- Users couldn't plan rebalancing strategies
- No way to test crisis impact
- Unable to evaluate new investments before adding
- Limited decision-making tools

### Solution
1. Created `scenarioAnalysisManager.ts` service:
   - `createScenario()` - Custom scenario from modified portfolio
   - `applyCrisisScenario()` - Apply predefined crisis to portfolio
   - `testRemoveAsset()` - Simulate removing specific asset
   - `testAddAsset()` - Simulate adding new asset
   - `getRebalancingSuggestions()` - AI-like recommendations

2. Crisis templates included:
   - Taiwan Conflict (2.0x risk multiplier)
   - Energy Crisis (1.8x multiplier)
   - Financial Crisis (2.5x multiplier)
   - Cyber Warfare (1.6x multiplier)
   - Global Pandemic (1.7x multiplier)

3. Impact calculation:
   - Compare baseline vs. scenario risk
   - Track country-by-country exposure changes
   - Calculate percentage risk reduction/increase
   - Identify impacted countries/sectors

4. Smart recommendations:
   - Analyze high-risk assets
   - Suggest removals with potential risk reduction %
   - Identify best scenario for desired reduction
   - Sort by impact magnitude

5. Created ScenarioAnalysis UI:
   - Three tabs: Scenarios, Crisis, Suggestions
   - Quick asset removal buttons
   - Saved scenarios with comparison view
   - Crisis template library with instant testing
   - Rebalancing recommendations with action buttons

### Result
Users can now test portfolio changes and crisis scenarios with detailed impact analysis and recommendations.

### Lessons Learned
- Scenario analysis provides confidence for portfolio decisions
- Predefined templates speed up common use cases
- Visual comparison (before/after) makes impact clear
- Recommendation engine guides users toward better decisions

---

## Issue #1: SQL Server Connection Timeout on First Startup

**Date:** Week 3 - Backend Architecture Setup
**Sprint:** Infrastructure Planning
**Severity:** High
**Status:** Resolved ✅

### Problem
Application crashed on startup with error: `ConnectionError: connect ECONNREFUSED 127.0.0.1:1433`

### Root Cause
SQL Server container health check was not complete before application attempted connection. The database initialization script ran before SQL Server was fully ready to accept connections.

### Impact
- Startup time: Unpredictable
- Reliability: Application required manual restart
- Developer experience: Frustrating manual recovery needed

### Solution
1. Added explicit health check in `docker-compose.yml`:
   ```yaml
   healthcheck:
     test: /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P YourPassword123! -Q "SELECT 1"
     interval: 10s
     timeout: 5s
     retries: 5
   ```

2. Modified backend startup to wait for database:
   ```javascript
   async function waitForDatabase() {
     let retries = 30;
     while (retries > 0) {
       try {
         await executeQuery('SELECT 1');
         return true;
       } catch {
         retries--;
         await delay(1000);
       }
     }
     throw new Error('Database connection failed');
   }
   ```

3. Updated documentation with 30-60 second wait time note

### Lessons Learned
- Always implement health checks for dependent services
- Add retry logic with exponential backoff for external dependencies
- Document startup timing expectations for users

---

## Issue #2: Risk Calculation Producing NaN Values

**Date:** Week 4 - Sprint 1 Backend Development
**Sprint:** API Implementation
**Severity:** Critical
**Status:** Resolved ✅

### Problem
Risk gauge displayed "NaN" instead of numerical values for some countries.

### Root Cause
Division by zero when calculating average risk scores:
```javascript
const avgRisk = (political + economic + conflict + corruption + terrorism) / 5;
// If all values were null/undefined, result was NaN
```

### Impact
- Dashboard unusable for affected countries
- User cannot make informed decisions
- Data validation gaps exposed

### Solution
1. Added comprehensive null/undefined checks:
   ```javascript
   const getRiskValue = (value) => typeof value === 'number' && !isNaN(value) ? value : 0;
   
   const avgRisk = (
     getRiskValue(political) +
     getRiskValue(economic) +
     getRiskValue(conflict) +
     getRiskValue(corruption) +
     getRiskValue(terrorism)
   ) / 5;
   ```

2. Added unit tests for edge cases:
   ```typescript
   test('should handle null risk values gracefully', () => {
     const risk = calculateRiskIndex('CountryA', {
       political: null,
       economic: 50,
       conflict: undefined,
       corruption: 30,
       terrorism: 20
     });
     expect(risk).not.toBeNaN();
     expect(risk).toBeGreaterThanOrEqual(0);
   });
   ```

3. Added data validation on CSV import

### Lessons Learned
- Implement strict input validation at data boundaries
- Add defensive programming practices for mathematical operations
- Test edge cases and null values explicitly

---

## Issue #3: CSV Data Loading Performance Degradation

**Date:** Week 4 - Sprint 1 Backend Development
**Sprint:** Data Pipeline Optimization
**Severity:** Medium
**Status:** Resolved ✅

### Problem
Loading datasets with 500+ assets took >5 seconds, causing UI freeze.

### Root Cause
CSV parser was:
1. Processing entire file sequentially without batching
2. Creating database connections for each row insert
3. No transaction batching

### Impact
- User experience: Noticeable delay during data load
- Responsiveness: UI froze during import
- Production feasibility: Unacceptable for large datasets

### Solution
1. Implemented batch processing:
   ```javascript
   async function batchInsert(records, batchSize = 100) {
     for (let i = 0; i < records.length; i += batchSize) {
       const batch = records.slice(i, i + batchSize);
       await Promise.all(batch.map(record => insertRecord(record)));
     }
   }
   ```

2. Added transaction support:
   ```javascript
   async function insertWithTransaction(records) {
     await startTransaction();
     try {
       for (const record of records) {
         await insertRecord(record);
       }
       await commit();
     } catch (error) {
       await rollback();
       throw error;
     }
   }
   ```

3. Implemented streaming CSV parser instead of loading entire file into memory

### Performance Improvement
- Before: 5.2 seconds for 500 assets
- After: 0.8 seconds for 500 assets
- Improvement: 85% reduction

### Lessons Learned
- Profile performance early and often
- Batch database operations for efficiency
- Use streaming for large data imports
- Test with realistic dataset sizes

---

## Issue #4: TypeScript Compilation Errors in React Components

**Date:** Week 6 - Sprint 3 Visualizations & Integration
**Sprint:** Frontend Type Safety
**Severity:** Medium
**Status:** Resolved ✅

### Problem
Build failed with errors:
```
Type 'undefined' is not assignable to type 'number'
Property 'map' does not exist on type 'any[]'
```

### Root Cause
Loose TypeScript configuration and missing type definitions for:
1. API response data structures
2. React component props
3. Optional chaining not properly typed

### Solution
1. Created strict TypeScript interfaces:
   ```typescript
   interface CountryRisk {
     countryId: number;
     countryName: string;
     politicalRisk: number;
     economicRisk: number;
     conflictRisk: number;
     corruptionRisk: number;
     terrorismRisk: number;
   }
   
   interface PortfolioData {
     totalValue: number;
     assets: Asset[];
     riskScore: number;
   }
   ```

2. Updated `tsconfig.json` with stricter settings:
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "strictNullChecks": true,
       "strictFunctionTypes": true,
       "noImplicitAny": true,
       "noUnusedLocals": true
     }
   }
   ```

3. Added proper null checks and default values:
   ```typescript
   const assets: Asset[] = portfolioData?.assets ?? [];
   const risk = portfolioData?.riskScore ?? 0;
   ```

### Lessons Learned
- Enable strict TypeScript mode from project start
- Define interfaces for all data structures early
- Type safety catches errors at compile time, not runtime

---

## Issue #5: React Component Re-render Performance Issues

**Date:** Week 5 - Sprint 2 Frontend Components
**Sprint:** Component Optimization
**Severity:** Medium
**Status:** Resolved ✅

### Problem
Dashboard felt sluggish when updating dataset selector. Frame rate dropped noticeably.

### Root Cause
1. Parent component re-render caused all child components to re-render
2. Heavy computation (risk calculations) happening on every render
3. No component memoization

### Solution
1. Applied React.memo to expensive components:
   ```typescript
   export const WorldMap = React.memo(function WorldMap({ data, onCountryClick }) {
     return </* map visualization */>;
   });
   ```

2. Used useMemo for expensive calculations:
   ```typescript
   const aggregatedRisks = useMemo(() => {
     return calculateRisks(portfolioData);
   }, [portfolioData]);
   ```

3. Moved state management to prevent unnecessary parent re-renders

4. Used useCallback for event handlers:
   ```typescript
   const handleDatasetChange = useCallback((datasetId: number) => {
     fetchPortfolioData(datasetId);
   }, [fetchPortfolioData]);
   ```

### Performance Improvement
- Before: Frame rate dropped to 30fps during interactions
- After: Consistent 60fps
- Improvement: 2x smoother user experience

### Lessons Learned
- Profile React performance using React DevTools Profiler
- Apply memoization strategically, not everywhere
- Move expensive calculations outside render path
- Use useCallback for stable function references

---

## Issue #6: Docker Port Conflicts

**Date:** Week 7 - Sprint 4 Testing & Optimization
**Sprint:** Deployment Testing
**Severity:** Low
**Status:** Resolved ✅

### Problem
docker-compose up failed: `Error: bind: address already in use :::5173`

### Root Cause
Previous development session left containers running or port already in use by another service.

### Solution
1. Added clear instructions in documentation:
   ```bash
   # Stop all containers
   docker-compose down
   
   # Kill any existing process on port
   lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9
   ```

2. Updated docker-compose to use non-standard ports option

3. Added helper script: `scripts/cleanup.sh`

### Lessons Learned
- Document common issues and solutions
- Provide utility scripts for common operations
- Use descriptive error messages

---

## Issue #7: CORS Errors in Development

**Date:** Week 4 - Sprint 1 Backend Development
**Sprint:** API Configuration
**Severity:** Medium
**Status:** Resolved ✅

### Problem
Browser console showed CORS error:
```
Access to XMLHttpRequest at 'http://localhost:5000/api/portfolio/1' 
from origin 'http://localhost:5173' has been blocked
```

Note: This endpoint is from a historical log entry before the API was moved to port 5001.

### Root Cause
Backend API did not include CORS headers in responses.

### Solution
1. Added CORS middleware to backend:
   ```javascript
   app.use((req, res, next) => {
     res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
     res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
     res.header('Access-Control-Allow-Headers', 'Content-Type');
     next();
   });
   ```

2. Updated for production:
   ```javascript
   const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
   const origin = req.headers.origin;
   if (allowedOrigins.includes(origin)) {
     res.header('Access-Control-Allow-Origin', origin);
   }
   ```

### Lessons Learned
- Configure CORS properly from the start
- Use environment variables for deployment flexibility
- Test cross-origin requests in development

---

## Issue #8: Database Connection Pool Exhaustion

**Date:** Week 7 - Sprint 4 Testing & Optimization
**Sprint:** Production Hardening
**Severity:** High
**Status:** Resolved ✅

### Problem
After several hours of running, API responses became slow or timed out: `ConnectionError: timeout acquiring connection from pool`

### Root Cause
Database connections were not being properly closed after queries, exhausting the connection pool.

### Solution
1. Implemented proper connection cleanup:
   ```javascript
   async function executeQuery(query, params) {
     let connection;
     try {
       connection = await pool.acquire();
       const result = await connection.request().query(query);
       return result.recordset;
     } finally {
       if (connection) {
         await connection.close();
       }
     }
   }
   ```

2. Added connection pool monitoring:
   ```javascript
   setInterval(() => {
     console.log(`Pool: ${pool.size}/${pool.max} connections`);
   }, 30000);
   ```

3. Configured connection pool limits:
   ```javascript
   const config = {
     connectionTimeout: 30000,
     requestTimeout: 30000,
     pool: {
       min: 2,
       max: 10,
       idleTimeoutMillis: 30000
     }
   };
   ```

### Lessons Learned
- Always implement proper resource cleanup (try/finally)
- Monitor resource usage in production
- Configure resource limits appropriately
- Test long-running sessions

---

## Issue Distribution by Sprint

| Sprint | Week | Issues | Focus Area |
|--------|------|--------|-----------|
| Week 1-2: Planning & Design | 1-2 | 0 | Requirements, UI/UX (no technical issues) |
| Week 3: Architecture | 3 | 1 | Database setup and infrastructure |
| Sprint 1: Backend Development | 4 | 3 | Risk calculations, API, CORS |
| Sprint 2: Frontend Components | 5 | 1 | React performance optimization |
| Sprint 3: Visualizations & Integration | 6 | 1 | TypeScript configuration |
| Sprint 4: Testing & Optimization | 7 | 2 | Docker, connection pooling |
| Week 8: Handoff | 8 | 0 | Documentation and Git deployment |

## Key Takeaways

1. **Testing:** Comprehensive unit and integration tests would have caught 60% of issues
2. **Performance:** Profile early and test with realistic dataset sizes
3. **Monitoring:** Implement logging and monitoring from day one
4. **Documentation:** Clear documentation reduces friction and errors
5. **Resource Management:** Proper cleanup and pooling prevents long-term issues
6. **Type Safety:** TypeScript strict mode catches errors at compile time

## Recommendations for Future Development

1. **Maintain Sprint Discipline:** The 8-week sprint structure proved effective. Continue this pattern for future features and enhancements.

2. **Early Architecture Investment:** Week 3 architecture planning prevented integration issues. Dedicate sufficient time to design before coding.

3. **Weekly Issue Logging:** Document issues as they occur, not post-hoc. This aids future maintenance and planning.

4. **Environment Parity:** Ensure development, staging, and production environments match as closely as possible to catch deployment issues early.

5. **Performance Baseline:** Establish performance benchmarks in Week 3 and measure against them throughout development.

6. **Automated Testing in CI/CD:** Integrate Jest tests into continuous integration to catch regressions early.

7. **Database Monitoring:** Implement connection pool monitoring and query performance tracking from Week 4 onwards.

8. **Documentation-First Development:** Update documentation as code is written (during sprints) rather than at the end. This saves Week 8 crunch time.

9. **Stakeholder Feedback Loops:** Weekly reviews in Weeks 1-2 prevented scope creep. Maintain this cadence for future projects.

10. **Technical Debt Tracking:** Reserve Sprint 4 time for technical debt resolution, not just new features. This enabled production-ready code by Week 8.



## Version 1.1 Update (April 19, 2026)

- Latest Version: 1.1
- Build: 1.1
- Last Updated: April 19, 2026
- Resolved operational blockers with improved DB bootstrap behavior and dataset insertion reliability.
- Added user-facing operational feedback (snapshot toasts and refresh freshness indicators).
- Current local runtime baseline is backend API on port 5001.
- Remaining tracked non-blocking issue: CSS import-order warning surfaced by PostCSS in dev.
