# System Architecture: Geopolitical Risk Dashboard

## Overview
The Geopolitical Risk Dashboard follows a modern three-tier architecture with a React frontend, Node.js backend API, and SQL Server database. This design was completed in Week 3 of the 8-week development cycle to support parallel frontend (Week 5) and backend (Week 4) implementation.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Browser (React App)                       │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │Dashboard │  │  Charts  │  │ Risk     │  │Portfolio │  │ │
│  │  │Container │  │Component │  │ Gauge    │  │ Panel    │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │Help Modal│  │Update    │  │Portfolio │  │Risk      │  │ │
│  │  │(Responsive)  │Status   │  │Download  │  │Insights  │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │        Data Services & State Management              │ │ │
│  │  │  - Portfolio Data Service                            │ │ │
│  │  │  - Country Risk Service                              │ │ │
│  │  │  - Risk Calculation Service                          │ │ │
│  │  │  - Daily Update Manager                              │ │ │
│  │  │  - Historical Snapshot Manager                       │ │ │
│  │  │  - Alerts & Thresholds Manager                       │ │ │
│  │  │  - Scenario Analysis Manager                         │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER (Node.js)                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                 Express-like API Router                    │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │/api/     │  │/api/     │  │/api/     │  │/api/     │  │ │
│  │  │datasets  │  │assets    │  │countries │  │portfolio │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │        Business Logic Layer                          │ │ │
│  │  │  - Risk Calculation Engine                           │ │ │
│  │  │  - Portfolio Aggregator                              │ │ │
│  │  │  - Data Validator                                    │ │ │
│  │  │  - CSV Data Loader                                   │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ SQL Queries
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              SQL Server 2022 Express                       │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │Countries │  │ Sectors  │  │ Assets   │  │Portfolio │  │ │
│  │  │ Table    │  │ Table    │  │ Table    │  │ Table    │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
│  │  ┌──────────┐  ┌──────────┐                              │ │
│  │  │Exposures │  │Dependencies│                              │ │
│  │  │ Table    │  │ Table    │                              │ │
│  │  └──────────┘  └──────────┘                              │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
User Interaction
       │
       ▼
Component Event Handler
       │
       ▼
Service Layer (e.g., portfolioService.fetchData)
       │
       ▼
API Endpoint (GET /api/portfolio/:datasetId)
       │
       ▼
Business Logic Layer
  ├─ Risk Calculation
  ├─ Portfolio Aggregation
  └─ Data Transformation
       │
       ▼
Database Query
       │
       ▼
SQL Server (Execute Query)
       │
       ▼
Result Set
       │
       ▼
Response Object (JSON)
       │
       ▼
Component State Update
       │
       ▼
Re-render with New Data
       │
       ▼
User Sees Updated Dashboard
```

## Component Architecture

```
App (Main Container)
├── Header
│   └── DatasetSelector
├── MainContent (Tabbed Interface)
│   ├── Dashboard Tab
│   │   ├── PortfolioPanel
│   │   │   ├── RiskGauge
│   │   │   ├── RiskSummaryCard
│   │   │   └── RiskLegend
│   │   ├── WorldMap
│   │   │   └── Country Risk Visualization
│   │   ├── ExposureCharts
│   │   │   ├── RegionalExposureChart
│   │   │   └── SectorExposureChart
│   │   └── HoldingsTable
│   │       └── Individual Asset Risk Details
│   ├── Summary Tab
│   │   └── Summary (Insights & Recommendations)
│   ├── Metrics Tab (value: advanced-metrics)
│   │   ├── RiskMetricsPanel (advanced statistical metrics)
│   │   └── CorrelationAnalysisPanel
│   ├── Scenarios Tab
│   │   ├── ScenarioAnalysis
│   │   │   ├── Saved Scenarios List
│   │   │   ├── Crisis Scenario Templates
│   │   │   ├── Quick Asset Tests
│   │   │   ├── Scenario Comparison View
│   │   │   └── Rebalancing Suggestions
│   │   ├── CustomScenarioBuilderPanel
│   │   └── Monte Carlo Simulation
│   └── Tools Tab
│       └── AdvancedFilters (Portfolio + CSV Upload tabs)
├── Header Modals (not tabs)
│   ├── AlertsAndNotifications (risk alerts & thresholds)
│   ├── News Feed
│   ├── Help / Methodology Modal
│   └── Settings Modal
├── Sidebar
│   ├── Portfolio Stats
│   ├── Risk Factor Weights
│   └── Reset Weights Button
├── Help Modal
│   └── Interactive Help System
├── Daily Update Status Modal
│   └── Update Information & Manual Refresh
└── Footer
    └── Information & Links
```

## Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│ COUNTRIES Table                                             │
├─────────────────────────────────────────────────────────────┤
│ PK: CountryID (int)                                         │
│    CountryName (varchar)                                    │
│    PoliticalRisk (decimal)                                  │
│    EconomicRisk (decimal)                                   │
│    ConflictRisk (decimal)                                   │
│    CorruptionRisk (decimal)                                 │
│    TerrorismRisk (decimal)                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SECTORS Table                                               │
├─────────────────────────────────────────────────────────────┤
│ PK: SectorID (int)                                          │
│    SectorName (varchar)                                     │
│    Description (varchar)                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ASSETS Table                                                │
├─────────────────────────────────────────────────────────────┤
│ PK: AssetID (int)                                           │
│    AssetName (varchar)                                      │
│ FK: SectorID (int)                                          │
│    Value (decimal)                                          │
│    HeadquartersCountry (varchar)                            │
│    Description (varchar)                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ EXPOSURES Table                                             │
├─────────────────────────────────────────────────────────────┤
│ PK: ExposureID (int)                                        │
│ FK: AssetID (int)                                           │
│ FK: CountryID (int)                                         │
│    ExposureType (varchar)                                   │
│    Percentage (decimal)                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ DEPENDENCIES Table                                          │
├─────────────────────────────────────────────────────────────┤
│ PK: DependencyID (int)                                      │
│ FK: AssetID (int)                                           │
│ FK: CountryID (int)                                         │
│    Description (varchar)                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PORTFOLIO Table                                             │
├─────────────────────────────────────────────────────────────┤
│ PK: PortfolioID (int)                                       │
│    PortfolioName (varchar)                                  │
│    Description (varchar)                                    │
│    CreatedDate (datetime)                                   │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

```
GET /api/health
  - Health check endpoint
  - Returns: { status: 'ok' }

GET /api/datasets
  - List all available datasets
  - Returns: Array of { id, name, description }

GET /api/assets/:datasetId
  - Get assets for a dataset
  - Returns: Array of assets with risk scores

GET /api/countries
  - Get all countries with base risk scores
  - Returns: Array of countries with 5D risk metrics

GET /api/portfolio/:datasetId
  - Get complete portfolio data
  - Returns: Portfolio with aggregated risks, exposures, holdings

GET /api/dependencies/:datasetId
  - Get country dependencies for a dataset
  - Returns: Array of direct and indirect country dependencies
```

## Risk Calculation Engine

See [RISK_ALGORITHMS.md](RISK_ALGORITHMS.md) §2.2 and §3.1 for the full methodology; the summary below mirrors the implementation (code is source of truth).

### Country Weighted Risk Index

`calculateRiskIndex` in `src/app/data/countryRiskData.ts` divides the weighted sum of the five dimensions by a **fixed constant of 500** (5 dimensions × 100 max weight) — not by the sum of the weights.

```
Weighted Risk Index = round( Σ(Dimension × Weight) / 500 )

Where:
  - Dimension = Base political / economic / conflict / corruption / terrorism risk (0-100)
  - Weight    = Individual weight (0-100) for each dimension
  - 500       = Fixed normalization constant (5 × 100), NOT the sum of the weights

Edge cases:
  - Total weight = 0            → 0
  - Country not in database     → 30 (default)

Because the divisor is constant, scores are compressed: with weights summing to
100, an all-100 country scores only (100 × 100) / 500 = 20.
```

### Portfolio Risk Score

`calculatePortfolioRisk` in `src/app/data/portfolioData.ts` is an **un-normalized weighted exposure sum** across every asset's country dependencies — not a weight-normalized average.

```
Portfolio Risk = min( 100, round( Σ (asset.weight / 100) × dependency.weight × countryRisk ) )

Where:
  - asset.weight      = Portfolio weight of the asset (percent)
  - dependency.weight = Country dependency weight for that asset
  - countryRisk       = Country Weighted Risk Index (above); missing country → 0

Contributions are summed (not averaged), so the raw total can exceed 100 and is
clamped by Math.min(100, …).
```

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 19 |
| Frontend Language | TypeScript | 5+ |
| Frontend Styling | Tailwind CSS | 4 |
| Frontend Build | Vite | 8 |
| Backend | Node.js | 18+ |
| Backend Framework | Express | 5 |
| Backend Language | JavaScript (ESM, `.js`) | ES2022 |
| Database | SQL Server | 2022 |
| Testing | Jest | 30 |
| Containerization | Docker | Latest |
| Orchestration | docker-compose | 3.8 |

## Security Architecture

```
Browser
  │
  ├─ HTTPS (in production)
  │
  ▼
API Server
  ├─ Input Validation
  ├─ Rate Limiting (recommended)
  ├─ CORS Configuration
  │
  ▼
Business Logic
  ├─ Data Sanitization
  ├─ SQL Injection Prevention (parameterized queries)
  │
  ▼
Database
  ├─ Authentication
  ├─ Encryption at rest
  ├─ Access controls
```

## Deployment Architecture

```
┌──────────────────────────────────────────┐
│         Docker Compose Network            │
├──────────────────────────────────────────┤
│                                          │
│  ┌──────────────┐    ┌──────────────┐   │
│  │   Frontend   │    │  Backend API │   │
│  │  (Port 3000) │───▶│  (Port 5050) │   │
│  │              │    │              │   │
│  └──────────────┘    └──────────────┘   │
│                            │             │
│                            │             │
│                      ┌─────▼──────┐     │
│                      │ SQL Server │     │
│                      │ (Port 1433)│     │
│                      │            │     │
│                      └────────────┘     │
│                                          │
└──────────────────────────────────────────┘
```

## Performance Considerations

1. **Frontend Optimization:**
   - Component memoization to prevent unnecessary re-renders
   - Lazy loading for charts and maps
   - Virtual scrolling for large tables

2. **Backend Optimization:**
   - Query result caching for frequently accessed data
   - Database indexing on primary keys and foreign keys
   - Connection pooling for database access

3. **Database Optimization:**
   - Indexes on CountryID, AssetID, SectorID
   - View materialization for complex queries
   - Data normalization to reduce redundancy

## Scalability Plan

| Component | Current Capacity | Scaling Strategy |
|-----------|-----------------|------------------|
| Assets | 1000+ | Pagination, virtualization |
| Countries | 200+ | No issues expected |
| Datasets | 10+ | Add dataset versioning |
| Users | Single user | Add authentication layer |
| Database | 100GB+ | SQL Server scaling, sharding |

## Conclusion

The architecture is designed for maintainability, scalability, and performance. Clear separation of concerns enables independent testing and deployment of components. The containerized deployment ensures consistency across environments. This architecture was intentionally designed in Week 3 to enable parallel development during Weeks 4-7 coding sprints, with backend and frontend teams working independently against documented API contracts.



## Version 1.1 Update (April 19, 2026)

- Latest Version: 1.1
- Build: 1.1
- Last Updated: April 19, 2026
- UI architecture now includes map snapshot export (SVG-to-canvas with fallback) and toast feedback.
- Header interaction architecture now includes refresh-status badges for fresh vs overdue states.
- Local runtime architecture is aligned to backend API on port 5050.
- Data bootstrap architecture now includes target DB auto-create before schema and seed initialization.
