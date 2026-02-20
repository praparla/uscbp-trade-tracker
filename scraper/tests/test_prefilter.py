"""Tests for the keyword pre-filter (Layer 1 cost optimization)."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

# Ensure scraper root is on the path so we can import modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from models import CsmsEntry
from prefilter import passes_keyword_filter, apply_prefilter


# ── helpers ──────────────────────────────────────────────────────────────

def _entry(title: str, full_text: Optional[str] = None, csms_id: str = "99999999") -> CsmsEntry:
    """Create a minimal CsmsEntry for testing."""
    return CsmsEntry(
        csms_id=csms_id,
        title=title,
        date="2025-06-01",
        full_text=full_text,
    )


# ── passes_keyword_filter ────────────────────────────────────────────────

class TestPassesKeywordFilter:
    def test_matches_tariff_in_title(self):
        assert passes_keyword_filter(_entry("New Tariff on Steel Imports"))

    def test_matches_section_232_in_title(self):
        assert passes_keyword_filter(_entry("Section 232 Proclamation Update"))

    def test_matches_section_301_in_title(self):
        assert passes_keyword_filter(_entry("Section 301 Four-Year Review"))

    def test_matches_ieepa_via_duty_keyword(self):
        assert passes_keyword_filter(_entry("Additional duties on imports from Canada"))

    def test_matches_htsus_keyword(self):
        assert passes_keyword_filter(_entry("HTSUS classification update for trade"))

    def test_matches_keyword_in_full_text(self):
        entry = _entry("General CBP Notice", full_text="This relates to antidumping duties on steel products")
        assert passes_keyword_filter(entry)

    def test_rejects_unrelated_title(self):
        assert not passes_keyword_filter(_entry("ACE System Maintenance Scheduled"))

    def test_rejects_unrelated_operational_notice(self):
        assert not passes_keyword_filter(_entry("CPSC Import Alert: Children's Toys"))

    def test_case_insensitive_matching(self):
        assert passes_keyword_filter(_entry("TARIFF UPDATE ON CHINESE GOODS"))
        assert passes_keyword_filter(_entry("new embargo on oil exports"))

    def test_matches_embargo(self):
        assert passes_keyword_filter(_entry("Trade embargo on sanctioned country"))

    def test_matches_sanctions(self):
        assert passes_keyword_filter(_entry("OFAC sanctions compliance update"))

    def test_matches_exclusion(self):
        assert passes_keyword_filter(_entry("Product exclusions from Section 301"))

    def test_matches_federal_register(self):
        assert passes_keyword_filter(_entry("Federal Register notice on trade rules"))

    def test_matches_countervailing(self):
        assert passes_keyword_filter(_entry("Countervailing duty order on widgets"))

    def test_matches_country_of_origin(self):
        assert passes_keyword_filter(_entry("Country of origin marking requirements"))


# ── apply_prefilter ──────────────────────────────────────────────────────

class TestApplyPrefilter:
    def test_filters_mixed_entries(self):
        entries = [
            _entry("Section 232 Steel Update", csms_id="1"),
            _entry("ACE Portal Maintenance", csms_id="2"),
            _entry("New tariff on aluminum", csms_id="3"),
            _entry("Office Hours Cancelled", csms_id="4"),
        ]
        passed, skipped = apply_prefilter(entries)
        assert len(passed) == 2
        assert skipped == 2
        assert passed[0].csms_id == "1"
        assert passed[1].csms_id == "3"

    def test_disabled_passes_all(self):
        entries = [
            _entry("ACE Portal Maintenance", csms_id="1"),
            _entry("Office Hours Cancelled", csms_id="2"),
        ]
        passed, skipped = apply_prefilter(entries, enabled=False)
        assert len(passed) == 2
        assert skipped == 0

    def test_empty_list(self):
        passed, skipped = apply_prefilter([])
        assert passed == []
        assert skipped == 0

    def test_all_pass(self):
        entries = [
            _entry("Tariff increase", csms_id="1"),
            _entry("Duty modification", csms_id="2"),
        ]
        passed, skipped = apply_prefilter(entries)
        assert len(passed) == 2
        assert skipped == 0

    def test_all_skipped(self):
        entries = [
            _entry("Portal maintenance", csms_id="1"),
            _entry("Office closure", csms_id="2"),
        ]
        passed, skipped = apply_prefilter(entries)
        assert len(passed) == 0
        assert skipped == 2
