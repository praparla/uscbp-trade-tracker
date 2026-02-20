"""Pipeline orchestrator — the main entry point for the CSMS trade actions scraper.

Usage:
    python main.py [OPTIONS]

Options:
    --dry-run          List what would be processed. No downloads, no API calls.
    --no-prefilter     Disable keyword pre-filtering.
    --full-text        Disable smart truncation.
    --model sonnet     Use Sonnet instead of Haiku.
    --clear-cache      Delete all cached classifications before running.
    --verbose          Enable DEBUG-level logging.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

# Ensure the scraper package is importable
sys.path.insert(0, str(Path(__file__).parent))

from cache import clear_cache
from classify import classify_entry, estimate_cost
from config import (
    DATE_RANGE_END,
    DATE_RANGE_START,
    DEFAULT_MODEL,
    FRONTEND_PUBLIC_DATA,
    FRONTEND_SRC_DATA,
    MAX_PDFS_TO_PROCESS,
    OUTPUT_FILENAME,
    SCRAPER_VERSION,
    SONNET_MODEL,
    SOURCE_PDF_FILES,
    SOURCE_PDFS_DIR,
)
from crawl import fetch_entries
from extract import extract_all_entries
from models import (
    CostOptimization,
    PipelineError,
    PipelineMeta,
    PipelineOutput,
    TradeAction,
)
from prefilter import apply_prefilter
from truncate import truncate_text

logger = logging.getLogger(__name__)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="CSMS Trade Actions Scraper — extracts structured trade data from CBP bulletins"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List what would be processed. No downloads, no API calls. No API key needed.",
    )
    parser.add_argument(
        "--no-prefilter",
        action="store_true",
        help="Disable keyword pre-filtering (send all entries to API).",
    )
    parser.add_argument(
        "--full-text",
        action="store_true",
        help="Disable smart truncation (send complete text, capped at 10k tokens).",
    )
    parser.add_argument(
        "--model",
        choices=["haiku", "sonnet"],
        default="haiku",
        help="Model to use for classification (default: haiku).",
    )
    parser.add_argument(
        "--clear-cache",
        action="store_true",
        help="Delete all cached classifications before running.",
    )
    parser.add_argument(
        "--fetch-only",
        action="store_true",
        help="Fetch all bulletin texts but skip classification. No API key needed.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable DEBUG-level logging.",
    )
    return parser.parse_args()


def setup_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
        datefmt="%H:%M:%S",
    )
    # Quiet noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


def write_output(output: PipelineOutput) -> None:
    """Write trade_actions.json atomically to both frontend locations."""
    data = json.loads(output.model_dump_json())

    for dest_dir in [FRONTEND_SRC_DATA, FRONTEND_PUBLIC_DATA]:
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / OUTPUT_FILENAME
        # Atomic write: write to temp file then rename
        tmp = tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".json",
            dir=dest_dir,
            delete=False,
            encoding="utf-8",
        )
        try:
            json.dump(data, tmp, indent=2, ensure_ascii=False)
            tmp.close()
            Path(tmp.name).rename(dest)
            logger.info("Output written: %s", dest)
        except Exception:
            tmp.close()
            Path(tmp.name).unlink(missing_ok=True)
            raise


def main() -> None:
    args = parse_args()
    setup_logging(args.verbose)

    model = SONNET_MODEL if args.model == "sonnet" else DEFAULT_MODEL
    prefilter_enabled = not args.no_prefilter
    truncation_enabled = not args.full_text

    # Startup banner
    logger.info("=" * 60)
    logger.info("CSMS Trade Actions Scraper v%s", SCRAPER_VERSION)
    logger.info("=" * 60)
    # TODO: Remove cap for production
    logger.info(
        "⚠️  MVP CAP: Processing limited to %d source documents",
        MAX_PDFS_TO_PROCESS,
    )
    logger.info("Model: %s", model)
    logger.info("Pre-filter: %s", "ON" if prefilter_enabled else "OFF")
    logger.info("Truncation: %s", "ON" if truncation_enabled else "OFF")
    logger.info("Date range: %s to %s", DATE_RANGE_START, DATE_RANGE_END)
    if args.dry_run:
        logger.info("MODE: DRY RUN — no network requests or API calls")
    logger.info("-" * 60)

    if args.clear_cache:
        clear_cache()

    # Check API key (unless dry-run or fetch-only)
    if not args.dry_run and not args.fetch_only and not os.environ.get("ANTHROPIC_API_KEY"):
        print(
            "\n❌ ANTHROPIC_API_KEY not set.\n\n"
            "To set it up:\n"
            "  1. Go to https://console.anthropic.com/\n"
            "  2. Create an API key under Settings → API Keys\n"
            "  3. Run: export ANTHROPIC_API_KEY='sk-ant-...'\n\n"
            "Or use --dry-run to preview without API calls.\n"
            "Or use --fetch-only to just download bulletin texts.\n",
            file=sys.stderr,
        )
        sys.exit(1)

    # ═══ Step 1: Extract CSMS entries from archive PDFs ═══
    logger.info("Step 1: Parsing CSMS archive PDFs...")
    all_entries = extract_all_entries(SOURCE_PDFS_DIR, SOURCE_PDF_FILES)

    # Filter by date range
    entries_in_range = [
        e for e in all_entries
        if DATE_RANGE_START <= e.date <= DATE_RANGE_END
    ]
    logger.info(
        "Date filter: %d entries in range %s to %s (from %d total)",
        len(entries_in_range), DATE_RANGE_START, DATE_RANGE_END, len(all_entries),
    )

    # ═══ Step 2: Apply keyword pre-filter on titles ═══
    logger.info("Step 2: Applying keyword pre-filter on titles...")
    filtered_entries, prefilter_skipped = apply_prefilter(
        entries_in_range, enabled=prefilter_enabled
    )

    if args.dry_run:
        print(f"\n{'=' * 60}")
        print(f"DRY RUN SUMMARY")
        print(f"{'=' * 60}")
        print(f"Total entries in PDFs:       {len(all_entries)}")
        print(f"In date range:               {len(entries_in_range)}")
        print(f"Pre-filter skipped:          {prefilter_skipped}")
        print(f"Would fetch & classify:      {len(filtered_entries)}")
        print(f"MVP cap:                     {MAX_PDFS_TO_PROCESS}")
        print(f"\nEntries that would be processed:")
        for i, e in enumerate(filtered_entries):
            cap_marker = " [OVER CAP]" if i >= MAX_PDFS_TO_PROCESS else ""
            print(f"  {e.date} | CSMS {e.csms_id} | {e.title[:70]}{cap_marker}")
        return

    # ═══ Step 3: Fetch full bulletin text via lnks.gd → GovDelivery ═══
    logger.info("Step 3: Fetching bulletin full text...")
    # Apply MVP cap to number of bulletins we fetch
    capped_entries = filtered_entries[:MAX_PDFS_TO_PROCESS]
    if len(filtered_entries) > MAX_PDFS_TO_PROCESS:
        logger.warning(
            "MVP CAP: Only fetching %d of %d entries",
            MAX_PDFS_TO_PROCESS, len(filtered_entries),
        )

    fetched_entries, fetch_errors = fetch_entries(capped_entries)

    # Only proceed with entries that have full text
    entries_with_text = [e for e in fetched_entries if e.full_text]
    logger.info(
        "Bulletins with full text: %d / %d fetched",
        len(entries_with_text), len(fetched_entries),
    )

    if args.fetch_only:
        print(f"\n{'=' * 60}")
        print(f"FETCH-ONLY COMPLETE")
        print(f"{'=' * 60}")
        print(f"  Entries in date range:  {len(entries_in_range)}")
        print(f"  Passed keyword filter:  {len(filtered_entries)}")
        print(f"  Bulletins fetched:      {len(entries_with_text)}")
        print(f"  Fetch errors:           {len(fetch_errors)}")
        print(f"  Texts cached in:        scraper/cache/texts/")
        print(f"{'=' * 60}\n")
        if fetch_errors:
            print("Errors:")
            for e in fetch_errors:
                print(f"  CSMS {e.csms_id}: {e.error}")
        return

    # ═══ Step 4: Classify each bulletin via Claude API ═══
    logger.info("Step 4: Classifying bulletins via Claude API...")
    all_actions: list[TradeAction] = []
    classification_errors: list[PipelineError] = []
    total_input_tokens = 0
    total_output_tokens = 0
    cache_hits = 0
    new_api_calls = 0

    for i, entry in enumerate(entries_with_text):
        logger.info(
            "[%d/%d] Classifying CSMS %s: %s",
            i + 1, len(entries_with_text), entry.csms_id, entry.title[:50],
        )

        # Apply truncation
        text = truncate_text(entry.full_text, enabled=truncation_enabled)

        try:
            actions, inp_tok, out_tok = classify_entry(
                entry, text, model=model
            )
        except EnvironmentError:
            raise  # API key missing — fatal
        except Exception as exc:
            logger.warning("Classification failed for CSMS %s: %s", entry.csms_id, exc)
            classification_errors.append(PipelineError(
                csms_id=entry.csms_id,
                url=entry.govdelivery_url,
                error=f"Classification failed: {exc}",
            ))
            continue

        if inp_tok == 0 and out_tok == 0:
            cache_hits += 1
        else:
            new_api_calls += 1
            total_input_tokens += inp_tok
            total_output_tokens += out_tok

        all_actions.extend(actions)
        logger.info(
            "  → %d actions extracted (tokens: %d in / %d out)",
            len(actions), inp_tok, out_tok,
        )

    # ═══ Step 5: Assemble output ═══
    all_actions.sort(key=lambda a: a.effective_date or "0000-00-00", reverse=True)

    estimated_cost = estimate_cost(total_input_tokens, total_output_tokens, model)
    all_errors = fetch_errors + classification_errors

    output = PipelineOutput(
        meta=PipelineMeta(
            generated_at=datetime.now(timezone.utc).isoformat(),
            csms_entries_scanned=len(entries_in_range),
            entries_after_filter=len(filtered_entries),
            bulletins_fetched=len(entries_with_text),
            max_pdfs_cap=MAX_PDFS_TO_PROCESS,
            date_range_start=DATE_RANGE_START,
            date_range_end=DATE_RANGE_END,
            scraper_version=SCRAPER_VERSION,
            data_sources=[f.name for f in SOURCE_PDFS_DIR.iterdir() if f.suffix == ".pdf"],
            cost_optimization=CostOptimization(
                prefilter_enabled=prefilter_enabled,
                prefilter_skipped=prefilter_skipped,
                truncation_enabled=truncation_enabled,
                model_used=model,
                cache_hits=cache_hits,
                new_api_calls=new_api_calls,
                batch_mode=False,
                estimated_cost_usd=round(estimated_cost, 4),
                total_input_tokens=total_input_tokens,
                total_output_tokens=total_output_tokens,
            ),
            errors=[PipelineError(
                csms_id=e.csms_id, url=e.url, error=e.error
            ) for e in all_errors],
        ),
        actions=all_actions,
    )

    # ═══ Step 6: Write output ═══
    write_output(output)

    # ═══ Print summary ═══
    print(f"\n{'═' * 50}")
    print(f"  Pipeline Complete")
    print(f"{'═' * 50}")
    print(f"  CSMS entries scanned:       {len(entries_in_range)}")
    print(f"  Filtered out (no keywords): {prefilter_skipped}")
    print(f"  Passed filter:              {len(filtered_entries)}")
    print(f"  MVP cap applied:            {MAX_PDFS_TO_PROCESS}")
    print(f"  Bulletins fetched:          {len(entries_with_text)}")
    print(f"  Cache hits:                 {cache_hits}")
    print(f"  New API calls:              {new_api_calls}")
    print(f"  Model used:                 {model}")
    print(f"  Estimated API cost:         ${estimated_cost:.4f}")
    print(f"  Trade actions extracted:    {len(all_actions)}")
    print(f"  Errors:                     {len(all_errors)}")
    print(f"  Output: frontend/src/data/{OUTPUT_FILENAME}")
    print(f"{'═' * 50}\n")


if __name__ == "__main__":
    main()
