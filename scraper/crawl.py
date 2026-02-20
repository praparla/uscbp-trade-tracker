"""Crawl GovDelivery bulletin pages for full CSMS message text.

The lnks.gd short URLs in the PDFs redirect (via HTTP or JS) to GovDelivery
bulletin pages. In practice, `requests` with allow_redirects=True follows
the full chain and lands on the final bulletin page in one request.

If lnks.gd returns a JS-only redirect page (no HTTP redirect), we parse
the <a id="destination"> href and make a second request.
"""

from __future__ import annotations

import hashlib
import logging
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from config import (
    CACHE_RAW_DIR,
    CACHE_TEXTS_DIR,
    REQUEST_DELAY_SECONDS,
    REQUEST_TIMEOUT,
    MAX_RETRIES,
    RETRY_BACKOFF_BASE,
    USER_AGENT,
)
from models import CsmsEntry, PipelineError

logger = logging.getLogger(__name__)

_SESSION = None  # type: requests.Session | None


def _get_session() -> requests.Session:
    global _SESSION
    if _SESSION is None:
        _SESSION = requests.Session()
        _SESSION.headers.update({"User-Agent": USER_AGENT})
    return _SESSION


def _cache_key(url: str) -> str:
    """SHA-256 hash of a URL for use as a cache filename."""
    return hashlib.sha256(url.encode()).hexdigest()[:16]


def _fetch_with_retry(url: str):
    """Fetch a URL with retries and backoff on 429/5xx."""
    session = _get_session()
    for attempt in range(MAX_RETRIES):
        try:
            resp = session.get(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)
            if resp.status_code == 200:
                return resp
            if resp.status_code == 429 or resp.status_code >= 500:
                wait = RETRY_BACKOFF_BASE * (2 ** attempt)
                logger.warning(
                    "HTTP %d from %s — retrying in %ds (attempt %d/%d)",
                    resp.status_code, url, wait, attempt + 1, MAX_RETRIES,
                )
                time.sleep(wait)
                continue
            logger.warning("HTTP %d from %s — skipping", resp.status_code, url)
            return None
        except requests.RequestException as exc:
            logger.warning("Request error for %s: %s", url, exc)
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_BACKOFF_BASE)
            else:
                return None
    return None


def _is_bulletin_page(html: str) -> bool:
    """Check if HTML is a full GovDelivery bulletin (not a redirect stub)."""
    # Bulletin pages have XHTML doctype and CSMS # in the title
    return "<!DOCTYPE html" in html[:200] or "CSMS #" in html[:500]


def _extract_text_from_bulletin(html: str) -> str:
    """Extract the message text from a GovDelivery bulletin HTML page."""
    soup = BeautifulSoup(html, "html.parser")

    # Remove scripts, styles, nav, footer
    for tag in soup.find_all(["script", "style", "nav", "footer"]):
        tag.decompose()

    # Try specific GovDelivery content containers
    content_div = (
        soup.find("div", class_="bulletin-body")
        or soup.find("div", class_="bulletin-content")
        or soup.find("div", {"id": "bulletin-body"})
        or soup.find("div", {"id": "bulletin-content"})
    )

    if content_div:
        text = content_div.get_text(separator="\n", strip=True)
    else:
        # Fallback: extract from body
        body = soup.find("body")
        if body:
            text = body.get_text(separator="\n", strip=True)
        else:
            text = soup.get_text(separator="\n", strip=True)

    # Strip GovDelivery subscription boilerplate
    cutoff_phrases = [
        "Update your subscriptions",
        "Subscriber Preferences Page",
        "This service is provided to you at no charge",
        "Powered by\nPrivacy Policy",
    ]
    for phrase in cutoff_phrases:
        idx = text.find(phrase)
        if idx > 0:
            text = text[:idx].strip()
            break

    return text


def _resolve_js_redirect(html: str):
    """If HTML is a lnks.gd JS redirect page, extract the destination URL."""
    soup = BeautifulSoup(html, "html.parser")
    anchor = soup.find("a", id="destination")
    if anchor and anchor.get("href"):
        return anchor["href"]
    return None


def fetch_bulletin(lnks_url: str, csms_id: str):
    """Fetch a CSMS bulletin via its lnks.gd URL. Returns (govdelivery_url, text) or (None, None).

    Handles two scenarios:
    1. requests follows HTTP redirects → lands on bulletin page directly
    2. lnks.gd returns JS redirect page → parse href, make second request
    """
    # Check text cache first (fastest path)
    text_cache = CACHE_TEXTS_DIR / f"csms_{csms_id}.txt"
    if text_cache.exists():
        logger.debug("CACHE HIT (text): CSMS %s", csms_id)
        text = text_cache.read_text(encoding="utf-8")
        # We don't know the exact govdelivery URL from cache, but that's fine
        return lnks_url, text

    # Check raw HTML cache
    raw_cache = CACHE_RAW_DIR / f"bulletin_{_cache_key(lnks_url)}.html"
    if raw_cache.exists():
        html = raw_cache.read_text(encoding="utf-8")
        final_url = lnks_url
        logger.debug("CACHE HIT (raw): %s", lnks_url)
    else:
        resp = _fetch_with_retry(lnks_url)
        if resp is None:
            return None, None
        html = resp.text
        final_url = resp.url  # may differ from lnks_url if redirected
        CACHE_RAW_DIR.mkdir(parents=True, exist_ok=True)
        raw_cache.write_text(html, encoding="utf-8")
        logger.info("Fetched: %s -> %s (cached)", lnks_url, final_url)
        time.sleep(REQUEST_DELAY_SECONDS)

    # Case 1: We landed on the bulletin page directly (HTTP redirect was followed)
    if _is_bulletin_page(html):
        text = _extract_text_from_bulletin(html)
        if text:
            CACHE_TEXTS_DIR.mkdir(parents=True, exist_ok=True)
            text_cache.write_text(text, encoding="utf-8")
        return final_url, text

    # Case 2: We got the lnks.gd JS redirect page
    gd_url = _resolve_js_redirect(html)
    if not gd_url:
        logger.warning("Cannot resolve lnks.gd page for CSMS %s: %s", csms_id, lnks_url)
        return None, None

    # Fetch the actual bulletin
    bulletin_cache = CACHE_RAW_DIR / f"bulletin_{_cache_key(gd_url)}.html"
    if bulletin_cache.exists():
        html = bulletin_cache.read_text(encoding="utf-8")
        logger.debug("CACHE HIT (bulletin raw): %s", gd_url)
    else:
        resp = _fetch_with_retry(gd_url)
        if resp is None:
            return gd_url, None
        html = resp.text
        CACHE_RAW_DIR.mkdir(parents=True, exist_ok=True)
        bulletin_cache.write_text(html, encoding="utf-8")
        logger.info("Fetched bulletin: %s (cached)", gd_url)
        time.sleep(REQUEST_DELAY_SECONDS)

    text = _extract_text_from_bulletin(html)
    if text:
        CACHE_TEXTS_DIR.mkdir(parents=True, exist_ok=True)
        text_cache.write_text(text, encoding="utf-8")

    return gd_url, text


def fetch_entries(
    entries,
    dry_run=False,
):
    """Fetch full text for a list of CSMS entries.

    Returns (updated_entries, errors).
    """
    errors = []
    fetched_count = 0

    for i, entry in enumerate(entries):
        if dry_run:
            logger.info(
                "[DRY RUN] Would fetch CSMS %s: %s", entry.csms_id, entry.title
            )
            continue

        if not entry.lnks_gd_url:
            logger.warning("No lnks.gd URL for CSMS %s — skipping fetch", entry.csms_id)
            errors.append(PipelineError(
                csms_id=entry.csms_id,
                error="No lnks.gd URL found in PDF",
            ))
            continue

        logger.info(
            "[%d/%d] Fetching CSMS %s: %s",
            i + 1, len(entries), entry.csms_id, entry.title[:60],
        )

        try:
            gd_url, text = fetch_bulletin(entry.lnks_gd_url, entry.csms_id)
        except Exception as exc:
            logger.warning("Error fetching CSMS %s: %s", entry.csms_id, exc)
            errors.append(PipelineError(
                csms_id=entry.csms_id,
                url=entry.lnks_gd_url,
                error=str(exc),
            ))
            continue

        if gd_url:
            entry.govdelivery_url = gd_url

        if text:
            entry.full_text = text
            fetched_count += 1
        else:
            errors.append(PipelineError(
                csms_id=entry.csms_id,
                url=entry.lnks_gd_url,
                error="No text extracted from bulletin",
            ))

    logger.info(
        "Fetch complete: %d/%d bulletins retrieved, %d errors",
        fetched_count, len(entries), len(errors),
    )
    return entries, errors
