"""Smart truncation — Layer 2 cost optimization.

Extracts only trade-relevant sections from long bulletin texts instead of
sending the entire document to the Claude API.

Strategy:
  1. Always include the first INTRO_TOKENS tokens (title, summary, purpose)
  2. For each trade keyword occurrence, include ±KEYWORD_WINDOW_TOKENS around it
  3. Merge overlapping windows
  4. Cap total at MAX_TRUNCATED_TOKENS
"""

from __future__ import annotations

import logging

from config import (
    INTRO_TOKENS,
    KEYWORD_WINDOW_TOKENS,
    MAX_TRUNCATED_TOKENS,
    MAX_FULL_TEXT_TOKENS,
    TRADE_KEYWORDS,
)

logger = logging.getLogger(__name__)

# Rough approximation: 1 token ≈ 4 characters for English text
CHARS_PER_TOKEN = 4


def _token_estimate(text: str) -> int:
    return len(text) // CHARS_PER_TOKEN


def truncate_text(
    text: str,
    *,
    enabled: bool = True,
) -> str:
    """Truncate text to relevant sections for API consumption.

    If disabled (--full-text), caps at MAX_FULL_TEXT_TOKENS instead.
    """
    if not text:
        return ""

    estimated_tokens = _token_estimate(text)

    if not enabled:
        max_chars = MAX_FULL_TEXT_TOKENS * CHARS_PER_TOKEN
        if len(text) > max_chars:
            logger.debug("Full-text mode: capping at %d tokens", MAX_FULL_TEXT_TOKENS)
            return text[:max_chars]
        return text

    # If already under the limit, no truncation needed
    if estimated_tokens <= MAX_TRUNCATED_TOKENS:
        return text

    max_chars = MAX_TRUNCATED_TOKENS * CHARS_PER_TOKEN
    intro_chars = INTRO_TOKENS * CHARS_PER_TOKEN
    window_chars = KEYWORD_WINDOW_TOKENS * CHARS_PER_TOKEN

    # Step 1: Always include the intro
    intro = text[:intro_chars]

    # Step 2: Find keyword windows in the rest of the text
    rest = text[intro_chars:]
    text_lower = rest.lower()
    windows: list[tuple[int, int]] = []  # (start, end) offsets into `rest`

    for keyword in TRADE_KEYWORDS:
        kw_lower = keyword.lower()
        start = 0
        while True:
            idx = text_lower.find(kw_lower, start)
            if idx == -1:
                break
            win_start = max(0, idx - window_chars)
            win_end = min(len(rest), idx + len(keyword) + window_chars)
            windows.append((win_start, win_end))
            start = idx + len(keyword)

    if not windows:
        # No keyword matches in the remainder — just return the intro
        result = f"[NOTE: Truncated to first {INTRO_TOKENS} tokens. No keyword matches in remainder.]\n\n{intro}"
        return result

    # Step 3: Merge overlapping windows
    windows.sort()
    merged: list[tuple[int, int]] = [windows[0]]
    for ws, we in windows[1:]:
        if ws <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], we))
        else:
            merged.append((ws, we))

    # Step 4: Build output, respecting cap
    parts = [intro]
    budget = max_chars - len(intro) - 200  # reserve for framing note

    for ws, we in merged:
        chunk = rest[ws:we]
        if len(chunk) > budget:
            chunk = chunk[:budget]
            parts.append(f"\n\n[...]\n\n{chunk}")
            break
        parts.append(f"\n\n[...]\n\n{chunk}")
        budget -= len(chunk) + 10

    result = (
        "[NOTE: This text has been extracted from key sections of a longer document. "
        "Some context may be missing.]\n\n"
        + "".join(parts)
    )

    logger.debug(
        "Truncated: %d -> %d tokens (estimated)",
        estimated_tokens, _token_estimate(result),
    )
    return result
