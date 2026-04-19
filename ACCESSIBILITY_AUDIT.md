# Accessibility Audit (Quick Pass)

Date: 2026-04-19
Scope: Core user flows in Dashboard, Summary, and Trends tabs
Method: Keyboard-only walkthrough checklist + visual contrast hotspot scan from component markup/classes

## Keyboard-Only Walkthrough Checklist

1. Header icon controls (News, Alerts, Update status, Help, Settings)
- Status: Pass
- Notes: Icon-only buttons now expose accessible names via aria-label.
- References:
  - [News button aria-label](src/app/App.tsx#L1370)
  - [Alerts button aria-label](src/app/App.tsx#L1432)
  - [Update status button aria-label](src/app/App.tsx#L1451)
  - [Help button aria-label](src/app/App.tsx#L1469)
  - [Settings button aria-label](src/app/App.tsx#L1477)

2. Global Risk Heat Map keyboard access
- Status: Pass
- Notes: Country paths are keyboard-focusable, labeled, and support Enter/Space to reveal tooltip context.
- References:
  - [Country keyboard role/tabIndex/aria-label](src/app/components/WorldMap.tsx#L161)
  - [Map SVG role and accessible name](src/app/components/WorldMap.tsx#L255)

3. Empty/Loading/Error state screen-reader announcements
- Status: Pass
- Notes: Core map and filtered holdings empty/loading/error states use role=status or role=alert with aria-live.
- References:
  - [Map loading state](src/app/components/WorldMap.tsx#L218)
  - [Map error state](src/app/components/WorldMap.tsx#L227)
  - [Holdings empty state](src/app/components/HoldingsTable.tsx#L89)
  - [Dashboard exposure empty state](src/app/App.tsx#L1725)

4. Tab and filter controls (Dashboard sidebar)
- Status: Partial
- Notes: Controls are native/select/range and keyboard-friendly, but visible focus styling is subtle in dense dark UI and should be made more prominent.
- References:
  - [Holdings filter section](src/app/App.tsx#L1618)
  - [Risk slider in sidebar](src/app/App.tsx#L1632)

5. Trends tab Recent Changes discoverability
- Status: Pass
- Notes: Added tooltip on Recent Changes heading describing meaning and calculation.
- References:
  - [Recent Changes heading + tooltip](src/app/components/HistoricalTrends.tsx#L112)

## WCAG Contrast Hotspots (Likely)

These are priority hotspots where very small font sizes are paired with muted zinc tones on dark backgrounds. They are likely to underperform WCAG contrast targets, especially for small text.

1. Header dataset description text (9-10px, zinc-600)
- Severity: High
- Reference: [Dataset description](src/app/App.tsx#L1347)

2. Sidebar microcopy and source labels (8-10px, zinc-500/600)
- Severity: High
- References:
  - [Snapshot description block](src/app/App.tsx#L1571)
  - [Source note](src/app/App.tsx#L1611)
  - [Source label](src/app/App.tsx#L1612)

3. Compact right-column dashboard headings (10px, zinc-600)
- Severity: High
- References:
  - [Total Portfolio Risk heading](src/app/App.tsx#L1813)
  - [Gauge status label](src/app/App.tsx#L1822)
  - [Top Risk Assets heading](src/app/App.tsx#L1836)
  - [Top Risk Countries heading](src/app/App.tsx#L1858)

4. Holdings table header labels (xs, zinc-500)
- Severity: Medium
- References:
  - [Holdings header labels](src/app/components/HoldingsTable.tsx#L99)

5. Historical Trends support text (zinc-400 on dark chart cards)
- Severity: Medium
- References:
  - [Portfolio Risk Change label](src/app/components/HistoricalTrends.tsx#L117)
  - [Country stats row](src/app/components/HistoricalTrends.tsx#L191)

## Recommended Next Fix Pass

1. Raise tiny muted text tokens in critical UI from zinc-600/zinc-500 to zinc-400 or zinc-300 where font size <= 10px.
2. Increase minimum text size in high-value metadata rows from 9-10px to at least 11-12px.
3. Strengthen focus-visible outlines for sidebar controls and icon buttons so keyboard focus is unmistakable.
4. Re-run contrast checks after token updates and track any remaining exceptions.
