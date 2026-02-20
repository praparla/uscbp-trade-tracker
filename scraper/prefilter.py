"""Keyword pre-filter — Layer 1 cost optimization.

Skips documents whose title (and optionally full text) don't contain
any trade-relevant keywords, avoiding unnecessary API calls.
"""

from __future__ import annotations

import logging
from models import CsmsEntry
from config import TRADE_KEYWORDS

logger = logging.getLogger(__name__)


def passes_keyword_filter(entry: CsmsEntry) -> bool:
    """Return True if the entry's title or full_text contains at least one trade keyword."""
    text = entry.title.lower()
    if entry.full_text:
        text += " " + entry.full_text.lower()

    for keyword in TRADE_KEYWORDS:
        if keyword.lower() in text:
            return True
    return False


def apply_prefilter(
    entries: list[CsmsEntry],
    *,
    enabled: bool = True,
) -> tuple[list[CsmsEntry], int]:
    """Filter entries by trade keywords.

    Returns (filtered_entries, skipped_count).
    """
    if not enabled:
        logger.info("Pre-filter DISABLED — passing all %d entries", len(entries))
        return entries, 0

    passed: list[CsmsEntry] = []
    skipped = 0

    for entry in entries:
        if passes_keyword_filter(entry):
            passed.append(entry)
        else:
            logger.debug(
                "SKIPPED (no trade keywords): CSMS %s — %s",
                entry.csms_id, entry.title[:60],
            )
            skipped += 1

    logger.info(
        "Pre-filter: %d passed, %d skipped out of %d",
        len(passed), skipped, len(entries),
    )
    return passed, skipped
