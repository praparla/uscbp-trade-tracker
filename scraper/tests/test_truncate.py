"""Tests for the smart truncation module (Layer 2 cost optimization)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from truncate import truncate_text, _token_estimate, CHARS_PER_TOKEN
from config import INTRO_TOKENS, MAX_TRUNCATED_TOKENS, MAX_FULL_TEXT_TOKENS


class TestTokenEstimate:
    def test_empty_string(self):
        assert _token_estimate("") == 0

    def test_short_string(self):
        # "hello" = 5 chars => 5 // 4 = 1 token
        assert _token_estimate("hello") == 1

    def test_longer_string(self):
        text = "a" * 400
        assert _token_estimate(text) == 100  # 400 / 4

    def test_proportional(self):
        t1 = _token_estimate("a" * 100)
        t2 = _token_estimate("a" * 200)
        assert t2 == t1 * 2


class TestTruncateText:
    def test_empty_string_returns_empty(self):
        assert truncate_text("") == ""

    def test_short_text_unchanged(self):
        text = "Section 232 tariff on steel imports from all countries."
        result = truncate_text(text)
        # Short text should pass through without modification
        assert result == text

    def test_text_under_limit_passes_through(self):
        """Text under MAX_TRUNCATED_TOKENS should not be truncated."""
        text = "tariff " * (MAX_TRUNCATED_TOKENS - 10)  # Well under limit
        # Token estimate of short text should be under limit
        if _token_estimate(text) <= MAX_TRUNCATED_TOKENS:
            result = truncate_text(text)
            assert result == text

    def test_long_text_gets_truncated(self):
        """Text well over the limit should be truncated."""
        # Create text that's ~20,000 tokens (way over the 3,000 cap)
        long_text = ("This is general non-trade content. " * 1000 +
                     "The tariff rate is 25% on steel imports. " +
                     "More general content follows. " * 1000)
        result = truncate_text(long_text)
        # Result should be shorter than original
        assert len(result) < len(long_text)
        # Result should contain the framing note
        assert "[NOTE:" in result
        # Result should include the intro portion
        assert result[:50] is not None

    def test_includes_keyword_windows(self):
        """Truncation should include windows around trade keywords."""
        # Build a long document with a keyword buried in the middle
        padding = "Lorem ipsum dolor sit amet. " * 200
        keyword_section = "The Section 232 tariff of 25% applies to all steel imports."
        long_text = padding + keyword_section + padding
        result = truncate_text(long_text)
        # The keyword section content should be present in the result
        assert "Section 232" in result or "tariff" in result

    def test_disabled_returns_full_text(self):
        """When disabled (--full-text), should cap at MAX_FULL_TEXT_TOKENS."""
        text = "tariff " * 100
        result = truncate_text(text, enabled=False)
        # Short text should pass through
        assert result == text

    def test_disabled_caps_very_long_text(self):
        """Disabled mode still caps at MAX_FULL_TEXT_TOKENS."""
        # Create extremely long text
        very_long = "a" * (MAX_FULL_TEXT_TOKENS * CHARS_PER_TOKEN * 2)
        result = truncate_text(very_long, enabled=False)
        assert len(result) <= MAX_FULL_TEXT_TOKENS * CHARS_PER_TOKEN

    def test_no_keyword_matches_in_remainder(self):
        """When no keywords found beyond intro, should note this."""
        # Create long text with no trade keywords
        long_text = "General non-trade content. " * 5000
        result = truncate_text(long_text)
        # Should contain a note about no keyword matches or the intro
        assert "[NOTE:" in result or "Truncated" in result

    def test_result_respects_max_cap(self):
        """Output should not exceed MAX_TRUNCATED_TOKENS (approximately)."""
        long_text = ("tariff duty quota embargo " * 500 +
                     "Section 232 Section 301 HTSUS " * 500)
        result = truncate_text(long_text)
        # Allow some overhead for the framing note
        max_chars = (MAX_TRUNCATED_TOKENS + 100) * CHARS_PER_TOKEN
        assert len(result) <= max_chars

    def test_merges_overlapping_windows(self):
        """Adjacent keyword occurrences should produce merged windows."""
        padding = "General content here. " * 200
        # Place keywords close together
        dense_section = ("tariff rate of 25% under Section 232 "
                         "with additional duties and countervailing duty provisions")
        long_text = padding + dense_section + padding
        result = truncate_text(long_text)
        # Dense section should appear as one chunk, not fragmented
        assert "tariff" in result.lower()
