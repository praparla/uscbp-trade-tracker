"""Response caching — Layer 4 cost optimization.

Caches Claude API classification responses keyed by a hash of:
  (document text + model name + prompt version)

Re-runs with the same text and model skip the API entirely.
"""

from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path

from config import CACHE_CLASSIFICATIONS_DIR, PROMPT_VERSION

logger = logging.getLogger(__name__)


def _cache_key(text: str, model: str) -> str:
    """Deterministic cache key from content + model + prompt version."""
    payload = f"{text}||{model}||{PROMPT_VERSION}"
    return hashlib.sha256(payload.encode()).hexdigest()[:24]


def get_cached(text: str, model: str) -> list[dict] | None:
    """Return cached classification result, or None on cache miss."""
    key = _cache_key(text, model)
    cache_file = CACHE_CLASSIFICATIONS_DIR / f"{key}.json"
    if cache_file.exists():
        try:
            data = json.loads(cache_file.read_text(encoding="utf-8"))
            logger.debug("CACHE HIT: %s", key)
            return data
        except (json.JSONDecodeError, KeyError):
            logger.warning("Corrupt cache entry: %s — deleting", cache_file)
            cache_file.unlink()
    return None


def set_cached(text: str, model: str, result: list[dict]) -> None:
    """Write a classification result to cache."""
    CACHE_CLASSIFICATIONS_DIR.mkdir(parents=True, exist_ok=True)
    key = _cache_key(text, model)
    cache_file = CACHE_CLASSIFICATIONS_DIR / f"{key}.json"
    cache_file.write_text(json.dumps(result, indent=2), encoding="utf-8")
    logger.debug("CACHE WRITE: %s", key)


def clear_cache() -> int:
    """Delete all cached classifications. Returns count of deleted files."""
    if not CACHE_CLASSIFICATIONS_DIR.exists():
        return 0
    count = 0
    for f in CACHE_CLASSIFICATIONS_DIR.glob("*.json"):
        f.unlink()
        count += 1
    logger.info("Cleared %d cached classifications", count)
    return count
