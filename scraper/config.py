"""Configuration constants for the CSMS trade actions scraper."""

from pathlib import Path

# --- Paths ---
PROJECT_ROOT = Path(__file__).parent.parent
SCRAPER_DIR = Path(__file__).parent
DATA_DIR = SCRAPER_DIR / "data"
SOURCE_PDFS_DIR = DATA_DIR / "source_pdfs"
CACHE_DIR = SCRAPER_DIR / "cache"
CACHE_RAW_DIR = CACHE_DIR / "raw"
CACHE_TEXTS_DIR = CACHE_DIR / "texts"
CACHE_CLASSIFICATIONS_DIR = CACHE_DIR / "classifications"

FRONTEND_SRC_DATA = PROJECT_ROOT / "frontend" / "src" / "data"
FRONTEND_PUBLIC_DATA = PROJECT_ROOT / "frontend" / "public" / "data"
OUTPUT_FILENAME = "trade_actions.json"

# --- MVP Cap ---
# TODO: Remove cap for production
MAX_PDFS_TO_PROCESS = 200  # TODO: Remove cap for production

# --- Date range ---
DATE_RANGE_START = "2025-01-20"  # Inauguration day
DATE_RANGE_END = "2026-02-20"

# --- Crawling ---
REQUEST_DELAY_SECONDS = 1.5  # Minimum delay between requests to cbp.gov/govdelivery
USER_AGENT = "TradeTimelineScraper/1.0 (research project)"
REQUEST_TIMEOUT = 15  # seconds
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 10  # seconds; 429 → 10s, 20s, 40s

# --- Source PDFs ---
SOURCE_PDF_FILES = [
    "csms_archive_incl_dec2025.pdf",
    "csms_archive_incl_jan2026_508c.pdf",
]

# --- Pre-filter keywords (Layer 1 cost optimization) ---
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
    "IEEPA", "executive order", "proclamation",
    "reciprocal", "withhold release", "WRO",
    "forced labor", "UFLPA",
    "steel", "aluminum", "copper", "semiconductor",
    "automobile", "auto parts",
]

# --- Truncation (Layer 2 cost optimization) ---
MAX_TRUNCATED_TOKENS = 3000  # Max tokens sent per API call (default)
MAX_FULL_TEXT_TOKENS = 10000  # Max tokens when --full-text is used
KEYWORD_WINDOW_TOKENS = 300  # Tokens around each keyword match
INTRO_TOKENS = 1500  # Always include first N tokens

# --- Claude API (Layer 3 cost optimization) ---
DEFAULT_MODEL = "claude-haiku-4-5-20251001"
SONNET_MODEL = "claude-sonnet-4-20250514"
MAX_EXTRACTION_TOKENS = 4096
PROMPT_VERSION = "v1"  # Bump this to invalidate classification cache

# --- Pricing (approximate, for cost estimation) ---
PRICING = {
    "claude-haiku-4-5-20251001": {"input_per_mtok": 0.80, "output_per_mtok": 4.00},
    "claude-sonnet-4-20250514": {"input_per_mtok": 3.00, "output_per_mtok": 15.00},
}

# --- Scraper version ---
SCRAPER_VERSION = "1.0.0"
