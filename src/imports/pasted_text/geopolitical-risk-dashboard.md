Use this example portfolio:

Example Portfolio

AAPL — Apple — 20%
MSFT — Microsoft — 20%
NVDA — Nvidia — 15%
XOM — Exxon Mobil — 15%
TSLA — Tesla — 15%
BTC — Bitcoin allocation or ETF proxy — 15%

This gives you:

heavy U.S. concentration
tech exposure
energy exposure
crypto exposure
indirect sensitivity to Taiwan, China, and Middle East instability

Example country/region mapping:

Asset	Weight	Primary Country	Region	Notes
AAPL	20%	United States	North America	U.S. direct exposure, China supply chain sensitivity
MSFT	20%	United States	North America	U.S. direct exposure
NVDA	15%	United States	North America	Taiwan semiconductor dependency
XOM	15%	United States	North America	Middle East energy sensitivity
TSLA	15%	United States	North America	China manufacturing sensitivity
BTC	15%	Global	Global	Macro and regulatory sensitivity

For the dashboard example, you can show a calculated output like this:

Portfolio Risk Summary

Total Portfolio Risk Score: 68 / 100
Highest Direct Exposure Country: United States
Highest Indirect Strategic Risk: Taiwan
Highest Regional Volatility Driver: Middle East
Flagged Countries: United States, China, Taiwan, Saudi Arabia, UAE

Example country-level heat map data:

Country	Exposure Type	Example Risk Score	Why it appears
United States	Direct	55	Most holdings are U.S.-listed
China	Indirect	72	Manufacturing and supply chain dependence
Taiwan	Indirect	81	Semiconductor concentration risk
Saudi Arabia	Indirect	66	Energy market sensitivity
UAE	Indirect	61	Regional energy/geopolitical spillover
Global	Macro	70	BTC and broader macro instability

Example formula for your app:

Country Exposure Score = Asset Weight × Country Dependency Weight × Country Risk Factor
Portfolio Risk Score = sum of all country exposure scores

Simple example:

NVDA 15% × Taiwan dependency 0.60 × Taiwan risk 81 = 7.29
XOM 15% × Middle East dependency 0.50 × regional risk 66 = 4.95
TSLA 15% × China dependency 0.45 × China risk 72 = 4.86

That gives you real business logic, not just display.

Figma-style main dashboard layout:

Top header:

Logo / app name
Portfolio dropdown: “Tech + Energy + Crypto Demo”
Date range
Search
Filters button

Left sidebar:

Dashboard
Portfolio
Country Map
Regions
Holdings
Alerts
Settings

Main center:

Large world map heat map
Countries shaded by risk intensity
Tooltip on hover:
Country: Taiwan
Risk Score: 81
Exposure Contribution: 7.29
Linked Assets: NVDA

Right rail:

Total Portfolio Risk Score: 68
Top Risk Countries
Taiwan
China
Saudi Arabia
Top Risk Assets
NVDA
TSLA
XOM
Alert count: 4

Bottom row:

Regional Exposure Bar Chart
North America
East Asia
Middle East
Europe
Global
Holdings Risk Table
Asset
Weight
Region
Main Risk Driver
Contribution Score
Risk Trend Line
Optional historical or simulated trend

Very rough wireframe:

----------------------------------------------------------------
| Geopolitical Risk Dashboard | Portfolio | Date | Search | Filter |
----------------------------------------------------------------
| Nav        |                                                 |   |
| Dashboard  |               WORLD HEAT MAP                    |Risk|
| Portfolio  |      US, China, Taiwan, Gulf highlighted        |68  |
| CountryMap |                                                 |   |
| Regions    |                                                 |Top |
| Holdings   |                                                 |Risks
| Alerts     |                                                 |   |
----------------------------------------------------------------
| Regional Exposure Chart | Holdings Risk Table | Trend Chart   |
----------------------------------------------------------------

What this looks like visually in Figma:

dark background
large center map card
summary cards on right
rounded cards for charts/tables
cyan/blue for neutral data
amber/orange/red gradient for rising geopolitical risk

Example mockup copy for the heat map tooltip:

Taiwan
Risk score: 81
Exposure contribution: 7.29
Linked assets: NVDA
Risk driver: semiconductor concentration

Example holdings table:

Asset	Weight	Country/Region	Risk Driver	Contribution
AAPL	20%	U.S. / China	supply chain concentration	8.10
MSFT	20%	U.S.	domestic concentration	6.50
NVDA	15%	U.S. / Taiwan	semiconductor dependency	7.29
XOM	15%	U.S. / Middle East	energy volatility	4.95
TSLA	15%	U.S. / China	manufacturing dependency	4.86
BTC	15%	Global	macro/regulatory instability	5.40


## Version 1.1 Update (April 19, 2026)

- Latest Version: 1.1
- Build: 1.1
- Last Updated: April 19, 2026
- Product direction now includes one-click map snapshot export from the Global Risk Heat Map card.
- Dashboard status language now includes explicit daily-update recency indicators.
- Help-system copy now reflects exports, refresh logic, and expanded tooling options.
- Local integration assumptions are updated for backend API on port 5001.
