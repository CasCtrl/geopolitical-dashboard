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
│   ├── Trends Tab
│   │   ├── HistoricalTrends
│   │   │   ├── Portfolio Risk Trend Chart
│   │   │   ├── Country Risk Trend Charts
│   │   │   └── Recent Changes Summary
│   │   └── Time Range Selector (7/30/90 days)
│   ├── Alerts Tab
│   │   ├── AlertsAndNotifications
│   │   │   ├── Alert Summary (Unread Count)
│   │   │   ├── Recent Activity Feed
│   │   │   ├── Risk Threshold Manager
│   │   │   └── Create New Threshold Form
│   │   └── Alert Event History
│   └── Scenarios Tab
│       ├── ScenarioAnalysis
│       │   ├── Saved Scenarios List
│       │   ├── Crisis Scenario Templates
│       │   ├── Quick Asset Tests
│       │   ├── Scenario Comparison View
│       │   └── Rebalancing Suggestions
│       └── What-If Testing Controls
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

GET /api/datasets/:datasetId
  - Get specific dataset details
  - Returns: Dataset object with metadata

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

```
Risk Index = Σ(Country Risk Score × Risk Weight) / Total Weight

Where:
  - Country Risk Score = (PoliticalRisk + EconomicRisk + ConflictRisk + CorruptionRisk + TerrorismRisk) / 5
  - Risk Weight = Individual weight (0-100) for each risk dimension
  - Total Weight = Sum of all weights

Example:
  Political Weight: 25
  Economic Weight: 20
  Conflict Weight: 15
  Corruption Weight: 20
  Terrorism Weight: 20
  Total: 100

  Portfolio Risk = (CountryA Risk × 25 + CountryB Risk × 20 + ...) / 100
```

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 18+ |
| Frontend Language | TypeScript | 5+ |
| Frontend Styling | Tailwind CSS | 3+ |
| Frontend Build | Vite | 5+ |
| Backend | Node.js | 18+ |
| Backend Language | TypeScript | 5+ |
| Database | SQL Server | 2022 |
| Testing | Jest | 29+ |
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
│  │  (Port 5173) │───▶│  (Port 5000) │   │
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
