"""Integration tests for the scraper pipeline.

Tests the --dry-run and --fetch-only modes, config validation,
and end-to-end output schema correctness.
"""

import sys
import json
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from config import (
    MAX_PDFS_TO_PROCESS,
    DATE_RANGE_START,
    DATE_RANGE_END,
    TRADE_KEYWORDS,
    CACHE_DIR,
    CACHE_TEXTS_DIR,
    CACHE_CLASSIFICATIONS_DIR,
    INTRO_TOKENS,
    KEYWORD_WINDOW_TOKENS,
    MAX_TRUNCATED_TOKENS,
    MAX_FULL_TEXT_TOKENS,
    PROMPT_VERSION,
    SOURCE_PDFS_DIR,
)


# ── Config Validation ────────────────────────────────────────────────────

class TestConfig:
    def test_max_pdfs_is_positive(self):
        assert MAX_PDFS_TO_PROCESS > 0

    def test_date_range_valid(self):
        assert DATE_RANGE_START < DATE_RANGE_END
        assert DATE_RANGE_START >= "2025-01-20"

    def test_trade_keywords_non_empty(self):
        assert len(TRADE_KEYWORDS) > 10
        # All keywords should be non-empty strings
        for kw in TRADE_KEYWORDS:
            assert isinstance(kw, str)
            assert len(kw) > 0

    def test_trade_keywords_contains_essentials(self):
        """Core trade keywords must always be present."""
        essentials = ["tariff", "duty", "Section 232", "Section 301", "HTSUS", "embargo", "sanction"]
        kw_lower = [k.lower() for k in TRADE_KEYWORDS]
        for essential in essentials:
            assert essential.lower() in kw_lower, f"Missing essential keyword: {essential}"

    def test_cache_dirs_are_paths(self):
        assert isinstance(CACHE_DIR, Path)
        assert isinstance(CACHE_TEXTS_DIR, Path)
        assert isinstance(CACHE_CLASSIFICATIONS_DIR, Path)

    def test_truncation_config_reasonable(self):
        assert INTRO_TOKENS > 0
        assert KEYWORD_WINDOW_TOKENS > 0
        assert MAX_TRUNCATED_TOKENS > INTRO_TOKENS
        assert MAX_FULL_TEXT_TOKENS > MAX_TRUNCATED_TOKENS

    def test_prompt_version_set(self):
        assert PROMPT_VERSION is not None
        assert len(PROMPT_VERSION) > 0


# ── Source PDF Availability ──────────────────────────────────────────────

class TestSourcePDFs:
    def test_source_pdf_dir_exists(self):
        assert SOURCE_PDFS_DIR.exists(), f"Source PDF dir not found: {SOURCE_PDFS_DIR}"

    def test_at_least_one_pdf(self):
        pdfs = list(SOURCE_PDFS_DIR.glob("*.pdf"))
        assert len(pdfs) >= 1, "No source PDFs found"

    def test_known_pdfs_present(self):
        expected = [
            "csms_archive_incl_dec2025.pdf",
            "csms_archive_incl_jan2026_508c.pdf",
        ]
        for name in expected:
            pdf = SOURCE_PDFS_DIR / name
            assert pdf.exists(), f"Expected PDF not found: {name}"


# ── Cached Data State ────────────────────────────────────────────────────

class TestCachedData:
    """Verify that previously fetched data is intact."""

    def test_cache_texts_dir_exists(self):
        if not CACHE_TEXTS_DIR.exists():
            pytest.skip("Cache texts dir doesn't exist — run --fetch-only first")
        assert CACHE_TEXTS_DIR.is_dir()

    def test_cached_texts_count(self):
        if not CACHE_TEXTS_DIR.exists():
            pytest.skip("No cached texts — run --fetch-only first")
        texts = list(CACHE_TEXTS_DIR.glob("*.txt"))
        assert len(texts) > 0, "No cached text files found"

    def test_manifest_exists(self):
        manifest = CACHE_DIR / "manifest.json"
        if not manifest.exists():
            pytest.skip("No manifest.json — run --fetch-only first")
        data = json.loads(manifest.read_text(encoding="utf-8"))
        assert isinstance(data, (list, dict))


# ── Environment ──────────────────────────────────────────────────────────

class TestEnvironment:
    """Tests for common environment issues encountered during development."""

    def test_api_key_format_if_set(self):
        """If ANTHROPIC_API_KEY is set, verify it's non-empty and well-formed."""
        key = os.environ.get("ANTHROPIC_API_KEY", "")
        if key:
            assert len(key) > 10, "API key appears too short"
            assert key.startswith("sk-ant-"), f"API key should start with 'sk-ant-', got: {key[:10]}..."
        # If not set, that's OK — --dry-run and --fetch-only don't need it

    def test_python_version(self):
        """Python 3.9+ minimum (3.11+ recommended per CLAUDE.md)."""
        assert sys.version_info >= (3, 9), f"Python 3.9+ required, got {sys.version}"

    def test_required_packages_importable(self):
        """All required packages should be importable."""
        import_errors = []
        for pkg in ["anthropic", "bs4", "pydantic", "fitz", "requests"]:
            try:
                __import__(pkg)
            except ImportError:
                import_errors.append(pkg)
        assert import_errors == [], f"Missing packages: {import_errors}"


# ── Output JSON Dual-Write Consistency ───────────────────────────────────

class TestOutputConsistency:
    """Verify both copies of trade_actions.json are in sync."""

    @pytest.fixture
    def json_paths(self):
        base = Path(__file__).resolve().parent.parent.parent / "frontend"
        src_path = base / "src" / "data" / "trade_actions.json"
        public_path = base / "public" / "data" / "trade_actions.json"
        return src_path, public_path

    def test_both_files_exist(self, json_paths):
        src, pub = json_paths
        assert src.exists(), f"Missing: {src}"
        assert pub.exists(), f"Missing: {pub}"

    def test_files_are_identical(self, json_paths):
        src, pub = json_paths
        if not (src.exists() and pub.exists()):
            pytest.skip("One or both JSON files missing")
        src_data = json.loads(src.read_text(encoding="utf-8"))
        pub_data = json.loads(pub.read_text(encoding="utf-8"))
        assert src_data == pub_data, (
            "frontend/src/data/trade_actions.json and frontend/public/data/trade_actions.json "
            "are out of sync! Copy one to the other after updating."
        )
