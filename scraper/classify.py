"""Claude API structured extraction — classify CSMS bulletins into TradeAction records.

Sends pre-filtered, truncated bulletin text to Claude and extracts zero or more
structured TradeAction objects.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import time

from anthropic import Anthropic

from cache import get_cached, set_cached
from config import (
    DEFAULT_MODEL,
    MAX_EXTRACTION_TOKENS,
    PRICING,
)
from models import CsmsEntry, TradeAction

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are a U.S. trade policy analyst extracting structured data from CSMS \
(Cargo Systems Messaging Service) bulletins published by U.S. Customs and \
Border Protection. Your task is to identify trade actions described in the \
bulletin and return structured JSON.

Rules:
- Return a JSON array of trade action objects. Return [] if no trade actions found.
- Each object must match the schema exactly.
- country names: use common English names (e.g., "China", "Canada"). Use "All" \
  for global measures. Use "Multiple" only if the text lists specific countries \
  you cannot identify.
- dates: ISO 8601 (YYYY-MM-DD) or null if not stated.
- raw_excerpt: max 200 characters, the most relevant quote from the source.
- duty_rate: include the percentage or description (e.g., "25%", "10% energy resources").
- federal_authority: the legal authority (e.g., "Section 232", "Executive Order 14195", \
  "Section 301 of the Trade Act of 1974").
- status: "active" for currently in effect, "pending" if future effective date, \
  "expired" if explicitly ended, "superseded" if replaced by a newer action.
- action_type: choose the most specific type.
- hs_codes: extract any HTS/HTSUS subheading numbers mentioned (e.g., "9903.01.20", "8471.50").
- If text appears truncated, extract what you can. Note truncation does not mean no action.
- UPDATE/CORRECTION messages may describe modifications to prior actions. Classify as \
  "modification" if they change rates/dates, or use the underlying action_type if they \
  provide new guidance.
"""

FEW_SHOT_EXAMPLES = """
Example input:
CSMS # 64348288 - GUIDANCE: Import Duties on Imports of Aluminum and Aluminum Derivative Products
The purpose of this message is to provide guidance on the March 12, 2025, Proclamation...
imposes 25 percent ad valorem duties on certain imports of aluminum articles...
9903.45.01: Aluminum articles classifiable under HTSUS provisions...

Example output:
[
  {
    "title": "Section 232 Aluminum and Derivative Product Duties",
    "summary": "25% ad valorem duties on imports of aluminum and aluminum derivative products from all countries, effective March 12, 2025, pursuant to Section 232.",
    "action_type": "tariff",
    "countries_affected": ["All"],
    "hs_codes": ["9903.45.01"],
    "effective_date": "2025-03-12",
    "expiration_date": null,
    "status": "active",
    "federal_authority": "Section 232 of the Trade Expansion Act of 1962",
    "duty_rate": "25%",
    "raw_excerpt": "imposes 25 percent ad valorem duties on certain imports of aluminum articles"
  }
]

Example input (no trade action):
CSMS # 67557993 - Resolved – ACE Reports 524 Time Out Error
CBP has completed troubleshooting its network connections. EDI message processing has resumed.

Example output:
[]
"""


def _build_user_prompt(entry: CsmsEntry, text: str) -> str:
    return (
        f"CSMS #{entry.csms_id} — {entry.title} — Date: {entry.date}\n\n"
        f"Full bulletin text:\n{text}\n\n"
        "Extract all trade actions from this bulletin. Return a JSON array."
    )


def _generate_action_id(entry: CsmsEntry, action_dict: dict, index: int) -> str:
    """Deterministic ID from CSMS ID + action fields."""
    key_str = f"{entry.csms_id}-{action_dict.get('action_type', '')}-{index}"
    suffix = hashlib.sha256(key_str.encode()).hexdigest()[:8]
    return f"csms-{entry.csms_id}-{suffix}"


def classify_entry(
    entry: CsmsEntry,
    text: str,
    *,
    model: str = DEFAULT_MODEL,
) -> tuple[list[TradeAction], int, int]:
    """Send bulletin text to Claude and extract TradeAction records.

    Returns (actions, input_tokens, output_tokens).
    """
    # Check cache first
    cached = get_cached(text, model)
    if cached is not None:
        actions = _parse_actions(cached, entry)
        return actions, 0, 0  # No tokens used on cache hit

    # Call Claude API
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error(
            "ANTHROPIC_API_KEY not set. Run: export ANTHROPIC_API_KEY='sk-ant-...'"
        )
        raise EnvironmentError("ANTHROPIC_API_KEY environment variable is required")

    client = Anthropic()
    user_prompt = _build_user_prompt(entry, text)

    logger.info("API call: CSMS %s (model: %s)", entry.csms_id, model)

    try:
        response = client.messages.create(
            model=model,
            max_tokens=MAX_EXTRACTION_TOKENS,
            system=SYSTEM_PROMPT + "\n\n" + FEW_SHOT_EXAMPLES,
            messages=[{"role": "user", "content": user_prompt}],
        )
    except Exception as exc:
        logger.error("API error for CSMS %s: %s", entry.csms_id, exc)
        raise

    input_tokens = response.usage.input_tokens
    output_tokens = response.usage.output_tokens

    # Parse the response
    raw_text = response.content[0].text.strip()

    # Try to extract JSON from the response (may be wrapped in markdown)
    json_str = raw_text
    if "```json" in json_str:
        json_str = json_str.split("```json", 1)[1].split("```", 1)[0]
    elif "```" in json_str:
        json_str = json_str.split("```", 1)[1].split("```", 1)[0]

    try:
        action_dicts = json.loads(json_str.strip())
    except json.JSONDecodeError:
        logger.warning(
            "Invalid JSON from API for CSMS %s — raw: %s",
            entry.csms_id, raw_text[:200],
        )
        action_dicts = []

    if not isinstance(action_dicts, list):
        logger.warning("API returned non-list for CSMS %s", entry.csms_id)
        action_dicts = []

    # Cache the raw result
    set_cached(text, model, action_dicts)

    actions = _parse_actions(action_dicts, entry)
    return actions, input_tokens, output_tokens


def _parse_actions(action_dicts: list[dict], entry: CsmsEntry) -> list[TradeAction]:
    """Validate and convert raw dicts to TradeAction models."""
    actions: list[TradeAction] = []
    for i, ad in enumerate(action_dicts):
        try:
            action = TradeAction(
                id=_generate_action_id(entry, ad, i),
                source_csms_id=f"CSMS #{entry.csms_id}",
                source_url=entry.govdelivery_url or entry.lnks_gd_url or "",
                title=ad.get("title", entry.title),
                summary=ad.get("summary", ""),
                action_type=ad.get("action_type", "other"),
                countries_affected=ad.get("countries_affected", []),
                hs_codes=ad.get("hs_codes", []),
                effective_date=ad.get("effective_date"),
                expiration_date=ad.get("expiration_date"),
                status=ad.get("status", "active"),
                federal_authority=ad.get("federal_authority"),
                duty_rate=ad.get("duty_rate"),
                raw_excerpt=ad.get("raw_excerpt", "")[:200],
            )
            actions.append(action)
        except Exception as exc:
            logger.warning(
                "Failed to parse action %d for CSMS %s: %s",
                i, entry.csms_id, exc,
            )
    return actions


def estimate_cost(input_tokens: int, output_tokens: int, model: str) -> float:
    """Estimate API cost in USD from token counts."""
    pricing = PRICING.get(model, PRICING[DEFAULT_MODEL])
    input_cost = (input_tokens / 1_000_000) * pricing["input_per_mtok"]
    output_cost = (output_tokens / 1_000_000) * pricing["output_per_mtok"]
    return input_cost + output_cost
