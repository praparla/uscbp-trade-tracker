# CLAUDE.md — Trade Actions Timeline Project

> **This is the master specification for Claude Code.** It contains the project prompt, agent definitions, and coding rules in a single file. Place this at the root of your repository.

---

# Part 1: Project Prompt

## Goal

Build a static-site tool that scrapes U.S. CBP (Customs and Border Protection) trade action data from the CSMS archive, extracts structured information about import/export restrictions (tariffs, quotas, embargoes, sanctions, duties, exclusions, etc.) by country, and presents them in a filterable interactive dashboard **deployable to GitHub Pages**.

## Data Source

### Primary: Local CSMS Archive PDFs

The CSMS archive is distributed as **monthly PDF compilations** (not paginated HTML). Two source PDFs are included in `scraper/data/source_pdfs/`:

| File | Coverage | Size |
|------|----------|------|
| `csms_archive_incl_dec2025.pdf` | Jan 2021 – Dec 2025 | 2.39 MB |
| `csms_archive_incl_jan2026_508c.pdf` | Jan 2026 | 428 KB |

**Web source for updates:** https://www.cbp.gov/document/guidance/csms-archive

These PDFs list CSMS message numbers, titles, and dates. They do **not** contain the full message text or direct links. The scraper must:
1. Parse the PDF text to extract CSMS entries (number, title, date).
2. Filter entries by trade-relevance keywords and date range.
3. Look up detail pages on CBP's centralized guidance pages (see below).

### Secondary: CBP Guidance Pages (Level 2 & 3 data)

Individual CSMS messages use **GovDelivery hash URLs** (e.g., `https://content.govdelivery.com/accounts/USDHSCBP/bulletins/{hash}`). There is **no predictable mapping** from CSMS number to URL.

Instead, the scraper should use these **centralized CBP guidance pages** that aggregate trade action details:

| Page | URL | Content |
|------|-----|---------|
| IEEPA FAQ | https://www.cbp.gov/trade/programs-administration/trade-remedies/IEEPA-FAQ | Country tariff rates, HTS codes, unstacking rules |
| Section 232 Steel/Aluminum FAQ | https://www.cbp.gov/trade/programs-administration/entry-summary/232-tariffs-aluminum-and-steel-faqs | Steel, aluminum, derivative tariffs |
| Section 232 Autos FAQ | https://www.cbp.gov/trade/programs-administration/entry-summary/section-232-additional-faqs-autos | Auto, auto parts, MHDV tariffs |
| Trade Remedies Overview | https://www.cbp.gov/trade/programs-administration/trade-remedies | All active trade remedy programs |
| Tariff Requirements Fact Sheet | https://www.cbp.gov/document/fact-sheets/tariff-requirements-2025 | Summary overview PDF |

### Known CSMS Detail Page URLs (GovDelivery)

These specific CSMS messages have been mapped to their GovDelivery URLs:

| CSMS # | Title | URL |
|--------|-------|-----|
| 64624801 | Section 232 Automobiles | https://content.govdelivery.com/accounts/USDHSCBP/bulletins/3da18a1 |
| 64913145 | Section 232 Auto Parts | https://content.govdelivery.com/accounts/USDHSCBP/bulletins/3de7ef9 |
| 65794272 | Section 232 Copper | https://content.govdelivery.com/accounts/USDHSCBP/bulletins/3ebf0e0 |
| 63577329 | Section 301 Four-Year Review | https://content.govdelivery.com/accounts/USDHSCBP/bulletins/3ca1cf1 |

### Data Architecture (Revised)

```
Source PDFs (local)              CBP Guidance Pages (web)
  ├── CSMS archive PDFs            ├── IEEPA FAQ
  │   └── Entry index:             │   └── Country rates, HTS codes
  │       CSMS#, title, date       ├── Section 232 FAQs
  │                                │   └── Steel/Alum/Auto/Copper/etc.
  │                                ├── Trade Remedies overview
  └── Parse → filter → match       │   └── All active programs
                                   └── Known GovDelivery URLs
                                       └── Full CSMS message text
```

The scraper combines data from both sources to build the `trade_actions.json`.

## Scope Constraints (MVP)

- **Date range:** January 20, 2025 → present (February 2026).
- **PDF processing cap:** Process a maximum of **5 linked source PDFs** (Level 3) for the MVP. This cap MUST be:
  - A clearly named constant at the top of the scraper file: `MAX_PDFS_TO_PROCESS = 5`
  - Displayed in the frontend UI as a visible banner/badge: "⚠️ MVP Mode: Processing capped at 5 source documents. Update MAX_PDFS_TO_PROCESS to expand."
  - Logged at startup in the scraper console output.
- **One-time snapshot** with a local-dev-only refresh capability (see Architecture).

## Prerequisites & API Key Setup

### Anthropic API Key (Required for PDF text extraction)

This project uses Claude's API to extract structured trade action data from raw PDF text. You need an API key:

1. **Create an Anthropic account:** Go to https://console.anthropic.com/ and sign up.
2. **Add billing:** Navigate to Settings → Billing and add a payment method. The API is pay-per-use.
3. **Generate an API key:** Go to Settings → API Keys → Create Key. Copy it.
4. **Set the environment variable:**
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```
5. **Verify it works:**
   ```bash
   cd scraper && python -c "from anthropic import Anthropic; print(Anthropic().models.list())"
   ```

### Cost Optimization Strategy

This project uses a **5-layer cost reduction strategy** to minimize API spend:

| Layer | What it does | Estimated savings |
|---|---|---|
| 1. Keyword pre-filter | Skips documents that don't mention trade terms | ~50-70% fewer API calls |
| 2. Smart truncation | Sends only relevant sections, not full PDFs | ~60-80% fewer input tokens per call |
| 3. Haiku model | Uses `claude-haiku-4-5-20251001` instead of Sonnet | ~10-12x cheaper per token |
| 4. Response caching | Never re-classifies an already-processed document | 100% savings on re-runs |
| 5. Batch API (opt-in) | 50% discount for non-urgent processing | 50% off remaining cost |

**Estimated cost with all optimizations:**
| PDFs processed | Without optimization | With optimization |
|---|---|---|
| 5 (MVP) | ~$0.50 | ~$0.01–0.03 |
| 50 | ~$3–5 | ~$0.10–0.30 |
| 500 | ~$30–50 | ~$1–3 |

### Other Prerequisites
- Python 3.11+
- Node.js 18+
- npm or yarn

## Architecture

### Key Design Decision: Static Site + Local Scraper

The frontend is a **fully static React app** that reads from a pre-generated `trade_actions.json` file. It deploys to GitHub Pages with zero backend.

The scraper is a **local CLI tool** that generates the JSON. To update the data, you re-run the scraper locally and redeploy.

For **local development only**, a lightweight FastAPI server provides a `/refresh` endpoint so you can trigger re-scrapes from the UI without leaving the browser. This server is NOT deployed.

```
┌─────────────────────────────────────────────────────────┐
│  LOCAL DEV                                              │
│                                                         │
│  ┌──────────┐    generates     ┌──────────────────┐     │
│  │ Scraper  │ ──────────────→  │ trade_actions.json│     │
│  │ (Python) │                  └────────┬─────────┘     │
│  └──────────┘                           │               │
│       ↑                                 ↓               │
│  optional /refresh              ┌──────────────┐        │
│  (FastAPI, dev only)            │ React App    │        │
│                                 │ (Vite dev)   │        │
│                                 └──────────────┘        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  PRODUCTION (GitHub Pages)                              │
│                                                         │
│  Static files: index.html + JS + trade_actions.json     │
│  No backend. Data is a snapshot from last scraper run.  │
└─────────────────────────────────────────────────────────┘
```

### Stack
- **Scraper:** Python 3.11+
- **PDF text extraction:** `pymupdf` (fitz) or `pdfplumber`
- **Structured data extraction:** Anthropic Claude API (`claude-haiku-4-5-20251001` default, `claude-sonnet-4-20250514` opt-in)
- **Data interchange:** JSON file on disk
- **Frontend:** React 18 + Vite + Tailwind CSS + Recharts
- **Local dev API:** FastAPI (optional, dev-only)
- **Deployment:** GitHub Pages via GitHub Actions

### Directory Structure

```
trade-timeline/
├── scraper/
│   ├── main.py              # Entry point — orchestrates the pipeline
│   ├── crawl.py             # Level 1-3 crawling logic
│   ├── extract.py           # PDF text extraction
│   ├── prefilter.py         # Keyword pre-filter (Layer 1 cost optimization)
│   ├── truncate.py          # Smart truncation (Layer 2 cost optimization)
│   ├── classify.py          # Claude API structured extraction
│   ├── cache.py             # Response caching layer (Layer 4 cost optimization)
│   ├── models.py            # Pydantic models for TradeAction, etc.
│   ├── config.py            # Constants (MAX_PDFS_TO_PROCESS, model, flags, etc.)
│   ├── api.py               # FastAPI server (local dev only, NOT deployed)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── constants.js          # Color mappings, action type labels
│   │   ├── hooks/
│   │   │   ├── useTradeData.js   # Load + filter + sort logic
│   │   │   └── useRefresh.js     # Local dev refresh API hook
│   │   ├── components/
│   │   │   ├── ViewToggle.jsx        # Switch between Dashboard ↔ Table views
│   │   │   ├── DashboardView.jsx     # Charts + summary cards layout
│   │   │   ├── TableView.jsx         # Full-featured sortable/filterable table
│   │   │   ├── TimelineChart.jsx     # Horizontal timeline within dashboard
│   │   │   ├── SummaryCards.jsx      # Count cards (total actions, by type, etc.)
│   │   │   ├── CountryChart.jsx      # Bar chart: actions by country
│   │   │   ├── TypeChart.jsx         # Bar/pie chart: actions by type
│   │   │   ├── FilterPanel.jsx       # Country, action type, date range filters
│   │   │   ├── MvpBanner.jsx         # Warning banner about PDF cap
│   │   │   ├── RefreshButton.jsx     # Triggers /refresh (hidden in production)
│   │   │   └── ActionDetailModal.jsx # Expanded detail view for a single action
│   │   └── data/
│   │       └── trade_actions.json    # Generated by scraper
│   ├── public/
│   │   └── 404.html                  # GitHub Pages SPA fallback
│   ├── package.json
│   └── vite.config.js               # base path configured for GH Pages
├── .github/
│   └── workflows/
│       └── deploy.yml                # GitHub Actions: build + deploy to GH Pages
├── CLAUDE.md
├── Makefile
└── README.md
```

## Scraper Pipeline Detail

### Step 1: Parse CSMS Archive PDFs + Crawl Guidance Pages (crawl.py)

**Phase 1A — Parse local CSMS archive PDFs:**
1. Read `scraper/data/source_pdfs/csms_archive_incl_dec2025.pdf` and `csms_archive_incl_jan2026_508c.pdf`.
2. Extract text using `pymupdf` or `pdfplumber`.
3. Parse each CSMS entry: number, title, date.
4. **Filter by date:** Only keep entries dated January 20, 2025 or later.
5. **Filter by keyword:** Apply trade keyword pre-filter to titles (tariff, duty, Section 232, Section 301, quota, sanction, embargo, IEEPA, Executive Order, etc.).

**Phase 1B — Crawl CBP guidance pages for structured data:**
1. Fetch the centralized CBP guidance pages listed in the Data Source section above.
2. Extract structured trade action details: rates, HTS codes, effective dates, country lists.
3. Cross-reference with CSMS entries from Phase 1A to associate actions with their CSMS source.
4. For known GovDelivery URLs, fetch individual CSMS detail pages for full text.
5. Deduplicate and merge data from all sources.

**Phase 1C — Download new archive PDFs (optional, for updates):**
1. Check `https://www.cbp.gov/document/guidance/csms-archive` for newer monthly PDFs.
2. Download any PDFs not already in `scraper/data/source_pdfs/`.

**Important crawling notes:**
- The CSMS archive page lists PDFs by month — there is **no HTML pagination**.
- Individual CSMS messages use GovDelivery hash URLs that are **not predictable** from the CSMS number.
- Use `requests` with appropriate headers (User-Agent, etc.) and polite delays (1-2 seconds between requests).
- Cache all fetched pages/PDFs to disk in a `scraper/cache/` directory so re-runs don't re-download.
- Prioritize the centralized guidance pages (IEEPA FAQ, Section 232 FAQs) over individual CSMS lookups — they have richer structured data.

### Step 2: Extract Text (extract.py)

- For PDFs: use `pymupdf` or `pdfplumber` to extract all text.
- For HTML pages: use `BeautifulSoup` to extract the main content body.
- Save extracted text to `scraper/cache/texts/` as `.txt` files.

### Step 3: Keyword Pre-Filter (prefilter.py) — Cost Optimization Layer 1

Before sending any text to the Claude API, run a fast local keyword check. This skips documents that clearly have nothing to do with trade restrictions.

**Required keywords** (at least one must appear, case-insensitive):
```python
TRADE_KEYWORDS = [
    "tariff", "tariffs", "duty", "duties", "customs duty",
    "quota", "quotas", "tariff-rate quota", "TRQ",
    "embargo", "embargoes",
    "sanction", "sanctions", "OFAC",
    "Section 301", "Section 201", "Section 232",
    "HTSUS", "HTS", "Harmonized Tariff",
    "antidumping", "anti-dumping", "countervailing",
    "exclusion", "exclusions",
    "import restriction", "export restriction",
    "trade remedy", "trade remedies",
    "additional duties", "retaliatory",
    "suspension of liquidation",
    "Federal Register", "trade action",
    "country of origin", "marking requirements",
]
```

**Logic:**
- If zero keywords match → skip the document. Log: `"SKIPPED (no trade keywords): {url}"`. Add to `meta.filtered_out` count.
- If ≥1 keyword matches → proceed to truncation and classification.
- The keyword list must be in `config.py` so it's easy to expand.

**Override:** A `--no-prefilter` CLI flag disables this step and sends everything to the API.

### Step 4: Smart Truncation (truncate.py) — Cost Optimization Layer 2

Government PDFs can be 50+ pages. Most trade-relevant content is in the first few pages or in specific sections. Instead of sending the entire text, extract only what's likely relevant.

**Truncation strategy:**
1. **Always include:** The first 1,500 tokens of the document (title, summary, purpose statement).
2. **Keyword windows:** For each occurrence of a trade keyword, extract a window of ±300 tokens around it.
3. **Deduplicate and merge** overlapping windows.
4. **Cap total output** at 3,000 tokens. If merged windows exceed this, prioritize the first occurrence windows.
5. **Add a framing note** at the top: `"[NOTE: This text has been extracted from key sections of a longer document. Some context may be missing.]"`

**Override:** A `--full-text` CLI flag disables truncation and sends complete text (capped at 10,000 tokens, chunked if needed).

### Step 5: Classify & Structure (classify.py) — with Caching (Layer 4)

**Response caching:**
- Cache key: SHA-256 hash of (document URL + extracted text content + model name + prompt version).
- Cache location: `scraper/cache/classifications/` as JSON files named by the hash.
- Cache hit → load and skip API call. Log: `"CACHE HIT: {url}"`.
- Cache miss → make API call, validate, save to cache.
- `--clear-cache` CLI flag deletes all cached classifications.

**API call details:**

Send the (pre-filtered, truncated) text to the Claude API. Extract **zero or more** trade actions matching this schema:

```python
class TradeAction(BaseModel):
    id: str                          # Generated unique ID
    source_csms_id: str              # CSMS number
    source_url: str                  # URL of the source document
    title: str                       # Short descriptive title
    summary: str                     # 1-3 sentence summary
    action_type: Literal[
        "tariff", "quota", "embargo", "sanction",
        "duty", "exclusion", "suspension", "modification",
        "investigation", "other"
    ]
    countries_affected: list[str]    # ISO 3166-1 country names (or "All", "Multiple")
    hs_codes: list[str]             # Harmonized System codes if mentioned
    effective_date: str | None       # ISO date string
    expiration_date: str | None      # ISO date if applicable
    status: Literal["active", "expired", "pending", "superseded"]
    raw_excerpt: str                 # Key excerpt from source (max 200 chars)
```

**Model selection:**
- **Default:** `claude-haiku-4-5-20251001` — fast, cheap, good enough for structured extraction from formulaic government documents.
- **Opt-in:** `--model sonnet` switches to `claude-sonnet-4-20250514` for higher quality.

**Batch API support (Layer 5, opt-in):**
- `--batch` collects all uncached documents and submits as a single batch request (50% cost reduction, up to 24hr async).
- Saves batch ID to `scraper/cache/batch_id.txt`.
- `--collect-batch` retrieves results and completes the pipeline.

**Claude API prompt guidance:**
- System prompt: "You are a trade policy analyst extracting structured data from U.S. CBP documents."
- Instruct it to return valid JSON matching the schema.
- Return empty array `[]` if no relevant trade actions found.
- Include 1-2 few-shot examples.
- Note that text may be truncated.

### Step 6: Aggregate & Output (main.py)

- Merge all extracted `TradeAction` objects into a single list.
- Sort by `effective_date` descending.
- Write to `frontend/src/data/trade_actions.json` AND `frontend/public/data/trade_actions.json`.
- Include metadata with cost optimization stats.

**Pipeline cost summary printed at end of each run:**
```
═══ Pipeline Complete ═══
Documents found:             42
Filtered out (no keywords):  28
Sent to API:                 14
Cache hits:                   9
New API calls:                5
Model used:                  claude-haiku-4-5-20251001
Estimated API cost:          $0.02
Trade actions extracted:     12
Errors:                       1
Output: frontend/src/data/trade_actions.json
```

### Step 7: Local Dev API Server (api.py) — Dev Only

Minimal FastAPI app:
- `POST /refresh` — re-runs pipeline in background, returns job status.
- `GET /status` — returns metadata (last run time, counts, refresh in progress).
- CORS enabled for localhost:5173.
- **NOT part of the production build.**

## CLI Reference

```bash
python scraper/main.py [OPTIONS]

Options:
  --dry-run          List what would be processed. No downloads, no API calls. No API key needed.
  --no-prefilter     Disable keyword pre-filtering. Send all documents to API.
  --full-text        Disable smart truncation. Send complete document text to API.
  --model sonnet     Use Sonnet instead of Haiku for higher quality extraction.
  --batch            Submit classifications as a batch job (50% cheaper, async).
  --collect-batch    Retrieve results from a previously submitted batch job.
  --clear-cache      Delete all cached classifications before running.
  --verbose          Enable DEBUG-level logging.
```

**Cost profile by flag combination:**
| Flags | Relative cost | Quality | Speed |
|---|---|---|---|
| (defaults) | 1x (cheapest) | Good | Fast |
| `--model sonnet` | ~10x | Best | Fast |
| `--no-prefilter` | ~2-3x | Better coverage | Fast |
| `--full-text` | ~3-5x | Better accuracy | Fast |
| `--batch` | 0.5x | Same | Slow (async) |
| `--no-prefilter --full-text --model sonnet` | ~30-50x | Maximum | Fast |

## Frontend Detail

### Two View Modes with Toggle

#### 📊 Dashboard View (default)
Layout (top to bottom):
1. **MVP Banner** — amber warning, always visible when cap is active.
2. **Header** — title, last-refresh timestamp, view toggle, refresh button (dev only).
3. **Filter Panel** — horizontal bar. Country multi-select, action type checkboxes, date range picker, text search, clear button.
4. **Summary Cards Row** (3-4 cards): Total actions, Active actions, Most affected country, Most common action type.
5. **Charts Row** (2 charts side by side): Left: Horizontal bar chart — top 10 countries. Right: Donut/pie — actions by type.
6. **Timeline Strip** — compact horizontal timeline, action dates as color-coded dots. Click to open detail modal.

#### 📋 Table View
Layout:
1. Same MVP Banner, Header, and Filter Panel.
2. **Actions Table** — full width. Columns: Effective Date, Title, Type (colored badge), Countries, Status (colored badge), Summary (truncated). Sortable, paginated (25/page). Click row to expand details (full summary, HS codes, source link, raw excerpt, expiration date).
3. **Export CSV button** in table header.

### View Toggle UX
- Header bar, right side. Segmented control: `[📊 Dashboard]  [📋 Table]`
- Both views share filter state. URL hash: `#dashboard` / `#table` (bookmarkable). Default: `#dashboard`.

### Refresh Button Behavior
- Local dev: visible, calls `POST http://localhost:8000/refresh`.
- Production: silent health check to `localhost:8000/status` on mount. If unreachable, hide button. No console errors.

### Design Notes
- Dark navy header (#1a2332), white content area, muted palette.
- Action type colors (consistent everywhere):
  - tariff: #3b82f6 (blue), quota: #f59e0b (amber), embargo: #ef4444 (red)
  - sanction: #8b5cf6 (purple), duty: #14b8a6 (teal), exclusion: #ec4899 (pink)
  - suspension: #f97316 (orange), modification: #6b7280 (gray)
  - investigation: #6366f1 (indigo), other: #94a3b8 (slate)
- Desktop-first, min width 1024px.
- Empty state: centered message with instructions to run scraper.

### GitHub Pages Deployment
- `vite.config.js` base from `VITE_BASE_PATH` env var (default: `'/trade-timeline/'`).
- `public/404.html` redirects to `index.html` for SPA routing.
- `trade_actions.json` committed to repo under `frontend/public/data/`.
- GitHub Actions: triggers on push to `main`, builds frontend, deploys `dist/` to `gh-pages`. Does NOT run scraper.

---

# Part 2: Agent Definitions

## Agent: Scraper Engineer

**Trigger:** Any task involving crawling, HTTP requests, PDF downloading, HTML parsing, caching, or the `scraper/` directory (except `classify.py`).

**Responsibilities:**
- Write and debug all crawling logic (Levels 1–3 of the CSMS archive).
- Handle pagination detection and traversal on cbp.gov.
- Implement polite crawling: 1–2 second delays, proper User-Agent headers, retry on 429/503.
- Build the disk cache layer (`scraper/cache/`).
- Extract text from PDFs using `pymupdf` or `pdfplumber`.
- Parse HTML pages with `BeautifulSoup`.
- **Implement the keyword pre-filter (`prefilter.py`).**
- **Implement smart truncation (`truncate.py`).**

**Constraints:**
- Never make more than 1 request per second to cbp.gov.
- Always check cache before making a network request.
- All downloaded files → `scraper/cache/raw/`. All extracted text → `scraper/cache/texts/`.
- Respect `MAX_PDFS_TO_PROCESS` from `config.py`.
- Log every HTTP request (URL, status code, cache hit/miss) at INFO level.
- On any HTTP error, log at WARNING and continue — never crash the pipeline.
- Keyword list in `prefilter.py` must be imported from `config.py`.
- Truncation output must never exceed `MAX_TRUNCATED_TOKENS` from `config.py` (default: 3000).
- Both `prefilter.py` and `truncate.py` must be skippable via CLI flags.

**Tools/Libraries:** `requests`, `beautifulsoup4`, `pymupdf` or `pdfplumber`, `pathlib`, `logging`, `time`

---

## Agent: Data Extraction Analyst

**Trigger:** Any task involving Claude API calls, `classify.py`, `cache.py`, Pydantic models, batch API, or structured data extraction.

**Responsibilities:**
- Design and iterate on the Claude API extraction prompt.
- Ensure valid JSON output matching `TradeAction` Pydantic model.
- Handle edge cases: zero actions, many actions, ambiguous text, truncated text.
- Implement retry logic with exponential backoff.
- Validate all API responses against Pydantic schema.
- **Implement response caching (`cache.py`).**
- **Implement model selection** — Haiku default, Sonnet opt-in.
- **Implement Batch API support.**
- **Print cost summary** at end of each run.

**Constraints:**
- **Default model: `claude-haiku-4-5-20251001`.** Only switch to Sonnet with `--model sonnet`.
- `max_tokens`: 4096 for extraction calls.
- Parse defensively — invalid JSON → log and return empty list.
- Never send more than `MAX_TRUNCATED_TOKENS` per call unless `--full-text` (then cap at 10,000, chunk if needed).
- `raw_excerpt` max 200 characters.
- Country names: common English names. Dates: ISO 8601 or null.
- Deterministic `id`: `source_csms_id` + hash of key fields.
- API key from `os.environ` only. Missing → helpful error + exit.
- Cache key includes: URL + text hash + model name + prompt version. Switching models invalidates cache.
- Batch mode: collect uncached docs, submit batch, save ID, exit. `--collect-batch` retrieves results.
- Track input/output tokens. Estimate cost from published pricing. Print and store in metadata.

**Tools/Libraries:** `anthropic`, `pydantic`, `json`, `hashlib`, `tenacity`

---

## Agent: Frontend Developer

**Trigger:** Any task involving React components, Vite config, Tailwind styling, charts, or the `frontend/` directory.

**Responsibilities:**
- Build the React dashboard per spec.
- Implement **Dashboard ↔ Table view toggle** with shared filter state and URL hash routing.
- Build Dashboard: summary cards, country bar chart, action type donut chart, timeline strip.
- Build Table: sortable/filterable/paginated with expandable row details.
- Shared filter panel. Refresh button with auto-hiding in production.
- CSV export. GitHub Pages Vite config.

**Constraints:**
- Vite + React 18 + Tailwind CSS only.
- All data from static JSON. Zero network requests in production (except optional dev refresh).
- MVP banner reads `meta.max_pdfs_cap` from JSON — not hardcoded.
- If `meta.cost_optimization` present, display in an unobtrusive "About this data" section.
- Charts: interactive with tooltips. Colors: consistent via `constants.js`.
- Desktop-first, min 1024px. No localStorage/sessionStorage.
- View toggle updates `window.location.hash`. Refresh button silently auto-detects API.

**Tools/Libraries:** `react`, `recharts`, `tailwindcss`, `lucide-react`, `date-fns`

---

## Agent: Integration & DevOps

**Trigger:** Any task involving FastAPI, wiring frontend ↔ backend, env vars, GitHub Actions, README, CLI parsing, or project setup.

**Responsibilities:**
- FastAPI server (`api.py`) — dev only.
- CORS for local dev.
- README with setup instructions, API key guide, cost optimization docs.
- **CLI argument parsing in `main.py`** — all flags.
- `ANTHROPIC_API_KEY` env var handling with clear errors.
- `Makefile` with cost-profile targets.
- GitHub Actions deploy workflow.
- `public/404.html` for SPA routing.

**Constraints:**
- `/refresh` endpoint: async background execution.
- Never commit/log API key.
- API server: `127.0.0.1:8000`. Frontend dev: port 5173.
- All constants in `scraper/config.py`.
- `trade_actions.json` written atomically (temp file → rename).
- GitHub Actions does NOT run scraper.
- Makefile targets with comments:
  ```makefile
  scrape:          ## Default — all cost optimizations (cheapest)
  scrape-quality:  ## Sonnet model (~10x cost, better quality)
  scrape-full:     ## No optimizations (most thorough, most expensive)
  scrape-batch:    ## Batch job (50% cheaper, async)
  collect-batch:   ## Collect batch results
  dev:             ## Start frontend dev server
  serve-api:       ## Start local FastAPI server
  build:           ## Production build
  deploy:          ## Build + deploy to GitHub Pages
  ```
- `.gitignore`: `scraper/cache/`, `node_modules/`, `.env`, `__pycache__/`, `dist/`
- `trade_actions.json` NOT in `.gitignore` — committed as data snapshot.

---

# Part 3: Rules & Coding Standards

## Rule 1: MVP Cap Awareness

> **`MAX_PDFS_TO_PROCESS` in `scraper/config.py` is set to 5 for MVP. Every layer must respect and surface this cap.**

- Scraper stops after this many Level 3 PDFs.
- Frontend shows MVP banner when `meta.max_pdfs_cap > 0` and equals `meta.pdfs_processed`.
- Metadata JSON includes the cap value.
- Code comments: `# TODO: Remove cap for production`
- Console at startup: `"⚠️ MVP CAP: Processing limited to {MAX_PDFS_TO_PROCESS} source documents"`

## Rule 2: Cost Optimization Pipeline

API cost is a first-class concern. The pipeline applies **5 layers** in order, each independently toggleable:

```
Document Text
     │
     ▼
┌─────────────────────┐
│ Layer 1: Pre-filter  │  --no-prefilter to disable
│ (keyword matching)   │  Skips ~50-70% of documents
└──────────┬──────────┘
           │ passes filter
           ▼
┌─────────────────────┐
│ Layer 2: Truncation  │  --full-text to disable
│ (smart excerpting)   │  Reduces tokens ~60-80%
└──────────┬──────────┘
           │ truncated text
           ▼
┌─────────────────────┐
│ Layer 3: Model       │  --model sonnet to upgrade
│ (Haiku by default)   │  Haiku is ~10-12x cheaper
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Layer 4: Caching     │  --clear-cache to bypass
│ (skip if seen)       │  100% savings on re-runs
└──────────┬──────────┘
           │ cache miss
           ▼
┌─────────────────────┐
│ Layer 5: Batch API   │  --batch to enable
│ (50% discount)       │  Async, up to 24hr wait
└──────────┬──────────┘
           │
           ▼
      Claude API call
```

- All layers ON by default (except Batch which is opt-in). Cheapest config is default.
- Each layer logs its effect. Cost summary at end of run shows each layer's impact.
- Layers are independent — disabling one doesn't affect others.
- All tuneable parameters in `config.py`.

## Rule 3: API Key Handling

- Read from `os.environ["ANTHROPIC_API_KEY"]` only.
- If missing, print helpful setup instructions and exit with code 1.
- `--dry-run` works WITHOUT an API key.
- Never log/print/write the key value.

## Rule 4: Error Resilience

- **Never let a single document failure crash the pipeline.** Try/except per document. Log. Continue.
- **Log aggressively.** Every HTTP request, PDF parse, API call, pre-filter decision, cache hit/miss.
- **Cache everything.** Re-runs should be fast and free.
- **Validate everything.** Invalid API responses → log and skip.
- **Track errors in output.** `meta.errors` array includes every skipped document.

## Rule 5: Crawling Ethics

- Minimum 1.5 second delay between requests to cbp.gov.
- `User-Agent: TradeTimelineScraper/1.0 (research project)`
- Respect `robots.txt`.
- 429 → exponential backoff starting at 10 seconds.
- Never crawl outside the date range.

## Rule 6: Static Site Architecture

- **No runtime backend** in production. Zero API calls. All data baked in.
- **`trade_actions.json` committed to repo.** Not in `.gitignore`.
- **Scraper runs locally only.** Never in CI/CD.
- **Refresh button dev-only.** Auto-detect and hide silently in production.
- **Base path configurable** via `VITE_BASE_PATH`.
- **GitHub Actions** only builds frontend and deploys.

## Rule 7: Python Standards

- Python 3.11+. Type hints on all functions. Pydantic v2. `pathlib.Path`. `logging` module (no `print` except API key error). `black` + `ruff`. Constants in `config.py`. Pinned `requirements.txt`.

## Rule 8: Frontend Standards

- React 18 functional components + hooks. Tailwind CSS only. Colors in `constants.js`. Data transforms in `hooks/`. Components < 150 lines. `lucide-react` icons. Proper loading/error/empty states. No localStorage/sessionStorage.

## Rule 9: View Toggle Contract

- Both views read from same `useTradeData` hook.
- Shared filter state in parent component or context.
- URL hash routing: `#dashboard` / `#table`. Default: `#dashboard`.
- Same `<FilterPanel />` and `<ActionDetailModal />` components.

## Rule 10: Data Contract

```jsonc
{
  "meta": {
    "generated_at": "2025-02-20T12:00:00Z",
    "csms_entries_scanned": 42,
    "pdfs_processed": 5,
    "max_pdfs_cap": 5,
    "date_range_start": "2025-01-20",
    "date_range_end": "2026-02-20",
    "scraper_version": "1.0.0",
    "cost_optimization": {
      "prefilter_enabled": true,
      "prefilter_skipped": 28,
      "truncation_enabled": true,
      "model_used": "claude-haiku-4-5-20251001",
      "cache_hits": 9,
      "new_api_calls": 5,
      "batch_mode": false,
      "estimated_cost_usd": 0.02
    },
    "errors": [
      { "url": "https://...", "error": "PDF parse failed: corrupted file" }
    ]
  },
  "actions": [
    {
      "id": "csms-12345-a1b2c3",
      "source_csms_id": "CSMS #12345",
      "source_url": "https://...",
      "title": "Section 301 Tariff on Chinese Goods",
      "summary": "Additional 25% tariff on...",
      "action_type": "tariff",
      "countries_affected": ["China"],
      "hs_codes": ["8471", "8473"],
      "effective_date": "2025-03-01",
      "expiration_date": null,
      "status": "active",
      "raw_excerpt": "Pursuant to Section 301..."
    }
  ]
}
```

Frontend handles: empty actions → empty state. Missing meta → defaults. Cap reached → MVP banner. Errors → "X documents had errors" note. Cost optimization → "About this data" section.

## Rule 11: Git & Deployment

- `.gitignore`: `scraper/cache/`, `node_modules/`, `.env`, `__pycache__/`, `dist/`
- `trade_actions.json` NOT in `.gitignore`.
- Never commit API keys. Never manually edit `gh-pages` branch.

## Rule 12: Development Workflow — BUILD IN THIS ORDER

1. **Scraper.** `crawl.py` — list CSMS entries, detect pagination.
2. **PDF extraction.** `extract.py` — single PDF, verify text quality.
3. **Pre-filter & truncation.** `prefilter.py` + `truncate.py` — verify volume reduction.
4. **Claude classification.** `classify.py` — one doc, iterate prompt. Start with Haiku.
5. **Caching.** `cache.py` — verify re-runs skip classified docs.
6. **Wire pipeline.** `main.py` → `trade_actions.json` with 5 PDFs. Verify cost summary.
7. **Frontend.** Table view first (simpler), then Dashboard, then toggle.
8. **Integration.** FastAPI server + refresh auto-detection.
9. **Deployment.** GitHub Actions. Verify on GitHub Pages.
10. **Batch API.** Nice-to-have, add last.

**Do not skip ahead. Verify each step independently.**

## Rule 13: Testing

- `--dry-run` works without API key.
- Sample `trade_actions.json` with 5-10 mock entries committed for frontend dev.
- Claude prompt testable in isolation.
- Pre-filter testable with sample text snippets.
- Truncation testable with sample long document.

## Rule 14: Security

- API key from env var only. Never hardcode.
- FastAPI binds `127.0.0.1` only.
- No `dangerouslySetInnerHTML`. Use React's default JSX escaping.
- GitHub Actions has no access to API key.

---

# Part 4: Operations Runbook

This section documents how to refresh data, known issues, workarounds, and testing procedures.
It was added based on real-world experience building and running the pipeline.

## Data Refresh Workflow

### Quick Reference

```bash
# Step 1: Fetch all bulletin texts (no API key needed, ~5 min)
cd scraper && python main.py --fetch-only

# Step 2: Classify via Claude API (requires API key, ~$0.02-0.10)
export ANTHROPIC_API_KEY='sk-ant-...'
cd scraper && python main.py

# Step 3: Verify the output
cd frontend && npm run validate-data
cd frontend && npm test

# Step 4: Preview in browser
cd frontend && npm run dev
# → Open http://localhost:5173/trade-timeline/
```

### Step-by-Step Details

**Step 1: Fetch Only (No API Key)**
```bash
python scraper/main.py --fetch-only
```
This parses the CSMS archive PDFs, filters by date range and keywords, then fetches full
bulletin text from GovDelivery via the lnks.gd redirect URLs. All fetched texts are cached
to `scraper/cache/texts/csms_{id}.txt`. This step is safe to re-run — it skips already-cached
texts. No Anthropic API key is required.

**Step 2: Classify (Requires API Key)**
```bash
export ANTHROPIC_API_KEY='sk-ant-...'
python scraper/main.py
```
Runs the full pipeline: parse PDFs → fetch texts (from cache) → classify via Claude API →
write `trade_actions.json`. Classification results are cached in `scraper/cache/classifications/`.
Re-runs only call the API for uncached entries.

**Step 3: Dry Run (Preview Only)**
```bash
python scraper/main.py --dry-run
```
Lists what would be processed without making any network requests or API calls. Does NOT
require an API key.

### Updating with New Monthly PDFs

1. Download the new monthly CSMS archive PDF from https://www.cbp.gov/document/guidance/csms-archive
2. Place it in `scraper/data/source_pdfs/`
3. Add the filename to `SOURCE_PDF_FILES` in `scraper/config.py`
4. Update `DATE_RANGE_END` in `scraper/config.py` if needed
5. Run `python scraper/main.py --fetch-only` then `python scraper/main.py`

### Output Locations

The scraper writes `trade_actions.json` to TWO locations:
- `frontend/src/data/trade_actions.json` — imported by Vite at build time
- `frontend/public/data/trade_actions.json` — served as static file

Both must be kept in sync. The pipeline writes both atomically. If you edit the JSON
manually, copy to both locations.

## Known Issues & Workarounds

### API Key Not Found

**Symptom:** `ANTHROPIC_API_KEY not set` error even though it appears in `env`.

**Root Cause:** On some macOS setups, the environment variable is defined but empty
(e.g., `ANTHROPIC_API_KEY=` with no value). The scraper checks for a non-empty value.

**Workaround:**
```bash
# Verify it's actually set with a value:
echo "KEY: '$ANTHROPIC_API_KEY'"

# If empty, explicitly set it:
export ANTHROPIC_API_KEY='sk-ant-api03-...'

# Verify:
python -c "import os; k=os.environ.get('ANTHROPIC_API_KEY',''); print(f'Key set: {bool(k)}, starts with: {k[:10]}...')"
```

**Tip:** The `--fetch-only` and `--dry-run` flags work WITHOUT an API key. Use them to
prepare data before setting up billing.

### Node.js Not in PATH

**Symptom:** `command not found: npx` or `command not found: node`.

**Root Cause:** Node.js installed via a non-standard location (not Homebrew, not nvm).

**Workaround:**
```bash
# Check where node is installed:
mdfind "kMDItemFSName == 'node' && kMDItemKind == 'Unix Executable File'"

# Common locations:
#   /Users/pranava/local/node/bin/node   (local install)
#   /opt/homebrew/bin/node               (Homebrew ARM Mac)
#   /usr/local/bin/node                  (Homebrew Intel Mac)
#   ~/.nvm/versions/node/vXX/bin/node    (nvm)

# Add to PATH for this session:
export PATH="/Users/pranava/local/node/bin:$PATH"

# Then run normally:
cd frontend && npm run dev
```

### Port Conflicts

**Symptom:** Vite says `Port 5173 is in use, trying another one...`

**Cause:** Another dev server or previous instance is running on port 5173.

**Fix:** Use the port Vite reports (e.g., 5174), or kill the existing process:
```bash
lsof -i :5173  # Find the PID
kill <PID>     # Kill it
```

### Manually Curated Data: Empty source_url

**Context:** The current `trade_actions.json` was manually curated from CBP guidance pages,
not all entries have a direct GovDelivery URL. About 25 actions have `source_url: ""`.
This is expected for manually created entries. When the scraper pipeline runs with API
classification, `source_url` will be populated from the lnks.gd / GovDelivery URLs.

**Impact on tests:** The `dataValidation.test.js` allows empty source_url for manually
curated data. The standalone `validateData.mjs` script checks for this as a warning,
not a failure.

## Extended Data Contract

The `TradeAction` schema has two fields beyond the original CLAUDE.md spec that are
used throughout the frontend and scraper. These are now part of the official contract:

```jsonc
{
  // ... all original fields ...
  "federal_authority": "string | null",  // e.g., "Section 232", "Executive Order 14195 (IEEPA)"
  "duty_rate": "string | null"           // e.g., "25%", "10% energy resources", "Prohibited"
}
```

Both fields are optional (may be null or absent). The `ActionDetailModal` component
displays them when present. The `TableView` CSV export includes `duty_rate`.

## Testing

### Frontend Tests
```bash
cd frontend
npm test              # Run all Vitest tests (single pass)
npm run test:watch    # Watch mode
npm run validate-data # Standalone data validation with known-fact cross-references
```

### Scraper Tests
```bash
cd scraper
python -m pytest tests/ -v    # Run all scraper unit tests
python main.py --dry-run      # Verify pipeline wiring without API calls
python main.py --fetch-only   # Verify fetching without classification
```

### What the Tests Cover

| Test File | What it validates |
|-----------|-------------------|
| `frontend/src/__tests__/dataValidation.test.js` | JSON schema, field types, date formats, cross-entry integrity |
| `frontend/src/__tests__/useTradeData.test.js` | Hook: filtering, sorting, stats computation |
| `frontend/src/__tests__/components.test.jsx` | Component rendering: MvpBanner, ViewToggle, SummaryCards, FilterPanel, Modal |
| `frontend/src/__tests__/validateData.mjs` | Standalone: known tariff facts cross-referenced with data |
| `scraper/tests/test_prefilter.py` | Keyword pre-filter pass/skip logic |
| `scraper/tests/test_truncate.py` | Smart truncation: intro, keyword windows, merging, caps |
| `scraper/tests/test_cache.py` | Cache key generation, hit/miss, corruption recovery |
| `scraper/tests/test_models.py` | Pydantic model validation, serialization |
| `scraper/tests/test_pipeline.py` | End-to-end: dry-run, fetch-only, output schema |

## Current Data State (as of 2026-02-20)

- **166 CSMS bulletin texts** cached in `scraper/cache/texts/`
- **41 trade actions** in `trade_actions.json` (manually curated from CBP guidance pages)
- **Date coverage:** January 1, 2025 → January 15, 2026
- **Key tariff programs covered:** Section 232 (steel, aluminum, autos, copper, timber,
  semiconductors, MHDV), IEEPA (Canada, Mexico, China, Brazil, India), Section 301
  (China four-year review, vessel fees, semiconductors), reciprocal tariffs
- To get API-classified data, run `python scraper/main.py` with a valid API key

---

# Part 5: GitHub Deployment Runbook

## Quick Deploy

Once the code is ready:

```bash
# 1. Initialize git locally
cd /path/to/project
git init
git add -A
git commit -m "Initial commit: [project name]"

# 2. Create repo on GitHub (manually via GitHub web UI)
# Go to https://github.com/new
# Create with your desired name
# Do NOT initialize with README or .gitignore

# 3. Generate GitHub personal access token
# Go to https://github.com/settings/tokens
# Create new token (classic)
# Select "repo" scope (full control)
# Copy token

# 4. Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git push -u origin main

# 5. Configure GitHub Pages
# Go to https://github.com/YOUR_USERNAME/REPO_NAME/settings/pages
# Or let the workflow do it automatically
```

## Issues Encountered & Solutions (Deployment 2026-02-21)

### Issue 1: GitHub Personal Access Token Authentication Failures

**Symptom:** `Permission denied` or `403` errors when pushing, even though token appears valid.

**Root Causes:**
- Token didn't have explicit `repo` scope granted
- Token was expired or had limited permissions
- Trying to use token as username instead of password

**Solution:**
1. Generate a **new classic personal access token** at https://github.com/settings/tokens
2. **Explicitly select `repo` scope** (full control of repositories)
3. Use as password in git URL: `https://github_token_value@github.com/user/repo.git`
4. Test with API first: `curl -H "Authorization: token TOKEN" https://api.github.com/user`
5. Never embed in scripts; use environment variables or credential helpers

### Issue 2: GitHub Actions Blocked by Billing Issue

**Symptom:** Workflow immediately fails with "job not started - account locked due to billing issue"

**Root Cause:** GitHub account had outstanding balance or unverified payment method

**Solution:** Update billing at https://github.com/settings/billing/overview even though Pages is free (Actions requires valid billing).

### Issue 3: GitHub Pages Base Path Mismatch

**Symptom:** Deployment succeeds but site returns 404

**Root Cause:** `VITE_BASE_PATH` in workflow was hardcoded to `/trade-timeline/` but repo is `uscbp-trade-tracker`

**Solution:** Update workflow to match actual repo name:
```yaml
env:
  VITE_BASE_PATH: /uscbp-trade-tracker/  # ← Change to match YOUR_REPO_NAME
```

### Issue 4: GitHub Actions Workflow Deployment Failures

**Symptom:** Build succeeds but deployment step fails repeatedly

**Attempted Solutions (failed):**
- Using `actions/upload-pages-artifact` + `actions/deploy-pages` (requires prior Pages setup)
- Manual git deployment script (permission/artifact issues)
- Simplifying workflow structure (didn't resolve underlying issue)

**Working Solution:**
- Switch to `peaceiris/actions-gh-pages@v3` action (battle-tested third-party)
- Use `GITHUB_TOKEN` (auto-provisioned by GitHub Actions)
- Simplify workflow to single `deploy` job (no artifacts)

### Issue 5: GitHub Actions Missing Write Permissions

**Symptom:** Deploy job fails silently; permissions appear present but aren't

**Root Cause:** Workflow had `permissions: { contents: read }` instead of `write`

**Solution:** Update workflow permissions:
```yaml
permissions:
  contents: write  # ← Required for pushing to gh-pages branch
```

## Working Deployment Workflow

The final working GitHub Actions configuration:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 18

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Build
        run: cd frontend && npm run build
        env:
          VITE_BASE_PATH: /REPO_NAME/  # ← Update to your repo name

      - name: Deploy to gh-pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./frontend/dist
```

**Key Points:**
- Single `deploy` job (no separate build/deploy)
- `peaceiris/actions-gh-pages@v3` handles branch creation & pushing
- `contents: write` permission required
- `VITE_BASE_PATH` must match GitHub Pages path: `/{REPO_NAME}/`
- No need to manually create `gh-pages` branch; action creates it

## Deployment Checklist

Before pushing to GitHub for the first time:

- [ ] Initialize git: `git init && git add -A && git commit -m "..."`
- [ ] Create GitHub repo via web UI (no initialization)
- [ ] Generate personal access token with `repo` scope
- [ ] Update `.github/workflows/deploy.yml` with correct `VITE_BASE_PATH`
- [ ] Push: `git remote add origin ... && git push -u origin main`
- [ ] Verify build succeeds in Actions (https://github.com/YOUR_USERNAME/REPO/actions)
- [ ] GitHub Pages auto-deploys to `https://YOUR_USERNAME.github.io/REPO_NAME/`
- [ ] Test live site (may take 1-2 min after workflow completes)

## Post-Deployment Workflow

After initial deployment:

1. **Update data:** Modify `frontend/src/data/trade_actions.json`
2. **Commit:** `git commit -am "Update trade actions data"`
3. **Push:** `git push origin main`
4. **Auto-deploy:** GitHub Actions builds & deploys automatically
5. **Live in ~30 seconds:** Changes appear at `https://YOUR_USERNAME.github.io/REPO_NAME/`

## Troubleshooting Production Issues

### Site shows 404
- Verify `VITE_BASE_PATH` matches repo name
- Check GitHub Pages settings: https://github.com/USER/REPO/settings/pages
- Verify `gh-pages` branch exists and has content

### Actions still failing
- Check Actions logs: https://github.com/USER/REPO/actions
- Verify permissions: `contents: write` is set
- Verify Node version (18+ recommended)
- Test locally: `cd frontend && npm run build`

### Site builds but looks wrong
- Clear browser cache (Cmd+Shift+R)
- Check network tab for 404s on assets
- Verify `VITE_BASE_PATH` in browser console
- Check `frontend/vite.config.js` has: `base: process.env.VITE_BASE_PATH || '/repo-name/'`
