"""Pydantic models for the trade actions pipeline."""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class CsmsEntry(BaseModel):
    """A single CSMS entry parsed from the archive PDF."""

    csms_id: str
    title: str
    date: str  # ISO date YYYY-MM-DD
    lnks_gd_url: Optional[str] = None  # lnks.gd short URL from PDF hyperlink
    govdelivery_url: Optional[str] = None  # resolved GovDelivery URL
    full_text: Optional[str] = None  # fetched bulletin content


class TradeAction(BaseModel):
    """A structured trade action extracted from a CSMS bulletin."""

    id: str
    source_csms_id: str
    source_url: str
    title: str
    summary: str
    action_type: Literal[
        "tariff", "quota", "embargo", "sanction",
        "duty", "exclusion", "suspension", "modification",
        "investigation", "other",
    ]
    countries_affected: List[str] = Field(default_factory=list)
    hs_codes: List[str] = Field(default_factory=list)
    effective_date: Optional[str] = None
    expiration_date: Optional[str] = None
    status: Literal["active", "expired", "pending", "superseded"] = "active"
    federal_authority: Optional[str] = None
    duty_rate: Optional[str] = None
    raw_excerpt: str = ""


class CostOptimization(BaseModel):
    """Cost optimization metadata for the pipeline run."""

    prefilter_enabled: bool = True
    prefilter_skipped: int = 0
    truncation_enabled: bool = True
    model_used: str = ""
    cache_hits: int = 0
    new_api_calls: int = 0
    batch_mode: bool = False
    estimated_cost_usd: float = 0.0
    total_input_tokens: int = 0
    total_output_tokens: int = 0


class PipelineError(BaseModel):
    """A recorded error from the pipeline."""

    csms_id: Optional[str] = None
    url: Optional[str] = None
    error: str = ""


class PipelineMeta(BaseModel):
    """Metadata block for the output JSON."""

    generated_at: str = ""
    csms_entries_scanned: int = 0
    entries_after_filter: int = 0
    bulletins_fetched: int = 0
    max_pdfs_cap: int = 0
    date_range_start: str = ""
    date_range_end: str = ""
    scraper_version: str = ""
    data_sources: List[str] = Field(default_factory=list)
    cost_optimization: CostOptimization = Field(default_factory=CostOptimization)
    errors: List[PipelineError] = Field(default_factory=list)


class PipelineOutput(BaseModel):
    """Top-level output JSON structure."""

    meta: PipelineMeta = Field(default_factory=PipelineMeta)
    actions: List[TradeAction] = Field(default_factory=list)
