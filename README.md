# U.S. Trade Actions Timeline

A static-site dashboard that tracks U.S. CBP (Customs and Border Protection) trade actions — tariffs, duties, quotas, embargoes, sanctions, and exclusions — by country and industry sector.

**Live site:** [praparla.github.io/uscbp-trade-tracker](https://praparla.github.io/uscbp-trade-tracker/)

## Features

- **Dashboard View** — Summary cards, country bar chart, action type donut chart, interactive timeline
- **Map View** — Choropleth world map colored by targeted action count, with country detail panel
- **Table View** — Sortable, filterable, paginated table with CSV export
- **Industries View** — 8 sector cards with verified CSMS citations and external estimates
- **Shared Filters** — Country, action type, status, date range, and text search across all views
- **Responsive** — Optimized layouts for mobile, tablet, and desktop
- **Static Deployment** — Zero backend in production; all data baked into JSON

## Data Coverage

- **41 trade actions** covering January 2025 - January 2026
- **Programs:** Section 232 (steel, aluminum, autos, copper, timber, semiconductors), IEEPA (Canada, Mexico, China, Brazil, India), Section 301, reciprocal tariffs
- **Sources:** CBP CSMS bulletins, IEEPA FAQ, Section 232 FAQs, Trade Remedies overview
- **166 CSMS bulletin texts** cached for citation traceability

## Quick Start

```bash
# Install frontend dependencies
cd frontend && npm install

# Run development server
npm run dev
# Open http://localhost:5173/trade-timeline/

# Run tests (1024 tests across 22 files)
npm test
```

## Project Structure

```
├── frontend/               # React 18 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/     # 14 React components
│   │   ├── hooks/          # 5 custom hooks
│   │   ├── data/           # trade_actions.json + TopoJSON
│   │   └── __tests__/      # 22 test files, 1024 tests
│   └── public/
├── scraper/                # Python CLI for data extraction
│   ├── main.py             # Pipeline entry point
│   ├── data/source_pdfs/   # CSMS archive PDFs
│   └── cache/              # Cached bulletin texts
├── .github/workflows/      # GitHub Actions deploy
├── CLAUDE.md               # Full project specification
└── BACKLOG.md              # Feature ideas
```

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Charts | Recharts |
| Map | react-simple-maps + Natural Earth TopoJSON |
| Testing | Vitest + React Testing Library |
| Scraper | Python 3.11+, pymupdf, Anthropic Claude API |
| Deployment | GitHub Pages via peaceiris/actions-gh-pages |

## Running the Scraper

The scraper extracts structured trade action data from CBP documents. It requires an Anthropic API key for classification.

```bash
# Fetch bulletin texts only (no API key needed)
cd scraper && python main.py --fetch-only

# Full pipeline with classification
export ANTHROPIC_API_KEY='sk-ant-...'
python main.py

# Preview what would be processed (no API key needed)
python main.py --dry-run
```

See `CLAUDE.md` Part 4 for the full operations runbook.

## Testing

```bash
cd frontend

npm test              # Run all 1024 tests
npm run test:watch    # Watch mode
npm run validate-data # Cross-reference known tariff facts
```

### Test Coverage

All 18 components, 5 hooks, and 3 utility modules are tested:

- **Components:** MvpBanner, ViewToggle, SummaryCards, FilterPanel, ActionDetailModal, TableView, DashboardView, MapView, MapCountryDetail, MapLegend, IndustryView, IndustryCard, TimelineChart, CountryChart, TypeChart, RefreshButton, IndustryComparisonChart, IndustryRateChart
- **Hooks:** useTradeData, useMapData, useIndustryData, useMediaQuery, useRefresh
- **Utilities:** constants, countryCodeMap, industryMap
- **Data Validation:** Schema integrity, citation traceability, known-fact cross-references

## Deployment

Pushes to `main` trigger automatic deployment via GitHub Actions:

1. Builds the frontend with `npm run build`
2. Deploys `dist/` to `gh-pages` branch
3. GitHub Pages serves the static site

No scraper runs in CI — data updates require a local scraper run followed by committing the updated `trade_actions.json`.

## Known Limitations

- **Empty source URLs:** 25 of 41 actions have empty `source_url` because they were manually curated from CBP guidance pages rather than individual CSMS bulletins. The frontend handles this gracefully by hiding the source link when absent.
- **Date range:** Currently covers January 2025 - January 2026. New monthly CSMS archive PDFs must be added manually.
- **Static data:** Dashboard reflects a point-in-time snapshot. Re-run the scraper and redeploy to update.

## License

This project is for research and educational purposes. Trade action data is sourced from public U.S. government documents.
