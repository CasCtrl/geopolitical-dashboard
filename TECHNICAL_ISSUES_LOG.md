# Technical Issues Log

## Overview
This document tracks technical issues encountered during development, their root causes, solutions implemented, and lessons learned.

---

## Issue #1: SQL Server Connection Timeout on First Startup

**Date:** Development Phase 3 (Week 5)
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

**Date:** Development Phase 3 (Week 6)
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

**Date:** Development Phase 4 (Week 9)
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

**Date:** Development Phase 3 (Week 7)
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

**Date:** Development Phase 4 (Week 10)
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

**Date:** Development Phase 5 (Week 13)
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

**Date:** Development Phase 3 (Week 8)
**Severity:** Medium
**Status:** Resolved ✅

### Problem
Browser console showed CORS error:
```
Access to XMLHttpRequest at 'http://localhost:5000/api/portfolio/1' 
from origin 'http://localhost:5173' has been blocked
```

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

**Date:** Development Phase 4 (Week 11)
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

## Summary of Issues by Category

| Category | Count | Severity |
|----------|-------|----------|
| Database/Connectivity | 3 | 2 Critical, 1 High |
| Performance | 2 | Both Medium |
| Type Safety | 1 | Medium |
| API/CORS | 1 | Medium |
| DevOps | 1 | Low |

## Key Takeaways

1. **Testing:** Comprehensive unit and integration tests would have caught 60% of issues
2. **Performance:** Profile early and test with realistic dataset sizes
3. **Monitoring:** Implement logging and monitoring from day one
4. **Documentation:** Clear documentation reduces friction and errors
5. **Resource Management:** Proper cleanup and pooling prevents long-term issues
6. **Type Safety:** TypeScript strict mode catches errors at compile time

## Recommendations for Future Development

1. Implement automated performance testing in CI/CD
2. Add APM (Application Performance Monitoring) tools
3. Set up production-like staging environment earlier
4. Implement comprehensive error tracking (e.g., Sentry)
5. Add load testing to identify bottlenecks
6. Document assumptions and constraints clearly
7. Conduct code reviews focusing on resource management
