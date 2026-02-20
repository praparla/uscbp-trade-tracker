"""Extract CSMS entries from archive PDFs.

Parses the table structure (CSMS#, Title, Date) and extracts the lnks.gd
hyperlink associated with each row.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime
from pathlib import Path

import fitz  # pymupdf

from models import CsmsEntry

logger = logging.getLogger(__name__)

# Date pattern for MM/DD/YYYY at end of row text
_DATE_RE = re.compile(r"(\d{1,2}/\d{1,2}/\d{4})")
# CSMS number: 8-digit number at start of row
_CSMS_ID_RE = re.compile(r"^(\d{7,9})\s+")


def parse_pdf(pdf_path: Path) -> list[CsmsEntry]:
    """Parse a CSMS archive PDF and return all entries with their links.

    Each CSMS entry in the PDF has:
    - A row of text: "CSMS# Title Date"
    - A hyperlink (lnks.gd URL) on the title text

    Multi-line entries share the same lnks.gd URL across continuation lines.
    We group by unique URL and extract CSMS#/date from the first line.
    """
    logger.info("Parsing PDF: %s", pdf_path.name)
    doc = fitz.open(str(pdf_path))
    entries: list[CsmsEntry] = []

    for page_num, page in enumerate(doc):
        links = page.get_links()
        words = page.get_text("words")  # (x0, y0, x1, y1, word, block, line, word_no)

        # Group links by unique URL, keeping only the first rect per URL on this page
        url_first_rect: dict[str, tuple[float, float, float, float]] = {}
        for lnk in links:
            uri = lnk.get("uri")
            if uri and uri.startswith("https://lnks.gd/") and uri not in url_first_rect:
                url_first_rect[uri] = lnk["from"]

        for uri, first_rect in url_first_rect.items():
            rect = fitz.Rect(first_rect)
            # Gather all words on the same line (within 8px of the rect's y-origin)
            row_words = [w for w in words if abs(w[1] - rect.y0) < 8]
            row_words.sort(key=lambda w: w[0])  # sort by x position
            row_text = " ".join(w[4] for w in row_words)

            if not row_text.strip():
                continue

            # Extract CSMS ID (first number)
            csms_match = _CSMS_ID_RE.match(row_text)
            if not csms_match:
                continue
            csms_id = csms_match.group(1)

            # Extract title — everything between CSMS# and date
            title_text = row_text[csms_match.end():].strip()

            # Try to find the date (could be on this line or need to look at
            # continuation lines for this URL)
            date_str = _extract_date_from_words(words, rect, uri, links, page)

            # Clean the date off the title if it's there
            date_match = _DATE_RE.search(title_text)
            if date_match:
                title_text = title_text[:date_match.start()].strip()

            # Also gather continuation line text for multi-line titles
            continuation = _get_continuation_text(words, rect, uri, links, page)
            if continuation:
                title_text = f"{title_text} {continuation}"

            # Parse date
            iso_date = _parse_date(date_str) if date_str else None
            if not iso_date:
                logger.debug("Skipping entry %s — no parseable date", csms_id)
                continue

            entries.append(CsmsEntry(
                csms_id=csms_id,
                title=title_text.strip(),
                date=iso_date,
                lnks_gd_url=uri,
            ))

    doc.close()
    logger.info("Extracted %d entries from %s", len(entries), pdf_path.name)
    return entries


def _extract_date_from_words(
    words: list,
    first_rect: fitz.Rect,
    uri: str,
    links: list,
    page: fitz.Page,
):
    """Find the date for this entry — could be on first or last continuation line."""
    # Get all rects for this URL to find the last line
    all_rects = [
        fitz.Rect(lnk["from"])
        for lnk in links
        if lnk.get("uri") == uri
    ]
    # The date is usually on the same y-line as the first rect, or the last rect
    for rect in [first_rect] + all_rects:
        line_words = [w for w in words if abs(w[1] - rect.y0) < 8]
        line_text = " ".join(w[4] for w in sorted(line_words, key=lambda w: w[0]))
        match = _DATE_RE.search(line_text)
        if match:
            return match.group(1)
    return None


def _get_continuation_text(
    words: list,
    first_rect: fitz.Rect,
    uri: str,
    links: list,
    page: fitz.Page,
) -> str:
    """Get text from continuation lines (same URL, different y-position)."""
    continuation_parts = []
    for lnk in links:
        if lnk.get("uri") != uri:
            continue
        rect = fitz.Rect(lnk["from"])
        # Skip the first line
        if abs(rect.y0 - first_rect.y0) < 4:
            continue
        line_words = [w for w in words if abs(w[1] - rect.y0) < 8]
        line_words.sort(key=lambda w: w[0])
        line_text = " ".join(w[4] for w in line_words)
        # Strip the date if present
        date_match = _DATE_RE.search(line_text)
        if date_match:
            line_text = line_text[:date_match.start()].strip()
        if line_text:
            continuation_parts.append(line_text)
    return " ".join(continuation_parts)


def _parse_date(date_str: str):
    """Parse MM/DD/YYYY to ISO YYYY-MM-DD."""
    try:
        dt = datetime.strptime(date_str, "%m/%d/%Y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return None


def extract_all_entries(pdf_dir: Path, pdf_files: list[str]) -> list[CsmsEntry]:
    """Parse all source PDFs and return combined entry list, deduplicated by CSMS ID."""
    all_entries: list[CsmsEntry] = []
    seen_ids: set[str] = set()

    for fname in pdf_files:
        pdf_path = pdf_dir / fname
        if not pdf_path.exists():
            logger.warning("PDF not found: %s", pdf_path)
            continue
        entries = parse_pdf(pdf_path)
        for entry in entries:
            if entry.csms_id not in seen_ids:
                seen_ids.add(entry.csms_id)
                all_entries.append(entry)
            else:
                logger.debug("Duplicate CSMS %s — skipping", entry.csms_id)

    all_entries.sort(key=lambda e: e.date, reverse=True)
    logger.info("Total unique entries across all PDFs: %d", len(all_entries))
    return all_entries
