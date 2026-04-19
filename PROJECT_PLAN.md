# Project Plan: Geopolitical Risk Dashboard

## Executive Summary
The Geopolitical Risk Dashboard is a full-stack web application designed to help investors assess and visualize geopolitical risks across their portfolios. This document outlines the project timeline, milestones, deliverables, and key objectives.

## Project Objectives
1. Develop a comprehensive dashboard for real-time geopolitical risk assessment
2. Create an interactive world map visualization of country risk levels
3. Build portfolio analysis tools with risk metrics across 5 dimensions
4. Deploy as a production-ready full-stack application
5. Enable data-driven investment decision-making

## Scope
- **Week 1:** User research, requirements gathering, and stakeholder engagement
- **Week 2:** UI/UX design, visual mockups, and interaction design
- **Week 3:** Backend infrastructure, database design, and API specification
- **Weeks 4-7:** Iterative development with sprint-based implementation and testing
- **Week 8:** Final packaging, documentation, Git deployment, and project handoff

## Project Team Structure

- **Project Lead / Developer:** Full-stack implementation across all layers
- **Stakeholder / User:** Portfolio managers and risk analysts providing feedback
- **QA / Tester:** Quality assurance and testing throughout sprints

## Timeline & Milestones

### Week 1: Requirements & User Analysis
**Objective:** Gather stakeholder requirements and define user personas

- [x] Conduct interviews with portfolio managers and risk analysts
- [x] Document key user stories and use cases
- [x] Define functional and non-functional requirements
- [x] Create user personas and journey maps
- [x] Identify data sources and risk metrics (5-dimensional framework)
- [x] Establish project success criteria and acceptance conditions

**Deliverables:** Requirements specification, user personas, use case documentation, stakeholder sign-off

### Week 2: Frontend Design & UI Storyboarding
**Objective:** Design user interface and create interactive storyboards

- [x] Create wireframes for all dashboard screens
- [x] Design component layouts and user workflows
- [x] Develop design system (colors, typography, spacing)
- [x] Build interactive storyboards and prototypes
- [x] Create Figma designs synced with guidelines
- [x] Design responsive layouts for various screen sizes
- [x] Plan accessibility and usability enhancements

**Deliverables:** Design mockups, interactive storyboards, design guidelines, component library, Figma prototypes

### Week 3: Backend Architecture & Infrastructure Setup
**Objective:** Design backend systems and prepare infrastructure

- [x] Design database schema (Countries, Sectors, Assets, Portfolio, Exposures, Dependencies)
- [x] Define REST API endpoints and data contracts
- [x] Plan risk calculation algorithms and validation rules
- [x] Set up Docker containerization strategy
- [x] Configure SQL Server database environment
- [x] Plan data pipeline and CSV loading mechanism
- [x] Document API specifications and contracts

**Deliverables:** Database schema, API documentation, system architecture diagrams, infrastructure setup

### Week 4: Sprint 1 - Core Backend Development
**Objective:** Implement backend API foundation

- [x] Implement database initialization and connection pooling
- [x] Build asset and country endpoints with data retrieval
- [x] Implement risk calculation service
- [x] Create portfolio data aggregation logic
- [x] Add CSV data loader and parser
- [x] Implement data validation and error handling
- [x] Write unit tests for core services

**Deliverables:** Functional API endpoints, working data services, unit tests, API server running on localhost:5001

### Week 5: Sprint 2 - Frontend Core Components
**Objective:** Build primary UI components and state management

- [x] Develop DatasetSelector and navigation components
- [x] Build RiskGauge and risk visualization components
- [x] Implement PortfolioPanel with summary displays
- [x] Create RiskSlider for risk assessment interaction
- [x] Build HoldingsTable for asset display
- [x] Set up React component architecture and hooks
- [x] Implement responsive CSS with Tailwind

**Deliverables:** Working React components, frontend running on localhost:5173, responsive UI, component library

### Week 6: Sprint 3 - Advanced Visualizations & Integration
**Objective:** Implement complex visualizations and frontend-backend integration

- [x] Develop WorldMap interactive visualization with D3/custom rendering
- [x] Build ExposureCharts and RegionalExposureChart components
- [x] Implement country risk exposure matrix
- [x] Connect frontend to backend API endpoints
- [x] Add data fetching and state management
- [x] Implement error handling and loading states
- [x] Create integration tests for API communication

**Deliverables:** Interactive visualizations, fully integrated app, working dashboard, integration tests

### Week 7: Sprint 4 - Testing, Optimization & Polish
**Objective:** Comprehensive testing, performance tuning, and refinement

- [x] Implement comprehensive unit tests (>80% coverage)
- [x] Conduct system and end-to-end testing
- [x] Perform performance optimization and profiling
- [x] Optimize database queries and API response times
- [x] Refine UI/UX based on usability testing
- [x] Implement security hardening and validation
- [x] Fix identified bugs and edge cases

**Deliverables:** Test suite, optimized application, performance improvements, bug fixes, production-ready build

### Week 8: Final Package & Handoff
**Objective:** Complete deliverables, documentation, and project handoff

- [x] Generate production build and Docker image
- [x] Push code to Git repository with clean commit history
- [x] Create comprehensive deployment documentation
- [x] Write user guide and troubleshooting documentation
- [x] Prepare technical handoff documentation
- [x] Conduct final testing and quality assurance
- [x] Package application for deployment
- [x] Implement responsive help modal for mobile and desktop
- [x] Add daily risk snapshot update system with status tracking
- [x] Implement portfolio report download functionality
- [x] Add interactive update status modal with manual refresh
- [x] Integrate daily updates into help documentation
- [x] Implement historical trends analysis with time-series data
- [x] Create alerts and thresholds management system
- [x] Build scenario analysis and crisis testing engine
- [x] Add three new dashboard tabs (Trends, Alerts, Scenarios)
- [x] Integrate snapshot recording and auto-checking thresholds
- [x] Create rebalancing suggestion engine

**Deliverables:** Production release on Git, deployment guide, user documentation, setup instructions, daily update system, responsive UI components, historical trends analytics, alerts system, scenario analysis engine, project handoff

## Key Deliverables

| Deliverable | Week | Status | Location |
|-------------|------|--------|----------|
| Requirements & User Analysis | 1 | ✅ Complete | [README.md](README.md) |
| UI Mockups & Storyboards | 2 | ✅ Complete | [guidelines/DESIGN_GUIDELINES.md](guidelines/DESIGN_GUIDELINES.md) |
| System Architecture | 3 | ✅ Complete | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Database Schema | 3 | ✅ Complete | [server/db/init.js](server/db/init.js) |
| API Endpoints | 3 | ✅ Complete | [FULLSTACK_SETUP.md](FULLSTACK_SETUP.md) |
| Backend API Implementation | 4 | ✅ Complete | [server/](server/) |
| Frontend Components | 5 | ✅ Complete | [src/app/components/](src/app/components/) |
| Advanced Visualizations | 6 | ✅ Complete | [src/app/components/](src/app/components/) |
| Integration Tests | 6 | ✅ Complete | [src/app/data/__tests__/integration/](src/app/data/__tests__/integration/) |
| Unit Tests | 7 | ✅ Complete | [src/app/data/__tests__/](src/app/data/__tests__/) |
| System Tests | 7 | ✅ Complete | [src/app/data/__tests__/system/](src/app/data/__tests__/system/) |
| Performance Optimization | 7 | ✅ Complete | Documented in [ARCHITECTURE.md](ARCHITECTURE.md) |
| Production Build | 8 | ✅ Complete | Package.json build scripts |
| Git Repository | 8 | ✅ Complete | GitHub repository |
| Deployment Documentation | 8 | ✅ Complete | [FULLSTACK_SETUP.md](FULLSTACK_SETUP.md) |
| Technical Issues Log | 8 | ✅ Complete | [TECHNICAL_ISSUES_LOG.md](TECHNICAL_ISSUES_LOG.md) |
| Project Plan | 8 | ✅ Complete | [PROJECT_PLAN.md](PROJECT_PLAN.md) |

## Success Criteria

- [x] Week 1: Requirements document approved by stakeholders
- [x] Week 2: UI design approved and storyboards validated with users
- [x] Week 3: Architecture reviewed, API contracts finalized, database designed
- [x] Week 4: Backend API functional with core endpoints tested
- [x] Week 5: Frontend components integrated with backend services
- [x] Week 6: All visualizations working, data flows end-to-end
- [x] Week 7: Test coverage >85%, performance meets targets, security hardened
- [x] Week 8: Git repository populated, documentation complete, ready for handoff

## Resource Requirements

- **Development Team:** 1 full-stack developer
- **Time Commitment:** 8 weeks, full-time engagement
- **Stakeholder Availability:** Weekly reviews (Week 1-2), bi-weekly feedback (Weeks 3-8)
- **Technology Stack:**
  - Frontend: React 18+, TypeScript, Tailwind CSS, Vite
  - Backend: Node.js, Express-like routing, TypeScript
  - Database: SQL Server 2022 Express
  - Testing: Jest, TypeScript
  - Deployment: Docker, docker-compose, Git

## Risk Management

| Risk | Probability | Impact | Mitigation | Timeline |
|------|-------------|--------|-----------|----------|
| Unclear requirements delay Week 1 | Medium | High | Daily standup with stakeholders, rapid prototype feedback | Week 1 |
| UI complexity requires redesign | Medium | High | Iterative prototyping, early user testing in Week 2 | Week 2 |
| Database performance bottleneck | Low | Critical | Indexing strategy, query optimization in Week 3 design | Week 4 |
| Integration delays between frontend/backend | Medium | Medium | Clear API contracts in Week 3, parallel development | Weeks 4-6 |
| Testing reveals critical bugs late | Medium | High | Continuous testing throughout Weeks 4-7 sprints | Weeks 4-7 |
| Schedule compression in final week | High | Medium | Buffer testing time, automate deployment processes | Week 7-8 |

## Lessons Learned

1. **Compressed Timeline Benefits:** 8-week sprint forces prioritization and prevents scope creep. Focus on MVP reduces complexity.

2. **Early Stakeholder Engagement:** Week 1 user research prevents mid-project pivots. Weekly feedback in early weeks saves rework.

3. **Clear Architecture in Week 3:** Detailed API design and database schema up-front prevents integration issues in sprints.

4. **Parallel Development:** Backend (Week 4) and frontend (Week 5) can run in parallel with clear contracts, reducing critical path.

5. **Continuous Testing:** Testing throughout sprints (Weeks 4-7) catches issues early. End-of-project testing is too late.

6. **Iterative Refinement:** Weeks 4-7 sprint format allows continuous feedback loops. Feature completion vs. perfection trade-offs improve velocity.

7. **Documentation Timing:** Keeping documentation updated during development (not at end) saves Week 8 crunch time.

8. **Git Discipline:** Clean commit history and documentation in Week 8 requires disciplined practices throughout project.

## Conclusion

The Geopolitical Risk Dashboard project successfully delivered a production-ready application within an 8-week accelerated timeline. By front-loading requirements (Week 1), design (Week 2), and architecture (Week 3), the project achieved rapid iteration in Weeks 4-7 with minimal rework. The structured approach—from user research through sprint-based development to final handoff—demonstrates that focused execution and clear priorities enable complex full-stack applications to ship quickly without sacrificing quality. The comprehensive documentation and test suite ensure maintainability and support for future enhancements.



## Version 1.1 Update (April 19, 2026)

- Latest Version: 1.1
- Build: 1.1
- Last Updated: April 19, 2026
- Plan baseline now reflects delivered v1.1 items: map snapshot export and refresh-status signaling.
- Operational delivery context updated for backend API on localhost:5001 in local development.
- Documentation workstream updated to include synchronized Help modal and tools guidance.
- Data reliability objective is now backed by stronger DB bootstrap and dataset loading behavior.
