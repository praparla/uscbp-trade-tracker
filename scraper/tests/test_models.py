"""Tests for Pydantic data models and the output JSON schema."""

import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from pydantic import ValidationError
from models import CsmsEntry, TradeAction


# ── CsmsEntry ────────────────────────────────────────────────────────────

class TestCsmsEntry:
    def test_valid_entry(self):
        entry = CsmsEntry(
            csms_id="64624801",
            title="Section 232 Automobiles",
            date="2025-04-03",
            full_text=None,
            source_url="https://content.govdelivery.com/accounts/USDHSCBP/bulletins/3da18a1",
        )
        assert entry.csms_id == "64624801"
        assert entry.title == "Section 232 Automobiles"

    def test_entry_with_full_text(self):
        entry = CsmsEntry(
            csms_id="12345",
            title="Test",
            date="2025-01-20",
            full_text="Full bulletin text here with tariff details...",
            source_url=None,
        )
        assert entry.full_text is not None

    def test_entry_requires_csms_id(self):
        with pytest.raises(ValidationError):
            CsmsEntry(
                csms_id=None,
                title="Test",
                date="2025-01-20",
                full_text=None,
                source_url=None,
            )


# ── TradeAction ──────────────────────────────────────────────────────────

class TestTradeAction:
    @pytest.fixture
    def valid_action_data(self):
        return {
            "id": "csms-64348411-steel",
            "source_csms_id": "CSMS #64348411",
            "source_url": "https://www.cbp.gov/trade/232-steel-faqs",
            "title": "Section 232 Import Duties on Steel",
            "summary": "25% tariff on steel imports from all countries.",
            "action_type": "tariff",
            "countries_affected": ["All"],
            "hs_codes": ["9903.81.89", "9903.81.90"],
            "effective_date": "2025-03-12",
            "expiration_date": None,
            "status": "active",
            "federal_authority": "Proclamation 10895, Section 232",
            "duty_rate": "25%",
            "raw_excerpt": "25% Section 232 duties on steel from all countries",
        }

    def test_valid_action(self, valid_action_data):
        action = TradeAction(**valid_action_data)
        assert action.action_type == "tariff"
        assert action.status == "active"
        assert "All" in action.countries_affected

    def test_invalid_action_type(self, valid_action_data):
        valid_action_data["action_type"] = "invalid_type"
        with pytest.raises(ValidationError):
            TradeAction(**valid_action_data)

    def test_invalid_status(self, valid_action_data):
        valid_action_data["status"] = "unknown_status"
        with pytest.raises(ValidationError):
            TradeAction(**valid_action_data)

    def test_empty_countries_allowed(self, valid_action_data):
        """Empty countries list should be allowed (some actions affect general categories)."""
        valid_action_data["countries_affected"] = []
        # This should not raise — the model allows empty lists
        action = TradeAction(**valid_action_data)
        assert action.countries_affected == []

    def test_null_dates_allowed(self, valid_action_data):
        valid_action_data["effective_date"] = None
        valid_action_data["expiration_date"] = None
        action = TradeAction(**valid_action_data)
        assert action.effective_date is None
        assert action.expiration_date is None

    def test_empty_source_url_allowed(self, valid_action_data):
        """Manually curated entries may have empty source_url."""
        valid_action_data["source_url"] = ""
        action = TradeAction(**valid_action_data)
        assert action.source_url == ""

    def test_optional_extended_fields(self, valid_action_data):
        """federal_authority and duty_rate are optional."""
        del valid_action_data["federal_authority"]
        del valid_action_data["duty_rate"]
        action = TradeAction(**valid_action_data)
        assert action.federal_authority is None
        assert action.duty_rate is None

    def test_serialization_roundtrip(self, valid_action_data):
        """Model should serialize to dict and back."""
        action = TradeAction(**valid_action_data)
        as_dict = action.model_dump()
        restored = TradeAction(**as_dict)
        assert restored.id == action.id
        assert restored.action_type == action.action_type

    def test_all_valid_action_types(self, valid_action_data):
        """All defined action types should be accepted."""
        valid_types = [
            "tariff", "quota", "embargo", "sanction", "duty",
            "exclusion", "suspension", "modification", "investigation", "other",
        ]
        for t in valid_types:
            valid_action_data["action_type"] = t
            action = TradeAction(**valid_action_data)
            assert action.action_type == t


# ── Output JSON Schema Validation ────────────────────────────────────────

class TestOutputJsonSchema:
    """Validate the actual trade_actions.json against expected structure."""

    @pytest.fixture
    def trade_data(self):
        json_path = (
            Path(__file__).resolve().parent.parent.parent
            / "frontend" / "src" / "data" / "trade_actions.json"
        )
        if not json_path.exists():
            pytest.skip("trade_actions.json not found — run scraper first")
        return json.loads(json_path.read_text(encoding="utf-8"))

    def test_has_meta_and_actions(self, trade_data):
        assert "meta" in trade_data
        assert "actions" in trade_data
        assert isinstance(trade_data["actions"], list)

    def test_meta_required_fields(self, trade_data):
        meta = trade_data["meta"]
        assert "generated_at" in meta
        assert "date_range_start" in meta
        assert "date_range_end" in meta
        assert "max_pdfs_cap" in meta
        assert "errors" in meta
        assert isinstance(meta["errors"], list)

    def test_meta_cost_optimization(self, trade_data):
        co = trade_data["meta"].get("cost_optimization")
        if co:
            assert isinstance(co["prefilter_enabled"], bool)
            assert isinstance(co["truncation_enabled"], bool)
            assert isinstance(co["model_used"], str)
            assert isinstance(co["estimated_cost_usd"], (int, float))

    def test_all_actions_valid(self, trade_data):
        """Every action in the JSON should pass Pydantic validation."""
        errors = []
        for i, action_data in enumerate(trade_data["actions"]):
            try:
                TradeAction(**action_data)
            except ValidationError as e:
                errors.append(f"Action {i} ({action_data.get('id', '?')}): {e}")
        assert errors == [], f"Validation errors:\n" + "\n".join(errors)

    def test_no_duplicate_ids(self, trade_data):
        ids = [a["id"] for a in trade_data["actions"]]
        assert len(set(ids)) == len(ids), "Duplicate action IDs found"

    def test_date_range_consistency(self, trade_data):
        """Action dates should fall within the stated meta range."""
        start = trade_data["meta"]["date_range_start"]
        end = trade_data["meta"]["date_range_end"]
        for action in trade_data["actions"]:
            if action.get("effective_date"):
                # Allow some leeway: actions may predate the range
                # (e.g., Section 301 review effective Jan 1, 2025 before Jan 20 start)
                assert action["effective_date"] <= end, (
                    f"{action['id']}: effective_date {action['effective_date']} > range end {end}"
                )
