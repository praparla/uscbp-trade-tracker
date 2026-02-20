"""Tests for the response caching layer (Layer 4 cost optimization)."""

from __future__ import annotations

import sys
import json
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from unittest.mock import patch
from cache import _cache_key, get_cached, set_cached, clear_cache


class TestCacheKey:
    def test_deterministic(self):
        """Same inputs always produce the same key."""
        k1 = _cache_key("hello world", "claude-haiku-4-5-20251001")
        k2 = _cache_key("hello world", "claude-haiku-4-5-20251001")
        assert k1 == k2

    def test_different_text_different_key(self):
        k1 = _cache_key("text A", "claude-haiku-4-5-20251001")
        k2 = _cache_key("text B", "claude-haiku-4-5-20251001")
        assert k1 != k2

    def test_different_model_different_key(self):
        k1 = _cache_key("same text", "claude-haiku-4-5-20251001")
        k2 = _cache_key("same text", "claude-sonnet-4-20250514")
        assert k1 != k2

    def test_key_is_hex_string(self):
        key = _cache_key("test", "model")
        assert all(c in "0123456789abcdef" for c in key)

    def test_key_has_consistent_length(self):
        k1 = _cache_key("short", "m")
        k2 = _cache_key("a" * 10000, "very-long-model-name")
        assert len(k1) == len(k2) == 24


class TestCacheReadWrite:
    @pytest.fixture
    def tmp_cache_dir(self, tmp_path):
        """Provide a temporary cache directory and patch the config."""
        cache_dir = tmp_path / "classifications"
        cache_dir.mkdir()
        with patch("cache.CACHE_CLASSIFICATIONS_DIR", cache_dir):
            yield cache_dir

    def test_miss_returns_none(self, tmp_cache_dir):
        result = get_cached("never seen this text", "claude-haiku-4-5-20251001")
        assert result is None

    def test_write_then_read(self, tmp_cache_dir):
        text = "Section 232 tariff on steel"
        model = "claude-haiku-4-5-20251001"
        data = [{"id": "test-1", "title": "Steel Tariff", "action_type": "tariff"}]

        set_cached(text, model, data)
        result = get_cached(text, model)

        assert result is not None
        assert result == data

    def test_different_model_is_cache_miss(self, tmp_cache_dir):
        text = "Same document text"
        data = [{"id": "test-1"}]

        set_cached(text, "claude-haiku-4-5-20251001", data)
        result = get_cached(text, "claude-sonnet-4-20250514")
        assert result is None  # Different model = cache miss

    def test_corrupt_cache_entry_deleted(self, tmp_cache_dir):
        """If a cache file contains invalid JSON, it should be deleted and return None."""
        text = "some text"
        model = "claude-haiku-4-5-20251001"

        # Write a corrupt file
        key = _cache_key(text, model)
        corrupt_file = tmp_cache_dir / f"{key}.json"
        corrupt_file.write_text("NOT VALID JSON {{{", encoding="utf-8")

        result = get_cached(text, model)
        assert result is None
        assert not corrupt_file.exists()  # Should be deleted

    def test_overwrite_existing_cache(self, tmp_cache_dir):
        text = "document"
        model = "model"
        old_data = [{"id": "old"}]
        new_data = [{"id": "new"}]

        set_cached(text, model, old_data)
        set_cached(text, model, new_data)
        result = get_cached(text, model)
        assert result == new_data


class TestClearCache:
    @pytest.fixture
    def populated_cache(self, tmp_path):
        cache_dir = tmp_path / "classifications"
        cache_dir.mkdir()
        # Create some cache files
        for i in range(5):
            (cache_dir / f"entry_{i}.json").write_text(
                json.dumps([{"id": f"test-{i}"}]), encoding="utf-8"
            )
        with patch("cache.CACHE_CLASSIFICATIONS_DIR", cache_dir):
            yield cache_dir

    def test_clears_all_files(self, populated_cache):
        count = clear_cache()
        assert count == 5
        remaining = list(populated_cache.glob("*.json"))
        assert len(remaining) == 0

    def test_returns_zero_for_empty_dir(self, tmp_path):
        cache_dir = tmp_path / "classifications"
        cache_dir.mkdir()
        with patch("cache.CACHE_CLASSIFICATIONS_DIR", cache_dir):
            count = clear_cache()
            assert count == 0

    def test_returns_zero_for_nonexistent_dir(self, tmp_path):
        cache_dir = tmp_path / "does_not_exist"
        with patch("cache.CACHE_CLASSIFICATIONS_DIR", cache_dir):
            count = clear_cache()
            assert count == 0
